"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "./store";

// ============================================================
// NOVEL READER PAGE — Full reading experience with AI TTS
// Features:
// - Beautiful reading layout with customizable fonts/sizes
// - AI Text-to-Speech with play/pause/speed/voice controls
// - Chapter navigation (prev/next)
// - Dark/Light/Sepia reading themes
// - Progress tracking
// ============================================================

interface NovelReaderProps {
  novelId: string;
  novelTitle: string;
  chapterId: string;
  chapterNum: number;
  chapterTitle: string;
  totalChapters: number;
  novelSource: string;
}

// Reading themes
const themes = {
  dark: { bg: "#0a0a0f", text: "#e2e2e8", subtle: "#8888a0", name: "Dark" },
  light: { bg: "#ffffff", text: "#1a1a2e", subtle: "#666680", name: "Light" },
  sepia: { bg: "#f4ecd8", text: "#5b4636", subtle: "#8b7b6b", name: "Sepia" },
  amoled: { bg: "#000000", text: "#c0c0d0", subtle: "#606080", name: "AMOLED" },
  purple: { bg: "#0d0a14", text: "#d4c8f0", subtle: "#7c6ca0", name: "Purple" },
};

type ThemeKey = keyof typeof themes;

// Font options
const fontOptions = [
  { id: "serif", name: "Serif", family: "Georgia, 'Times New Roman', serif" },
  { id: "sans", name: "Sans", family: "'Inter', -apple-system, sans-serif" },
  { id: "mono", name: "Mono", family: "'Space Mono', 'Courier New', monospace" },
  { id: "lora", name: "Lora", family: "Lora, Georgia, serif" },
];

