export const signTransaction =async ({connection,transaction}:any)=>{
    try{

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
    }catch(e:any){
        console.log("Error in signing Transaction:",e);
    }
}