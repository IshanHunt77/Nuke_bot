import { Connection, Keypair } from '@solana/web3.js';
import TelegramBot from 'node-telegram-bot-api';
import { getQuote } from './getQuote'; // Assuming this module exists
import { signTransaction } from './signTransaction'; // Assuming this module exists
import { getBalance } from './getBalance';

// Bot configuration
const BOT_TOKEN = '8164931415:AAGMAVxsnR_WjHN8Hx8TeOn6ki7jueP6XHk';
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Solana connection
const connection = new Connection("https://api.mainnet-beta.solana.com");
// For a production environment, consider securely managing and loading wallets
// instead of generating a new one every time the bot starts.
const wallet = Keypair.generate(); 

// State management for users
interface UserSession {
    step: number;
    answers: string[];
}
const userStates = new Map<number, UserSession>();

// Questions for the swap process
const swapQuestions = [
    '', // Placeholder for step 0
    'Please enter the input token (e.g., SOL, ETH).',
    'Please enter the output token (e.g., SOL, ETH).',
    'Kindly specify the amount of the input token you wish to swap.',
    'Please enter the desired slippage percentage (e.g., 0.5 for 0.5%).'
];

// Handle /start command
bot.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    userStates.set(chatId, { step: 0, answers: [] });

    const welcomeMessage = `
*Welcome to Luke Bot!*

Luke Bot facilitates seamless token swaps on the Solana blockchain directly from Telegram.
To begin, simply follow the prompts for a secure and efficient swapping experience.

*Your Public Key:* \`${wallet.publicKey.toBase58()}\`
*Your Private Key:* \`${Buffer.from(wallet.secretKey).toString('hex')}\`

_Please secure these keys immediately. This message will be automatically deleted in 5 minutes for your security._

To proceed, please type 'OK'.
`;

    try {
        const sentMessage = await bot.sendMessage(
            chatId,
            welcomeMessage,
            { parse_mode: "Markdown" }
        );
        // Automatically delete the message containing keys after 5 minutes (300,000 milliseconds)
        setTimeout(() => {
            bot.deleteMessage(chatId, sentMessage.message_id).catch(e => console.error("Error deleting message:", e));
        }, 300000);
    } catch (e) {
        console.error("Error sending start message:", e);
        bot.sendMessage(chatId, "An error occurred while starting the bot. Please try again.");
    }
});

// Handle all incoming messages
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const state = userStates.get(chatId);

    if (!state) {
        // If the user hasn't started the bot, prompt them to do so.
        if (!msg.text?.startsWith('/start')) {
            bot.sendMessage(chatId, "Welcome! Please type /start to begin your session with Luke Bot.");
        }
        return;
    }

    // Handle 'OK' to proceed after displaying keys
    if (state.step === 0 && msg.text?.toLowerCase() === 'ok') {
        state.step++;
        bot.sendMessage(chatId, swapQuestions[state.step]);
        return;
    }

    // Process answers for swap questions
    if (state.step > 0 && state.step < swapQuestions.length) {
        if (msg.text) {
            state.answers.push(msg.text);
            state.step++;

            if (state.step < swapQuestions.length) {
                bot.sendMessage(chatId, swapQuestions[state.step]);
            } else {
                // All questions answered, display summary and prompt for action
                const summaryMessage = `
*Swap Details Confirmation:*
*Input Token:* ${state.answers[0]}
*Output Token:* ${state.answers[1]}
*Amount:* ${state.answers[2]}
*Slippage:* ${state.answers[3]}%

If these details are correct, please click 'Swap' to proceed. Otherwise, you may go 'Back' to adjust.
`;
                bot.sendMessage(
                    chatId,
                    summaryMessage,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "Swap", callback_data: "swap" }],
                                [{ text: "Back", callback_data: "back" }]
                            ]
                        }
                    }
                );
            }
        } else {
            bot.sendMessage(chatId, "Please provide a valid text response for the current step.");
        }
    }
});

