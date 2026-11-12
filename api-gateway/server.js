const express=require("express");

const app=express();

app.get("/",(req,res)=>{
res.send("API Gateway Running");
});

app.listen(8080,()=>{
 console.log("API Gateway Running");
});