import { useEffect, useState } from "react";
import "./App.css";

const appointmentTimes = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00"];
const initialMessages = [
  {
    role: "assistant",
    content:
      "I can answer general health and wellness questions. Tell me what you would like to know. I cannot diagnose or replace a healthcare professional.",
  },
];

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function getJson(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error(
      "Could not connect to the backend. Start the API gateway and services, then refresh.",
      { cause: error }
    );
  }

  const responseText = await response.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    throw new Error(
      `The backend returned an invalid response (HTTP ${response.status}). Check that the API gateway and services are running.`
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.error || `The backend request failed (HTTP ${response.status}).`
    );
  }
  if (data === null) {
    throw new Error("The backend returned an empty response. Please try again.");
  }
  return data;
}

async function fetchCareData(signal) {
  const [doctorResult, appointmentResult] = await Promise.allSettled([
    getJson("/api/doctors", { signal }),
    getJson("/api/appointments", { signal }),
  ]);
  if (signal?.aborted) throw new DOMException("Request aborted", "AbortError");

  const doctors =
    doctorResult.status === "fulfilled" && Array.isArray(doctorResult.value)
      ? doctorResult.value
      : null;
  const appointments =
    appointmentResult.status === "fulfilled" &&
    Array.isArray(appointmentResult.value)
      ? appointmentResult.value
      : null;
  const errors = [];
  if (doctors === null) errors.push("Could not load doctors.");
  if (appointments === null) errors.push("Could not load appointments.");

  return {
    doctors,
    appointments,
    error: errors.length
      ? `${errors.join(" ")} Make sure the API gateway and related services are running, then refresh.`
      : "",
  };
}

