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
const { Wallet } = require("@project-serum/anchor");
const { bs58 } = require("@project-serum/anchor/dist/cjs/utils/bytes");
const { Connection, Keypair, VersionedTransaction } = require("@solana/web3.js");
const axios = require("axios");
require("dotenv").config(); // To load PRIVATE_KEY
const connection = new Connection("https://api.mainnet-beta.solana.com");
const wallet = new Wallet(Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY)));
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 1. Get swap quote (SOL -> USDC)
        const quoteUrl = "https://lite-api.jup.ag/swap/v1/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100000000&slippageBps=50&restrictIntermediateTokens=true";
        const quoteResponse = (yield axios.get(quoteUrl)).data;
        console.log("Quote Response:\n", JSON.stringify(quoteResponse, null, 2));
        // 2. Get swap transaction
        const swapRes = yield axios.post("https://lite-api.jup.ag/swap/v1/swap", {
            quoteResponse,
            userPublicKey: wallet.publicKey.toString(),
        });
        const swapTransaction = swapRes.data.swapTransaction;
        const transactionBuf = Buffer.from(swapTransaction, "base64");
        const transaction = VersionedTransaction.deserialize(transactionBuf);
        // 3. Sign the transaction
        transaction.sign([wallet.payer]);
        const latestBlockhash = yield connection.getLatestBlockhash();
        // 4. Serialize and send the transaction
        const rawTransaction = transaction.serialize();
        const signature = yield connection.sendRawTransaction(rawTransaction, {
            maxRetries: 2,
            skipPreflight: true,
        });
        // 5. Confirm the transaction
        yield connection.confirmTransaction({
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            signature,
        });
        console.log(`Transaction successful! ✅`);
        console.log(`View on Solscan: https://solscan.io/tx/${signature}`);
    }
    catch (err) {
        console.error("Swap failed:", err.message || err);
    }
});
main();
