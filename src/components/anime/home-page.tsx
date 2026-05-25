"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "./store";

/* ─── Scroll reveal observer hook ─── */
function useLunarReveal() {
  useEffect(() => {
    const sections = document.querySelectorAll(".lunar-section");
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("lunar-visible");
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);
}

/* ─── Hero Mascot SVG (open eyes with sparkle) ─── */
function HeroMascot({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Crescent moon */}
      <path d="M25 100 C25 55, 100 25, 110 65 C115 82, 105 105, 70 110 C42 114, 25 110, 25 100Z" fill="#7c6cf0" opacity="0.15"/>
      <path d="M35 97 C35 60, 95 35, 103 68 C107 80, 98 100, 68 105 C44 108, 35 105, 35 97Z" fill="#7c6cf0" opacity="0.22"/>
      {/* Cat body */}
      <ellipse cx="68" cy="74" rx="20" ry="18" fill="#e8e6f0"/>
      {/* Cat head */}
      <circle cx="68" cy="55" r="16" fill="#e8e6f0"/>
      {/* Cat ears */}
      <path d="M54 46 L49 26 L60 42 Z" fill="#e8e6f0"/>
      <path d="M82 46 L87 26 L76 42 Z" fill="#e8e6f0"/>
      <path d="M55 45 L51 29 L60 42 Z" fill="#d4c8f0"/>
      <path d="M81 45 L85 29 L76 42 Z" fill="#d4c8f0"/>
      {/* Open eyes with sparkle */}
      <ellipse cx="62" cy="52" rx="3.5" ry="4" fill="#2d1b69"/>
      <ellipse cx="74" cy="52" rx="3.5" ry="4" fill="#2d1b69"/>
      <circle cx="63.5" cy="50.5" r="1.2" fill="#fff"/>
      <circle cx="75.5" cy="50.5" r="1.2" fill="#fff"/>
      <circle cx="61" cy="53" r="0.6" fill="#fff" opacity="0.5"/>
      <circle cx="73" cy="53" r="0.6" fill="#fff" opacity="0.5"/>
      {/* Nose */}
      <ellipse cx="68" cy="57" rx="1.8" ry="1.2" fill="#d4a0c0"/>
      {/* Mouth */}
      <path d="M66 59 Q68 61 70 59" stroke="#c4a0c0" strokeWidth="0.8" fill="none"/>
      {/* Whiskers */}
      <line x1="52" y1="56" x2="61" y2="57" stroke="#c4b8d8" strokeWidth="0.7"/>
      <line x1="52" y1="59" x2="61" y2="58" stroke="#c4b8d8" strokeWidth="0.7"/>
      <line x1="75" y1="57" x2="84" y2="56" stroke="#c4b8d8" strokeWidth="0.7"/>
      <line x1="75" y1="58" x2="84" y2="59" stroke="#c4b8d8" strokeWidth="0.7"/>
      {/* Tail */}
      <path d="M88 74 Q100 65, 96 52 Q94 46, 92 48" stroke="#d4c8f0" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      {/* Sparkle near ear */}
      <path d="M90 30 L91 27 L92 30 L95 31 L92 32 L91 35 L90 32 L87 31 Z" fill="#7c6cf0" opacity="0.6"/>
    </svg>
  );
}