export default function NovelReaderPage({
  novelId, novelTitle, chapterId, chapterNum, chapterTitle, totalChapters, novelSource
}: NovelReaderProps) {
  const navigate = useAppStore(s => s.navigate);

  // Content state
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Reader settings
  const [theme, setTheme] = useState<ThemeKey>("dark");
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [fontFamily, setFontFamily] = useState(fontOptions[0]);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showTTS, setShowTTS] = useState(false);

  // TTS state
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState(1);
  const [ttsVoice, setTtsVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ttsProgress, setTtsProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Fetch chapter content
  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/novel/read?novelId=${encodeURIComponent(novelId)}&chapterId=${encodeURIComponent(chapterId)}&chapterNum=${chapterNum}`
        );
        if (!res.ok) throw new Error(`Failed to load chapter`);
        const data = await res.json();
        setContent(data.content || "<p>Chapter content unavailable.</p>");
      } catch (err: any) {
        setError(err.message || "Failed to load chapter");
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [novelId, chapterId, chapterNum]);

  // TTS: Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      // Prefer English voices
      const englishVoice = voices.find(v => v.lang.startsWith("en") && v.name.toLowerCase().includes("google")) ||
                          voices.find(v => v.lang.startsWith("en") && !v.name.includes("espeak")) ||
                          voices.find(v => v.lang.startsWith("en")) ||
                          voices[0];
      if (englishVoice) setTtsVoice(englishVoice);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // TTS: Extract text from HTML content
  const getTextContent = useCallback(() => {
    if (!content) return "";
    return content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }, [content]);

  // TTS: Speak
  const startTTS = useCallback(() => {
    window.speechSynthesis.cancel();
    const text = getTextContent();
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    if (ttsVoice) utterance.voice = ttsVoice;
    utterance.rate = ttsSpeed;
    utterance.pitch = 1;

    utterance.onboundary = (event) => {
      if (text.length > 0) {
        setTtsProgress(Math.round((event.charIndex / text.length) * 100));
      }
    };

    utterance.onend = () => {
      setTtsPlaying(false);
      setTtsProgress(100);
    };

    utterance.onerror = () => {
      setTtsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
    setTtsPlaying(true);
  }, [getTextContent, ttsVoice, ttsSpeed]);

  // TTS: Stop
  const stopTTS = useCallback(() => {
    window.speechSynthesis.cancel();
    setTtsPlaying(false);
    setTtsProgress(0);
  }, []);

  // TTS: Pause/Resume
  const toggleTTSPause = useCallback(() => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setTtsPlaying(true);
    } else {
      window.speechSynthesis.pause();
      setTtsPlaying(false);
    }
  }, []);

  // Navigate to another chapter
  const goToChapter = (num: number) => {
    stopTTS();
    navigate({
      page: "novel-read",
      novelId,
      novelTitle,
      chapterId: `chapter-${num}`,
      chapterNum: num,
      chapterTitle: `Chapter ${num}`,
      totalChapters,
      novelSource,
    } as any);
  };

  // Chapter navigation
  const hasPrev = chapterNum > 1;
  const hasNext = chapterNum < totalChapters;

  const currentTheme = themes[theme];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: currentTheme.bg }}>
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b backdrop-blur-xl" style={{ background: `${currentTheme.bg}ee`, borderColor: `${currentTheme.text}10` }}>
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate({ page: "novel-detail", novelId, novelTitle, novelCover: "", novelAuthor: "", novelSource } as any)}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
            style={{ color: currentTheme.subtle }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <p className="text-xs truncate" style={{ color: currentTheme.text, fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
              {novelTitle}
            </p>
            <p className="text-[10px] truncate" style={{ color: currentTheme.subtle }}>
              Chapter {chapterNum} of {totalChapters}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* TTS toggle */}
          <button
            onClick={() => { setShowTTS(!showTTS); setShowSettings(false); }}
            className={`p-2 rounded-lg transition-all ${showTTS ? "bg-[#a855f7]/20 text-[#a855f7]" : "hover:bg-white/[0.06]"}`}
            style={{ color: showTTS ? "#a855f7" : currentTheme.subtle }}
            title="AI Text-to-Speech"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>

          {/* Settings toggle */}
          <button
            onClick={() => { setShowSettings(!showSettings); setShowTTS(false); }}
            className={`p-2 rounded-lg transition-all ${showSettings ? "bg-white/[0.08]" : "hover:bg-white/[0.06]"}`}
            style={{ color: currentTheme.subtle }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── TTS Panel ── */}
      {showTTS && (
        <div className="border-b p-4" style={{ background: `${currentTheme.bg}`, borderColor: `${currentTheme.text}10` }}>
          <div className="max-w-2xl mx-auto">
            {/* AI badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#a855f7]/15 text-[#a855f7] text-[10px] font-bold">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                AI Text-to-Speech
              </span>
              <span className="text-[10px]" style={{ color: currentTheme.subtle }}>Listen to this chapter</span>
            </div>

            {/* Playback controls */}
            <div className="flex items-center gap-3 mb-3">
              {/* Play/Pause */}
              <button
                onClick={ttsPlaying ? toggleTTSPause : startTTS}
                className="w-12 h-12 rounded-full bg-[#a855f7] text-white flex items-center justify-center hover:bg-[#9333ea] transition-all shadow-[0_0_16px_rgba(168,85,247,0.3)]"
              >
                {ttsPlaying ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                ) : (
                  <svg className="w-5 h-5 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                )}
              </button>

              {/* Stop */}
              <button
                onClick={stopTTS}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                style={{ background: `${currentTheme.text}10`, color: currentTheme.subtle }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
              </button>

              {/* Progress */}
              <div className="flex-1">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${currentTheme.text}10` }}>
                  <div
                    className="h-full rounded-full bg-[#a855f7] transition-all duration-300"
                    style={{ width: `${ttsProgress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px]" style={{ color: currentTheme.subtle }}>{ttsPlaying ? "Playing..." : ttsProgress > 0 ? "Paused" : "Ready"}</span>
                  <span className="text-[9px]" style={{ color: currentTheme.subtle }}>{ttsProgress}%</span>
                </div>
              </div>
            </div>

            {/* Speed + Voice */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Speed control */}
              <div className="flex items-center gap-2 flex-1">
                <span className="text-[10px] font-bold" style={{ color: currentTheme.subtle }}>Speed:</span>
                <div className="flex gap-1">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                    <button
                      key={speed}
                      onClick={() => { setTtsSpeed(speed); if (ttsPlaying) { stopTTS(); startTTS(); } }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        ttsSpeed === speed ? "bg-[#a855f7] text-white" : ""
                      }`}
                      style={ttsSpeed !== speed ? { background: `${currentTheme.text}10`, color: currentTheme.subtle } : {}}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice selector */}
              <div className="flex items-center gap-2 flex-1">
                <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: currentTheme.subtle }}>Voice:</span>
                <select
                  value={ttsVoice?.name || ""}
                  onChange={e => {
                    const voice = availableVoices.find(v => v.name === e.target.value);
                    if (voice) { setTtsVoice(voice); if (ttsPlaying) { stopTTS(); startTTS(); } }
                  }}
                  className="flex-1 text-[10px] rounded-lg px-2 py-1 outline-none border-none"
                  style={{ background: `${currentTheme.text}10`, color: currentTheme.text }}
                >
                  {availableVoices.filter(v => v.lang.startsWith("en")).map(v => (
                    <option key={v.name} value={v.name}>{v.name.replace("Microsoft ", "").replace("Google ", "")}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Panel ── */}
      {showSettings && (
        <div className="border-b p-4" style={{ background: `${currentTheme.bg}`, borderColor: `${currentTheme.text}10` }}>
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Theme */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: currentTheme.subtle }}>Theme</span>
              <div className="flex gap-2">
                {(Object.entries(themes) as [ThemeKey, typeof themes.dark][]).map(([key, t]) => (
                  <button
                    key={key}
                    onClick={() => setTheme(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      theme === key ? "ring-2 ring-[#a855f7]" : ""
                    }`}
                    style={{ background: t.bg, color: t.text, border: `1px solid ${t.text}20` }}
                  >
                    <span className="w-3 h-3 rounded-full" style={{ background: t.text }} />
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Font size */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: currentTheme.subtle }}>
                Font Size: {fontSize}px
              </span>
              <div className="flex items-center gap-3">
                <button onClick={() => setFontSize(f => Math.max(12, f - 2))} className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: `${currentTheme.text}10`, color: currentTheme.text }}>-</button>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: `${currentTheme.text}10` }}>
                  <div className="h-full rounded-full bg-[#a855f7]" style={{ width: `${((fontSize - 12) / 20) * 100}%` }} />
                </div>
                <button onClick={() => setFontSize(f => Math.min(32, f + 2))} className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: `${currentTheme.text}10`, color: currentTheme.text }}>+</button>
              </div>
            </div>

            {/* Font family */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: currentTheme.subtle }}>Font</span>
              <div className="flex gap-2">
                {fontOptions.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFontFamily(f)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      fontFamily.id === f.id ? "ring-2 ring-[#a855f7]" : ""
                    }`}
                    style={{ background: `${currentTheme.text}10`, color: currentTheme.text, fontFamily: f.family }}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Line height */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: currentTheme.subtle }}>
                Line Height: {lineHeight.toFixed(1)}
              </span>
              <input
                type="range"
                min="1.2"
                max="2.5"
                step="0.1"
                value={lineHeight}
                onChange={e => setLineHeight(parseFloat(e.target.value))}
                className="w-full accent-[#a855f7]"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Content area ── */}
      <div className="flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-[#a855f7]/30 border-t-[#a855f7] animate-spin" />
            <p className="text-sm" style={{ color: currentTheme.subtle }}>Loading chapter...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <p className="text-sm" style={{ color: currentTheme.subtle }}>{error}</p>
            <button onClick={() => navigate({ page: "novel-detail", novelId, novelTitle, novelCover: "", novelAuthor: "", novelSource } as any)} className="px-4 py-2 rounded-full bg-[#a855f7] text-white text-[11px] font-bold">
              Go Back
            </button>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-6 py-10">
            {/* Chapter title */}
            <h1
              className="text-2xl font-bold mb-8 text-center"
              style={{ color: currentTheme.text, fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              {chapterTitle || `Chapter ${chapterNum}`}
            </h1>

            {/* Chapter content */}
            <div
              ref={contentRef}
              className="novel-content"
              style={{
                color: currentTheme.text,
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
                fontFamily: fontFamily.family,
              }}
              dangerouslySetInnerHTML={{ __html: content }}
            />

            {/* Chapter navigation */}
            <div className="flex items-center justify-between mt-16 pt-8" style={{ borderTop: `1px solid ${currentTheme.text}10` }}>
              {hasPrev ? (
                <button
                  onClick={() => goToChapter(chapterNum - 1)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all hover:scale-[1.02]"
                  style={{ background: `${currentTheme.text}08`, color: currentTheme.text, border: `1px solid ${currentTheme.text}10` }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7" /></svg>
                  Previous
                </button>
              ) : <div />}

              <span className="text-[11px]" style={{ color: currentTheme.subtle }}>
                {chapterNum} / {totalChapters}
              </span>

              {hasNext ? (
                <button
                  onClick={() => goToChapter(chapterNum + 1)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold bg-[#a855f7] text-white transition-all hover:bg-[#9333ea] hover:scale-[1.02]"
                >
                  Next
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7" /></svg>
                </button>
              ) : <div />}
            </div>

            {/* TTS quick access at bottom */}
            {!showTTS && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => { setShowTTS(true); startTTS(); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#a855f7]/10 border border-[#a855f7]/20 text-[#a855f7] text-[12px] font-bold hover:bg-[#a855f7]/20 transition-all"
                  style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    <path d="M19 10v2a7 7 0 01-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                  Listen with AI
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Inline styles for novel content ── */}
      <style jsx>{`
        .novel-content p {
          margin-bottom: 1em;
          text-align: justify;
        }
        .novel-content h2, .novel-content h3 {
          margin-top: 1.5em;
          margin-bottom: 0.75em;
          font-weight: bold;
        }
        .novel-content em, .novel-content i {
          font-style: italic;
        }
        .novel-content strong, .novel-content b {
          font-weight: bold;
        }
        .novel-content hr {
          margin: 2em 0;
          border: none;
          border-top: 1px solid currentColor;
          opacity: 0.1;
        }
      `}</style>
    </div>
  );
}
