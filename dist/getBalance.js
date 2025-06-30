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
exports.getBalance = void 0;
const web3_js_1 = require("@solana/web3.js");
const getBalance = (address) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const connection = new web3_js_1.Connection("https://solana-mainnet.g.alchemy.com/v2/2Z-oKEpyJ0uxd4L827Yqrkg7m1nm9g_Y", "confirmed");
        const publicKey = new web3_js_1.PublicKey(address);
        const balance = yield connection.getBalance(publicKey);
        return balance;
    }
    catch (e) {
        console.log("Error fetching balance:", e);
    }
});
exports.getBalance = getBalance;
