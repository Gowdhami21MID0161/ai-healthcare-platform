const express=require("express");
const db=require("./db");

const app=express();
const allowedTimes=new Set(["09:00","10:00","11:00","13:00","14:00","15:00"]);

app.use(express.json({limit:"16kb"}));

app.get("/appointments",(req,res)=>{
  const appointments=db.prepare(`
    SELECT id, patient_name AS patientName, doctor_id AS doctorId,
           doctor_name AS doctorName, appointment_date AS date,
           appointment_time AS time, status
    FROM appointments
    WHERE status='booked'
      AND datetime(appointment_date || ' ' || appointment_time) >= datetime('now','localtime')
    ORDER BY appointment_date, appointment_time
  `).all();
  res.json(appointments);
});

app.get("/appointments/count",(req,res)=>{
  const {count}=db.prepare(`
    SELECT COUNT(*) AS count
    FROM appointments
    WHERE status='booked'
      AND datetime(appointment_date || ' ' || appointment_time) >= datetime('now','localtime')
  `).get();
  res.json({count});
});

app.post("/appointments",(req,res)=>{
  const {patientName,doctorId,doctorName,date,time}=req.body||{};
  if(typeof patientName!=="string"||patientName.trim().length<2||patientName.trim().length>100){
    return res.status(400).json({error:"Enter a name between 2 and 100 characters."});
  }
  if(!Number.isSafeInteger(doctorId)||doctorId<1||
      typeof doctorName!=="string"||!doctorName.trim()||doctorName.length>100){
    return res.status(400).json({error:"Choose a valid doctor."});
  }
  if(typeof date!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(date)){
    return res.status(400).json({error:"Choose a valid appointment date."});
  }
  const [year,month,day]=date.split("-").map(Number);
  const calendarDate=new Date(year,month-1,day);
  if(calendarDate.getFullYear()!==year||calendarDate.getMonth()!==month-1||
      calendarDate.getDate()!==day){
    return res.status(400).json({error:"Choose a valid appointment date."});
  }
  if(typeof time!=="string"||!allowedTimes.has(time)){
    return res.status(400).json({error:"Choose an available appointment time."});
  }

  const appointmentDateTime=new Date(`${date}T${time}:00`);
  if(Number.isNaN(appointmentDateTime.getTime())||appointmentDateTime<=new Date()){
    return res.status(400).json({error:"Choose a future appointment time."});
  }

  try{
    const result=db.prepare(`
      INSERT INTO appointments
        (patient_name,doctor_id,doctor_name,appointment_date,appointment_time)
      VALUES
        (@patientName,@doctorId,@doctorName,@date,@time)
    `).run({
      patientName:patientName.trim(),
      doctorId,
      doctorName:doctorName.trim(),
      date,
      time,
    });
    const appointment=db.prepare(`
      SELECT id, patient_name AS patientName, doctor_id AS doctorId,
             doctor_name AS doctorName, appointment_date AS date,
             appointment_time AS time, status
      FROM appointments WHERE id=?
    `).get(result.lastInsertRowid);
    return res.status(201).json(appointment);
  }catch(error){
    if(error.code==="SQLITE_CONSTRAINT_UNIQUE"){
      return res.status(409).json({error:"That doctor is already booked at this time. Choose another slot."});
    }
    console.error("Could not save appointment:",error.message);
    return res.status(500).json({error:"Could not save the appointment. Please try again."});
  }
});

app.patch("/appointments/:id/cancel",(req,res)=>{
  const id=Number(req.params.id);
  if(!Number.isSafeInteger(id)||id<1){
    return res.status(400).json({error:"Invalid appointment id."});
  }
  const result=db.prepare(`
    UPDATE appointments
    SET status='cancelled'
    WHERE id=? AND status='booked'
  `).run(id);
  if(result.changes===0){
    return res.status(404).json({error:"Appointment not found or already cancelled."});
  }
  return res.json({id,status:"cancelled"});
});

app.listen(process.env.PORT||5003,()=>{
  console.log(`Appointment Service Running on port ${process.env.PORT||5003}`);
});
