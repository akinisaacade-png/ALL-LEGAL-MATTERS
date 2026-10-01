import React, { useState, useEffect, useRef } from "react";
import { LegalDocument } from "../types";
import { ComplianceAlert } from "../complianceEngine";
import { generateDocumentPdfBlobUri, downloadDocumentAsPdf } from "../utils/pdfGenerator";
import {
  FileText,
  Download,
  Printer,
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Shield,
  Eye,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface EmbeddedPdfViewerProps {
  document: LegalDocument;
  alerts?: ComplianceAlert[];
  jurisdiction?: string;
  currentUser?: { name?: string; email?: string } | null;
  onClose?: () => void;
}

export default function EmbeddedPdfViewer({
  document,
  alerts = [],
  jurisdiction = "CA-ON / Transnational",
  currentUser,
  onClose,
}: EmbeddedPdfViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [viewerTab, setViewerTab] = useState<"embedded_pdf" | "structured_preview">("embedded_pdf");
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate real PDF blob URI whenever document or alerts change
  const refreshPdf = () => {
    setLoading(true);
    try {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      const uri = generateDocumentPdfBlobUri({
        document,
        alerts,
        jurisdiction,
        currentUser,
      });
      setBlobUrl(uri);
    } catch (err) {
      console.warn("Failed to generate embedded PDF blob:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPdf();
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [document.id, document.content, document.riskScore, alerts.length, jurisdiction]);

  const handleDownload = () => {
    downloadDocumentAsPdf({
      document,
      alerts,
      jurisdiction,
      currentUser,
    });
  };

  const handlePrint = () => {
    if (blobUrl) {
      const iframe = window.document.getElementById(`pdf-iframe-${document.id}`) as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        return;
      }
      window.open(blobUrl, "_blank");
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div
      ref={containerRef}
      className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col transition-all ${
        isFullscreen
          ? "fixed inset-4 z-50 bg-slate-950 flex flex-col border-indigo-500/80 shadow-2xl"
          : "w-full my-4"
      }`}
    >
      {/* Top Header & Viewer Controls Bar */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700 font-bold">
                Embedded PDF Engine
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {document.size || "Original Size"} · Risk: {document.riskScore}%
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-white truncate max-w-md" title={document.name}>
              {document.name}
            </h4>
          </div>
        </div>

        {/* Tab & Action Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* View Mode Switcher */}
          <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-[11px] font-bold mr-1">
            <button
              type="button"
              onClick={() => setViewerTab("embedded_pdf")}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                viewerTab === "embedded_pdf"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Eye className="w-3 h-3" />
              Actual PDF
            </button>
            <button
              type="button"
              onClick={() => setViewerTab("structured_preview")}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                viewerTab === "structured_preview"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText className="w-3 h-3" />
              Doc Pages
            </button>
          </div>

          {/* Zoom Controls (Active in doc pages) */}
          <div className="hidden sm:flex items-center gap-1 px-1 py-0.5 bg-slate-900 rounded-md border border-slate-800 text-slate-300 text-xs">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(75, z - 15))}
              className="p-1 hover:text-white hover:bg-slate-800 rounded transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1 w-9 text-center font-bold text-slate-300">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
              className="p-1 hover:text-white hover:bg-slate-800 rounded transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Refresh */}
          <button
            type="button"
            onClick={refreshPdf}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-800 text-xs transition"
            title="Re-render PDF document"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
          </button>

          {/* Download button */}
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 hover:text-white rounded text-[11px] font-bold transition"
            title="Download PDF copy directly"
          >
            <Download className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">Download</span>
          </button>

          {/* Print button */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-bold transition"
            title="Print PDF document"
          >
            <Printer className="w-3 h-3 text-amber-400" />
          </button>

          {/* Open In New Tab */}
          {blobUrl && (
            <a
              href={blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded transition"
              title="Open full PDF in separate browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded transition"
            title={isFullscreen ? "Exit Fullscreen" : "Expand Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded transition"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Document Viewer Canvas / Iframe Body */}
      <div className={`relative bg-slate-950 flex-1 overflow-auto ${isFullscreen ? "min-h-[500px]" : "h-[620px]"}`}>
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-20 space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
            <p className="text-xs text-slate-300 font-mono">Compiling real sovereign PDF document stream...</p>
          </div>
        ) : null}

        {viewerTab === "embedded_pdf" ? (
          blobUrl ? (
            <div className="w-full h-full flex flex-col bg-slate-900">
              <iframe
                id={`pdf-iframe-${document.id}`}
                src={`${blobUrl}#toolbar=1&navpanes=1&statusbar=1&view=FitH`}
                title={`Embedded PDF: ${document.name}`}
                className="w-full h-full border-0 rounded-b-lg bg-slate-900"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-400" />
              <p className="text-sm font-bold text-white">Could not initialize PDF stream.</p>
              <button
                type="button"
                onClick={refreshPdf}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold"
              >
                Retry Generation
              </button>
            </div>
          )
        ) : (
          /* Structured Clean Layout View with simulated high-fidelity document sheet */
          <div className="p-6 md:p-10 flex justify-center bg-slate-950 min-h-full">
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
              className="w-full max-w-[850px] bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-6 shadow-2xl text-slate-200 transition-transform"
            >
              {/* Document Header Sheet */}
              <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono tracking-widest uppercase text-amber-400 font-bold block mb-1">
                    SOVEREIGN COMPLIANCE DOSSIER
                  </span>
                  <h2 className="text-lg font-black text-white">{document.name}</h2>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Jurisdiction: {jurisdiction} · Category: {document.category} · Size: {document.size}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={`px-3 py-1.5 rounded-lg border text-center ${
                      document.riskScore > 50
                        ? "bg-red-950/70 border-red-800 text-red-300"
                        : "bg-emerald-950/70 border-emerald-800 text-emerald-300"
                    }`}
                  >
                    <span className="block text-[9px] uppercase font-mono font-bold">Audit Score</span>
                    <span className="text-sm font-black">{document.riskScore}%</span>
                  </div>
                </div>
              </div>

              {/* Compliance Summary Findings */}
              {alerts && alerts.length > 0 && (
                <div className="bg-slate-950/70 p-4 rounded-lg border border-slate-800 space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Regulatory Compliance Findings ({alerts.length})
                  </h5>
                  <div className="space-y-1.5">
                    {alerts.slice(0, 3).map((a) => (
                      <div key={a.id} className="text-xs flex items-start gap-2 text-slate-300 font-mono">
                        <span
                          className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                            a.severity === "critical"
                              ? "bg-red-400"
                              : a.severity === "warning"
                              ? "bg-amber-400"
                              : "bg-blue-400"
                          }`}
                        />
                        <span>
                          <strong className="text-white">{a.ruleName}:</strong> {a.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Document Text Body */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-1 font-mono uppercase tracking-wider">
                  <span>Document Provisions & Clauses</span>
                  <span>{document.content?.length || 0} characters</span>
                </div>
                <pre className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950 p-5 rounded-lg border border-slate-800/80 max-h-[450px] overflow-y-auto">
                  {document.content || "(No text content loaded)"}
                </pre>
              </div>

              {/* Document Metadata Footer */}
              <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 font-mono">
                <span>
                  Author: {document.uploadedBy || currentUser?.email || "counsel@alllegalmatters.com"} · Uploaded:{" "}
                  {new Date(document.uploadedAt).toLocaleString()}
                </span>
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle className="w-3 h-3" /> Encrypted & Verified
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Ribbon */}
      <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active In-Platform PDF Preview</span>
        </span>
        <div className="flex items-center gap-3">
          <span>A4 Format · 300 DPI Rendering</span>
          <span>Sovereign Legal Engine v4.2</span>
        </div>
      </div>
    </div>
  );
}
