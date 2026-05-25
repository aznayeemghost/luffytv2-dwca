"use client";

import { useState } from "react";
import { useAppStore } from "./store";

export default function ContactPage() {
  const navigate = useAppStore(s => s.navigate);
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would send to an API
    setSubmitted(true);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="lunar-fade-in-up lunar-delay-1 flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8 bg-white/15" />
            <span
              className="text-[11px] font-bold tracking-[0.12em] uppercase text-white/35"
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              Get in touch
            </span>
            <div className="h-px w-8 bg-white/15" />
          </div>

          <h1
            className="lunar-fade-in-up lunar-delay-2 text-3xl sm:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            Contact Us
          </h1>

          <p
            className="lunar-fade-in-up lunar-delay-3 text-[15px] text-white/40 max-w-md mx-auto"
            style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
          >
            Have a question, suggestion, or just want to say hi? We would love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Info cards */}
          <div className="lg:col-span-2 space-y-4">
            {[
              {
                icon: (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#7c6cf0" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                ),
                title: "Email",
                value: "support@luffytv.app",
                color: "#7c6cf0",
              },
              {
                icon: (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#4a9eff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                  </svg>
                ),
                title: "Discord",
                value: "Join our community",
                color: "#4a9eff",
              },
              {
                icon: (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#2dd4a0" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                  </svg>
                ),
                title: "Twitter / X",
                value: "@LuffyTVOfficial",
                color: "#2dd4a0",
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className="lunar-fade-in-up flex items-start gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors"
                style={{ animationDelay: `${0.4 + i * 0.1}s`, animationFillMode: "both" }}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h3
                    className="text-sm font-bold text-white mb-0.5"
                    style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-[13px] text-white/40"
                    style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
                  >
                    {item.value}
                  </p>
                </div>
              </div>
            ))}

            {/* FAQ hint */}
            <div
              className="lunar-fade-in-up p-5 rounded-2xl bg-[#7c6cf0]/[0.04] border border-[#7c6cf0]/10"
              style={{ animationDelay: "0.7s", animationFillMode: "both" }}
            >
              <h3
                className="text-sm font-bold text-[#7c6cf0] mb-2"
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
              >
                Quick Answers
              </h3>
              <p
                className="text-[13px] text-white/35 leading-relaxed"
                style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
              >
                Is Luffy TV free? Yes, completely free with zero ads. No sign-up required to start watching. We support 4K streaming on all devices.
              </p>
            </div>
          </div>

          {/* Right: Contact form */}
          <div className="lg:col-span-3">
            {submitted ? (
              <div className="lunar-fade-in-up flex flex-col items-center justify-center py-16 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="w-16 h-16 rounded-full bg-[#2dd4a0]/10 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-[#2dd4a0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3
                  className="text-xl font-bold text-white mb-2"
                  style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
                >
                  Message Sent!
                </h3>
                <p
                  className="text-[14px] text-white/40 mb-6 max-w-xs"
                  style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
                >
                  Thanks for reaching out. We will get back to you as soon as possible.
                </p>
                <button
                  onClick={() => navigate({ page: "home" })}
                  className="lunar-btn-primary"
                >
                  Back to Home
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="lunar-fade-in-up space-y-5 p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
                style={{ animationDelay: "0.3s", animationFillMode: "both" }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-[11px] font-bold tracking-wider uppercase text-white/30 mb-2"
                      style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
                    >
                      Name
                    </label>
                    <input
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your name"
                      className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#7c6cf0]/30 focus:bg-white/[0.04] transition-all"
                      style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-[11px] font-bold tracking-wider uppercase text-white/30 mb-2"
                      style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
                    >
                      Email
                    </label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your@email.com"
                      className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#7c6cf0]/30 focus:bg-white/[0.04] transition-all"
                      style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="block text-[11px] font-bold tracking-wider uppercase text-white/30 mb-2"
                    style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
                  >
                    Subject
                  </label>
                  <input
                    required
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="What is this about?"
                    className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#7c6cf0]/30 focus:bg-white/[0.04] transition-all"
                    style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
                  />
                </div>

                <div>
                  <label
                    className="block text-[11px] font-bold tracking-wider uppercase text-white/30 mb-2"
                    style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
                  >
                    Message
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us what's on your mind..."
                    className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#7c6cf0]/30 focus:bg-white/[0.04] transition-all resize-none"
                    style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
                  />
                </div>

                <button type="submit" className="lunar-btn-primary w-full justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
