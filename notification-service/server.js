const express=require("express");

const app=express();

app.get("/notifications",(req,res)=>{
res.json([
{
message:"Appointment Reminder"
}
]);
});

app.listen(5005,()=>{
 console.log("Notification Service Running");
});