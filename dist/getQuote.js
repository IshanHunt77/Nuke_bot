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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuote = void 0;
const fetchTokens_1 = require("./fetchTokens");
const undici_1 = require("undici");
const getQuote = (_a) => __awaiter(void 0, [_a], void 0, function* ({ inputToken, outputToken, amount, slippage }) {
    console.log("🔍 Quote requested:", { inputToken, outputToken, amount, slippage });
    yield (0, fetchTokens_1.fetchAndStoreTokens)();
    const inputMint = fetchTokens_1.tokens.get(inputToken);
    const outputMint = fetchTokens_1.tokens.get(outputToken);
    if (!inputMint)
        throw new Error(`Input token with symbol ${inputToken} not found.`);
    if (!outputMint)
        throw new Error(`Output token with symbol ${outputToken} not found.`);
    const lamports = Math.floor(amount * Math.pow(10, inputMint.decimals));
    const quoteUrl = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${inputMint.address}&outputMint=${outputMint.address}&amount=${lamports}&slippageBps=${slippage * 100}&restrictIntermediateTokens=true`;
    console.log("🌐 Fetching quote from:", quoteUrl);
    const res = yield (0, undici_1.fetch)(quoteUrl);
    let quoteResponse = yield res.json();
    return { quoteResponse, outputDecimalValue: outputMint.decimals };
});
exports.getQuote = getQuote;
