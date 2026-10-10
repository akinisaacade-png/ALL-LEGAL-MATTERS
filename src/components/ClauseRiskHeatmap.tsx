import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { LegalDocument, LegalClause } from "../types";
import {
  AlertTriangle,
  ShieldCheck,
  FileText,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  TrendingUp,
  Download,
  Flame,
  ArrowUpDown,
  Layers,
  Info
} from "lucide-react";

interface ClauseRiskHeatmapProps {
  documents: LegalDocument[];
  onSelectDoc: (doc: LegalDocument) => void;
  onNavigateToTab?: (tab: "counsel" | "vault") => void;
  showToast: (msg: string) => void;
}

// Canonical Clause Categories for the Heatmap Matrix
export const CLAUSE_CATEGORIES = [
  { id: "governing_law", label: "Governing Law / Forum", keywords: ["governing law", "jurisdiction", "forum", "london", "new york", "court"] },
  { id: "damages", label: "Liquidated Damages / Penalties", keywords: ["liquidated damages", "damages", "penalty", "leak", "punitive", "indemnity"] },
  { id: "confidentiality", label: "Confidentiality & Lockup", keywords: ["confidentiality", "confidential", "lockup", "non-disclosure", "term"] },
  { id: "tenancy_entry", label: "Quiet Enjoyment & Right of Entry", keywords: ["entry", "inspection", "quiet enjoyment", "notice", "sunday", "hours"] },
  { id: "security_deposit", label: "Security Deposit & Escrow", keywords: ["deposit", "security deposit", "escrow", "non-refundable", "hold fee"] },
  { id: "non_compete", label: "Non-Compete & Restrictive Covenants", keywords: ["non-compete", "restrictive", "barred", "compete", "solicit"] },
  { id: "liability", label: "Liability Limitation & Cap", keywords: ["liability", "limitation", "consequential", "warranty", "cap"] },
  { id: "termination", label: "Termination & Early Notice", keywords: ["termination", "terminate", "early exit", "severance", "notice"] },
];

export interface HeatmapCell {
  documentId: string;
  documentName: string;
  document: LegalDocument;
  categoryId: string;
  categoryLabel: string;
  riskScore: number; // 0 (Clean), 1 (Low), 2 (Medium), 3 (High)
  riskLevel: "None" | "Low" | "Medium" | "High";
  matchingClause?: LegalClause;
}

