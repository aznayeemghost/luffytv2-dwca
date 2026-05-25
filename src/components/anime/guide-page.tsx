"use client";

import { useState } from "react";
import { useAppStore } from "./store";

/* ─── FAQ data ─── */
const faqs = [
  {
    q: "How do I start watching anime on Luffy TV?",
    a: "Simply click the 'Watch Now' button on the homepage or navbar. You can browse our full catalog of anime series, movies, and TV shows without creating an account. Just pick what you want to watch and hit play — it's completely free with zero ads.",
    category: "Getting Started",
  },
  {
    q: "Is Luffy TV really free? Are there hidden fees?",
    a: "Yes, Luffy TV is 100% free with no hidden fees, no credit card required, and no premium tiers. We support ourselves through non-intrusive methods that never interrupt your viewing experience. You will never see a single ad while watching content on our platform.",
    category: "Getting Started",
  },
  {
    q: "What video quality is available?",
    a: "Luffy TV supports streaming up to 4K resolution. The player automatically adjusts quality based on your internet connection to ensure smooth playback. You can also manually select your preferred quality from 480p up to 4K if your connection supports it.",
    category: "Playback",
  },
  {
    q: "Can I watch anime with subtitles or dubbed?",
    a: "Absolutely! We offer both subbed and dubbed versions for most popular anime. You can switch between subtitle languages and audio tracks directly from the video player. We support over 20 subtitle languages including English, Spanish, French, Portuguese, and more.",
    category: "Playback",
  },
  {
    q: "How do I use the bookmark feature?",
    a: "While browsing or watching any anime, click the bookmark icon (heart symbol) to save it to your bookmarks. Access your bookmarked shows anytime from the Bookmarks page. Your bookmarks are stored locally in your browser, so they persist across sessions without needing an account.",
    category: "Features",
  },
  {
    q: "Does Luffy TV work on mobile devices?",
    a: "Yes! Luffy TV is fully responsive and works great on phones, tablets, and desktops. We also have a dedicated mobile navigation bar at the bottom of the screen for easy access on smaller devices. The video player is optimized for touch controls and mobile streaming.",
    category: "Features",
  },
  {
    q: "How do I search for a specific anime?",
    a: "Click the search icon in the navbar or use the keyboard shortcut Ctrl+K (Cmd+K on Mac) to open the search. Type the anime name in English or Japanese and we'll show you matching results from our catalog instantly.",
    category: "Features",
  },
  {
    q: "What is the Watch Together feature?",
    a: "Watch Together allows you to create synchronized viewing rooms where you and your friends can watch the same anime at the same time. Playback is synced so everyone sees the same scene simultaneously, and you can chat in real-time while watching.",
    category: "Features",
  },
  {
    q: "How do I report a broken episode or video?",
    a: "If you encounter a broken episode or video that won't load, please visit our Contact page and submit a report. Include the anime name, episode number, and a brief description of the issue. We typically fix broken links within 24 hours.",
    category: "Support",
  },
  {
    q: "Can I download anime for offline viewing?",
    a: "Currently, Luffy TV is a streaming-only platform and does not support offline downloads. However, we're working on adding a download feature in a future update. Stay tuned for announcements on our Contact page.",
    category: "Support",
  },
];

/* ─── Quick steps data ─── */
const quickSteps = [
  {
    step: 1,
    title: "Browse",
    desc: "Explore thousands of anime, movies, and TV shows in our ever-growing catalog",
    gradient: "from-violet-500/20 to-purple-600/20",
    borderColor: "border-violet-500/20",
    iconColor: "text-violet-400",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    step: 2,
    title: "Select",
    desc: "Pick any title, check episodes, ratings, synopsis, and pick right where you left off",
    gradient: "from-blue-500/20 to-cyan-500/20",
    borderColor: "border-blue-500/20",
    iconColor: "text-blue-400",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    step: 3,
    title: "Watch",
    desc: "Stream in up to 4K quality with zero ads, zero interruptions — totally free",
    gradient: "from-emerald-500/20 to-teal-500/20",
    borderColor: "border-emerald-500/20",
    iconColor: "text-emerald-400",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

/* ─── Feature highlights ─── */
const features = [
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    title: "4K Streaming",
    desc: "Crystal clear quality up to 4K resolution",
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth={2} />
      </svg>
    ),
    title: "Zero Ads",
    desc: "No interruptions, no pop-ups, ever",
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    title: "Bookmarks",
    desc: "Save favorites and pick up anytime",
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    title: "Sub & Dub",
    desc: "20+ subtitle languages and dubs",
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    ),
    title: "Mobile Ready",
    desc: "Works perfectly on any screen size",
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Watch Together",
    desc: "Sync rooms with friends in real-time",
  },
];

