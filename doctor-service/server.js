const express=require("express");

const app=express();

app.get("/doctors",(req,res)=>{
res.json([
  {
    id:1,
    name:"Dr Smith"
  }
]);
});

app.listen(5002);