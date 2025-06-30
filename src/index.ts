import { Connection, Keypair } from '@solana/web3.js';
import TelegramBot from 'node-telegram-bot-api';
import { getQuote } from './getQuote';
import { signTransaction } from './signTransaction';
import { getBalance } from './getBalance';
import prisma from './prisma';

const BOT_TOKEN = '8164931415:AAGMAVxsnR_WjHN8Hx8TeOn6ki7jueP6XHk';
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const connection = new Connection("https://api.mainnet-beta.solana.com");

interface UserSession {
  step: number;
  answers: string[];
  wallet: Keypair;
  quoteResponse?: any;
}

const userStates = new Map<string, UserSession>();
console.log("🚀 Bot is up and running!");

const swapQuestions = [
  '',
  '*Step 1:* Please enter the *input token* (e.g., `SOL`, `ETH`).',
  '*Step 2:* Enter the *output token* (e.g., `USDT`, `BTC`).',
  '*Step 3:* Specify the *amount* of the input token to swap.',
  '*Step 4:* Enter the *slippage* percentage (e.g., `0.5` for 0.5%).'
];

bot.onText(/^\/start$/, async (msg) => {
  const chatId = msg.chat.id.toString();

  let wallet: Keypair;
  const userInfo = await prisma.user.findFirst({ where: { telegramId: chatId } });
  if (userInfo) {
    wallet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(userInfo.privatekey)));
  } else {
    wallet = Keypair.generate();
    await prisma.user.create({
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

  const sentMessage = await bot.sendMessage(Number(chatId), welcomeMessage, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[{ text: "🔄 Refresh", callback_data: "refresh" }], [{ text: '✅ OK', callback_data: 'ok' }]]
    }
  });

  setTimeout(() => bot.deleteMessage(Number(chatId), sentMessage.message_id).catch(() => {}), 300000);
});

bot.on('callback_query', async (callbackQuery) => {
  const { message, data }: any = callbackQuery;
  const chatId = message.chat.id.toString();
  const state = userStates.get(chatId);

  if (!state) {
    await bot.answerCallbackQuery(callbackQuery.id, { text: "Session expired. Please type /start to begin again." });
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

        if (isNaN(amount) || isNaN(slippage)) throw new Error("Invalid amount or slippage value.");

        await bot.sendMessage(Number(chatId), "⏳ Fetching the best quote for your swap...");
        const response = await getQuote({ inputToken, outputToken, amount, slippage });
        state.quoteResponse = response.quoteResponse;

        const received = response.quoteResponse.outAmount / Math.pow(10, response.outputDecimalValue);
        const quoteMessage = `
*📊 Swap Preview:*

*Input:* ${amount} ${inputToken.toUpperCase()}
*Output:* ~${received.toFixed(response.outputDecimalValue)} ${outputToken.toUpperCase()}

Click *Transact* to proceed or *Cancel* to abort.`;

        await bot.sendMessage(Number(chatId), quoteMessage, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "💸 Transact", callback_data: "transact" }], [{ text: "❌ Cancel", callback_data: "cancel" }]]
          }
        });
      } catch (e: any) {
        await bot.sendMessage(Number(chatId), `❌ *Quote Error:* \`${e.message}\``, { parse_mode: "Markdown" });
        userStates.delete(chatId);
      }
      break;

    case 'transact':
      try {
        const tx = await signTransaction({ connection, quoteResponse: state.quoteResponse, wallet: state.wallet });
        await bot.sendMessage(Number(chatId), `✅ *Transaction Successful!*
🔗 [View on Solscan](https://solscan.io/tx/${tx})`, {
          parse_mode: "Markdown",
          disable_web_page_preview: true
        });
        userStates.delete(chatId);
      } catch (e: any) {
        await bot.sendMessage(Number(chatId), `❌ *Transaction Failed:* \`${e.message}\``, { parse_mode: "Markdown" });
        userStates.delete(chatId);
      }
      break;

    case 'back':
      if (state.step > 1) {
        state.answers.pop();
        state.step--;
        bot.sendMessage(Number(chatId), swapQuestions[state.step], { parse_mode: 'Markdown' });
      } else {
        state.answers = [];
        state.step = 0;
        bot.sendMessage(Number(chatId), "🔁 Type *OK* to begin again.", { parse_mode: 'Markdown' });
      }
      break;

    case 'refresh':
      try {
        const user = await prisma.user.findFirst({ where: { telegramId: chatId } });
        if (!user) {
          await bot.sendMessage(Number(chatId), "❌ *User not found.* Please type /start.", { parse_mode: "Markdown" });
          return;
        }

        const balance = await getBalance(user.publickey);
        const msg = `
🔄 *Balance Refreshed!*

*Wallet:* \`${user.publickey}\`
*Balance:* ${balance} lamports

Click *OK* to continue.`;

        await bot.sendMessage(Number(chatId), msg, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "🔄 Refresh", callback_data: "refresh" }], [{ text: "✅ OK", callback_data: "ok" }]]
          }
        });
      } catch (e) {
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
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id.toString();
  const state = userStates.get(chatId);
  if (!state || msg.text?.startsWith('/')) return;

  if (state.step >= 1 && state.step < swapQuestions.length) {
    state.answers.push(msg.text!);
    state.step++;

    if (state.step < swapQuestions.length) {
      bot.sendMessage(Number(chatId), swapQuestions[state.step], { parse_mode: 'Markdown' });
    } else {
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
});
