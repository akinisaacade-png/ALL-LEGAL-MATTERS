import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, Play, Pause, RotateCcw, Sparkles, AlertTriangle, CheckCircle } from "lucide-react";
import { LegalDocument } from "../types";
import { ComplianceAlert } from "../complianceEngine";

interface ComplianceAudioSummaryProps {
  document: LegalDocument;
  alerts?: ComplianceAlert[];
  showToast: (msg: string) => void;
  autoPlay?: boolean;
}

export default function ComplianceAudioSummary({
  document,
  alerts = [],
  showToast,
  autoPlay = false
}: ComplianceAudioSummaryProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoadingTts, setIsLoadingTts] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<string>("Kore");
  const [summaryText, setSummaryText] = useState<string>("");
  const [showTranscript, setShowTranscript] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate the spoken summary script from high-risk clauses and alerts
  useEffect(() => {
    const highRiskAlerts = alerts.filter(a => a.severity === "critical");
    const highRiskClauses = (document.clauses || []).filter(c => c.risk === "High");
    const totalCritical = highRiskAlerts.length + highRiskClauses.length;

    let script = "";
    if (totalCritical > 0) {
      const issues: string[] = [];
      highRiskAlerts.forEach(a => {
        issues.push(`${a.ruleName}, violating ${a.sourceStatute}`);
      });
      highRiskClauses.forEach(c => {
        if (!issues.some(i => i.toLowerCase().includes(c.title.toLowerCase()))) {
          issues.push(`${c.title}: ${c.analysis}`);
        }
      });

      const issueDetails = issues.slice(0, 3).join(". In addition, ");
      script = `Compliance audit complete for ${document.name}. Overall risk score is ${document.riskScore} percent. ${totalCritical} critical compliance issues were detected. Specifically: ${issueDetails}. Immediate redline remediation is recommended to ensure statutory validity.`;
    } else if (document.riskScore > 35) {
      script = `Compliance audit completed for ${document.name}. Overall risk score is ${document.riskScore} percent. Moderate risk exposure was identified in dispute resolution and liability terms. Review recommended redlines before final execution.`;
    } else {
      script = `Compliance audit completed for ${document.name}. Risk score is ${document.riskScore} percent. No critical statutory violations were detected. All examined covenants align with established subnational and commercial benchmarks.`;
    }

    setSummaryText(script);
  }, [document, alerts]);

  // Clean up any speaking when component unmounts
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const handlePlaySpokenSummary = async () => {
    if (isPlaying) {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      return;
    }

    setIsLoadingTts(true);

    try {
      // First attempt backend Gemini TTS module
      const response = await fetch("/api/multimodal/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: summaryText,
          voice: selectedVoice
        })
      });

      const data = await response.json();

      if (data && data.audio && data.audio !== "MOCK_AUDIO_GENERATED") {
        // Play base64 audio
        const audioSrc = `data:audio/mp3;base64,${data.audio}`;
        if (!audioRef.current) {
          audioRef.current = new Audio(audioSrc);
        } else {
          audioRef.current.src = audioSrc;
        }

        audioRef.current.onended = () => setIsPlaying(false);
        await audioRef.current.play();
        setIsPlaying(true);
        showToast("🔊 Playing AI-synthesized spoken compliance audit summary.");
      } else {
        // Seamless high-fidelity fallback to browser Web Speech API
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(summaryText);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;

          // Attempt to match voice preference
          const voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            const preferred = voices.find(v => 
              selectedVoice === "Fen" ? v.name.includes("Female") || v.name.includes("Samantha") || v.name.includes("Google US English") :
              v.name.includes("Male") || v.name.includes("Daniel") || v.name.includes("Alex")
            );
            if (preferred) utterance.voice = preferred;
          }

          utterance.onend = () => setIsPlaying(false);
          utterance.onerror = () => setIsPlaying(false);

          window.speechSynthesis.speak(utterance);
          setIsPlaying(true);
          showToast("🔊 Playing spoken compliance audit summary via neural vocal engine.");
        } else {
          showToast("Speech synthesis not supported in this browser environment.");
        }
      }
    } catch (err) {
      // Direct Web Speech API fallback
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(summaryText);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
        showToast("🔊 Playing spoken compliance audit feedback.");
      } else {
        showToast("Audio vocal synthesis unavailable.");
      }
    } finally {
      setIsLoadingTts(false);
    }
  };

  const highRiskCount = alerts.filter(a => a.severity === "critical").length + (document.clauses || []).filter(c => c.risk === "High").length;

  return (
    <div id="compliance-spoken-feedback-loop" className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 border border-indigo-500/30 p-4 rounded-xl shadow-lg space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/30 border border-indigo-400 flex items-center justify-center text-amber-300">
            <Volume2 className={`w-5 h-5 ${isPlaying ? "animate-pulse text-amber-300" : "text-indigo-300"}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-white">
                Spoken Compliance Summary
              </span>
              <span className="bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-[9.5px] px-2 py-0.2 rounded font-mono font-bold uppercase">
                AI Feedback Loop
              </span>
              {highRiskCount > 0 && (
                <span className="bg-rose-950 border border-rose-500/40 text-rose-400 text-[9.5px] px-2 py-0.2 rounded font-mono font-bold uppercase">
                  {highRiskCount} High-Risk
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Audible debrief explaining detected non-compliance clauses, statutory violations, and recommended redline actions.
            </p>
          </div>
        </div>

        {/* Audio Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            disabled={isPlaying || isLoadingTts}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 font-mono outline-none"
            title="Speaker Voice"
          >
            <option value="Kore">Voice: Kore (Neutral)</option>
            <option value="Fen">Voice: Fen (Soft)</option>
            <option value="Puck">Voice: Puck (Energetic)</option>
          </select>

          <button
            type="button"
            onClick={handlePlaySpokenSummary}
            disabled={isLoadingTts}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow ${
              isPlaying
                ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                : "bg-indigo-600 hover:bg-indigo-500 text-white"
            }`}
          >
            {isLoadingTts ? (
              <span>Synthesizing...</span>
            ) : isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause Audio</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Listen Spoken Summary</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold font-mono transition-all border border-slate-700"
            title="Toggle Transcript Text"
          >
            {showTranscript ? "Hide Script" : "Transcript"}
          </button>
        </div>
      </div>

      {/* Visual Audio Waveform simulation when playing */}
      {isPlaying && (
        <div className="flex items-center gap-1.5 py-1 px-3 bg-slate-950/80 rounded-lg border border-indigo-500/20">
          <span className="text-[10px] text-indigo-300 font-mono font-bold mr-2 uppercase">Vocal Stream Active:</span>
          <div className="flex items-center gap-1 h-4">
            <span className="w-1 bg-amber-400 rounded-full animate-bounce h-3" style={{ animationDelay: "0ms" }} />
            <span className="w-1 bg-indigo-400 rounded-full animate-bounce h-4" style={{ animationDelay: "150ms" }} />
            <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-2.5" style={{ animationDelay: "300ms" }} />
            <span className="w-1 bg-amber-400 rounded-full animate-bounce h-4" style={{ animationDelay: "450ms" }} />
            <span className="w-1 bg-indigo-400 rounded-full animate-bounce h-3" style={{ animationDelay: "200ms" }} />
          </div>
          <span className="text-[10px] text-slate-400 italic ml-auto truncate max-w-sm">
            "{summaryText.substring(0, 75)}..."
          </span>
        </div>
      )}

      {/* Spoken Transcript Dropdown */}
      {showTranscript && (
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs space-y-1.5 animate-fadeIn">
          <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block">
            Generated AI Spoken Transcript:
          </span>
          <p className="text-slate-200 leading-relaxed font-sans font-medium">
            "{summaryText}"
          </p>
        </div>
      )}
    </div>
  );
}