/* ─── CTA Mascot SVG (smaller, open eyes) ─── */
function CTAMascot({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 68 C18 38, 72 18, 80 45 C84 58, 76 72, 50 76 C30 78, 18 76, 18 68Z" fill="#7c6cf0" opacity="0.15"/>
      <ellipse cx="48" cy="50" rx="14" ry="12" fill="#e8e6f0"/>
      <circle cx="48" cy="38" r="11" fill="#e8e6f0"/>
      <path d="M38 32 L35 18 L43 28 Z" fill="#e8e6f0"/>
      <path d="M58 32 L61 18 L53 28 Z" fill="#e8e6f0"/>
      <path d="M39 31 L36 21 L44 28 Z" fill="#d4c8f0"/>
      <path d="M57 31 L60 21 L52 28 Z" fill="#d4c8f0"/>
      <ellipse cx="44" cy="36" rx="2.5" ry="3" fill="#2d1b69"/>
      <ellipse cx="52" cy="36" rx="2.5" ry="3" fill="#2d1b69"/>
      <circle cx="45" cy="35" r="0.9" fill="#fff"/>
      <circle cx="53" cy="35" r="0.9" fill="#fff"/>
      <ellipse cx="48" cy="39.5" rx="1.2" ry="0.8" fill="#d4a0c0"/>
      <line x1="36" y1="38" x2="42" y2="39" stroke="#c4b8d8" strokeWidth="0.6"/>
      <line x1="54" y1="39" x2="60" y2="38" stroke="#c4b8d8" strokeWidth="0.6"/>
      <path d="M62 50 Q72 44, 70 36" stroke="#d4c8f0" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

/* ─── Star positions (deterministic) ─── */
const stars = [
  { left: "8%", top: "15%", dur: "2.8s", delay: "0s" },
  { left: "22%", top: "25%", dur: "3.2s", delay: "0.5s" },
  { left: "45%", top: "10%", dur: "4s", delay: "1s" },
  { left: "65%", top: "20%", dur: "3.5s", delay: "1.5s" },
  { left: "80%", top: "8%", dur: "2.5s", delay: "0.3s" },
  { left: "15%", top: "60%", dur: "3.8s", delay: "2s" },
  { left: "35%", top: "70%", dur: "3s", delay: "0.8s" },
  { left: "55%", top: "55%", dur: "4.2s", delay: "1.2s" },
  { left: "75%", top: "65%", dur: "2.9s", delay: "2.5s" },
  { left: "90%", top: "45%", dur: "3.6s", delay: "0.7s" },
  { left: "5%", top: "40%", dur: "3.3s", delay: "1.8s" },
  { left: "50%", top: "35%", dur: "4.5s", delay: "2.2s" },
  { left: "30%", top: "50%", dur: "2.7s", delay: "0.2s" },
  { left: "70%", top: "80%", dur: "3.1s", delay: "1.4s" },
  { left: "85%", top: "30%", dur: "3.9s", delay: "0.9s" },
];

/* ─── Ticker anime names ─── */
const tickerItems = [
  "Naruto ナルト",
  "Jujutsu Kaisen 呪術廻戦",
  "One Piece ワンピース",
  "Demon Slayer 鬼滅の刃",
  "Attack on Titan 進撃の巨人",
  "My Hero Academia 僕のヒーローアカデミア",
  "Spy × Family スパイファミリー",
  "Chainsaw Man チェンソーマン",
  "Dragon Ball ドラゴンボール",
  "Bleach ブリーチ",
  "Death Note デスノート",
  "Fullmetal Alchemist 鋼の錬金術師",
  "Hunter × Hunter ハンター×ハンター",
  "One Punch Man ワンパンマン",
];

/* ─── Animated count-up hook ─── */
function useCountUp(target: number, duration: number = 2000, started: boolean = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!started) { setCount(0); return; }
    let start = 0;
    const startTime = performance.now();
    // Ease-out cubic for satisfying deceleration
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic: fast start, slow finish
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      setCount(current);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [started, target, duration]);

  return count;
}

/* ─── CountUp display component ─── */
function CountUpValue({ target, suffix, duration, started }: {
  target: number; suffix?: string; duration?: number; started: boolean;
}) {
  const count = useCountUp(target, duration || 2000, started);
  const formatted = count.toLocaleString();
  return <>{formatted}{suffix || ""}</>;
}

/* ─── Stats data ─── */
const stats = [
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#7c6cf0" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
    ),
    targetValue: 10000,
    suffix: "+",
    label: "ANIME SERIES",
    color: "#7c6cf0",
    duration: 2500,
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#4a9eff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
        <line x1="7" y1="2" x2="7" y2="22" />
        <line x1="17" y1="2" x2="17" y2="22" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="2" y1="7" x2="7" y2="7" />
        <line x1="2" y1="17" x2="7" y2="17" />
        <line x1="17" y1="7" x2="22" y2="7" />
        <line x1="17" y1="17" x2="22" y2="17" />
      </svg>
    ),
    targetValue: 5000,
    suffix: "+",
    label: "MOVIES",
    color: "#4a9eff",
    duration: 2200,
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#2dd4a0" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    ),
    targetValue: 0,
    suffix: "",
    displayText: "Zero",
    label: "ADS",
    color: "#2dd4a0",
    duration: 800,
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#e05c9c" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    targetValue: 4,
    suffix: "K",
    label: "MAX QUALITY",
    color: "#e05c9c",
    duration: 1500,
  },
];

