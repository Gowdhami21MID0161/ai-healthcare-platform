const express=require("express");

const app=express();

app.get("/patients",(req,res)=>{
  res.json([
    {id:1,name:"John"},
    {id:2,name:"Sara"}
  ]);
});

app.listen(5001);