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
const token = '8164931415:AAGMAVxsnR_WjHN8Hx8TeOn6ki7jueP6XHk';
const bot = new node_telegram_bot_api_1.default(token, { polling: true });
const connection = new web3_js_1.Connection("https://api.mainnet-beta.solana.com");
const wallet = web3_js_1.Keypair.generate();
const question = [
    ' ',
    'Enter input token(/SOL,/ETH etc)',
    'Enter output token(/SOL,/ETH etc)',
    'Enter amount of input token you want to Swap',
    'Enter Slippage (%)'
];
const userState = new Map();
bot.onText(/^\/start$/, (msg) => {
    const chatId = msg.chat.id;
    userState.set(chatId, { step: 0, answers: [] });
    bot.sendMessage(msg.chat.id, `*Welcome to Luke Bot!*\n\nLuke Bot helps you easily swap tokens on the Solana blockchain directly from Telegram.\nJust start the bot, follow the prompts, and swap your tokens securely and quickly!\n\n*Your PUBLIC_KEY:* \`${wallet.publicKey}\`\n*PRIVATE_KEY:* \`${wallet.secretKey}\`\n\n_Copy the keys as this msg will auto delete in 5 minutes \n\n Type Ok to proceed_`, { parse_mode: "Markdown" }).then((sendMsg) => {
        setTimeout(() => {
            bot.deleteMessage(msg.chat.id, sendMsg.message_id);
        }, 300000);
    });
});
bot.on('message', (msg) => {
    var _a;
    const chatId = msg.chat.id;
    const state = userState.get(chatId);
    if (!state)
        return; // Ignore if user hasn't started
    // If waiting for OK to proceed
    if (state.step === 0 && ((_a = msg.text) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'ok') {
        state.step++;
        bot.sendMessage(chatId, question[state.step]);
        return;
    }
    // If in the question flow
    if (state.step > 0 && state.step < question.length) {
        state.answers.push(msg.text);
        state.step++;
        if (state.step < question.length) {
            bot.sendMessage(chatId, question[state.step]);
        }
        else {
            bot.sendMessage(chatId, `*Input Token:* ${state.answers[0]}\n*Output Token:* ${state.answers[1]}\n*Amount:* ${state.answers[2]}\n*Slippage:* ${state.answers[3]}\n\nIf everything is Ok, then click on Swap to proceed.`, {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "swap", callback_data: "swap" }], [{ text: "back", callback_data: "back" }]
                    ]
                }
            });
        }
    }
});
bot.on('callback_query', (callbackQuery) => __awaiter(void 0, void 0, void 0, function* () {
    const { message, data } = callbackQuery;
    const state = userState.get(message.chat.id);
    if (data === 'swap' && state) {
        try {
            console.log(state.answers[0], state.answers[1], state.answers[2], state.answers[3]);
            console.log("begin get quote");
            const response = yield (0, getQuote_1.getQuote)({
                inputToken: state.answers[0],
                outputToken: state.answers[1],
                amount: Number(state.answers[2]),
                slippage: Number(state.answers[3])
            });
            state.answers.push(response.quoteResponse);
            bot.sendMessage(message.chat.id, `*Swap Quote*\n\nYou are swapping *${state.answers[2]}* ${state.answers[0]} for ${state.answers[1]}.\n\nYou will receive:\n*${(response.quoteResponse.outAmount) / Math.pow(10, response.outputDecimalValue)}* ${state.answers[1]}\n\nIf everything looks correct, please click *Transact* to proceed.`, {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Transact", callback_data: "transact" }]
                    ]
                }
            });
        }
        catch (e) {
            bot.sendMessage(message.chat.id, `❌ *Failed to get quote:*\n${e.message || e}`, { parse_mode: "Markdown" });
        }
    }
    else if (data === 'transact' && state) {
        try {
            const response = yield (0, signTransaction_1.signTransaction)({ connection, quoteResponse: state.answers[4], wallet });
            bot.sendMessage(message.chat.id, `✅ *Transaction Successful!*\n\nYou can view your transaction on Solscan:\nhttps://solscan.io/tx/${response}`, { parse_mode: "Markdown" });
        }
        catch (e) {
            bot.sendMessage(message.chat.id, `❌ *Transaction failed:*\n${e}`, { parse_mode: "Markdown" });
        }
    }
    else if (data === "back") {
        state.answers.pop();
        state.step--;
        bot.sendMessage(message.chat.id, question[state.step], {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "back", callback_data: "back" }]
                ]
            }
        });
    }
}));
