"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const getQuote_1 = require("./getQuote");
const signTransaction_1 = require("./signTransaction");
const getBalance_1 = require("./getBalance");
const prisma_1 = __importDefault(require("./prisma"));
const token = process.env.TELEGRAM_BOT_API;
if (!token) {
    throw new Error("❌ TELEGRM_BOT_API is not defined in environment variables.");
}
const bot = new node_telegram_bot_api_1.default(token, { polling: true });
const connection = new web3_js_1.Connection("https://api.mainnet-beta.solana.com");
const userStates = new Map();
console.log("🚀 Bot is up and running!");
const swapQuestions = [
    '',
    '*Step 1:* Please enter the *input token* (e.g., `SOL`, `ETH`).',
    '*Step 2:* Enter the *output token* (e.g., `USDT`, `BTC`).',
    '*Step 3:* Specify the *amount* of the input token to swap.',
    '*Step 4:* Enter the *slippage* percentage (e.g., `0.5` for 0.5%).'
];
bot.onText(/^\/start$/, (msg) => __awaiter(void 0, void 0, void 0, function* () {
    const chatId = msg.chat.id.toString();
    let wallet;
    const userInfo = yield prisma_1.default.user.findFirst({ where: { telegramId: chatId } });
    if (userInfo) {
        wallet = web3_js_1.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(userInfo.privatekey)));
    }
    else {
        wallet = web3_js_1.Keypair.generate();
        yield prisma_1.default.user.create({
            data: {
                telegramId: chatId,
                publickey: wallet.publicKey.toBase58(),
                privatekey: JSON.stringify(Array.from(wallet.secretKey))
            }
        });
    }
    userStates.set(chatId, { step: 0, answers: [], wallet });
    const welcomeMessage = `
*👋 Welcome to LUKE SWAP BOT!*

*Your Wallet Address:*
\`${wallet.publicKey.toBase58()}\`
Click *Refresh* to get balance \n
Click *OK* to begin your swap journey 🚀
`;
    const sentMessage = yield bot.sendMessage(Number(chatId), welcomeMessage, {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [[{ text: "🔄 Refresh", callback_data: "refresh" }], [{ text: '✅ OK', callback_data: 'ok' }]]
        }
    });
    setTimeout(() => bot.deleteMessage(Number(chatId), sentMessage.message_id).catch(() => { }), 300000);
}));
bot.on('callback_query', (callbackQuery) => __awaiter(void 0, void 0, void 0, function* () {
    const { message, data } = callbackQuery;
    const chatId = message.chat.id.toString();
    const state = userStates.get(chatId);
    if (!state) {
        yield bot.answerCallbackQuery(callbackQuery.id, { text: "Session expired. Please type /start to begin again." });
        return;
    }
    switch (data) {
        case 'ok':
            state.step++;
            bot.sendMessage(Number(chatId), swapQuestions[state.step], { parse_mode: 'Markdown' });
            break;
        case 'swap':
            try {
                const [inputToken, outputToken, amountStr, slippageStr] = state.answers;
                const amount = Number(amountStr);
                const slippage = Number(slippageStr);
                if (isNaN(amount) || isNaN(slippage))
                    throw new Error("Invalid amount or slippage value.");
                yield bot.sendMessage(Number(chatId), "⏳ Fetching the best quote for your swap...");
                const response = yield (0, getQuote_1.getQuote)({ inputToken, outputToken, amount, slippage });
                state.quoteResponse = response.quoteResponse;
                const received = response.quoteResponse.outAmount / Math.pow(10, response.outputDecimalValue);
                const quoteMessage = `
*📊 Swap Preview:*

*Input:* ${amount} ${inputToken.toUpperCase()}
*Output:* ~${received.toFixed(response.outputDecimalValue)} ${outputToken.toUpperCase()}

Click *Transact* to proceed or *Cancel* to abort.`;
                yield bot.sendMessage(Number(chatId), quoteMessage, {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [[{ text: "💸 Transact", callback_data: "transact" }], [{ text: "❌ Cancel", callback_data: "cancel" }]]
                    }
                });
            }
            catch (e) {
                yield bot.sendMessage(Number(chatId), `❌ *Quote Error:* \`${e.message}\``, { parse_mode: "Markdown" });
                userStates.delete(chatId);
            }
            break;
        case 'transact':
            try {
                const tx = yield (0, signTransaction_1.signTransaction)({ connection, quoteResponse: state.quoteResponse, wallet: state.wallet });
                yield bot.sendMessage(Number(chatId), `✅ *Transaction Successful!*
🔗 [View on Solscan](https://solscan.io/tx/${tx})`, {
                    parse_mode: "Markdown",
                    disable_web_page_preview: true
                });
                userStates.delete(chatId);
            }
            catch (e) {
                yield bot.sendMessage(Number(chatId), `❌ *Transaction Failed:* \`${e.message}\``, { parse_mode: "Markdown" });
                userStates.delete(chatId);
            }
            break;
        case 'back':
            if (state.step > 1) {
                state.answers.pop();
                state.step--;
                bot.sendMessage(Number(chatId), swapQuestions[state.step], { parse_mode: 'Markdown' });
            }
            else {
                state.answers = [];
                state.step = 0;
                bot.sendMessage(Number(chatId), "🔁 Type *OK* to begin again.", { parse_mode: 'Markdown' });
            }
            break;
        case 'refresh':
            try {
                const user = yield prisma_1.default.user.findFirst({ where: { telegramId: chatId } });
                if (!user) {
                    yield bot.sendMessage(Number(chatId), "❌ *User not found.* Please type /start.", { parse_mode: "Markdown" });
                    return;
                }
                const balance = yield (0, getBalance_1.getBalance)(user.publickey);
                const msg = `
🔄 *Balance Refreshed!*

*Wallet:* \`${user.publickey}\`
*Balance:* ${balance} lamports

Click *OK* to continue.`;
                yield bot.sendMessage(Number(chatId), msg, {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [[{ text: "🔄 Refresh", callback_data: "refresh" }], [{ text: "✅ OK", callback_data: "ok" }]]
                    }
                });
            }
            catch (e) {
                console.error("Refresh error", e);
                bot.sendMessage(Number(chatId), "⚠️ Failed to refresh balance.");
            }
            break;
        case 'cancel':
            bot.sendMessage(Number(chatId), "❌ *Transaction Cancelled.*", { parse_mode: "Markdown" });
            userStates.delete(chatId);
            break;
        default:
            bot.sendMessage(Number(chatId), "🤖 *Unknown action.* Please type /start.", { parse_mode: "Markdown" });
            break;
    }
}));
bot.on('message', (msg) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const chatId = msg.chat.id.toString();
    const state = userStates.get(chatId);
    if (!state || ((_a = msg.text) === null || _a === void 0 ? void 0 : _a.startsWith('/')))
        return;
    if (state.step >= 1 && state.step < swapQuestions.length) {
        state.answers.push(msg.text);
        state.step++;
        if (state.step < swapQuestions.length) {
            bot.sendMessage(Number(chatId), swapQuestions[state.step], { parse_mode: 'Markdown' });
        }
        else {
            const summary = `
*🔍 Review Your Swap:*

*Input:* ${state.answers[0]}
*Output:* ${state.answers[1]}
*Amount:* ${state.answers[2]}
*Slippage:* ${state.answers[3]}%

Click *Swap* to proceed or *Back* to make changes.`;
            bot.sendMessage(Number(chatId), summary, {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔁 Back", callback_data: "back" }],
                        [{ text: "🚀 Swap", callback_data: "swap" }]
                    ]
                }
            });
        }
    }
}));
