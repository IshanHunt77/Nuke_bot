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
const anchor_1 = require("@project-serum/anchor");
const web3_js_1 = require("@solana/web3.js");
const axios_1 = __importDefault(require("axios"));
const connection = new web3_js_1.Connection("rpc provider url");
const keypair = web3_js_1.Keypair.generate();
const wallet = new anchor_1.Wallet(keypair);
// send pub pvt key to user on start
const getQuote = (_a) => __awaiter(void 0, [_a], void 0, function* ({ amount, slippage, inputMint, outputMint }) {
    try {
        const quoteResponse = yield (yield axios_1.default.get(`https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}\
            &outputMint=${outputMint}\
            &amount=${amount}\
            &slippageBps=${slippage}`));
    }
    catch (e) {
        console.log("Error:", e);
    }
});
