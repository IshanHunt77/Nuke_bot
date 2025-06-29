import { SimulateTransactionConfig, VersionedTransaction } from "@solana/web3.js";
import axios from "axios";

export const signTransaction =async ({connection,quoteResponse,wallet}:any)=>{
    try{
      const swapRes = await axios.post("https://lite-api.jup.ag/swap/v1/swap", {
      quoteResponse,
      userPublicKey: wallet.publicKey.toString(),//get public key from db
    });

    const swapTransaction = swapRes.data.swapTransaction;
    const transactionBuf = Buffer.from(swapTransaction, "base64");
    const transaction = VersionedTransaction.deserialize(transactionBuf);
        transaction.sign([wallet.payer]);//get payer from db

    const latestBlockhash = await connection.getLatestBlockhash();

    // 4. Serialize and send the transaction
    const rawTransaction = transaction.serialize();
    const signature = await connection.sendRawTransaction(rawTransaction, {
      maxRetries: 2,
      skipPreflight: true,
    });

    // 5. Confirm the transaction
    await connection.confirmTransaction({
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      signature,
    });

    console.log(`Transaction successful! ✅`);
    console.log(`View on Solscan: https://solscan.io/tx/${signature}`);
    return signature;
    }catch(e:any){
        console.log("Error in signing Transaction:",e);
    }
}