/* ─── Category colors ─── */
const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  "Getting Started": { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  "Playback": { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  "Features": { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20" },
  "Support": { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
};

/* ─── Accordion Item ─── */
function AccordionItem({ q, a, category, isOpen, onClick, index }: {
  q: string; a: string; category: string; isOpen: boolean; onClick: () => void; index: number;
}) {
  const colors = categoryColors[category] || categoryColors["Features"];
  return (
    <div
      className={`relative border rounded-2xl overflow-hidden transition-all duration-500 ${
        isOpen
          ? `${colors.border} bg-white/[0.04] shadow-[0_0_30px_rgba(124,108,240,0.06)]`
          : "border-white/[0.05] bg-white/[0.01] hover:border-white/[0.1] hover:bg-white/[0.02]"
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <button
        onClick={onClick}
        className="w-full flex items-start gap-4 px-6 py-5 text-left group"
      >
        <div className={`shrink-0 mt-0.5 px-2.5 py-1 rounded-lg ${colors.bg} ${colors.border} border`}>
          <span className={`text-[10px] font-bold tracking-wide uppercase ${colors.text}`}>
            {category}
          </span>
        </div>
        <span
          className="text-[15px] font-semibold text-white/85 group-hover:text-white transition-colors leading-relaxed flex-1"
          style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
        >
          {q}
        </span>
        <div className={`shrink-0 mt-1 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
          isOpen ? "bg-[#7c6cf0]/20 rotate-180" : "bg-white/[0.04] group-hover:bg-white/[0.08]"
        }`}>
          <svg
            className={`w-3.5 h-3.5 transition-colors duration-300 ${isOpen ? "text-[#7c6cf0]" : "text-white/30"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="px-6 pb-5 pl-[4.5rem]">
          <div className="w-full h-px bg-gradient-to-r from-white/[0.06] via-white/[0.1] to-white/[0.06] mb-4" />
          <p
            className="text-[14px] text-white/50 leading-[1.8] font-normal"
            style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
          >
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Guide Page ─── */
export default function GuidePage() {
  const navigate = useAppStore(s => s.navigate);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [searchFaq, setSearchFaq] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = ["All", ...Array.from(new Set(faqs.map(f => f.category)))];

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.q.toLowerCase().includes(searchFaq.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchFaq.toLowerCase());
    const matchesCategory = !activeCategory || activeCategory === "All" || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen pb-16">
      {/* Hero Section with gradient background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-[#7c6cf0]/[0.07] blur-[120px]" />
          <div className="absolute top-20 right-1/4 w-[400px] h-[400px] rounded-full bg-[#4CC9F0]/[0.05] blur-[100px]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        </div>
        <div className="relative pt-16 pb-12 px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#7c6cf0]/40" />
            <div className="px-4 py-1.5 rounded-full border border-[#7c6cf0]/20 bg-[#7c6cf0]/[0.08]">
              <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-[#7c6cf0]" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                Help Center
              </span>
            </div>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#7c6cf0]/40" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
            How to Use{" "}
            <span className="bg-gradient-to-r from-[#8B5CF6] via-[#A78BFA] to-[#4CC9F0] bg-clip-text text-transparent">Luffy TV</span>
          </h1>
          <p className="text-[15px] text-white/40 max-w-lg mx-auto leading-relaxed" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
            Everything you need to know about streaming anime on Luffy TV. Free, ad-free, and effortless — just the way it should be.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 space-y-14">
        {/* GET STARTED IN 3 STEPS */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#7c6cf0]/10 border border-[#7c6cf0]/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#7c6cf0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>Get Started in 3 Steps</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {quickSteps.map((step, i) => (
              <div key={step.step} className={`relative rounded-2xl border ${step.borderColor} bg-gradient-to-br ${step.gradient} p-6 group hover:scale-[1.02] transition-all duration-300`}>
                <div className="absolute -top-3 -right-2 w-9 h-9 rounded-full bg-[#0a0a14] border border-white/[0.08] flex items-center justify-center">
                  <span className="text-[13px] font-bold text-[#7c6cf0]">{step.step}</span>
                </div>
                <div className={`mb-4 ${step.iconColor} group-hover:scale-110 transition-transform duration-300`}>{step.icon}</div>
                <h3 className="text-base font-bold text-white mb-2" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>{step.title}</h3>
                <p className="text-[13px] text-white/40 leading-relaxed" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>{step.desc}</p>
                {i < 2 && <div className="hidden sm:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-white/[0.1] to-white/[0.03]" />}
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <button onClick={() => navigate({ page: "watchnow" })} className="group relative inline-flex items-center gap-3 px-8 py-3.5 rounded-full text-[14px] font-bold uppercase tracking-wider bg-[#7c6cf0] text-white hover:bg-[#6b5ce0] transition-all duration-300 hover:shadow-[0_0_30px_rgba(124,108,240,0.35)]" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              Start Watching Now
            </button>
          </div>
        </section>

        {/* FEATURES OVERVIEW */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#4CC9F0]/10 border border-[#4CC9F0]/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#4CC9F0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
            </div>
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>What You Get</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {features.map((feat, i) => (
              <div key={i} className="group rounded-2xl border border-white/[0.05] bg-white/[0.01] p-5 hover:bg-white/[0.03] hover:border-white/[0.1] transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-[#7c6cf0]/10 border border-[#7c6cf0]/15 flex items-center justify-center text-[#7c6cf0] mb-3 group-hover:scale-110 group-hover:bg-[#7c6cf0]/15 transition-all duration-300">{feat.icon}</div>
                <h4 className="text-[14px] font-bold text-white/90 mb-1" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>{feat.title}</h4>
                <p className="text-[12px] text-white/35 leading-relaxed" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ SECTION */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            </div>
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4 mb-6">
            <div className="relative max-w-lg">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input type="text" value={searchFaq} onChange={e => setSearchFaq(e.target.value)} placeholder="Search questions..." className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[14px] text-white placeholder-white/25 outline-none focus:border-[#7c6cf0]/40 focus:bg-white/[0.04] transition-all duration-300" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }} />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(activeCategory === cat ? null : cat)} className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide uppercase transition-all duration-300 border ${(activeCategory === cat || (!activeCategory && cat === "All")) ? "bg-[#7c6cf0]/15 border-[#7c6cf0]/30 text-[#7c6cf0]" : "bg-white/[0.02] border-white/[0.06] text-white/35 hover:text-white/60 hover:border-white/[0.12]"}`} style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>{cat}</button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-white/[0.04] bg-white/[0.01]">
                <svg className="w-12 h-12 text-white/10 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <p className="text-sm text-white/25">No matching questions found.</p>
                <p className="text-[12px] text-white/15 mt-1">Try a different search term or category.</p>
              </div>
            ) : filteredFaqs.map((faq, i) => (
              <AccordionItem key={`${faq.q}-${i}`} q={faq.q} a={faq.a} category={faq.category} isOpen={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)} index={i} />
            ))}
          </div>
        </section>

        {/* STILL NEED HELP */}
        <section>
          <div className="relative rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-[#7c6cf0]/[0.06] blur-[80px]" />
              <div className="absolute bottom-0 left-0 w-[200px] h-[200px] rounded-full bg-[#4CC9F0]/[0.04] blur-[60px]" />
            </div>
            <div className="relative p-8 text-center space-y-4">
              <div className="flex justify-center mb-2">
                <div className="w-12 h-12 rounded-2xl bg-[#7c6cf0]/10 border border-[#7c6cf0]/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#7c6cf0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                </div>
              </div>
              <h3 className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>Still need help?</h3>
              <p className="text-[14px] text-white/40 max-w-sm mx-auto leading-relaxed" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>Can't find what you're looking for? Our team is here to help. Reach out and we'll get back to you within 24 hours.</p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button onClick={() => navigate({ page: "contact" })} className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[13px] font-bold uppercase tracking-wider bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.1] hover:border-white/[0.15] transition-all duration-300" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  Contact Us
                </button>
                <button onClick={() => navigate({ page: "home" })} className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[13px] font-bold uppercase tracking-wider bg-[#7c6cf0]/10 border border-[#7c6cf0]/20 text-[#7c6cf0] hover:bg-[#7c6cf0]/20 transition-all duration-300" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                  Back Home
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
