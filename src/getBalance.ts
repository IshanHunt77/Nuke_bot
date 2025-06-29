import axios from "axios"

export const getBalance = (address:String)=>{
    try{
        const balance = axios.get("solana/url");
        return balance.result.value
    }catch(e:any){
        console.log("Error fetching balance:",e);
    }
}