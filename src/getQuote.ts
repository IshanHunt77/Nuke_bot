import https from "https";
import { fetchAndStoreTokens, tokens } from "./fetchTokens";

interface Quote {
  amount: number;
  inputToken: string;
  outputToken: string;
  slippage: number;
}



export const getQuote = async ({ inputToken, outputToken, amount, slippage }: Quote) => {
  console.log("🔍 Quote requested:", { inputToken, outputToken, amount, slippage });
  await fetchAndStoreTokens();

  const inputMint = tokens.get(inputToken)
  const outputMint = tokens.get(outputToken)

  if (!inputMint) throw new Error(`Input token with symbol ${inputToken} not found.`);
  if (!outputMint) throw new Error(`Output token with symbol ${outputToken} not found.`);

  const lamports = Math.floor(amount * Math.pow(10, inputMint.decimals));
  const quoteUrl = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${inputMint.address}&outputMint=${outputMint.address}&amount=${lamports}&slippageBps=${slippage * 100}&restrictIntermediateTokens=true`;

  console.log("🌐 Fetching quote from:", quoteUrl);
  const res = await fetch(quoteUrl);
  

  let quoteResponse: any = await res.json();
  

  return { quoteResponse, outputDecimalValue: outputMint.decimals };
};
