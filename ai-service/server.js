const express=require("express");
const cors=require("cors");

const app=express();

app.use(cors());
app.use(express.json({limit:"16kb"}));

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

app.post("/chat",async(req,res)=>{
  const {message,history=[]}=req.body||{};
  if(typeof message!=="string"||!message.trim()){
    return res.status(400).json({error:"Enter a question before sending."});
  }
  if(message.length>2000){
    return res.status(400).json({error:"Questions must be 2000 characters or fewer."});
  }
  if(!Array.isArray(history)){
    return res.status(400).json({error:"Conversation history must be a list."});
  }
  if(!process.env.OPENAI_API_KEY){
    return res.status(503).json({
      error:"Chat is not configured. Set OPENAI_API_KEY in the AI service environment and restart it.",
    });
  }

  const conversation=history.slice(-10).filter((item)=>
    item&&
    (item.role==="user"||item.role==="assistant")&&
    typeof item.content==="string"&&
    item.content.length<=2000
  );
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),30000);

  try{
    const response=await fetch(
      process.env.OPENAI_CHAT_COMPLETIONS_URL||
        "https://api.openai.com/v1/chat/completions",
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body:JSON.stringify({
          model:process.env.OPENAI_MODEL||"gpt-4o-mini",
          messages:[
            {
              role:"system",
              content:"You are a helpful health-information assistant in a healthcare appointment demo. Answer the user's actual question directly in plain language. Provide general education, not a diagnosis or personalized treatment; do not prescribe medication or invent facts. If important details are missing, say what is uncertain and ask a brief follow-up question. Recommend a qualified clinician for personal medical decisions. If symptoms may indicate an immediate emergency, advise contacting local emergency services now. This app's doctors and appointment slots are demo data; never claim that a real appointment has been made or that you can see a user's records.",
            },
            ...conversation,
            {role:"user",content:message.trim()},
          ],
        }),
        signal:controller.signal,
      }
    );

    if(!response.ok){
      console.error(`Chat provider returned HTTP ${response.status}`);
      return res.status(502).json({
        error:`The configured AI provider returned HTTP ${response.status}. Check the model settings and API key.`,
      });
    }

    const data=await response.json();
    const reply=data.choices?.[0]?.message?.content;
    if(typeof reply!=="string"||!reply.trim()){
      console.error("Chat provider returned no assistant message");
      return res.status(502).json({
        error:"The configured AI provider returned an empty answer. Please try again.",
      });
    }

    return res.json({reply:reply.trim()});
  }catch(error){
    if(error.name==="AbortError"){
      return res.status(504).json({error:"The assistant took too long to respond. Please try again."});
    }
    console.error("Chat provider request failed:",error.message);
    return res.status(502).json({
      error:"Could not reach the configured AI provider. Check the service connection and try again.",
    });
  }finally{
    clearTimeout(timeout);
  }
});

const port=process.env.PORT||5004;
app.listen(port,()=>{
  console.log(`AI Service Running on port ${port}`);
});