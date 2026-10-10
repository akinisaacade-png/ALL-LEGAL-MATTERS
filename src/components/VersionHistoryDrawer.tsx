import React, { useState, useMemo } from "react";
import {
  History,
  X,
  RefreshCw,
  GitCompare,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  Printer,
  Trash2,
  Copy,
  Check,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  FileText,
  SplitSquareVertical,
  Columns
} from "lucide-react";
import { LegalDocument, DocumentVersion } from "../types";

interface VersionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  document: LegalDocument;
  currentUser: { email?: string; name?: string } | null;
  onRestoreVersion: (versionId: string) => Promise<void> | void;
  onDeleteVersion: (versionId: string) => Promise<void> | void;
  onPrintVersion: (doc: { name: string; content: string }) => void;
  showToast: (msg: string) => void;
}

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  text: string;
  lineNumA?: number;
  lineNumB?: number;
}

// Compute a line-by-line diff between two strings
function computeLineDiff(textA: string, textB: string): {
  lines: DiffLine[];
  additions: number;
  deletions: number;
  unchanged: number;
} {
  const linesA = textA.split(/\r?\n/);
  const linesB = textB.split(/\r?\n/);

  // Dynamic programming LCS table
  const m = linesA.length;
  const n = linesB.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (linesA[i] === linesB[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to build the diff
  let i = m;
  let j = n;
  const rawDiff: DiffLine[] = [];
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
      rawDiff.unshift({
        type: "unchanged",
        text: linesA[i - 1],
        lineNumA: i,
        lineNumB: j,
      });
      unchanged++;
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawDiff.unshift({
        type: "added",
        text: linesB[j - 1],
        lineNumB: j,
      });
      additions++;
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawDiff.unshift({
        type: "removed",
        text: linesA[i - 1],
        lineNumA: i,
      });
      deletions++;
      i--;
    }
  }

  return { lines: rawDiff, additions, deletions, unchanged };
}

