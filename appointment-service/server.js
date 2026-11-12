const express=require("express");

const app=express();

app.get("/appointments",(req,res)=>{
res.json([
 {
  doctor:"Dr Smith",
  time:"10 AM"
 }
]);
});

app.listen(5003,()=>{
 console.log("Appointment Service Running");
});