export const ClauseRiskHeatmap: React.FC<ClauseRiskHeatmapProps> = ({
  documents,
  onSelectDoc,
  onNavigateToTab,
  showToast,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<"all" | "high-only">("all");
  const [sortBy, setSortBy] = useState<"density-desc" | "risk-desc" | "name">("density-desc");

  // Build matrix data
  const matrixData = useMemo(() => {
    const cells: HeatmapCell[] = [];

    documents.forEach((doc) => {
      CLAUSE_CATEGORIES.forEach((cat) => {
        // Look for matching clause in doc.clauses
        let matchingClause: LegalClause | undefined = undefined;
        let riskScore = 0;
        let riskLevel: "None" | "Low" | "Medium" | "High" = "None";

        if (doc.clauses && doc.clauses.length > 0) {
          matchingClause = doc.clauses.find((cl) => {
            const titleLower = cl.title.toLowerCase();
            const textLower = cl.text.toLowerCase();
            return cat.keywords.some((kw) => titleLower.includes(kw) || textLower.includes(kw));
          });

          if (matchingClause) {
            if (matchingClause.risk === "High") {
              riskScore = 3;
              riskLevel = "High";
            } else if (matchingClause.risk === "Medium") {
              riskScore = 2;
              riskLevel = "Medium";
            } else {
              riskScore = 1;
              riskLevel = "Low";
            }
          }
        }

        // If no matching explicit clause, but the raw content heavily triggers category keywords, estimate density
        if (!matchingClause && doc.content) {
          const contentLower = doc.content.toLowerCase();
          const matches = cat.keywords.filter((kw) => contentLower.includes(kw));
          if (matches.length >= 2 && doc.riskScore > 50) {
            riskScore = 2;
            riskLevel = "Medium";
          }
        }

        cells.push({
          documentId: doc.id,
          documentName: doc.name,
          document: doc,
          categoryId: cat.id,
          categoryLabel: cat.label,
          riskScore,
          riskLevel,
          matchingClause,
        });
      });
    });

    return cells;
  }, [documents]);

  // Compute document remediation density stats
  const documentStats = useMemo(() => {
    return documents.map((doc) => {
      const docCells = matrixData.filter((c) => c.documentId === doc.id);
      const highRiskCount = docCells.filter((c) => c.riskLevel === "High").length;
      const medRiskCount = docCells.filter((c) => c.riskLevel === "Medium").length;
      const totalDensity = docCells.reduce((acc, curr) => acc + curr.riskScore, 0);

      return {
        doc,
        highRiskCount,
        medRiskCount,
        totalDensity,
        riskScore: doc.riskScore,
      };
    });
  }, [documents, matrixData]);

  // Sorted documents for Y-axis ordering
  const sortedDocuments = useMemo(() => {
    return [...documentStats].sort((a, b) => {
      if (sortBy === "density-desc") {
        if (b.highRiskCount !== a.highRiskCount) return b.highRiskCount - a.highRiskCount;
        return b.totalDensity - a.totalDensity;
      }
      if (sortBy === "risk-desc") {
        return b.riskScore - a.riskScore;
      }
      return a.doc.name.localeCompare(b.doc.name);
    });
  }, [documentStats, sortBy]);

  // Total high-risk clauses in entire vault
  const totalHighRiskClauses = useMemo(() => {
    return matrixData.filter((c) => c.riskLevel === "High").length;
  }, [matrixData]);

  // Render D3 Heatmap
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || sortedDocuments.length === 0) return;

    // Clear previous elements
    d3.select(svgRef.current).selectAll("*").remove();

    const containerWidth = containerRef.current.getBoundingClientRect().width || 800;
    const margin = { top: 90, right: 30, bottom: 40, left: 190 };
    const width = Math.max(760, containerWidth);
    const height = Math.max(340, sortedDocuments.length * 48 + margin.top + margin.bottom);

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    const docIds = sortedDocuments.map((d) => d.doc.id);
    const catIds = CLAUSE_CATEGORIES.map((c) => c.id);

    // Scales
    const xScale = d3
      .scaleBand()
      .domain(catIds)
      .range([margin.left, width - margin.right])
      .padding(0.08);

    const yScale = d3
      .scaleBand()
      .domain(docIds)
      .range([margin.top, height - margin.bottom])
      .padding(0.08);

    // Heatmap Color scale: 0: dark slate, 1: emerald, 2: amber, 3: crimson red
    const colorScale = d3
      .scaleLinear<string>()
      .domain([0, 1, 2, 3])
      .range(["#0f172a", "#065f46", "#d97706", "#ef4444"]);

    // Defs for gradients & filters
    const defs = svg.append("defs");
    const glowFilter = defs.append("filter").attr("id", "highRiskGlow").attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%");
    glowFilter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "blur");
    glowFilter.append("feComposite").attr("in", "SourceGraphic").attr("in2", "blur").attr("operator", "over");

    // X-Axis (Clause Categories) at the top
    const xAxisGroup = svg.append("g").attr("class", "x-axis");

    xAxisGroup
      .selectAll("text")
      .data(CLAUSE_CATEGORIES)
      .enter()
      .append("text")
      .attr("x", (d) => (xScale(d.id) || 0) + xScale.bandwidth() / 2)
      .attr("y", margin.top - 18)
      .attr("text-anchor", "start")
      .attr("transform", (d) => {
        const x = (xScale(d.id) || 0) + xScale.bandwidth() / 2;
        const y = margin.top - 18;
        return `rotate(-32, ${x}, ${y})`;
      })
      .attr("fill", "#cbd5e1")
      .attr("font-size", "10px")
      .attr("font-weight", "600")
      .attr("font-family", "system-ui, -apple-system, sans-serif")
      .text((d) => d.label);

    // Y-Axis (Document Labels) on the left
    const yAxisGroup = svg.append("g").attr("class", "y-axis");

    const docLabels = yAxisGroup
      .selectAll<SVGGElement, any>("g")
      .data(sortedDocuments)
      .enter()
      .append("g")
      .attr("transform", (d: any) => `translate(0, ${(yScale(d.doc.id) || 0) + yScale.bandwidth() / 2})`)
      .attr("class", "cursor-pointer")
      .on("click", (_event, d: any) => {
        onSelectDoc(d.doc);
        showToast(`Selected "${d.doc.name}" for vault remediation.`);
      });

    // Document Name Text
    docLabels
      .append("text")
      .attr("x", margin.left - 12)
      .attr("y", -2)
      .attr("text-anchor", "end")
      .attr("fill", "#f1f5f9")
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .text((d: any) => (d.doc.name.length > 22 ? d.doc.name.substring(0, 20) + "..." : d.doc.name));

    // Document Risk Badge
    docLabels
      .append("text")
      .attr("x", margin.left - 12)
      .attr("y", 11)
      .attr("text-anchor", "end")
      .attr("fill", (d: any) => (d.highRiskCount > 0 ? "#f87171" : "#34d399"))
      .attr("font-size", "9px")
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .text((d: any) => `${d.highRiskCount} High Risk · ${d.riskScore}%`);

    // Heatmap Grid Cells
    const cellsGroup = svg.append("g").attr("class", "heatmap-cells");

    const cellSelection = cellsGroup
      .selectAll<SVGGElement, HeatmapCell>("g")
      .data(matrixData)
      .enter()
      .append("g")
      .attr("transform", (d: HeatmapCell) => `translate(${xScale(d.categoryId) || 0}, ${yScale(d.documentId) || 0})`);

    // Cell Rectangles
    cellSelection
      .append("rect")
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("fill", (d: HeatmapCell) => colorScale(d.riskScore))
      .attr("stroke", (d: HeatmapCell) => (d.riskLevel === "High" ? "#f87171" : "#1e293b"))
      .attr("stroke-width", (d: HeatmapCell) => (d.riskLevel === "High" ? 1.5 : 1))
      .attr("filter", (d: HeatmapCell) => (d.riskLevel === "High" ? "url(#highRiskGlow)" : "none"))
      .attr("opacity", 0)
      .attr("class", "cursor-pointer transition-all")
      .on("mouseenter", (event, d: HeatmapCell) => {
        setHoveredCell(d);
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
        d3.select(event.currentTarget).attr("stroke", "#fbbf24").attr("stroke-width", 2.5);
      })
      .on("mousemove", (event) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      })
      .on("mouseleave", (event, d: HeatmapCell) => {
        setHoveredCell(null);
        setTooltipPos(null);
        d3.select(event.currentTarget)
          .attr("stroke", d.riskLevel === "High" ? "#f87171" : "#1e293b")
          .attr("stroke-width", d.riskLevel === "High" ? 1.5 : 1);
      })
      .on("click", (_event, d: HeatmapCell) => {
        onSelectDoc(d.document);
        showToast(`Remediating clause "${d.categoryLabel}" in ${d.documentName}`);
        if (onNavigateToTab) {
          onNavigateToTab("vault");
        }
      })
      .transition()
      .duration(450)
      .delay((_d: any, idx: number) => (idx % 8) * 40)
      .attr("opacity", (d: HeatmapCell) => {
        if (filterSeverity === "high-only" && d.riskLevel !== "High") {
          return 0.15;
        }
        return d.riskScore === 0 ? 0.45 : 0.95;
      });

    // Cell Content Markers (Icon / Dot inside cell)
    cellSelection
      .filter((d: HeatmapCell) => d.riskScore > 0)
      .append("text")
      .attr("x", xScale.bandwidth() / 2)
      .attr("y", yScale.bandwidth() / 2 + 3.5)
      .attr("text-anchor", "middle")
      .attr("fill", "#ffffff")
      .attr("font-size", (d: HeatmapCell) => (d.riskLevel === "High" ? "11px" : "9px"))
      .attr("font-weight", "900")
      .attr("font-family", "system-ui")
      .attr("pointer-events", "none")
      .text((d: HeatmapCell) => (d.riskLevel === "High" ? "!" : d.riskLevel === "Medium" ? "▲" : "●"));

  }, [sortedDocuments, matrixData, filterSeverity, onSelectDoc, onNavigateToTab, showToast]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Remediation Priority Summary */}
      <div className="bg-slate-950 p-5 sm:p-6 rounded-xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono tracking-widest text-rose-400 uppercase font-black flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
                D3 CLAUSE RISK DENSITY HEATMAP
              </span>
              <span className="text-[9px] bg-red-950/80 text-rose-300 border border-red-800 px-2 py-0.5 rounded font-mono font-bold">
                {totalHighRiskClauses} High-Risk Clusters Detected
              </span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Cross-Document Clause Vulnerability Matrix
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              Identify systemic legal exposure across all agreements in your vault. Dark red cells represent unenforceable, high-risk clauses that demand immediate redline remediation.
            </p>
          </div>

          {/* Quick Filter & Sort Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setFilterSeverity("all")}
                className={`px-3 py-1.5 font-bold rounded-md transition-all ${
                  filterSeverity === "all" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                All Clauses
              </button>
              <button
                type="button"
                onClick={() => setFilterSeverity("high-only")}
                className={`px-3 py-1.5 font-bold rounded-md transition-all flex items-center gap-1 ${
                  filterSeverity === "high-only"
                    ? "bg-rose-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-300" />
                High-Risk Only
              </button>
            </div>

            <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setSortBy("density-desc")}
                className={`px-2.5 py-1.5 font-bold rounded-md transition-all flex items-center gap-1 ${
                  sortBy === "density-desc" ? "bg-amber-500 text-slate-950 font-black shadow" : "text-slate-400 hover:text-white"
                }`}
                title="Sort documents by highest number of high-risk clauses"
              >
                <ArrowUpDown className="w-3 h-3" />
                Urgency Rank
              </button>
              <button
                type="button"
                onClick={() => setSortBy("risk-desc")}
                className={`px-2.5 py-1.5 font-bold rounded-md transition-all ${
                  sortBy === "risk-desc" ? "bg-amber-500 text-slate-950 font-black shadow" : "text-slate-400 hover:text-white"
                }`}
                title="Sort by overall risk score"
              >
                Risk %
              </button>
            </div>
          </div>
        </div>

        {/* Legend strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[11px] text-slate-400 font-bold uppercase">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-900 border border-slate-800 inline-block" />
              <span className="text-slate-400 text-[11px]">Safe / Compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-700 inline-block" />
              <span className="text-emerald-300 text-[11px]">Low Risk</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-600 inline-block" />
              <span className="text-amber-300 text-[11px]">Medium Risk</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-600 border border-rose-400 inline-block animate-pulse" />
              <span className="text-rose-300 font-bold text-[11px]">Critical High Risk (!)</span>
            </div>
          </div>
          <span className="text-[11px] text-indigo-400 italic">
            Tip: Click any cell or document label to remediate instantly in Document Vault.
          </span>
        </div>
      </div>

      {/* Main Heatmap Canvas Section */}
      <div
        ref={containerRef}
        className="relative bg-slate-950 rounded-xl border border-slate-800 p-4 sm:p-6 overflow-x-auto shadow-2xl min-h-[420px]"
      >
        <svg ref={svgRef} className="block select-none mx-auto"></svg>

        {/* Interactive Floating Tooltip */}
        {hoveredCell && tooltipPos && (
          <div
            style={{
              left: `${Math.min(tooltipPos.x + 15, (containerRef.current?.clientWidth || 700) - 280)}px`,
              top: `${Math.max(10, tooltipPos.y - 120)}px`,
            }}
            className="absolute pointer-events-none z-30 bg-slate-900/95 border-2 border-slate-700 p-3.5 rounded-xl shadow-2xl max-w-xs space-y-2 backdrop-blur-md animate-fadeIn"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
              <span className="text-xs font-black text-white truncate">{hoveredCell.documentName}</span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                  hoveredCell.riskLevel === "High"
                    ? "bg-rose-950 text-rose-300 border border-rose-800"
                    : hoveredCell.riskLevel === "Medium"
                    ? "bg-amber-950 text-amber-300 border border-amber-800"
                    : hoveredCell.riskLevel === "Low"
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {hoveredCell.riskLevel} Risk
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                Dimension: {hoveredCell.categoryLabel}
              </span>
              {hoveredCell.matchingClause ? (
                <div className="mt-1 space-y-1">
                  <p className="text-[11px] text-slate-200 italic font-mono bg-slate-950/70 p-1.5 rounded border border-slate-800">
                    "{hoveredCell.matchingClause.text}"
                  </p>
                  <p className="text-[10.5px] text-slate-400 leading-snug">
                    {hoveredCell.matchingClause.analysis}
                  </p>
                </div>
              ) : (
                <p className="text-[10.5px] text-slate-500 italic mt-0.5">
                  No explicit violation flagged in this category.
                </p>
              )}
            </div>

            <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[9px] text-amber-400 font-bold uppercase tracking-wider">
              <span>Click to Remediate in Vault</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        )}
      </div>

      {/* Remediation Action Priority Queue */}
      <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-850 pb-3">
          <div>
            <span className="text-[9px] font-mono text-amber-400 font-bold uppercase tracking-wider block">
              ACTIONABLE REMEDIATION QUEUE
            </span>
            <h4 className="text-base font-bold text-white tracking-tight mt-0.5">
              Ranked Remediation Prioritization
            </h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {sortedDocuments.filter((d) => d.highRiskCount > 0).length} Urgent Agreements
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedDocuments.map((item, index) => {
            const hasUrgent = item.highRiskCount > 0;
            return (
              <div
                key={item.doc.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                  hasUrgent
                    ? "bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/30 border-rose-900/60 shadow-lg hover:border-rose-500/80"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[9px] font-black uppercase font-mono px-2 py-0.5 rounded ${
                        hasUrgent
                          ? "bg-rose-600 text-white shadow"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      Priority #{index + 1}
                    </span>
                    <span
                      className={`text-xs font-black font-mono ${
                        item.riskScore > 50 ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {item.riskScore}% Risk
                    </span>
                  </div>

                  <h5 className="text-xs font-bold text-white truncate" title={item.doc.name}>
                    {item.doc.name}
                  </h5>

                  <p className="text-[11px] text-slate-400">
                    Category: <span className="text-slate-200 capitalize">{item.doc.category}</span>
                  </p>

                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-rose-400 font-bold">
                      {item.highRiskCount} High Risk
                    </span>
                    <span>•</span>
                    <span className="text-amber-400 font-bold">
                      {item.medRiskCount} Medium Risk
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onSelectDoc(item.doc);
                    showToast(`Navigating to Vault for ${item.doc.name}`);
                    if (onNavigateToTab) {
                      onNavigateToTab("vault");
                    }
                  }}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    hasUrgent
                      ? "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                  }`}
                >
                  <span>Remediate in Vault</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
