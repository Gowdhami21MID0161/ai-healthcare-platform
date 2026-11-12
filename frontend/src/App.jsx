import { useState } from "react";
import "./App.css";

function App() {
  const [symptom,setSymptom]=useState("");
  const [result,setResult]=useState("");

  async function analyze(){
    const res = await fetch(
      `http://localhost:5004/analyze?symptom=${symptom}`
    );

    const data = await res.json();
    setResult(data.result);
  }

  return (
    <div className="container">

      <div className="navbar">
        <h1>🏥 AI Healthcare Assistant</h1>
      </div>

      <div className="cards">
        <div className="card">
          <h2>240</h2>
          <p>Patients</p>
        </div>

        <div className="card">
          <h2>50</h2>
          <p>Doctors</p>
        </div>

        <div className="card">
          <h2>120</h2>
          <p>Appointments</p>
        </div>
      </div>

      <div className="chatbox">
          <h2>🤖 AI Symptom Analyzer</h2>

          <textarea
            rows="5"
            placeholder="Enter symptoms..."
            onChange={(e)=>setSymptom(e.target.value)}
          />

          <button onClick={analyze}>
            Analyze Symptoms
          </button>

          <h3>{result}</h3>
      </div>

    </div>
  );
}

export default App;