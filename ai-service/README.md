# Local healthcare portal demo

## What this demo does

- The doctor service returns a small **sample** directory. Replace it with
  real clinic-provider data before using this as a real healthcare service.
- The appointment service saves demo bookings in its local SQLite database
  (`appointment-service/appointments.db`). It supports listing, booking, and
  cancelling appointments. The sample time slots are not connected to a
  clinic's real calendar.
- The AI assistant uses an OpenAI-compatible chat-completions provider. It
  answers general questions, but AI output can be inaccurate and is not a
  diagnosis or a substitute for clinical care.

This demo has no login or patient-specific access control. Its appointment
list is shared by anyone using the running demo. Do not enter real patient
information or use it to manage actual care.

## Configure the AI assistant

Set the provider key in the AI service's environment, not in frontend code or
committed files:

```powershell
$env:OPENAI_API_KEY = "your-api-key"
$env:OPENAI_MODEL = "gpt-4o-mini"
npm start
```

`OPENAI_API_KEY` is required. `OPENAI_MODEL` defaults to `gpt-4o-mini`.
To use another compatible provider, set `OPENAI_CHAT_COMPLETIONS_URL` to its
full chat-completions endpoint. It must accept the standard
`/chat/completions` request and return `choices[0].message.content`.

Without a valid key and provider configuration, the chat displays an explicit
configuration error instead of pretending to generate an answer.

## Run locally

Start each service in its own terminal from the project root:

```powershell
npm --prefix doctor-service start
npm --prefix appointment-service start
npm --prefix ai-service start
npm --prefix api-gateway start
npm --prefix frontend run dev
```

The appointment SQLite database is created on first start. The gateway expects
the doctor, appointment, and AI services on ports 5002, 5003, and 5004. Set
`DOCTOR_SERVICE_URL`, `APPOINTMENT_SERVICE_URL`, and `AI_SERVICE_URL` if they
run elsewhere. If the gateway uses a different port, set
`VITE_API_PROXY_TARGET` before starting the frontend.
