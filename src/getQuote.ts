import axios from "axios";

interface Quote {
    amount: number;
    inputToken: string;
    outputToken: string;
    slippage: number;
}

let cachedTokens: any[] | null = null;
let tokenMap: Map<string, any> | null = null; // A map for O(1) lookup by symbol

// Assumes tokens is an array sorted by symbol using localeCompare()
const binarySearchTokens = ({ tokens, symbol }: any) => {
    let l = 0, h = tokens.length - 1;
    const searchSymbol = symbol;

    while (l <= h) {
        let mid = Math.floor((l + h) / 2);
        const midSymbol = tokens[mid].symbol;

        const comparisonResult = searchSymbol.localeCompare(midSymbol);

        if (comparisonResult === 0) {
            return tokens[mid];
        } else if (comparisonResult > 0) {
            l = mid + 1;
        } else {
            h = mid - 1;
        }
    }
    throw new Error(`Token with symbol ${symbol} not found`);
};

export const getQuote = async ({ inputToken, outputToken, amount, slippage }: Quote) => {
    console.log("starting getQuote");

    // 1. Fetch tokens only if not already cached
    if (!cachedTokens || !tokenMap) {
        console.log("Fetching all tokens from API for the first time...");
        try {
            const allResponse = await axios.get("https://lite-api.jup.ag/tokens/v1/all");
            // Convert the object of tokens (keyed by address) to an array of token objects
            const tokensData = Object.values(allResponse.data);

            // Populate the map for direct symbol lookup
            tokenMap = new Map<string, any>();
            tokensData.forEach((token: any) => {
                tokenMap?.set(token.symbol, token);
            });

            // Sort the array if you still want to use binary search for some reason
            // However, with the map, binary search becomes redundant for direct symbol lookups.
            // Keeping it here for completeness if you have other search needs.
            cachedTokens = tokensData.sort((a: any, b: any) =>
                a.symbol.localeCompare(b.symbol)
            );
            console.log("Tokens cached successfully.");
        } catch (error) {
            console.error("Failed to fetch token list:", error);
            throw new Error("Could not fetch token list from Jupiter API.");
        }
    } else {
        console.log("Using cached tokens.");
    }

    // 2. Use the cached data for lookup
    const inputMint = tokenMap?.get(inputToken);
    const outputMint = tokenMap?.get(outputToken);

    if (!inputMint) {
        throw new Error(`Input token with symbol ${inputToken} not found in cache.`);
    }
    if (!outputMint) {
        throw new Error(`Output token with symbol ${outputToken} not found in cache.`);
    }

    const lamports = Math.floor(amount * Math.pow(10, inputMint.decimals));

    const quoteUrl = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${inputMint.address}&outputMint=${outputMint.address}&amount=${lamports}&slippageBps=${slippage*100}&restrictIntermediateTokens=true`;

    const quoteResponse = (await axios.get(quoteUrl)).data;
    console.log("Quote Response:\n", JSON.stringify(quoteResponse, null, 2));
    return {quoteResponse,outputDecimalValue:outputMint.decimals};
};

// Example Usage:
// getQuote({ inputToken: "SOL", outputToken: "USDT", amount: 0.1, slippage: 50 })
//   .then(quote => console.log("Quote fetched:", quote))
//   .catch(error => console.error("Error:", error.message));

// Call it multiple times to see caching in action:
// setTimeout(() => {
//     getQuote({ inputToken: "ETH", outputToken: "USDC", amount: 0.5, slippage: 50 });
// }, 2000);