import React, { useState } from "react";
import {
  Printer,
  Download,
  X,
  FileText,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Layers,
  Files,
  Trash2,
  Sparkles,
  Info,
  Calendar,
  CheckSquare,
  Square
} from "lucide-react";
import { LegalDocument } from "../types";
import { downloadBulkDocumentsAsPdf } from "../utils/pdfGenerator";

interface BulkDocumentExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDocs: LegalDocument[];
  allDocs: LegalDocument[];
  onToggleDoc: (docId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  jurisdiction?: string;
  currentUser?: { name?: string; email?: string } | null;
  showToast: (msg: string) => void;
}

export const BulkDocumentExportModal: React.FC<BulkDocumentExportModalProps> = ({
  isOpen,
  onClose,
  selectedDocs,
  allDocs,
  onToggleDoc,
  onSelectAll,
  onClearAll,
  jurisdiction = "CA-ON / Transnational",
  currentUser,
  showToast,
}) => {
  const [bundleTitle, setBundleTitle] = useState("Sovereign Vault Portfolio Compendium");
  const [customFilename, setCustomFilename] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const avgRisk =
    selectedDocs.length > 0
      ? Math.round(selectedDocs.reduce((acc, d) => acc + (d.riskScore || 0), 0) / selectedDocs.length)
      : 0;

  const criticalViolations = selectedDocs.filter((d) => (d.riskScore || 0) >= 50).length;

  const handleExport = async () => {
    if (selectedDocs.length === 0) {
      showToast("⚠️ Please select at least one document to export.");
      return;
    }

    setIsExporting(true);
    try {
      const finalFilename = customFilename.trim()
        ? customFilename.trim()
        : `Combined_Vault_Bundle_${selectedDocs.length}_Documents.pdf`;

      downloadBulkDocumentsAsPdf({
        documents: selectedDocs,
        jurisdiction,
        currentUser,
        bundleTitle: bundleTitle.trim() || undefined,
        filename: finalFilename,
      });

      showToast(`📑 Generated combined PDF bundle with ${selectedDocs.length} documents successfully.`);
      onClose();
    } catch (err) {
      console.error("Bulk export error:", err);
      showToast("❌ An error occurred while generating the combined PDF bundle.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-export-title"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase font-black">
                  DOCUMENT VAULT · BUNDLE EXPORT
                </span>
                <span className="text-[9px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.2 rounded font-mono font-bold">
                  {selectedDocs.length} of {allDocs.length} Selected
                </span>
              </div>
              <h3 id="bulk-export-title" className="text-lg font-bold text-white tracking-tight">
                Bulk Print & Combined PDF Portfolio
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-300">
          {/* Executive Portfolio Metrics Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase block font-semibold">
                Total Documents
              </span>
              <p className="text-xl font-black text-white mt-0.5">{selectedDocs.length}</p>
              <span className="text-[9px] text-slate-500 font-mono">
                {selectedDocs.length === allDocs.length ? "Full vault portfolio" : "Custom subset"}
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase block font-semibold">
                Avg Risk Score
              </span>
              <p
                className={`text-xl font-black mt-0.5 ${
                  avgRisk >= 50 ? "text-red-400" : avgRisk >= 25 ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                {avgRisk}%
              </p>
              <span className="text-[9px] text-slate-500 font-mono">
                {avgRisk >= 50 ? "Elevated exposure" : avgRisk >= 25 ? "Moderate advisory" : "Compliant standard"}
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase block font-semibold">
                Critical Flags
              </span>
              <p className="text-xl font-black text-red-400 mt-0.5">{criticalViolations}</p>
              <span className="text-[9px] text-slate-500 font-mono">Risk index ≥ 50%</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase block font-semibold">
                Jurisdiction
              </span>
              <p className="text-xs font-bold text-indigo-300 mt-1 truncate" title={jurisdiction}>
                {jurisdiction}
              </p>
              <span className="text-[9px] text-slate-500 font-mono">Enforcement venue</span>
            </div>
          </div>

          {/* Quick Selection Toolbar */}
          <div className="flex items-center justify-between bg-slate-950/50 p-2.5 rounded-lg border border-slate-800 text-xs">
            <span className="text-[11px] font-medium text-slate-400">
              Select or deselect documents to include in the combined export bundle:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSelectAll}
                className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold transition-colors"
              >
                Select All ({allDocs.length})
              </button>
              <button
                type="button"
                onClick={onClearAll}
                className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded font-semibold transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Document selection list */}
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {allDocs.map((doc, idx) => {
              const isSelected = selectedDocs.some((d) => d.id === doc.id);
              return (
                <div
                  key={doc.id}
                  onClick={() => onToggleDoc(doc.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-indigo-950/30 border-indigo-500/60 ring-1 ring-indigo-500/40 text-white"
                      : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDoc(doc.id);
                      }}
                      className="text-indigo-400 hover:text-indigo-300 shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                    <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold truncate text-slate-200">{doc.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                        {doc.category} · {doc.size || "Standard"} ·{" "}
                        {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                        doc.riskScore >= 50
                          ? "bg-red-950 text-red-300 border border-red-900"
                          : doc.riskScore >= 25
                          ? "bg-amber-950 text-amber-300 border border-amber-900"
                          : "bg-emerald-950 text-emerald-300 border border-emerald-900"
                      }`}
                    >
                      {doc.riskScore}% Risk
                    </span>
                    {isSelected && (
                      <span className="text-[9px] bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                        Queued
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bundle Customization Settings */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Bundle Customization & PDF Output Settings
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                  Portfolio Bundle Title:
                </label>
                <input
                  type="text"
                  value={bundleTitle}
                  onChange={(e) => setBundleTitle(e.target.value)}
                  placeholder="e.g. Sovereign Vault Portfolio Compendium"
                  className="w-full bg-slate-900 text-xs text-slate-200 p-2 border border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                  Output Filename (Optional):
                </label>
                <input
                  type="text"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  placeholder={`Combined_Vault_Bundle_${selectedDocs.length}_Documents.pdf`}
                  className="w-full bg-slate-900 text-xs text-slate-200 p-2 border border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <p className="text-[10px] text-slate-400 italic">
              The generated combined PDF includes an executive portfolio cover, consolidated Table of Contents,
              verified document metadata, compliance audit risk indicators, detected redlines, and paginated document text.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Privileged & Confidential Export · Compliant with ISO 27001 Legal Safeguards
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedDocs.length === 0 || isExporting}
              onClick={handleExport}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Compiling PDF...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Download Combined PDF ({selectedDocs.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkDocumentExportModal;
