import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Download,
  Volume2,
  Clock,
  Sparkles,
  FileAudio,
  CheckCircle,
  AlertCircle,
  Plus,
  RefreshCw,
  FastForward,
  User
} from "lucide-react";
import { LegalDocument, VoiceMemo } from "../types";

interface DocumentVoiceMemosProps {
  document: LegalDocument;
  currentUser: { email?: string; name?: string } | null;
  onAttachMemo: (memo: VoiceMemo) => Promise<void> | void;
  onDeleteMemo: (memoId: string) => Promise<void> | void;
  showToast: (msg: string) => void;
}

// Generate a valid short synthesized WAV chime base64 data URL for mock dictations
function createSyntheticAudioDataUrl(durationSeconds = 3): string {
  const sampleRate = 8000;
  const numSamples = sampleRate * durationSeconds;
  const buffer = new Uint8Array(44 + numSamples);

  // RIFF identifier
  buffer.set([0x52, 0x49, 0x46, 0x46], 0);
  const fileSize = 36 + numSamples;
  buffer[4] = fileSize & 0xff;
  buffer[5] = (fileSize >> 8) & 0xff;
  buffer[6] = (fileSize >> 16) & 0xff;
  buffer[7] = (fileSize >> 24) & 0xff;

  // WAVE identifier
  buffer.set([0x57, 0x41, 0x56, 0x45], 8);
  // fmt subchunk
  buffer.set([0x66, 0x6d, 0x74, 0x20, 16, 0, 0, 0, 1, 0, 1, 0], 12);
  // Sample rate
  buffer[24] = sampleRate & 0xff;
  buffer[25] = (sampleRate >> 8) & 0xff;
  buffer[26] = (sampleRate >> 16) & 0xff;
  buffer[27] = (sampleRate >> 24) & 0xff;
  // Byte rate
  buffer[28] = sampleRate & 0xff;
  buffer[29] = (sampleRate >> 8) & 0xff;
  buffer[30] = (sampleRate >> 16) & 0xff;
  buffer[31] = (sampleRate >> 24) & 0xff;
  // Block align & bits per sample
  buffer.set([1, 0, 8, 0], 32);
  // data subchunk
  buffer.set([0x64, 0x61, 0x74, 0x61], 36);
  buffer[40] = numSamples & 0xff;
  buffer[41] = (numSamples >> 8) & 0xff;
  buffer[42] = (numSamples >> 16) & 0xff;
  buffer[43] = (numSamples >> 24) & 0xff;

  // Tone synthesis (440Hz A4 chime decaying)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const freq = 440 + 220 * Math.sin(t * 3);
    const decay = Math.exp(-t * 1.5);
    const sample = 128 + Math.round(50 * Math.sin(2 * Math.PI * freq * t) * decay);
    buffer[44 + i] = Math.max(0, Math.min(255, sample));
  }

  let binary = "";
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return "data:audio/wav;base64," + btoa(binary);
}

