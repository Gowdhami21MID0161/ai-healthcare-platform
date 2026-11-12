const express=require("express");

const app=express();
app.use(express.json({limit:"16kb"}));

app.get("/",(req,res)=>{
  res.send("API Gateway Running");
});

const services={
  patients:process.env.PATIENT_SERVICE_URL||"http://localhost:5001",
  doctors:process.env.DOCTOR_SERVICE_URL||"http://localhost:5002",
  appointments:process.env.APPOINTMENT_SERVICE_URL||"http://localhost:5003",
};

async function forwardJson(req,res,url,body){
  try{
    const response=await fetch(url,{
      method:req.method,
      headers:body?{"Content-Type":"application/json"}:undefined,
      body:body?JSON.stringify(body):undefined,
    });
    const responseBody=await response.text();
    res.status(response.status);
    if(responseBody) res.type("application/json").send(responseBody);
    else res.end();
  }catch(error){
    console.error(`Service request failed for ${req.method} ${url}:`,error.message);
    res.status(502).json({error:"The service is unavailable. Check that it is running and try again."});
  }
}

app.get("/doctors",(req,res)=>{
  forwardJson(req,res,`${services.doctors}/doctors`);
});

app.get("/appointments",(req,res)=>{
  forwardJson(req,res,`${services.appointments}/appointments`);
});

app.post("/appointments",async(req,res)=>{
  const {patientName,doctorId,date,time}=req.body||{};
  if(typeof patientName!=="string"||!Number.isSafeInteger(doctorId)||
      typeof date!=="string"||typeof time!=="string"){
    return res.status(400).json({error:"Enter your name and choose a doctor, date, and time."});
  }

  try{
    const doctorsResponse=await fetch(`${services.doctors}/doctors`);
    if(!doctorsResponse.ok){
      throw new Error(`Doctors service returned HTTP ${doctorsResponse.status}`);
    }
    const doctors=await doctorsResponse.json();
    const doctor=doctors.find((item)=>item.id===doctorId);
    if(!doctor){
      return res.status(400).json({error:"That doctor is not in the current directory. Refresh and choose again."});
    }
    return forwardJson(req,res,`${services.appointments}/appointments`,{
      patientName,
      doctorId,
      doctorName:doctor.name,
      date,
      time,
    });
  }catch(error){
    console.error("Could not validate appointment doctor:",error.message);
    return res.status(502).json({error:"Could not check the doctor directory. Please try again."});
  }
});

app.patch("/appointments/:id/cancel",(req,res)=>{
  forwardJson(req,res,`${services.appointments}/appointments/${req.params.id}/cancel`);
});

app.get("/dashboard",async(req,res)=>{
  const entries=Object.entries(services);
  const results=await Promise.allSettled(entries.map(async([key,baseUrl])=>{
    const response=await fetch(`${baseUrl}/${key}/count`);
    if(!response.ok){
      throw new Error(`${key} service returned HTTP ${response.status}`);
    }

    const data=await response.json();
    if(!Number.isSafeInteger(data.count)||data.count<0){
      throw new Error(`${key} service returned an invalid count`);
    }

    return [key,data.count];
  }));
  const counts={patients:null,doctors:null,appointments:null};
  const unavailable=[];

  results.forEach((result,index)=>{
    const [key]=entries[index];
    if(result.status==="fulfilled"){
      counts[key]=result.value[1];
    }else{
      console.error(`Dashboard count unavailable for ${key}:`,result.reason.message);
      unavailable.push(key);
    }
  });

  res.json({counts,unavailable});
});

app.post("/chat",async(req,res)=>{
  const aiServiceUrl=process.env.AI_SERVICE_URL||"http://localhost:5004";

  try{
    const response=await fetch(`${aiServiceUrl}/chat`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(req.body),
    });
    const data=await response.json();
    res.status(response.status).json(data);
  }catch(error){
    console.error("AI service request failed:",error.message);
    res.status(502).json({
      error:"Could not reach the AI service. Check that it is running and try again.",
    });
  }
});

app.listen(process.env.PORT||8080,()=>{
  console.log(`API Gateway Running on port ${process.env.PORT||8080}`);
});