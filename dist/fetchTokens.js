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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAndStoreTokens = exports.tokens = void 0;
const stream_1 = require("stream");
// @ts-ignore if needed for TS
const nodeStream = stream_1.Readable.fromWeb(res.body);
const stream_json_1 = require("stream-json");
const StreamArray_1 = require("stream-json/streamers/StreamArray");
const promises_1 = require("node:stream/promises");
exports.tokens = new Map();
const fetchAndStoreTokens = () => __awaiter(void 0, void 0, void 0, function* () {
    const res = yield fetch("https://lite-api.jup.ag/tokens/v1/all");
    if (!res.ok || !res.body) {
        throw new Error(`Failed to fetch: ${res.status}`);
    }
    console.log(res.body);
    yield (0, promises_1.pipeline)(nodeStream, (0, stream_json_1.parser)(), (0, StreamArray_1.streamArray)(), function (source) {
        return __asyncGenerator(this, arguments, function* () {
            var _a, e_1, _b, _c;
            try {
                for (var _d = true, source_1 = __asyncValues(source), source_1_1; source_1_1 = yield __await(source_1.next()), _a = source_1_1.done, !_a; _d = true) {
                    _c = source_1_1.value;
                    _d = false;
                    const { value } = _c;
                    const { symbol, name, address, decimals } = value;
                    exports.tokens.set(symbol, { symbol, name, address, decimals });
                    // Add this debug log to confirm parsing works
                    console.log("Parsed token:", symbol);
                    if (!symbol || !name || !address || decimals === undefined)
                        continue;
                    try {
                        // await prisma.token.upsert({ ... })
                    }
                    catch (err) {
                        console.error(`⚠️ Failed to insert ${symbol}`, err);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = source_1.return)) yield __await(_b.call(source_1));
                }
                finally { if (e_1) throw e_1.error; }
            }
        });
    });
    console.log("✅ Token import completed.");
    console.log(exports.tokens.get('SOL'));
});
exports.fetchAndStoreTokens = fetchAndStoreTokens;
// fetchAndStoreTokens().catch(err => {
//   console.error("❌ Fetch/store failed:", err);
// });
