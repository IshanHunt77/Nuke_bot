import { Connection, PublicKey } from "@solana/web3.js";
import axios from "axios"

export const getBalance = async(address:String)=>{
    try{
        const connection = new Connection("https://solana-mainnet.g.alchemy.com/v2/2Z-oKEpyJ0uxd4L827Yqrkg7m1nm9g_Y","confirmed");
        const publicKey = new PublicKey(address)
        const balance = await connection.getBalance(publicKey)
        return balance
    }catch(e:any){
        console.log("Error fetching balance:",e);
    }
}