export const DocumentVoiceMemos: React.FC<DocumentVoiceMemosProps> = ({
  document,
  currentUser,
  onAttachMemo,
  onDeleteMemo,
  showToast,
}) => {
  const memos = document.voiceMemos || [];

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  // Pending recorded audio review
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null);
  const [pendingDuration, setPendingDuration] = useState<number>(0);
  const [pendingTitle, setPendingTitle] = useState("");
  const [pendingNotes, setPendingNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Playback states for attached memos
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState<{ [id: string]: number }>({});
  const [playbackDuration, setPlaybackDuration] = useState<{ [id: string]: number }>({});
  const [playbackSpeed, setPlaybackSpeed] = useState<{ [id: string]: number }>({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioElementsRef = useRef<{ [id: string]: HTMLAudioElement }>({});

  // Clean up recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Start live microphone recording
  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];
    setRecordSeconds(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Audio recording is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        
        // Convert Blob to Base64 Data URL for persistent storage
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setPendingAudioUrl(base64Audio);
          setPendingDuration(recordSeconds || 1);
          setPendingTitle(
            `Memo: ${document.name.replace(/\.[^/.]+$/, "")} Review (${new Date().toLocaleDateString()})`
          );
        };

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setIsPaused(false);

      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn("Microphone access error:", err);
      setMicError(
        err.message || "Microphone access denied or unavailable. You can use sample dictation."
      );
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        recordTimerRef.current = setInterval(() => {
          setRecordSeconds((prev) => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      }
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
  };

  const cancelRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
    setPendingAudioUrl(null);
    setRecordSeconds(0);
  };

  // Fallback: Generate synthesized dictation memo
  const handleGenerateSampleMemo = () => {
    const syntheticUrl = createSyntheticAudioDataUrl(8);
    setPendingAudioUrl(syntheticUrl);
    setPendingDuration(8);
    setPendingTitle(
      `Counsel Dictation: ${document.name.replace(/\.[^/.]+$/, "")} Assessment`
    );
    setPendingNotes(
      "Synthesized legal counsel voice briefing covering statutory compliance and clause enforceability."
    );
    setMicError(null);
    showToast("🎙️ Synthesized legal dictation note ready for review.");
  };

  // Commit pending memo to document
  const handleSavePendingMemo = async () => {
    if (!pendingAudioUrl) return;

    const newMemo: VoiceMemo = {
      id: `memo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: pendingTitle.trim() || `Voice Memo: ${new Date().toLocaleTimeString()}`,
      audioBlobUrl: pendingAudioUrl,
      durationSeconds: pendingDuration || 5,
      recordedAt: new Date().toISOString(),
      recordedBy: currentUser?.name || currentUser?.email || "Legal Counsel",
      notes: pendingNotes.trim() || undefined,
      fileSizeBytes: Math.round(pendingAudioUrl.length * 0.75),
    };

    try {
      setIsSaving(true);
      await onAttachMemo(newMemo);
      setPendingAudioUrl(null);
      setPendingTitle("");
      setPendingNotes("");
      setPendingDuration(0);
      showToast(`🎙️ Voice memo "${newMemo.title}" attached to document!`);
    } catch (err) {
      console.warn("Error attaching voice memo:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Audio Playback Controls for an attached memo
  const togglePlayMemo = (memo: VoiceMemo) => {
    let audio = audioElementsRef.current[memo.id];

    if (!audio) {
      audio = new Audio(memo.audioBlobUrl);
      audioElementsRef.current[memo.id] = audio;

      audio.ontimeupdate = () => {
        setPlaybackTime((prev) => ({ ...prev, [memo.id]: audio.currentTime }));
      };

      audio.onloadedmetadata = () => {
        setPlaybackDuration((prev) => ({
          ...prev,
          [memo.id]: audio.duration || memo.durationSeconds,
        }));
      };

      audio.onended = () => {
        setActivePlayingId(null);
        setPlaybackTime((prev) => ({ ...prev, [memo.id]: 0 }));
      };
    }

    // Stop any other playing audio
    Object.keys(audioElementsRef.current).forEach((id) => {
      if (id !== memo.id) {
        audioElementsRef.current[id].pause();
      }
    });

    if (activePlayingId === memo.id) {
      audio.pause();
      setActivePlayingId(null);
    } else {
      const speed = playbackSpeed[memo.id] || 1;
      audio.playbackRate = speed;
      audio.play().catch((err) => console.warn("Audio play prevented:", err));
      setActivePlayingId(memo.id);
    }
  };

  const handleSeek = (memoId: string, value: number) => {
    const audio = audioElementsRef.current[memoId];
    if (audio) {
      audio.currentTime = value;
      setPlaybackTime((prev) => ({ ...prev, [memoId]: value }));
    }
  };

  const cycleSpeed = (memoId: string) => {
    const currentSpeed = playbackSpeed[memoId] || 1;
    const speeds = [1, 1.25, 1.5, 2];
    const nextSpeed = speeds[(speeds.indexOf(currentSpeed) + 1) % speeds.length];
    setPlaybackSpeed((prev) => ({ ...prev, [memoId]: nextSpeed }));

    const audio = audioElementsRef.current[memoId];
    if (audio) {
      audio.playbackRate = nextSpeed;
    }
  };

  const handleDownloadMemo = (memo: VoiceMemo) => {
    const a = window.document.createElement("a");
    a.href = memo.audioBlobUrl;
    a.download = `${memo.title.replace(/\s+/g, "_")}.wav`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    showToast(`⬇️ Downloaded audio memo "${memo.title}".`);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-5 shadow-lg">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase font-black flex items-center gap-1.5">
              <FileAudio className="w-4 h-4 text-amber-400" />
              VOICE MEMOS & AUDIO DICTATION VAULT
            </span>
            <span className="text-[9px] bg-slate-950 text-slate-300 border border-slate-800 px-1.5 py-0.2 rounded font-mono font-bold">
              {memos.length} Attached {memos.length === 1 ? "Memo" : "Memos"}
            </span>
          </div>
          <h4 className="text-base font-bold text-white tracking-tight">
            Document Voice Dictations & Audio Briefings
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Record confidential counsel dictations and attach spoken audio briefings directly to{" "}
            <span className="text-slate-200 font-semibold">{document.name}</span>.
          </p>
        </div>

        {/* Action button: Start Recording */}
        {!isRecording && !pendingAudioUrl && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startRecording}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-red-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Mic className="w-4 h-4 animate-pulse" />
              <span>Record Voice Memo</span>
            </button>
            <button
              type="button"
              onClick={handleGenerateSampleMemo}
              className="p-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold border border-slate-700 transition-colors"
              title="Create a synthesized dictation note"
            >
              + Sample Note
            </button>
          </div>
        )}
      </div>

      {/* Mic Permission Warning */}
      {micError && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg flex items-start justify-between gap-3 text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{micError}</span>
          </div>
          <button
            type="button"
            onClick={handleGenerateSampleMemo}
            className="text-[11px] underline font-bold hover:text-white shrink-0"
          >
            Generate Synthesized Audio Memo
          </button>
        </div>
      )}

      {/* Live Recording Studio Zone */}
      {isRecording && (
        <div className="bg-slate-950 p-5 rounded-xl border-2 border-red-500/60 shadow-xl space-y-4 animate-fadeIn relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping inline-block" />
              <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                {isPaused ? "Recording Paused" : "Live Recording Active..."}
              </span>
            </div>
            <div className="text-lg font-mono font-black text-red-400 tracking-wider">
              {formatTime(recordSeconds)}
            </div>
          </div>

          {/* Animated Audio Waveform Bars */}
          <div className="flex items-center justify-center gap-1.5 h-12 py-2 bg-slate-900/60 rounded-lg border border-slate-850">
            {Array.from({ length: 28 }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 bg-gradient-to-t from-red-600 via-rose-500 to-amber-400 rounded-full transition-all duration-150"
                style={{
                  height: isPaused
                    ? "6px"
                    : `${Math.max(8, Math.sin(i * 0.4 + recordSeconds * 2) * 32 + 16)}px`,
                  opacity: isPaused ? 0.4 : 0.85,
                }}
              />
            ))}
          </div>

          {/* Recording Control Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 font-bold transition-colors"
            >
              Discard Recording
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={pauseRecording}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-colors"
              >
                {isPaused ? "Resume" : "Pause"}
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-2 shadow transition-all cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Finish & Preview</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review & Tagging Form Before Attaching */}
      {pendingAudioUrl && !isRecording && (
        <div className="bg-slate-950 p-5 rounded-xl border border-indigo-500/50 shadow-xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-indigo-600 text-white">
                <CheckCircle className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                Preview & Attach Voice Memo
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-400">
              Duration: {formatTime(pendingDuration)}
            </span>
          </div>

          {/* Inline Audio Preview Player */}
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center gap-3">
            <audio controls src={pendingAudioUrl} className="w-full h-8" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">
                Memo Title / Subject:
              </label>
              <input
                type="text"
                value={pendingTitle}
                onChange={(e) => setPendingTitle(e.target.value)}
                placeholder="e.g. Clause 4 Limitation Note"
                className="w-full bg-slate-900 text-xs text-white p-2 border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">
                Optional Transcription / Context Note:
              </label>
              <input
                type="text"
                value={pendingNotes}
                onChange={(e) => setPendingNotes(e.target.value)}
                placeholder="Brief summary of advice recorded in this memo..."
                className="w-full bg-slate-900 text-xs text-white p-2 border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPendingAudioUrl(null)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSavePendingMemo}
              disabled={isSaving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSaving ? "Attaching..." : "Attach Memo to Document"}</span>
            </button>
          </div>
        </div>
      )}

      {/* List of Attached Voice Memos */}
      <div className="space-y-3">
        {memos.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
            <Mic className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-bold text-slate-300">No Voice Memos Attached Yet</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
              Record voice memos to provide oral legal opinions, summarize negotiation points, or attach client dictations to this document.
            </p>
            <button
              type="button"
              onClick={startRecording}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-bold rounded-lg transition-colors"
            >
              <Mic className="w-3.5 h-3.5 text-red-400" />
              <span>Record First Memo</span>
            </button>
          </div>
        ) : (
          memos.map((memo) => {
            const isPlaying = activePlayingId === memo.id;
            const currentTime = playbackTime[memo.id] || 0;
            const duration = playbackDuration[memo.id] || memo.durationSeconds || 1;
            const speed = playbackSpeed[memo.id] || 1;

            return (
              <div
                key={memo.id}
                className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all space-y-3"
              >
                {/* Top Info Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <FileAudio className="w-3.5 h-3.5 text-amber-400" />
                        {memo.title}
                      </span>
                      <span className="text-[9px] bg-slate-900 border border-slate-800 text-indigo-400 px-1.5 py-0.2 rounded font-mono font-bold">
                        {formatTime(memo.durationSeconds)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                      <span>Recorded by: {memo.recordedBy}</span>
                      <span>•</span>
                      <span>{new Date(memo.recordedAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleDownloadMemo(memo)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded transition-colors"
                      title="Download audio file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            `Permanently delete voice memo "${memo.title}" from this document?`
                          )
                        ) {
                          onDeleteMemo(memo.id);
                        }
                      }}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded transition-colors"
                      title="Delete voice memo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Optional Transcript / Context Note */}
                {memo.notes && (
                  <p className="text-[11px] text-slate-300 italic bg-slate-900/60 p-2.5 rounded border border-slate-850 font-sans leading-relaxed">
                    "{memo.notes}"
                  </p>
                )}

                {/* Custom Audio Player Controls Strip */}
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-center gap-3">
                  {/* Play / Pause Toggle */}
                  <button
                    type="button"
                    onClick={() => togglePlayMemo(memo)}
                    className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow transition-all cursor-pointer"
                    title={isPlaying ? "Pause audio" : "Play audio memo"}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>

                  {/* Scrubber Timeline */}
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={currentTime}
                      onChange={(e) => handleSeek(memo.id, parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Playback Time */}
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>

                  {/* Speed Toggle */}
                  <button
                    type="button"
                    onClick={() => cycleSpeed(memo.id)}
                    className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-bold rounded border border-slate-700 transition-colors shrink-0"
                    title="Change playback speed"
                  >
                    {speed}x
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
