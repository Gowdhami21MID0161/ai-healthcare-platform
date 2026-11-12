const express=require("express");

const app=express();
const db=require("./db");

app.get("/patients",(req,res)=>{
  const patients=db.prepare("SELECT * FROM patients").all();
  res.json(patients);
});

app.get("/patients/count",(req,res)=>{
  const {count}=db.prepare("SELECT COUNT(*) AS count FROM patients").get();
  res.json({count});
});

app.listen(5001);