/* ─── Features data ─── */
const features = [
  {
    icon: (
      <svg className="w-5 h-5 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Watch Together",
    desc: "Synchronized playback rooms with friends in real-time",
  },
  {
    icon: (
      <svg className="w-5 h-5 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: "Live Chat & Comments",
    desc: "Real-time chat and community discussions while watching",
  },
  {
    icon: (
      <svg className="w-5 h-5 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    title: "Full Customization",
    desc: "Avatars, themes, profiles, and personalized watchlists",
  },
  {
    icon: (
      <svg className="w-5 h-5 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h18v18H3z" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    ),
    title: "Guilds & Community",
    desc: "Join guilds, create rooms, and build your anime circle",
  },
  {
    icon: (
      <svg className="w-5 h-5 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    title: "Multi-Language",
    desc: "Subtitles in 20+ languages for global accessibility",
  },
  {
    icon: (
      <svg className="w-5 h-5 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    title: "Cross-Device Sync",
    desc: "Seamless experience across phone, tablet, and desktop",
  },
];

/* ─── Breakdown data ─── */
const breakdowns = [
  {
    title: "Social",
    color: "#7c6cf0",
    items: ["Watch parties with friends", "Live comments & reactions", "Community rooms & guilds", "Friends system & profiles"],
  },
  {
    title: "Personal",
    color: "#4a9eff",
    items: ["Custom avatars & themes", "XP leveling & achievements", "Watch history & resume", "Smart recommendations"],
  },
  {
    title: "Technical",
    color: "#2dd4a0",
    items: ["4K streaming quality", "Fast adaptive loading", "Multiple server options", "Cross-platform support"],
  },
];

/* ─── Stats section with count-up animation ─── */
function StatsSection() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect(); // Only trigger once
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="lunar-section py-20 px-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="lunar-stat-card flex flex-col items-center gap-3">
            <div className="flex items-center justify-center">{stat.icon}</div>
            <span
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white"
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              {stat.displayText ? (
                <span className={visible ? "lunar-count-pop" : "opacity-0"}>{stat.displayText}</span>
              ) : (
                <CountUpValue target={stat.targetValue} suffix={stat.suffix} duration={stat.duration} started={visible} />
              )}
            </span>
            <span
              className="text-[10px] font-bold tracking-[0.1em] uppercase text-white/25"
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN HOME PAGE COMPONENT — LunarAnime Landing Page
   ═══════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const navigate = useAppStore(s => s.navigate);
  useLunarReveal();

  return (
    <>
      {/* ══════════════════════════════════════════
          PERSISTENT BG: Floating blue/teal nebula orbs
          Amorphous, blurred, drifting shapes that
          float across the entire page background.
          Rendered as a FIXED sibling so it stays
          behind all scrollable content.
          ══════════════════════════════════════════ */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Large teal-blue orb — upper left */}
        <div
          className="lunar-orb"
          style={{
            left: "-5%", top: "8%",
            width: 500, height: 400,
            background: "radial-gradient(ellipse, rgba(20,120,180,0.14) 0%, rgba(10,80,140,0.06) 45%, transparent 75%)",
            filter: "blur(80px)",
            "--orb-dur": "14s", "--orb-delay": "0s",
          } as React.CSSProperties}
        />
        {/* Cyan-teal orb — center right */}
        <div
          className="lunar-orb"
          style={{
            right: "-8%", top: "35%",
            width: 450, height: 350,
            background: "radial-gradient(ellipse, rgba(10,160,190,0.12) 0%, rgba(6,100,150,0.05) 45%, transparent 75%)",
            filter: "blur(90px)",
            "--orb-dur": "18s", "--orb-delay": "2s",
          } as React.CSSProperties}
        />
        {/* Deep blue orb — lower left */}
        <div
          className="lunar-orb"
          style={{
            left: "10%", bottom: "15%",
            width: 550, height: 400,
            background: "radial-gradient(ellipse, rgba(30,60,160,0.12) 0%, rgba(15,30,100,0.05) 45%, transparent 75%)",
            filter: "blur(85px)",
            "--orb-dur": "16s", "--orb-delay": "4s",
          } as React.CSSProperties}
        />
        {/* Small teal accent — upper right */}
        <div
          className="lunar-orb"
          style={{
            right: "15%", top: "5%",
            width: 300, height: 250,
            background: "radial-gradient(ellipse, rgba(15,180,200,0.10) 0%, rgba(8,120,160,0.04) 45%, transparent 75%)",
            filter: "blur(70px)",
            "--orb-dur": "20s", "--orb-delay": "1s",
          } as React.CSSProperties}
        />
        {/* Blue-purple mix — center */}
        <div
          className="lunar-orb"
          style={{
            left: "40%", top: "55%",
            width: 400, height: 350,
            background: "radial-gradient(ellipse, rgba(60,80,180,0.10) 0%, rgba(40,50,140,0.04) 45%, transparent 75%)",
            filter: "blur(75px)",
            "--orb-dur": "22s", "--orb-delay": "3s",
          } as React.CSSProperties}
        />
        {/* Teal accent — bottom right */}
        <div
          className="lunar-orb"
          style={{
            right: "5%", bottom: "10%",
            width: 350, height: 300,
            background: "radial-gradient(ellipse, rgba(10,140,170,0.11) 0%, rgba(5,90,130,0.04) 45%, transparent 75%)",
            filter: "blur(80px)",
            "--orb-dur": "17s", "--orb-delay": "5s",
          } as React.CSSProperties}
        />
      </div>

      {/* Content sits above the fixed orbs */}
      <div className="relative z-[1]" style={{ marginTop: -75 }}>

      {/* ══════════════════════════════════════════
          SECTION 1: HERO — Video Behind Text Effect
          LunarAnime-style: video plays through the
          "LUFFY TV" letters using mix-blend-mode
          ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ minHeight: "100vh" }}>
        {/* ─── Layer 0: Video Background ─── */}
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          src="/hero-bg.mp4"
        />

        {/* ─── Layer 1: Purple glow behind text ─── */}
        <div
          className="absolute top-[32%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full pointer-events-none z-[1]"
          style={{ background: "radial-gradient(ellipse, rgba(124,108,240,0.18) 0%, rgba(109,93,252,0.08) 40%, transparent 70%)", filter: "blur(60px)" }}
        />

        {/* ─── Layer 2: TEXT MASK — mix-blend-multiply ───
            Black bg × video = black (hides video)
            White text × video = video (shows video through letters)
            Constrained to upper portion only to avoid overlapping tagline */}
        <div className="absolute inset-0 z-[2] mix-blend-multiply bg-[#050507] flex items-start justify-center pt-[22vh]">
          <div className="relative">
            {/* The title — white text shows the video through */}
            <h1
              className="font-black tracking-tight text-white leading-none select-none hero-video-text"
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace", fontSize: "clamp(48px, 12vw, 160px)" }}
            >
              LUFFY TV
            </h1>
            {/* Light sweep across the text */}
            <div className="hero-light-sweep" />
          </div>
        </div>

        {/* ─── Layer 3: Edge gradients — smooth blending ─── */}
        <div className="absolute inset-0 z-[3] pointer-events-none">
          {/* Top fade */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#050507] to-transparent" />
          {/* Bottom fade — stronger for content area */}
          <div className="absolute bottom-0 left-0 right-0 h-72 bg-gradient-to-t from-[#050507] via-[#050507]/80 to-transparent" />
          {/* Side vignettes */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,#050507_100%)]" />
        </div>

        {/* ─── Layer 4: Stars — subtle twinkling ─── */}
        <div className="absolute inset-0 z-[4] pointer-events-none">
          {stars.map((star, i) => (
            <div
              key={i}
              className="lunar-star"
              style={{
                left: star.left,
                top: star.top,
                "--twinkle-dur": star.dur,
                "--twinkle-delay": star.delay,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* ─── Layer 5: Subtitle, Description & CTA ───
            Positioned in the bottom 35% of the hero, with enough
            spacing from the LUFFY TV text above to avoid overlap */}
        <div className="absolute bottom-0 left-0 right-0 z-[5] text-center pb-24 px-6">
          {/* Eyebrow */}
          <div className="lunar-fade-in-up lunar-delay-1 flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8 bg-white/15" />
            <span
              className="text-[11px] font-bold tracking-[0.12em] uppercase text-white/45"
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              Free · Ad-Free · Always
            </span>
            <div className="h-px w-8 bg-white/15" />
          </div>

          {/* Subtitle */}
          <h2
            className="lunar-fade-in-up lunar-delay-3 font-bold text-white/70 mb-3"
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace", fontSize: "clamp(18px, 3vw, 36px)" }}
          >
            Your Anime Universe
          </h2>

          {/* Description */}
          <p
            className="lunar-fade-in-up lunar-delay-4 text-[14px] text-white/40 leading-relaxed mx-auto mb-7"
            style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif", maxWidth: 460 }}
          >
            Stream thousands of anime series in up to 4K with zero ads. Watch together with friends, chat in real-time, and build your anime community.
          </p>

          {/* CTA Buttons */}
          <div className="lunar-fade-in-up lunar-delay-5 flex flex-wrap items-center justify-center gap-4">
            <button className="lunar-btn-primary" onClick={() => navigate({ page: "watchnow" })}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              Start Watching Free
            </button>
            <button className="lunar-btn-ghost" onClick={() => navigate({ page: "watchnow" })}>
              Browse Catalog
            </button>
          </div>
        </div>

        {/* ─── Scroll indicator ─── */}
        <div className="lunar-fade-in-up lunar-delay-7 absolute bottom-4 left-1/2 -translate-x-1/2 z-[5] flex flex-col items-center gap-2">
          <div className="w-6 h-9 rounded-full border-2 border-white/10 flex items-start justify-center pt-2">
            <div className="w-1 h-2 rounded-full bg-white/30 lunar-scroll-dot" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 2: ANIME TICKER STRIPE
          Scrolling marquee of popular anime titles
          with Japanese text — placed right below hero
          ══════════════════════════════════════════ */}
      <div className="w-full overflow-hidden bg-white/[0.015] border-y border-white/[0.06]">
        <div className="lunar-ticker-track py-3">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-3 px-4 text-[13px] text-white/45 whitespace-nowrap"
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              {item}
              <span className="text-white/15">•</span>
            </span>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SECTION 3: STATS — 4 cards with count-up
          ══════════════════════════════════════════ */}
      <StatsSection />

      {/* DIVIDER */}
      <div className="lunar-divider max-w-5xl mx-auto" />

      {/* ══════════════════════════════════════════
          SECTION 4: FEATURES — 6 cards in 3-col grid
          ══════════════════════════════════════════ */}
      <section id="features-section" className="lunar-section py-20 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2
            className="text-2xl sm:text-3xl font-bold text-white mb-3"
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            Everything you need
          </h2>
          <p
            className="text-sm text-white/45 max-w-md mx-auto"
            style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
          >
            Built for anime fans by anime fans. All the features you wish every streaming platform had.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feat) => (
            <div key={feat.title} className="lunar-feature-card">
              <div className="mb-4 flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.04]">
                {feat.icon}
              </div>
              <h3
                className="text-sm font-bold text-white mb-2"
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
              >
                {feat.title}
              </h3>
              <p
                className="text-[13px] text-white/45 leading-relaxed"
                style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
              >
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* DIVIDER */}
      <div className="lunar-divider max-w-5xl mx-auto" />

      {/* ══════════════════════════════════════════
          SECTION 5: FEATURE BREAKDOWN — 3 cards
          ══════════════════════════════════════════ */}
      <section className="lunar-section py-20 px-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {breakdowns.map((col) => (
            <div key={col.title} className="lunar-breakdown-card">
              <h3
                className="text-sm font-bold mb-5"
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace", color: col.color }}
              >
                {col.title}
              </h3>
              <ul className="space-y-3">
                {col.items.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke={col.color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span
                      className="text-[13px] text-white/45 leading-relaxed"
                      style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
                    >
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* DIVIDER */}
      <div className="lunar-divider max-w-5xl mx-auto" />

      {/* ══════════════════════════════════════════
          SECTION 6: CTA — "Ready to dive in?"
          ══════════════════════════════════════════ */}
      <section className="lunar-section py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          {/* CTA Mascot */}
          <div className="lunar-mascot-float-slow mb-6 flex justify-center">
            <CTAMascot className="w-20 h-16 sm:w-24 sm:h-20" />
          </div>

          <h2
            className="text-3xl sm:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            Ready to dive in?
          </h2>
          <p
            className="text-[15px] text-white/45 mb-8 max-w-md mx-auto"
            style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
          >
            Join thousands of anime fans streaming their favorite shows for free. No ads, no sign-up required.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button className="lunar-btn-primary" onClick={() => navigate({ page: "watchnow" })}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              Start Watching Free
            </button>
            <button className="lunar-btn-ghost" onClick={() => navigate({ page: "watchnow" })}>
              Browse Catalog
            </button>
          </div>
        </div>
      </section>
      </div>
    </>
  );
}
