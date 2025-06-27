import { GoogleGenerativeAI } from "@google/generative-ai";

interface Quote {
    amount:number;
    inputToken:string;
    outputToken:string;
    slippage:number
}

export const getQuote = async({inputToken,outputToken,amount,slippage}:Quote)=>{
    //convert tokens to symbols using gemini
    const genAI = new GoogleGenerativeAI(process.env.API_KEY || '');
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

        const prompt = `Give address of the tokens ${inputToken},${outputToken}, just the address like
        1.
        2.
        Give the response in this order`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text(); 

        const MintAddress_Tokens = text
          .split('\n')
          .map((line:string) => line.trim().replace(/^\d+\.\s*/, '')) 
          .filter((name:string) => name);

    const quoteUrl =
      `https://lite-api.jup.ag/swap/v1/quote?inputMint=${MintAddress_Tokens[0]}&outputMint=${MintAddress_Tokens[1]}&amount=${amount}&slippageBps=${slippage}&restrictIntermediateTokens=true`;

    const quoteResponse = (await axios.get(quoteUrl)).data;
    console.log("Quote Response:\n", JSON.stringify(quoteResponse, null, 2));
    return quoteResponse;
}