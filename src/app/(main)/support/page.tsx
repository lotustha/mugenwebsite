"use client";

import { useState, FormEvent } from "react";

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setStatus("success");
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <span className="inline-block font-body text-secondary text-sm font-medium uppercase tracking-wider mb-2">
            Help
          </span>
          <h1 className="font-headline text-4xl font-bold text-text-main mb-8 tracking-tight">
            Contact Support
          </h1>

          {status === "success" ? (
            <div className="bg-surface p-6 rounded-lg text-center">
              <p className="font-body text-primary text-lg">
                Thank you for contacting us! We'll get back to you soon.
              </p>
              <button
                onClick={() => setStatus("idle")}
                className="mt-4 font-body text-text-main hover:text-primary"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block font-body text-text-main mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-surface border border-outline-variant/15 rounded font-body text-text-main focus:outline-none focus:border-primary/50"
                />
              </div>

              <div>
                <label htmlFor="email" className="block font-body text-text-main mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-surface border border-outline-variant/15 rounded font-body text-text-main focus:outline-none focus:border-primary/50"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block font-body text-text-main mb-2">
                  Subject
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-surface border border-outline-variant/15 rounded font-body text-text-main focus:outline-none focus:border-primary/50"
                >
                  <option value="">Select a subject</option>
                  <option value="general">General Inquiry</option>
                  <option value="bug">Bug Report</option>
                  <option value="account">Account Issue</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block font-body text-text-main mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full px-4 py-3 bg-surface border border-outline-variant/15 rounded font-body text-text-main focus:outline-none focus:border-primary/50 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full py-3 bg-primary hover:bg-primary-dim disabled:opacity-50 font-heading font-semibold text-surface rounded transition-colors"
              >
                {status === "loading" ? "Sending..." : "Send Message"}
              </button>

              {status === "error" && (
                <p className="font-body text-red-500 text-center">
                  Failed to send message. Please try again.
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}