import React, { useState, useMemo } from "react";
import { LegalDocument } from "../types";
import {
  FileEdit,
  Hash,
  Binary,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Sliders,
  CheckSquare,
  Square,
} from "lucide-react";

interface BatchRenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDocs: LegalDocument[];
  allDocs: LegalDocument[];
  onApplyRename: (renamedDocs: { id: string; newName: string }[]) => void;
  showToast: (msg: string) => void;
}

export default function BatchRenameModal({
  isOpen,
  onClose,
  selectedDocs,
  allDocs,
  onApplyRename,
  showToast,
}: BatchRenameModalProps) {
  if (!isOpen) return null;

  // Active documents being renamed
  const initialIds = selectedDocs.length > 0 ? selectedDocs.map((d) => d.id) : allDocs.map((d) => d.id);
  const [targetDocIds, setTargetDocIds] = useState<string[]>(initialIds);

  // Rename Mode: Sequential Numbering or Regex Pattern
  const [renameMode, setRenameMode] = useState<"sequential" | "regex">("sequential");

  // Sequential Numbering Settings
  const [prefix, setPrefix] = useState<string>("Agreement");
  const [startNumber, setStartNumber] = useState<number>(1);
  const [digitPadding, setDigitPadding] = useState<number>(3); // e.g. 001
  const [suffix, setSuffix] = useState<string>("_Executed");
  const [namingFormat, setNamingFormat] = useState<"prefix_num" | "prefix_num_original" | "original_num">("prefix_num");
  const [preserveExtension, setPreserveExtension] = useState<boolean>(true);

  // Regex Pattern Settings
  const [regexFind, setRegexFind] = useState<string>("\\s+");
  const [regexReplace, setRegexReplace] = useState<string>("_");
  const [caseInsensitive, setCaseInsensitive] = useState<boolean>(true);
  const [globalMatch, setGlobalMatch] = useState<boolean>(true);
  const [regexError, setRegexError] = useState<string | null>(null);

  // Toggle selection
  const toggleDoc = (id: string) => {
    setTargetDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setTargetDocIds(allDocs.map((d) => d.id));
  };

  const clearAll = () => {
    setTargetDocIds([]);
  };

  // Helper to split name and extension
  const splitExtension = (filename: string): { base: string; ext: string } => {
    const lastDot = filename.lastIndexOf(".");
    if (lastDot > 0 && lastDot < filename.length - 1) {
      return {
        base: filename.substring(0, lastDot),
        ext: filename.substring(lastDot),
      };
    }
    return { base: filename, ext: "" };
  };

  // Compute live preview of renamed documents
  const previewList = useMemo(() => {
    setRegexError(null);
    let regexObj: RegExp | null = null;

    if (renameMode === "regex") {
      try {
        let flags = "";
        if (globalMatch) flags += "g";
        if (caseInsensitive) flags += "i";
        regexObj = new RegExp(regexFind, flags);
      } catch (err: any) {
        setRegexError(err?.message || "Invalid regular expression syntax");
      }
    }

    return allDocs
      .filter((doc) => targetDocIds.includes(doc.id))
      .map((doc, index) => {
        const { base, ext } = splitExtension(doc.name);
        let newName = doc.name;

        if (renameMode === "sequential") {
          const currentNum = startNumber + index;
          const formattedNum = String(currentNum).padStart(digitPadding, "0");
          const extensionPart = preserveExtension ? ext : "";

          if (namingFormat === "prefix_num") {
            const cleanPrefix = prefix ? `${prefix}_` : "";
            const cleanSuffix = suffix ? `${suffix}` : "";
            newName = `${cleanPrefix}${formattedNum}${cleanSuffix}${extensionPart}`;
          } else if (namingFormat === "prefix_num_original") {
            const cleanPrefix = prefix ? `${prefix}_` : "";
            const cleanSuffix = suffix ? `_${suffix}` : "";
            newName = `${cleanPrefix}${formattedNum}_${base}${cleanSuffix}${extensionPart}`;
          } else if (namingFormat === "original_num") {
            const cleanSuffix = suffix ? `_${suffix}` : "";
            newName = `${base}_${formattedNum}${cleanSuffix}${extensionPart}`;
          }
        } else if (renameMode === "regex") {
          if (regexObj) {
            try {
              if (preserveExtension) {
                const replacedBase = base.replace(regexObj, regexReplace);
                newName = `${replacedBase}${ext}`;
              } else {
                newName = doc.name.replace(regexObj, regexReplace);
              }
            } catch (err) {
              newName = doc.name;
            }
          }
        }

        // Strip illegal filesystem characters if needed
        newName = newName.trim() || doc.name;

        return {
          id: doc.id,
          originalName: doc.name,
          newName,
          isChanged: newName !== doc.name,
          category: doc.category,
        };
      });
  }, [
    allDocs,
    targetDocIds,
    renameMode,
    prefix,
    startNumber,
    digitPadding,
    suffix,
    namingFormat,
    preserveExtension,
    regexFind,
    regexReplace,
    caseInsensitive,
    globalMatch,
  ]);

  const handleApply = () => {
    const changes = previewList
      .filter((p) => p.isChanged)
      .map((p) => ({
        id: p.id,
        newName: p.newName,
      }));

    if (changes.length === 0) {
      showToast("ℹ️ No name changes detected to apply.");
      onClose();
      return;
    }

    onApplyRename(changes);
    showToast(`✨ Successfully batch renamed ${changes.length} document${changes.length > 1 ? "s" : ""}.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Batch Document Renamer</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-700/50 font-bold uppercase">
                  {targetDocIds.length} Selected
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Rename multiple agreements using sequential numbering or regex pattern substitutions.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setRenameMode("sequential")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                renameMode === "sequential"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Hash className="w-4 h-4" />
              Sequential Numbering
            </button>
            <button
              type="button"
              onClick={() => setRenameMode("regex")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                renameMode === "regex"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Binary className="w-4 h-4" />
              Regex Pattern Replacement
            </button>
          </div>

          {/* Sequential Numbering Configuration Panel */}
          {renameMode === "sequential" && (
            <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  Sequential Parameters
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Example: {prefix}_{String(startNumber).padStart(digitPadding, "0")}{suffix}.pdf
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1">Prefix</label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="e.g. Agreement"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1">Start Number</label>
                  <input
                    type="number"
                    min="0"
                    value={startNumber}
                    onChange={(e) => setStartNumber(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1">Number Padding</label>
                  <select
                    value={digitPadding}
                    onChange={(e) => setDigitPadding(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value={1}>1, 2, 3... (None)</option>
                    <option value={2}>01, 02, 03... (2 Digits)</option>
                    <option value={3}>001, 002, 003... (3 Digits)</option>
                    <option value={4}>0001, 0002... (4 Digits)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1">Suffix</label>
                  <input
                    type="text"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    placeholder="e.g. _Final"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1">Naming Structure</label>
                  <select
                    value={namingFormat}
                    onChange={(e) => setNamingFormat(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="prefix_num">[Prefix]_[Number][Suffix]</option>
                    <option value="prefix_num_original">[Prefix]_[Number]_[OriginalName][Suffix]</option>
                    <option value="original_num">[OriginalName]_[Number][Suffix]</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={preserveExtension}
                      onChange={(e) => setPreserveExtension(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-1 focus:ring-indigo-500 accent-indigo-600"
                    />
                    <span className="text-xs text-slate-300">Preserve original file extension (.pdf, etc.)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Regex Pattern Replacement Configuration Panel */}
          {renameMode === "regex" && (
            <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Binary className="w-3.5 h-3.5" />
                  Regular Expression Match & Replace
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Standard JavaScript regex rules apply
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1">
                    Find Pattern (Regex)
                  </label>
                  <input
                    type="text"
                    value={regexFind}
                    onChange={(e) => setRegexFind(e.target.value)}
                    placeholder="e.g. \\s+ or ^Draft_"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  {regexError ? (
                    <p className="text-[10px] text-red-400 font-mono mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {regexError}
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                      Quick patterns: <code className="text-indigo-300">\\s+</code> (spaces),{" "}
                      <code className="text-indigo-300">^Doc</code> (start),{" "}
                      <code className="text-indigo-300">\\d+</code> (numbers)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1">
                    Replace With
                  </label>
                  <input
                    type="text"
                    value={regexReplace}
                    onChange={(e) => setRegexReplace(e.target.value)}
                    placeholder="e.g. _ or ALM_Final_"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Replacement text to insert into matching substrings
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={caseInsensitive}
                    onChange={(e) => setCaseInsensitive(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-1 focus:ring-amber-500 accent-amber-500"
                  />
                  <span className="text-xs text-slate-300">Case-insensitive (/i)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={globalMatch}
                    onChange={(e) => setGlobalMatch(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-1 focus:ring-amber-500 accent-amber-500"
                  />
                  <span className="text-xs text-slate-300">Replace all occurrences (/g)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={preserveExtension}
                    onChange={(e) => setPreserveExtension(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-1 focus:ring-amber-500 accent-amber-500"
                  />
                  <span className="text-xs text-slate-300">Preserve file extension</span>
                </label>
              </div>
            </div>
          )}

          {/* Document Scope & Live Preview Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Live Transformation Preview
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {previewList.filter((p) => p.isChanged).length} of {targetDocIds.length} will change
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold"
                >
                  Select All ({allDocs.length})
                </button>
                <span className="text-slate-600">·</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] text-slate-500 hover:text-slate-300 font-bold"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-[10px] uppercase font-mono text-slate-400 sticky top-0 border-b border-slate-800 z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">Inc.</th>
                    <th className="py-2.5 px-3">Original Document Name</th>
                    <th className="py-2.5 px-3 w-6 text-center"></th>
                    <th className="py-2.5 px-3">Proposed New Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {allDocs.map((doc) => {
                    const isIncluded = targetDocIds.includes(doc.id);
                    const previewItem = previewList.find((p) => p.id === doc.id);
                    const isChanged = previewItem?.isChanged || false;
                    const newName = previewItem?.newName || doc.name;

                    return (
                      <tr
                        key={doc.id}
                        className={`transition-colors hover:bg-slate-900/60 ${
                          !isIncluded ? "opacity-40 bg-slate-950/40" : isChanged ? "bg-indigo-950/20" : ""
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleDoc(doc.id)}
                            className="text-slate-400 hover:text-white"
                          >
                            {isIncluded ? (
                              <CheckSquare className="w-4 h-4 text-amber-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600" />
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px] truncate max-w-[220px]">
                          <span title={doc.name}>{doc.name}</span>
                        </td>
                        <td className="py-2.5 px-1 text-center text-slate-500">
                          <ArrowRight className="w-3.5 h-3.5 inline text-slate-600" />
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] truncate max-w-[260px]">
                          {isIncluded ? (
                            isChanged ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-1.5" title={newName}>
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                {newName}
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">No change</span>
                            )
                          ) : (
                            <span className="text-slate-600 italic">Excluded</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400">
            <span>
              Targeting <strong className="text-white">{targetDocIds.length}</strong> documents (
              <strong className="text-emerald-400">
                {previewList.filter((p) => p.isChanged).length}
              </strong>{" "}
              modifications ready)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={previewList.filter((p) => p.isChanged).length === 0}
              onClick={handleApply}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Apply Batch Rename ({previewList.filter((p) => p.isChanged).length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
