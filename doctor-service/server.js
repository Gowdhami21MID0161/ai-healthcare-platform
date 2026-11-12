const express=require("express");

const app=express();
const doctors=[
  {
    id:1,
    name:"Dr. Taylor Morgan",
    specialty:"Family medicine",
    location:"Demo clinic"
  },
  {
    id:2,
    name:"Dr. Jordan Lee",
    specialty:"Pediatrics",
    location:"Demo clinic"
  },
  {
    id:3,
    name:"Dr. Casey Patel",
    specialty:"Dermatology",
    location:"Demo clinic"
  }
];

app.get("/doctors",(req,res)=>{
  res.json(doctors);
});

app.get("/doctors/count",(req,res)=>{
  res.json({count:doctors.length});
});

app.listen(process.env.PORT||5002,()=>{
  console.log(`Doctor Service Running on port ${process.env.PORT||5002}`);
});