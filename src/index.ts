import { Keypair } from '@solana/web3.js';
import TelegramBot from 'node-telegram-bot-api';
import { text } from 'stream/consumers';
import { getQuote } from './getQuote';

const token = '8164931415:AAGMAVxsnR_WjHN8Hx8TeOn6ki7jueP6XHk';
const bot = new TelegramBot(token,{polling:true});

const keypair = Keypair.generate();

const question = [
    ' ',
    'Enter input token(/SOL,/ETH etc)',
    'Enter output token(/SOL,/ETH etc)',
    'Enter amount of input token you want to Swap',
    'Enter Slippage (%)'
]

const userState = new Map();

bot.onText(/^\/start$/,(msg)=>{
    const chatId = msg.chat.id;
    userState.set(chatId,{step:0,answers:[]});
    bot.sendMessage(
        msg.chat.id,
        `*Welcome to Luke Bot!*\n\nLuke Bot helps you easily swap tokens on the Solana blockchain directly from Telegram.\nJust start the bot, follow the prompts, and swap your tokens securely and quickly!\n\n*Your PUBLIC_KEY:* \`${keypair.publicKey}\`\n*PRIVATE_KEY:* \`${keypair.secretKey}\`\n\n_Copy the keys as this msg will auto delete in 5 minutes \n\n Type Ok to proceed_`,
        { parse_mode: "Markdown" }
      ).then((sendMsg)=>{
        setTimeout(()=>{
            bot.deleteMessage(msg.chat.id,sendMsg.message_id);
        },300000);
        })
      });


bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const state = userState.get(chatId);

    if (!state) return; // Ignore if user hasn't started

    // If waiting for OK to proceed
    if (state.step === 0 && msg.text?.toLowerCase() === 'ok') {
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
        } else {
            bot.sendMessage(chatId,
                `*Input Token:* ${state.answers[0]}\n*Output Token:* ${state.answers[1]}\n*Amount:* ${state.answers[2]}\n*Slippage:* ${state.answers[3]}\n\nIf everything is Ok, then click on Swap to proceed.`,
                {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "swap", callback_data: "swap" }]
                        ]
                    }
                }
            );
        }
    }
});


bot.on('callback_query',async (callbackQuery)=>{
    const {message,data}:any = callbackQuery;
    const state = userState.get(message.chat.id);
    
    if(data === 'swap'){
        await getQuote({
            inputToken:state.answers[0],
            outputToken:state.answers[1],
            amount:Number(state.answers[2]),
            slippage:Number(state.answers[3])
        });
    }
})