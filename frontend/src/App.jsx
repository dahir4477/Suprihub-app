import { useState } from "react";

const initialForm = {
  name: "",
  email: "",
  message: ""
};

function App() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", text: "" });
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Submission failed");
      }

      setStatus({ type: "success", text: payload.message });
      setForm(initialForm);
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="container">
      <h1>Dispatch Request Form</h1>
      <p>Submit requests to the dispatch backend API.</p>

      <form className="dispatch-form" onSubmit={onSubmit}>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          value={form.name}
          onChange={onChange}
          required
          maxLength={100}
        />

        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          required
          maxLength={255}
        />

        <label htmlFor="message">Message / Request</label>
        <textarea
          id="message"
          name="message"
          value={form.message}
          onChange={onChange}
          required
          maxLength={2000}
          rows={5}
        />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </form>

      {status.text && (
        <div className={`status ${status.type}`} role="status">
          {status.text}
        </div>
      )}
    </main>
  );
}

export default App;
