export const getSwapTransaction =async ({quoteResponse}:any)=>{
    try{
    const swapRes = await axios.post("https://lite-api.jup.ag/swap/v1/swap", {
      quoteResponse,
      userPublicKey: wallet.publicKey.toString(),//get public key from db
    });

    const swapTransaction = swapRes.data.swapTransaction;
    const transactionBuf = Buffer.from(swapTransaction, "base64");
    const transaction = VersionedTransaction.deserialize(transactionBuf);
    return transaction;
    }catch(e:any){
        console.log("Error in Swap Transaction:",e);
    }
}