function App() {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serviceError, setServiceError] = useState("");
  const [booking, setBooking] = useState({
    patientName: "",
    doctorId: "",
    date: "",
    time: "",
  });
  const [bookingError, setBookingError] = useState("");
  const [bookingNotice, setBookingNotice] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [chatError, setChatError] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function loadCareData(signal) {
    setServiceError("");
    try {
      const data = await fetchCareData(signal);
      if (data.doctors) setDoctors(data.doctors);
      if (data.appointments) setAppointments(data.appointments);
      setServiceError(data.error);
    } catch (error) {
      if (error.name !== "AbortError") setServiceError(error.message);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    fetchCareData(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data.doctors) setDoctors(data.doctors);
        if (data.appointments) setAppointments(data.appointments);
        setServiceError(data.error);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setServiceError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  function refreshCareData() {
    setIsLoading(true);
    loadCareData();
  }

  const selectedDoctor = doctors.find(
    (doctor) => String(doctor.id) === booking.doctorId
  );
  const bookedTimes = appointments
    .filter(
      (appointment) =>
        appointment.doctorId === Number(booking.doctorId) &&
        appointment.date === booking.date
    )
    .map((appointment) => appointment.time);
  const availableTimes = appointmentTimes.filter((time) => !bookedTimes.includes(time));

  async function submitAppointment(event) {
    event.preventDefault();
    setBookingError("");
    setBookingNotice("");
    setIsBooking(true);

    try {
      const appointment = await getJson("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...booking,
          doctorId: Number(booking.doctorId),
        }),
      });
      setBookingNotice(
        `Appointment booked with ${appointment.doctorName} for ${new Date(
          `${appointment.date}T${appointment.time}`
        ).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}.`
      );
      setBooking({
        patientName: "",
        doctorId: "",
        date: "",
        time: "",
      });
      setIsLoading(true);
      await loadCareData();
    } catch (error) {
      setBookingError(error.message);
    } finally {
      setIsBooking(false);
    }
  }

  async function cancelAppointment(id) {
    try {
      await getJson(`/api/appointments/${id}/cancel`, { method: "PATCH" });
      setAppointments((current) => current.filter((item) => item.id !== id));
      setBookingNotice("Appointment cancelled.");
      setBookingError("");
    } catch (error) {
      setBookingError(error.message);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    const question = message.trim();
    if (!question || isSending) return;

    const previousMessages = messages;
    setMessages((current) => [...current, { role: "user", content: question }]);
    setMessage("");
    setChatError("");
    setIsSending(true);

    try {
      const data = await getJson("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          history: previousMessages.slice(-10),
        }),
      });
      if (typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("The assistant returned an empty answer. Please try again.");
      }
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.reply },
      ]);
    } catch (error) {
      setChatError(error.message);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Careline home">
          <span className="brand-mark" aria-hidden="true">+</span>
          <span>Careline<span className="brand-dot">.</span></span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#doctors">Find a doctor</a>
          <a href="#appointments">Appointments</a>
          <a href="#assistant">Ask the assistant</a>
        </nav>
        <span className="demo-label"><span /> DEMO HEALTH PORTAL</span>
      </header>

      <section className="welcome">
        <p className="eyebrow">WELCOME TO CARELINE</p>
        <h1>Care starts with a clear next step.</h1>
        <p className="welcome-copy">
          Browse a sample care team, book a demo appointment, keep track of your
          bookings, or ask the AI assistant a general health question.
        </p>
        <div className="welcome-actions">
          <a className="primary-link" href="#book-appointment">Book an appointment</a>
          <a className="secondary-link" href="#assistant">Ask a health question <span aria-hidden="true">→</span></a>
        </div>
      </section>

      <section className="care-section" id="doctors" aria-labelledby="doctors-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MEET THE CARE TEAM</p>
            <h2 id="doctors-title">Choose a doctor</h2>
          </div>
          <div className="section-controls">
            <span className="section-count">
              {isLoading ? "Loading..." : `${doctors.length} sample providers`}
            </span>
            <button type="button" className="refresh-button" onClick={refreshCareData} disabled={isLoading}>
              Refresh
            </button>
          </div>
        </div>
        {serviceError && <p className="service-error" role="alert">{serviceError}</p>}
        {!isLoading && !serviceError && doctors.length === 0 && (
          <p className="empty-state">No doctors are listed right now. Please try refreshing.</p>
        )}
        <div className="doctor-grid">
          {doctors.map((doctor, index) => (
            <article className="doctor-card" key={doctor.id}>
              <div className={`doctor-avatar doctor-avatar-${index % 3}`} aria-hidden="true">
                {doctor.name.split(" ").filter((part) => part.endsWith(".") || /^[A-Z]/.test(part))
                  .slice(0, 2).map((part) => part.replace(".", "")[0]).join("")}
              </div>
              <div className="doctor-details">
                <p className="doctor-specialty">{doctor.specialty}</p>
                <h3>{doctor.name}</h3>
                <p className="doctor-location">{doctor.location || "Demo clinic"}</p>
              </div>
              <a
                className="book-doctor-link"
                href="#book-appointment"
                onClick={() =>
                  setBooking((current) => ({ ...current, doctorId: String(doctor.id) }))
                }
              >
                Choose <span aria-hidden="true">→</span>
              </a>
            </article>
          ))}
        </div>
      </section>

      <div className="booking-layout">
        <section className="booking-card" id="book-appointment" aria-labelledby="booking-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">STEP 1 · REQUEST A VISIT</p>
              <h2 id="booking-title">Book an appointment</h2>
            </div>
            <span className="step-number">01</span>
          </div>
          <p className="section-description">
            Choose a provider and a demo time. Your booking will appear in the
            appointments list.
          </p>
          <form className="booking-form" onSubmit={submitAppointment}>
            <label>
              Your name
              <input
                type="text"
                autoComplete="name"
                minLength="2"
                maxLength="100"
                placeholder="e.g. Alex"
                value={booking.patientName}
                onChange={(event) =>
                  setBooking((current) => ({ ...current, patientName: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Doctor
              <select
                value={booking.doctorId}
                onChange={(event) =>
                  setBooking((current) => ({
                    ...current,
                    doctorId: event.target.value,
                    time: "",
                  }))
                }
                required
              >
                <option value="">Select a doctor</option>
                {doctors.map((doctor) => (
                  <option value={doctor.id} key={doctor.id}>
                    {doctor.name} · {doctor.specialty}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                Date
                <input
                  type="date"
                  min={localDateString()}
                  value={booking.date}
                  onChange={(event) =>
                    setBooking((current) => ({ ...current, date: event.target.value, time: "" }))
                  }
                  required
                />
              </label>
              <label>
                Time
                <select
                  value={booking.time}
                  onChange={(event) =>
                    setBooking((current) => ({ ...current, time: event.target.value }))
                  }
                  disabled={!selectedDoctor || !booking.date || availableTimes.length === 0}
                  required
                >
                  <option value="">
                    {!selectedDoctor || !booking.date
                      ? "Choose doctor and date"
                      : availableTimes.length
                        ? "Select a time"
                        : "No times left"}
                  </option>
                  {availableTimes.map((time) => (
                    <option value={time} key={time}>
                      {new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {bookingError && <p className="form-message form-error" role="alert">{bookingError}</p>}
            {bookingNotice && <p className="form-message form-success" role="status">{bookingNotice}</p>}
            <button className="submit-button" type="submit" disabled={isBooking || isLoading}>
              {isBooking ? "Booking..." : "Confirm demo appointment"}
            </button>
          </form>
        </section>

        <section className="appointments-card" id="appointments" aria-labelledby="appointments-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">STEP 2 · YOUR BOOKINGS</p>
              <h2 id="appointments-title">Appointments</h2>
            </div>
            <span className="appointment-count">
              {appointments.length} upcoming
            </span>
          </div>
          <p className="section-description">
            Appointments you book in this demo will show up here.
          </p>
          {isLoading ? (
            <p className="empty-state">Loading your appointments...</p>
          ) : appointments.length === 0 ? (
            <div className="empty-appointments">
              <span className="empty-calendar" aria-hidden="true">□</span>
              <h3>No appointments yet</h3>
              <p>Once you book a visit, you’ll see the details here.</p>
              <a href="#book-appointment">Book your first appointment <span aria-hidden="true">→</span></a>
            </div>
          ) : (
            <div className="appointment-list">
              {appointments.map((appointment) => (
                <article className="appointment-item" key={appointment.id}>
                  <div className="appointment-date">
                    <span>
                      {new Date(`${appointment.date}T12:00:00`).toLocaleDateString([], {
                        month: "short",
                      })}
                    </span>
                    <strong>
                      {new Date(`${appointment.date}T12:00:00`).getDate()}
                    </strong>
                  </div>
                  <div className="appointment-info">
                    <h3>{appointment.doctorName}</h3>
                    <p>{appointment.patientName}</p>
                    <p>
                      {new Date(`${appointment.date}T${appointment.time}`).toLocaleString([], {
                        weekday: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <button
                    className="cancel-button"
                    type="button"
                    onClick={() => cancelAppointment(appointment.id)}
                    aria-label={`Cancel appointment with ${appointment.doctorName}`}
                  >
                    Cancel
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="assistant-card" id="assistant" aria-labelledby="assistant-title">
        <div className="assistant-heading">
          <div className="assistant-avatar" aria-hidden="true">AI</div>
          <div>
            <p className="eyebrow">STEP 3 · ASK A QUESTION</p>
            <h2 id="assistant-title">Health information assistant</h2>
          </div>
          <span className="online-indicator"><span /> AI-powered</span>
        </div>
        <div className="assistant-intro">
          <p>Ask in your own words. For example:</p>
          <div className="question-suggestions">
            {["What can cause a fever?", "How can I prepare for an appointment?"].map((question) => (
              <button
                type="button"
                key={question}
                onClick={() => setMessage(question)}
                disabled={isSending}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
        <div className="chat-messages" aria-live="polite">
          {messages.map((item, index) => (
            <div className={`message-row message-${item.role}`} key={`${item.role}-${index}`}>
              {item.role === "assistant" && (
                <span className="message-avatar" aria-hidden="true">AI</span>
              )}
              <p className="message-bubble">{item.content}</p>
            </div>
          ))}
          {isSending && (
            <div className="message-row message-assistant">
              <span className="message-avatar" aria-hidden="true">AI</span>
              <p className="message-bubble typing-indicator">Preparing an answer...</p>
            </div>
          )}
        </div>
        <form className="chat-form" onSubmit={sendMessage}>
          <label className="sr-only" htmlFor="chat-message">Your question</label>
          <textarea
            id="chat-message"
            rows="2"
            maxLength="2000"
            placeholder="Type a health or wellness question..."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            disabled={isSending}
          />
          <button type="submit" disabled={!message.trim() || isSending}>
            {isSending ? "Sending..." : "Ask"}
          </button>
        </form>
        <div className="chat-footer">
          {chatError ? (
            <p className="chat-error" role="alert">{chatError}</p>
          ) : (
            <p>AI can make mistakes. Don’t include personal details; verify health advice with a clinician.</p>
          )}
          <span>{message.length}/2000</span>
        </div>
      </section>

      <footer className="page-footer">
        <span>Careline · Healthcare appointment demo</span>
        <span>For emergencies, contact your local emergency services.</span>
      </footer>
    </main>
  );
}

export default App;
