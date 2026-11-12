const express=require("express");
const cors=require("cors");

const app=express();

app.use(cors());

app.get("/analyze",(req,res)=>{

  const symptom=(req.query.symptom || "").toLowerCase();

  let result="Consult a doctor.";

  if(symptom.includes("fever"))
  {
    result="Possible Viral Fever";
  }

  if(symptom.includes("cough"))
  {
    result="Possible Cold";
  }

  if(symptom.includes("headache"))
  {
    result="Possible Migraine";
  }

  res.json({
    result
  });
});

app.listen(5004,()=>{
  console.log("AI Service Running");
});