export const VersionHistoryDrawer: React.FC<VersionHistoryDrawerProps> = ({
  isOpen,
  onClose,
  document,
  currentUser,
  onRestoreVersion,
  onDeleteVersion,
  onPrintVersion,
  showToast,
}) => {
  const versions = document.versions || [];

  // Default selected version for inspection/diff
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(() => {
    return versions.length > 0 ? versions[versions.length - 1].id : null;
  });

  const [viewMode, setViewMode] = useState<"diff" | "preview">("diff");
  const [diffLayout, setDiffLayout] = useState<"unified" | "split">("unified");
  const [isRestoring, setIsRestoring] = useState(false);
  const [copied, setCopied] = useState(false);

  // Selected historical version
  const selectedVersion = useMemo(() => {
    if (!selectedVersionId) {
      return versions.length > 0 ? versions[versions.length - 1] : null;
    }
    return versions.find((v) => v.id === selectedVersionId) || null;
  }, [versions, selectedVersionId]);

  // Compute diff: Historical version (A) vs Active Document (B)
  const diffResult = useMemo(() => {
    if (!selectedVersion) {
      return { lines: [], additions: 0, deletions: 0, unchanged: 0 };
    }
    return computeLineDiff(selectedVersion.content, document.content);
  }, [selectedVersion, document.content]);

  // Risk difference
  const riskDelta = useMemo(() => {
    if (!selectedVersion) return 0;
    return document.riskScore - selectedVersion.riskScore;
  }, [selectedVersion, document.riskScore]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast("📋 Version content copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRestore = async (versionId: string) => {
    if (!selectedVersion) return;
    const verNumber = selectedVersion.versionNumber || "checkpoint";
    if (
      !confirm(
        `Are you sure you want to restore Version ${verNumber}? A backup snapshot of your current active document will be created automatically before rolling back.`
      )
    ) {
      return;
    }

    try {
      setIsRestoring(true);
      await onRestoreVersion(versionId);
      showToast(`🔄 Restored to Version ${verNumber}! Current active document updated.`);
    } catch (err) {
      console.warn("Restore error:", err);
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container */}
      <div className="w-full max-w-4xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden z-10 animate-slideInRight">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <History className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest text-indigo-400 uppercase font-black">
                  AUDIT TIMELINE & CHECKPOINTS
                </span>
                <span className="text-[9px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.2 rounded font-mono font-bold">
                  {versions.length + 1} Total Versions
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white truncate max-w-md sm:max-w-xl">
                Version History: {document.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close version history drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content: Split List & Diff/Viewer */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {/* Left Column: Version Timeline Selector (4 cols on desktop) */}
          <div className="md:col-span-4 bg-slate-950/60 overflow-y-auto p-4 space-y-3 flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Revision Points
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Active + {versions.length} Snapshots
              </span>
            </div>

            {/* Active Current Version Card */}
            <div className="p-3 bg-indigo-950/30 border-2 border-indigo-500/70 rounded-xl space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-indigo-600 text-white shadow">
                  Active (Current)
                </span>
                <span className="text-[10px] font-bold font-mono text-emerald-400">
                  Risk: {document.riskScore}%
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-100 truncate">
                {document.changeSummary || "Latest modified baseline"}
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>{new Date(document.uploadedAt).toLocaleString()}</span>
                <span>{document.content.length} chars</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">
                Author: {document.uploadedBy || currentUser?.email || "Current User"}
              </div>
            </div>

            {/* Historical Checkpoints */}
            {versions.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl space-y-2 my-auto">
                <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-300">No Historical Checkpoints Yet</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  When you edit this agreement, checkpoints will automatically be recorded here for instant diff and rollback.
                </p>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider block">
                  Historical Checkpoints:
                </span>
                {versions
                  .slice()
                  .reverse()
                  .map((ver, idx) => {
                    const isSelected = selectedVersion?.id === ver.id;
                    const verNum = ver.versionNumber || versions.length - idx;
                    return (
                      <div
                        key={ver.id}
                        onClick={() => setSelectedVersionId(ver.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all space-y-2 relative ${
                          isSelected
                            ? "bg-slate-800 border-amber-500/80 shadow-md ring-1 ring-amber-500/30"
                            : "bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[9px] font-bold font-mono px-1.5 py-0.2 rounded uppercase ${
                                isSelected
                                  ? "bg-amber-400 text-slate-950 font-black"
                                  : "bg-slate-800 text-slate-300"
                              }`}
                            >
                              V{verNum}
                            </span>
                            <span className="text-xs font-bold text-slate-200">
                              Revision #{verNum}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                              ver.riskScore > 50
                                ? "text-rose-400 bg-rose-950/60 border border-rose-900/40"
                                : "text-emerald-400 bg-emerald-950/60 border border-emerald-900/40"
                            }`}
                          >
                            Risk: {ver.riskScore}%
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 italic truncate font-sans">
                          "{ver.changeSummary || "Historical revision snapshot"}"
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>{new Date(ver.editedAt).toLocaleString()}</span>
                          <span>{ver.content.length} chars</span>
                        </div>

                        {isSelected && (
                          <div className="pt-1.5 border-t border-slate-700 flex items-center justify-between gap-1">
                            <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Selected for Diff
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  confirm(
                                    `Permanently delete Version ${verNum}? This action cannot be undone.`
                                  )
                                ) {
                                  onDeleteVersion(ver.id);
                                }
                              }}
                              className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-950 transition-colors"
                              title="Delete this checkpoint"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Right Column: Diff Visualizer & Inspector (8 cols on desktop) */}
          <div className="md:col-span-8 flex flex-col overflow-hidden bg-slate-950">
            {selectedVersion ? (
              <>
                {/* Control Bar for Selected Version */}
                <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <GitCompare className="w-4 h-4 text-amber-400" />
                        Comparing:{" "}
                        <span className="text-amber-400">
                          V{selectedVersion.versionNumber || "Selected"}
                        </span>{" "}
                        <ArrowRight className="w-3 h-3 text-slate-400" />{" "}
                        <span className="text-indigo-400">Current Active</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <span className="text-emerald-400 font-bold">
                        +{diffResult.additions} lines added
                      </span>
                      <span className="text-rose-400 font-bold">
                        -{diffResult.deletions} lines removed
                      </span>
                      <span className="text-slate-400">
                        {diffResult.unchanged} unchanged
                      </span>
                      {riskDelta !== 0 && (
                        <span
                          className={`font-bold ${
                            riskDelta < 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          Risk: {selectedVersion.riskScore}% → {document.riskScore}% (
                          {riskDelta > 0 ? `+${riskDelta}%` : `${riskDelta}%`})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Toolbar */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setViewMode("diff")}
                        className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
                          viewMode === "diff"
                            ? "bg-indigo-600 text-white"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Visual Diff
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("preview")}
                        className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
                          viewMode === "preview"
                            ? "bg-indigo-600 text-white"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Full Content
                      </button>
                    </div>

                    {viewMode === "diff" && (
                      <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setDiffLayout("unified")}
                          className={`p-1 rounded transition-colors ${
                            diffLayout === "unified"
                              ? "bg-slate-800 text-white"
                              : "text-slate-400 hover:text-white"
                          }`}
                          title="Unified view (combined line flow)"
                        >
                          <SplitSquareVertical className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiffLayout("split")}
                          className={`p-1 rounded transition-colors ${
                            diffLayout === "split"
                              ? "bg-slate-800 text-white"
                              : "text-slate-400 hover:text-white"
                          }`}
                          title="Split side-by-side view"
                        >
                          <Columns className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopy(selectedVersion.content)}
                      className="p-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-bold flex items-center gap-1 transition-all"
                      title="Copy historical version text"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onPrintVersion({
                          name: `${document.name}_V${selectedVersion.versionNumber || "Checkpoint"}`,
                          content: selectedVersion.content,
                        })
                      }
                      className="p-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-bold flex items-center gap-1 transition-all"
                      title="Print / PDF this version"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                    </button>

                    {/* Restore Button */}
                    <button
                      type="button"
                      onClick={() => handleRestore(selectedVersion.id)}
                      disabled={isRestoring}
                      className="p-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                      title="Rollback active document to this state"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRestoring ? "animate-spin" : ""}`} />
                      <span>Restore V{selectedVersion.versionNumber || "This"}</span>
                    </button>
                  </div>
                </div>

                {/* Diff Legend / Meta Banner */}
                <div className="px-4 py-2 bg-slate-950 border-b border-slate-900 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500/80 inline-block" />
                      Green = Added in Active Document
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-rose-500/80 inline-block" />
                      Red = Removed from V{selectedVersion.versionNumber || "Past"}
                    </span>
                  </div>
                  <span className="hidden sm:inline text-slate-500">
                    Baseline: {new Date(selectedVersion.editedAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Viewport: Diff or Full Content */}
                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-1">
                  {viewMode === "preview" ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                        <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block mb-1">
                          Historical Content Snapshot (Version {selectedVersion.versionNumber || "Saved"})
                        </span>
                        <p className="text-slate-300 whitespace-pre-wrap select-text">
                          {selectedVersion.content}
                        </p>
                      </div>

                      {selectedVersion.clauses && selectedVersion.clauses.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-sans">
                            Clauses Audited in this Version:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {selectedVersion.clauses.map((cl, i) => (
                              <div
                                key={i}
                                className="p-2.5 bg-slate-900 border border-slate-800 rounded text-[11px] space-y-1"
                              >
                                <div className="flex justify-between font-sans font-bold">
                                  <span className="text-slate-200">{cl.title}</span>
                                  <span
                                    className={`px-1 rounded text-[9px] ${
                                      cl.risk === "High"
                                        ? "text-rose-400 bg-rose-950"
                                        : "text-emerald-400 bg-emerald-950"
                                    }`}
                                  >
                                    {cl.risk}
                                  </span>
                                </div>
                                <p className="text-slate-400 italic">"{cl.text}"</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : diffLayout === "unified" ? (
                    /* Unified Line Diff Flow */
                    <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/60 divide-y divide-slate-850">
                      {diffResult.lines.map((line, idx) => {
                        if (line.type === "added") {
                          return (
                            <div
                              key={idx}
                              className="flex items-start bg-emerald-950/40 text-emerald-200 hover:bg-emerald-950/60 border-l-4 border-emerald-500 py-1 px-2 transition-colors select-text"
                            >
                              <span className="w-8 text-[10px] text-emerald-500/70 select-none font-bold">
                                +{line.lineNumB}
                              </span>
                              <span className="w-5 text-emerald-400 select-none font-bold">+</span>
                              <span className="flex-1 whitespace-pre-wrap">{line.text || " "}</span>
                            </div>
                          );
                        } else if (line.type === "removed") {
                          return (
                            <div
                              key={idx}
                              className="flex items-start bg-rose-950/40 text-rose-300 hover:bg-rose-950/60 border-l-4 border-rose-500 py-1 px-2 transition-colors select-text"
                            >
                              <span className="w-8 text-[10px] text-rose-500/70 select-none font-bold">
                                -{line.lineNumA}
                              </span>
                              <span className="w-5 text-rose-400 select-none font-bold">-</span>
                              <span className="flex-1 whitespace-pre-wrap line-through opacity-80">
                                {line.text || " "}
                              </span>
                            </div>
                          );
                        } else {
                          return (
                            <div
                              key={idx}
                              className="flex items-start text-slate-400 hover:bg-slate-900/80 py-1 px-2 transition-colors select-text"
                            >
                              <span className="w-8 text-[10px] text-slate-600 select-none">
                                {line.lineNumB}
                              </span>
                              <span className="w-5 text-slate-600 select-none">&nbsp;</span>
                              <span className="flex-1 whitespace-pre-wrap">{line.text || " "}</span>
                            </div>
                          );
                        }
                      })}
                    </div>
                  ) : (
                    /* Side-by-Side Split Diff */
                    <div className="grid grid-cols-2 gap-2 border border-slate-800 rounded-lg overflow-hidden bg-slate-900/60">
                      <div className="p-3 border-r border-slate-800 space-y-2">
                        <div className="sticky top-0 bg-slate-900 p-1.5 rounded border border-slate-800 flex justify-between items-center text-[10px] font-bold">
                          <span className="text-amber-400">
                            Version {selectedVersion.versionNumber || "Selected"}
                          </span>
                          <span className="text-slate-400 font-mono">
                            {selectedVersion.content.length} chars
                          </span>
                        </div>
                        <div className="p-2 bg-slate-950/80 rounded border border-slate-850 text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {selectedVersion.content}
                        </div>
                      </div>

                      <div className="p-3 space-y-2">
                        <div className="sticky top-0 bg-slate-900 p-1.5 rounded border border-slate-800 flex justify-between items-center text-[10px] font-bold">
                          <span className="text-indigo-400">Current Active Version</span>
                          <span className="text-slate-400 font-mono">
                            {document.content.length} chars
                          </span>
                        </div>
                        <div className="p-2 bg-slate-950/80 rounded border border-slate-850 text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {document.content}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Bar with Restore CTA */}
                <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-4">
                  <div className="text-xs text-slate-400">
                    <span className="text-white font-bold">Safe Rollback:</span> Restoring snapshots will archive the current state as a new checkpoint before reverting.
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestore(selectedVersion.id)}
                    disabled={isRestoring}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRestoring ? "animate-spin" : ""}`} />
                    <span>Restore Version {selectedVersion.versionNumber || ""} as Active</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="p-12 text-center my-auto space-y-3">
                <History className="w-12 h-12 text-slate-700 mx-auto" />
                <h3 className="text-sm font-bold text-slate-300">No Historical Checkpoint Selected</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Select a version checkpoint from the timeline on the left to inspect its diff against the current document.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
