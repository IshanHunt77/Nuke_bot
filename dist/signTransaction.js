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
exports.signTransaction = void 0;
const web3_js_1 = require("@solana/web3.js");
const axios_1 = __importDefault(require("axios"));
const signTransaction = (_a) => __awaiter(void 0, [_a], void 0, function* ({ connection, quoteResponse, wallet }) {
    try {
        const swapRes = yield axios_1.default.post("https://lite-api.jup.ag/swap/v1/swap", {
            quoteResponse,
            userPublicKey: wallet.publicKey.toString(), //get public key from db
        });
        const swapTransaction = swapRes.data.swapTransaction;
        const transactionBuf = Buffer.from(swapTransaction, "base64");
        const transaction = web3_js_1.VersionedTransaction.deserialize(transactionBuf);
        let simulateTxConfig = {
            sigVerify: false,
            replaceRecentBlockhash: true,
            commitment: "finalized",
            accounts: undefined,
            innerInstructions: undefined,
            minContextSlot: undefined,
        };
        let simulateResult = yield connection.simulateTransaction(transaction, simulateTxConfig);
        console.log(simulateResult);
        return simulateResult;
        //     transaction.sign([wallet.payer]);//get payer from db
        // const latestBlockhash = await connection.getLatestBlockhash();
        // // 4. Serialize and send the transaction
        // const rawTransaction = transaction.serialize();
        // const signature = await connection.sendRawTransaction(rawTransaction, {
        //   maxRetries: 2,
        //   skipPreflight: true,
        // });
        // // 5. Confirm the transaction
        // await connection.confirmTransaction({
        //   blockhash: latestBlockhash.blockhash,
        //   lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        //   signature,
        // });
        // console.log(`Transaction successful! ✅`);
        // console.log(`View on Solscan: https://solscan.io/tx/${signature}`);
        //return signature;
    }
    catch (e) {
        console.log("Error in signing Transaction:", e);
    }
});
exports.signTransaction = signTransaction;