// Handle inline keyboard button callbacks
bot.on('callback_query', async (callbackQuery) => {
    const { message, data }: any = callbackQuery;
    const chatId = message.chat.id;
    const state = userStates.get(chatId);

    if (!state) {
        bot.sendMessage(chatId, "Your session has expired or not started. Please type /start to begin a new session.");
        return;
    }

    switch (data) {
        case 'swap':
            try {
                // Ensure all necessary answers are present for getQuote
                if (state.answers.length < 4) {
                    throw new Error("Missing swap parameters. Please restart the process with /start.");
                }

                const [inputToken, outputToken, amountStr, slippageStr] = state.answers;
                const amount = Number(amountStr);
                const slippage = Number(slippageStr);

                if (isNaN(amount) || isNaN(slippage)) {
                    throw new Error("Invalid amount or slippage provided. Please enter numeric values.");
                }

                await bot.sendMessage(chatId, "Fetching swap quote, please wait...");
                const response = await getQuote({
                    inputToken,
                    outputToken,
                    amount,
                    slippage
                });

                state.answers.push(response.quoteResponse); // Store the quote response

                const receivedAmount = response.quoteResponse.outAmount / Math.pow(10, response.outputDecimalValue);
                const quoteMessage = `
*Swap Quote Details:*

You are proposing to swap *${amount} ${inputToken.toUpperCase()}* for *${outputToken.toUpperCase()}*.

You are estimated to receive approximately:
*${receivedAmount.toFixed(response.outputDecimalValue)} ${outputToken.toUpperCase()}*

To finalize this transaction, please click 'Transact'.
`;
                await bot.sendMessage(
                    chatId,
                    quoteMessage,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "Transact", callback_data: "transact" }]
                            ]
                        }
                    }
                );
            } catch (error: any) {
                console.error("Error during swap quote:", error);
                bot.sendMessage(
                    chatId,
                    `❌ *Failed to retrieve swap quote:*\n\`${error.message || "An unexpected error occurred."}\`\nPlease try again or verify your input.`,
                    { parse_mode: "Markdown" }
                );
                // Optionally reset state or allow user to try again
                userStates.delete(chatId);
            }
            break;

        case 'transact':
            try {
                // Ensure quote response is available
                if (state.answers.length < 5 || !state.answers[4]) {
                    throw new Error("No swap quote found. Please initiate a swap first.");
                }
                
                await bot.sendMessage(chatId, "Initiating transaction, please wait...");
                const transactionResponse = await signTransaction({
                    connection,
                    quoteResponse: state.answers[4],
                    wallet
                });

                const successMessage = `
✅ *Transaction Successful!*

You can view your transaction details on Solscan:
[https://solscan.io/tx/${transactionResponse}](https://solscan.io/tx/${transactionResponse})

Thank you for using Luke Bot!
`;
                await bot.sendMessage(
                    chatId,
                    successMessage,
                    { parse_mode: "Markdown", disable_web_page_preview: true }
                );
                userStates.delete(chatId); // Clear user state after successful transaction
            } catch (error: any) {
                console.error("Error during transaction:", error);
                bot.sendMessage(
                    chatId,
                    `❌ *Transaction Failed:*\n\`${error.message || "An unexpected error occurred during the transaction."}\`\nPlease try again.`,
                    { parse_mode: "Markdown" }
                );
                // Optionally reset state or allow user to try again
                userStates.delete(chatId);
            }
            break;

        case 'back':
            // Move back to the previous step in the question flow
            if (state.step > 1) { // Cannot go back beyond the first question (step 1)
                state.answers.pop(); // Remove the last answer
                state.step--;
                // If moving back from the confirmation step, present the previous question
                bot.sendMessage(chatId, swapQuestions[state.step]);
            } else if (state.step === 1) {
                // If at the first question, reset to step 0 and prompt for 'OK'
                state.answers = [];
                state.step = 0;
                bot.sendMessage(chatId, "You've gone back to the start. Please type 'OK' to proceed with the swap process.");
            }
            break;

            case 'Refresh';
            try {
                const address = await prisma.user.find({
                    where : {
                        telegramId : chatId
                    }
                })
                const response = await getBalance(address);
            }catch(e:any){
                bot.sendMessage(chatId,"Error getting balance")
            }

        default:
            bot.sendMessage(chatId, "Unknown action. Please use the provided buttons.");
            break;
    }

    // Always answer the callback query to remove the loading state on the button
    await bot.answerCallbackQuery(callbackQuery.id);
});