import { Readable } from 'stream';
// @ts-ignore if needed for TS
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';
import { chain } from 'stream-chain';
import prisma from './prisma';
import { pipeline } from 'node:stream/promises';
import { fetch } from 'undici';

interface Token {
  symbol : string;
  name : string;
  address : string;
  decimals : number;
}
export const tokens = new Map<string,Token>()
export const fetchAndStoreTokens = async () => {
  const res = await fetch("https://lite-api.jup.ag/tokens/v1/all");
  if (!res.ok || !res.body) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
 const nodeStream = Readable.fromWeb(res.body as any);

console.log(res.body)
  await pipeline(
    nodeStream,
    parser(),
    streamArray(),
    async function* (source: AsyncIterable<any>)
 {
      for await (const { value } of source) {
  const { symbol, name, address, decimals } = value;
        tokens.set(symbol,{symbol,name,address,decimals});
  // Add this debug log to confirm parsing works
  console.log("Parsed token:", symbol);

  if (!symbol || !name || !address || decimals === undefined) continue;

  try {
    // await prisma.token.upsert({ ... })
  } catch (err) {
    console.error(`⚠️ Failed to insert ${symbol}`, err);
  }
}

    }
  );

  console.log("✅ Token import completed.");
  console.log(tokens.get('SOL'));
};

// fetchAndStoreTokens().catch(err => {
//   console.error("❌ Fetch/store failed:", err);
// });


