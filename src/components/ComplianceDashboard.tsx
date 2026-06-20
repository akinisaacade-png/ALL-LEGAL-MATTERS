import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { LegalDocument } from "../types";
import { AlertTriangle, ShieldCheck, FileText, CheckCircle2, TrendingUp, Sparkles, HelpCircle, Download } from "lucide-react";
import { jsPDF } from "jspdf";

interface ComplianceDashboardProps {
  documents: LegalDocument[];
  onSelectDoc: (doc: LegalDocument) => void;
  onNavigateToTab: (tab: "counsel" | "vault") => void;
  showToast: (msg: string) => void;
}

export default function ComplianceDashboard({
  documents,
  onSelectDoc,
  onNavigateToTab,
  showToast,
}: ComplianceDashboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedHoverDoc, setSelectedHoverDoc] = useState<LegalDocument | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");
  const [activeSort, setActiveSort] = useState<"risk-desc" | "risk-asc" | "name">("risk-desc");

  const exportPDFReport = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Outer frame padding
      doc.setDrawColor(32, 38, 57);
      doc.setLineWidth(0.5);
      doc.rect(5, 5, 200, 287);

      // Header
      doc.setFillColor(15, 23, 42);
      doc.rect(5, 5, 200, 35, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(18);
      doc.text("SOVEREIGN COMPLIANCE METRICS REPORT", 12, 17);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("AI-POWERED CONTRACT EXPOSURE AUDITER & COMPLIANCE COUNSEL", 12, 23);
      
      // Timestamp
      const dateStr = new Date().toLocaleString();
      doc.text(`Generated At: ${dateStr} (Pacific Standard Time)`, 12, 29);
      doc.text(`Target Auditor Recipient: Akin Isacc (akinisaacade@gmail.com)`, 12, 34);

      // Section: Summary Index
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont("Helvetica", "bold");
      doc.text("1. OVERALL PORTFOLIO METRICS SUMMARY", 12, 50);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Total Audited Documents: ${totalDocs}`, 15, 58);
      doc.text(`Average Risk Index Level: ${avgRiskScore}%`, 15, 64);
      doc.text(`Critical Violation Exposure Alerts: ${highRiskDocs.length} (Requires Immediate Revision)`, 15, 70);
      doc.text(`Monitored Documents: ${medRiskDocs.length}`, 15, 76);
      doc.text(`Fully Compliant/Safe Assets: ${lowRiskDocs.length}`, 15, 82);

      // Horizontal separator line
      doc.setDrawColor(203, 213, 225);
      doc.line(10, 90, 200, 90);

      // Section: Breakdown Table
      doc.setFont("Helvetica", "bold");
      doc.text("2. COMPREHENSIVE DOCUMENT COMPLIANCE REGISTER", 12, 100);

      // Table headers
      doc.setFillColor(241, 245, 249);
      doc.rect(10, 106, 190, 8, "F");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text("Document Name", 12, 111.5);
      doc.text("Domain", 80, 111.5);
      doc.text("Size", 115, 111.5);
      doc.text("Compliance Index", 145, 111.5);
      doc.text("Alert Level", 175, 111.5);

      let currentY = 118;
      documents.forEach((d) => {
        if (currentY > 265) {
          doc.addPage();
          // Inner border for new page
          doc.setDrawColor(32, 38, 57);
          doc.rect(5, 5, 200, 287);
          currentY = 20;

          // Re-print header block minimal
          doc.setFillColor(15, 23, 42);
          doc.rect(5, 5, 200, 15, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(10);
          doc.text("SOVEREIGN COMPLIANCE METRICS REPORT (CONTINUED)", 12, 14);
          currentY = 30;
        }

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        
        const truncName = d.name.length > 32 ? d.name.substring(0, 30) + "..." : d.name;
        doc.text(truncName, 12, currentY);
        doc.text(d.category.toUpperCase(), 80, currentY);
        doc.text(d.size, 115, currentY);
        doc.text(`${d.riskScore}%`, 145, currentY);

        let level = "SAFE / COMPLIANT";
        if (d.riskScore > 50) {
          level = "CRITICAL LIMIT";
          doc.setTextColor(220, 38, 38);
          doc.setFont("Helvetica", "bold");
        } else if (d.riskScore > 20) {
          level = "AUDIT REVIEW";
          doc.setTextColor(217, 119, 6);
          doc.setFont("Helvetica", "bold");
        } else {
          doc.setTextColor(5, 150, 105);
        }
        doc.text(level, 175, currentY);

        // Draw subtle row bottom light gray line
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        doc.line(10, currentY + 3, 200, currentY + 3);

        currentY += 8;
      });

      // Space for signature escrow audit statement
      currentY += 10;
      if (currentY > 240) {
        doc.addPage();
        doc.setDrawColor(32, 38, 57);
        doc.rect(5, 5, 200, 287);
        currentY = 20;
      }

      doc.setFont("Helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Verification Statement: The elements generated above have been synthesized securely via localized", 12, currentY);
      doc.text("state assessment parameters matching sovereign subnational judicial frameworks.", 12, currentY + 4);

      // Save
      doc.save("Sovereign_Compliance_Report.pdf");
      showToast("PDF compliance report downloaded successfully.");
    } catch (err) {
      console.error(err);
      showToast("Could not assemble PDF. Check console for error trace.");
    }
  };

  // Summary Metrics
  const totalDocs = documents.length;
  const highRiskDocs = documents.filter((d) => d.riskScore > 50);
  const medRiskDocs = documents.filter((d) => d.riskScore > 20 && d.riskScore <= 50);
  const lowRiskDocs = documents.filter((d) => d.riskScore <= 20);

  const avgRiskScore = totalDocs > 0 
    ? Math.round(documents.reduce((acc, d) => acc + d.riskScore, 0) / totalDocs) 
    : 0;

  // Categories list
  const categories = ["all", ...Array.from(new Set(documents.map((d) => d.category)))];

  // Filter & Sort
  const filteredDocs = documents
    .filter((d) => activeCategoryFilter === "all" || d.category === activeCategoryFilter)
    .sort((a, b) => {
      if (activeSort === "risk-desc") return b.riskScore - a.riskScore;
      if (activeSort === "risk-asc") return a.riskScore - b.riskScore;
      return a.name.localeCompare(b.name);
    });

  // Parse file size into numeric relative weight for D3 bubble sizing
  const getDocWeight = (sizeStr: string): number => {
    const num = parseFloat(sizeStr.replace(/[^0-9.]/g, ""));
    if (isNaN(num)) return 10;
    if (sizeStr.toLowerCase().includes("kb")) return Math.max(8, Math.min(15, num / 20));
    if (sizeStr.toLowerCase().includes("mb")) return Math.max(16, Math.min(30, num * 5));
    return 12;
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || filteredDocs.length === 0) return;

    // Clear previous SVG contents
    d3.select(svgRef.current).selectAll("*").remove();

    const containerWidth = containerRef.current.getBoundingClientRect().width || 600;
    const height = 340;
    const margin = { top: 40, right: 100, bottom: 50, left: 60 };
    const width = containerWidth - margin.left - margin.right;

    const svg = d3
      .select(svgRef.current)
      .attr("width", containerWidth)
      .attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Add glowing filter definitions for high risk
    const defs = svg.append("defs");
    
    const glowFilter = defs.append("filter")
      .attr("id", "glow-high-risk")
      .attr("x", "-20%")
      .attr("y", "-20%")
      .attr("width", "140%")
      .attr("height", "140%");

    glowFilter.append("feGaussianBlur")
      .attr("stdDeviation", "8")
      .attr("result", "blur");

    glowFilter.append("feComposite")
      .attr("in", "SourceGraphic")
      .attr("in2", "blur")
      .attr("operator", "over");

    // Scales
    const xScale = d3.scalePoint()
      .domain(Array.from(new Set(filteredDocs.map(d => d.category))))
      .range([40, width - 40])
      .padding(0.5);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([height - margin.top - margin.bottom, 10]);

    // X & Y Gridlines
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
      .call(
        d3.axisBottom(xScale)
          .tickSize(-(height - margin.top - margin.bottom - 10))
          .tickFormat(() => "")
      )
      .selectAll("line")
      .attr("stroke", "#1e293b")
      .attr("stroke-dasharray", "3,3")
      .attr("opacity", 0.5);

    g.append("g")
      .attr("class", "grid")
      .call(
        d3.axisLeft(yScale)
          .ticks(5)
          .tickSize(-width)
          .tickFormat(() => "")
      )
      .selectAll("line")
      .attr("stroke", "#1e293b")
      .attr("stroke-dasharray", "3,3")
      .attr("opacity", 0.5);

    // Axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(d => `${d}%`);

    const xAxisG = g.append("g")
      .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
      .call(xAxis);

    xAxisG.selectAll("text")
      .attr("fill", "#94a3b8")
      .attr("font-size", "10px")
      .attr("font-weight", "600")
      .attr("text-transform", "uppercase")
      .attr("dy", "1em");

    xAxisG.select(".domain").attr("stroke", "#334155");
    xAxisG.selectAll("line").attr("stroke", "#334155");

    const yAxisG = g.append("g")
      .call(yAxis);

    yAxisG.selectAll("text")
      .attr("fill", "#94a3b8")
      .attr("font-size", "10px")
      .attr("font-family", "monospace");

    yAxisG.select(".domain").attr("stroke", "#334155");
    yAxisG.selectAll("line").attr("stroke", "#334155");

    // Y Axis Label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -50)
      .attr("x", -(height - margin.top - margin.bottom) / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .attr("fill", "#64748b")
      .attr("font-size", "9px")
      .attr("font-weight", "bold")
      .attr("letter-spacing", "0.05em")
      .text("COMPLIANCE RISK EXPOSURE STATUS");

    // Guidelines for risk zones
    const zones = [
      { max: 100, min: 50, color: "rgba(239, 68, 68, 0.04)", text: "CRITICAL REVISION ZONE", textY: 30, textColor: "rgba(239, 68, 68, 0.4)" },
      { max: 50, min: 20, color: "rgba(245, 158, 11, 0.02)", text: "MONITOR & AUDIT ZONE", textY: 130, textColor: "rgba(245, 158, 11, 0.3)" },
      { max: 20, min: 0, color: "rgba(16, 185, 129, 0.02)", text: "COMPLIANT / SAFE ZONE", textY: 215, textColor: "rgba(16, 185, 129, 0.3)" }
    ];

    zones.forEach(zone => {
      g.append("rect")
        .attr("x", 0)
        .attr("y", yScale(zone.max))
        .attr("width", width)
        .attr("height", yScale(zone.min) - yScale(zone.max))
        .attr("fill", zone.color);

      g.append("text")
        .attr("x", width - 10)
        .attr("y", yScale((zone.max + zone.min) / 2))
        .attr("dy", "0.3em")
        .attr("text-anchor", "end")
        .attr("fill", zone.textColor)
        .attr("font-size", "8px")
        .attr("font-weight", "black")
        .attr("letter-spacing", "0.08em")
        .text(zone.text);
    });

    // Draw document node bubbles with d3 forces/scatter mapping
    const bubbles = g.selectAll(".doc-bubble")
      .data(filteredDocs)
      .enter()
      .append("g")
      .attr("class", "doc-bubble")
      .attr("transform", d => {
        const xVal = xScale(d.category) || (width / 2);
        const yVal = yScale(d.riskScore);
        return `translate(${xVal}, ${yVal})`;
      })
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        setSelectedHoverDoc(d);
        // Dim others
        d3.selectAll(".doc-bubble")
          .style("opacity", 0.3);
        d3.select(this)
          .style("opacity", 1)
          .select("circle")
          .attr("stroke-width", 3)
          .attr("stroke", "#ffb000");
      })
      .on("mouseleave", function () {
        setSelectedHoverDoc(null);
        d3.selectAll(".doc-bubble")
          .style("opacity", 1);
        d3.select(this)
          .select("circle")
          .attr("stroke-width", d => (d as LegalDocument).riskScore > 50 ? 2 : 1)
          .attr("stroke", d => {
            const risk = (d as LegalDocument).riskScore;
            return risk > 50 ? "#ef4444" : risk > 20 ? "#f59e0b" : "#10b981";
          });
      })
      .on("click", (event, d) => {
        onSelectDoc(d);
        showToast(`Loaded ${d.name} details from compliance workspace.`);
      });

    // Outer ring for high-risk elements
    bubbles.filter(d => d.riskScore > 50)
      .append("circle")
      .attr("r", d => getDocWeight(d.size) + 7)
      .attr("fill", "none")
      .attr("stroke", "rgba(239, 68, 68, 0.4)")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4,2")
      .attr("class", "animate-spin-slow")
      .style("animation", "spin 10s linear infinite");

    // Main circle representor
    bubbles.append("circle")
      .attr("r", d => getDocWeight(d.size))
      .attr("fill", d => {
        if (d.riskScore > 50) return "rgba(185, 28, 28, 0.85)"; // Red
        if (d.riskScore > 20) return "rgba(217, 119, 6, 0.85)"; // Orange
        return "rgba(4, 120, 87, 0.85)"; // Green
      })
      .attr("stroke", d => {
        if (d.riskScore > 50) return "#ef4444";
        if (d.riskScore > 20) return "#f59e0b";
        return "#10b981";
      })
      .attr("stroke-width", d => d.riskScore > 50 ? 2.5 : 1.5)
      .attr("shadow", d => d.riskScore > 50 ? "0 0 10px #ef4444" : "none");

    // Little inner node status indicator
    bubbles.append("circle")
      .attr("r", 2)
      .attr("fill", "#ffffff")
      .attr("opacity", 0.8);

    // Dynamic clean text label on map if total text documents fits
    bubbles.append("text")
      .attr("y", d => -getDocWeight(d.size) - 6)
      .attr("text-anchor", "middle")
      .attr("fill", "#f8fafc")
      .attr("font-size", "8.5px")
      .attr("font-weight", d => d.riskScore > 50 ? "black" : "medium")
      .attr("background-color", "rgba(15, 23, 42, 0.8)")
      .text(d => d.name.length > 20 ? d.name.substring(0, 18) + "..." : d.name);

  }, [filteredDocs, activeCategoryFilter, activeSort]);

  // Set Resize Listener
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      // Force trigger re-render of SVGs
      setActiveCategoryFilter(prev => prev);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div id="compliance-dashboard-panel" className="space-y-6">
      {/* Top Banner section */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/60 p-6 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
            <h2 className="text-lg font-black text-white uppercase tracking-wider">D3.js Sovereign Compliances & Risks</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Live interactive analytics dashboard mapping legal risk structures, non-compliant clauses, and enforcement issues mapped against subnational requirements in real-time.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportPDFReport}
            id="export-pdf-compliance-dashboard"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white border border-indigo-500 rounded hover:border-indigo-400 transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            Export PDF Report
          </button>
          <button
            onClick={() => {
              onNavigateToTab("vault");
              showToast("Opening secure loader...");
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-200 border border-slate-700/80 rounded hover:border-slate-600 transition-all flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            Ingest Agreement Form
          </button>
        </div>
      </div>

      {/* Metric Bento Summary blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 - Average Compliance Risk */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Average Risk Index</span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-3xl font-black ${avgRiskScore > 50 ? "text-red-400 animate-pulse" : avgRiskScore > 20 ? "text-amber-400" : "text-emerald-400"}`}>
                {avgRiskScore}%
              </span>
              <span className="text-[9px] text-slate-500 font-mono">AVG</span>
            </div>
            <p className="text-[9px] text-slate-400 italic">Across {totalDocs} scanned files</p>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-indigo-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 - High Risk Alerts */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-red-400 uppercase font-black tracking-wider block">Critical Revisions</span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-3xl font-black ${highRiskDocs.length > 0 ? "text-red-400" : "text-slate-400"}`}>
                {highRiskDocs.length}
              </span>
              <span className="text-[9px] text-slate-500 font-mono">High Exposure</span>
            </div>
            <p className="text-[9px] text-slate-500">Require immediate redressal</p>
          </div>
          <div className={`p-3 rounded-lg border text-red-400 ${highRiskDocs.length > 0 ? "bg-red-950/40 border-red-800/60 animate-pulse" : "bg-slate-900/40 border-slate-850"}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 - Safe Zone Documents */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">Compliant Safe Zone</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-emerald-400">
                {lowRiskDocs.length}
              </span>
              <span className="text-[9px] text-slate-500 font-mono">Passed</span>
            </div>
            <p className="text-[9px] text-slate-400">Risk below 20%</p>
          </div>
          <div className="p-3 bg-emerald-950/20 rounded-lg border border-emerald-900/50 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4 - Total Encrypted */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Vault Footprint</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-indigo-400">
                {totalDocs}
              </span>
              <span className="text-[9px] text-slate-500 font-mono">Files Locked</span>
            </div>
            <p className="text-[9px] text-slate-400">SHA-256 local isolation</p>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-indigo-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main D3 Canvas Block & List Splitting */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Right Panel/Left Panel: The Interactive Chart */}
        <div className="lg:col-span-8 bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-900 pb-3 gap-3">
            <div>
              <span className="bg-indigo-950 text-indigo-400 border border-indigo-900 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider block w-fit">
                Interactive D3 Layout Canvas
              </span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-1.5">Contract Risk Mapping Scatter Grid</h3>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">Category:</span>
                <select
                  value={activeCategoryFilter}
                  onChange={(e) => setActiveCategoryFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 p-1.5 text-xs text-white rounded font-mono"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === "all" ? "ALL FILES" : cat.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">Sort:</span>
                <select
                  value={activeSort}
                  onChange={(e: any) => setActiveSort(e.target.value)}
                  className="bg-slate-900 border border-slate-700 p-1.5 text-xs text-white rounded font-mono"
                >
                  <option value="risk-desc">RISK (DESC)</option>
                  <option value="risk-asc">RISK (ASC)</option>
                  <option value="name">NAME (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {totalDocs === 0 ? (
            <div className="py-24 text-center border border-dashed border-slate-800 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2 animate-bounce" />
              <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">No Audited documents available to map in D3.</p>
              <button
                onClick={() => onNavigateToTab("vault")}
                className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-bold rounded"
              >
                Ingest Sample Files
              </button>
            </div>
          ) : (
            <div ref={containerRef} className="relative bg-slate-900/40 rounded-lg border border-slate-900 p-2 overflow-hidden">
              {/* Plot canvas */}
              <svg ref={svgRef} className="mx-auto block overflow-visible select-none"></svg>

              {/* Float Tooltip Details Box over SVG */}
              <div className="absolute top-2 left-2 bg-slate-950/95 border border-slate-800 p-3 rounded-lg max-w-[280px] pointer-events-none transition-all shadow-xl backdrop-blur">
                {selectedHoverDoc ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-900 pb-1">
                      <span className="text-white font-bold text-[10px] truncate max-w-[150px]">{selectedHoverDoc.name}</span>
                      <span className={`text-[9px] font-bold px-1.5 rounded ${
                        selectedHoverDoc.riskScore > 50 ? "bg-red-950 text-red-300 border border-red-900" : "bg-emerald-950 text-emerald-300 border border-emerald-900"
                      }`}>
                        {selectedHoverDoc.riskScore}% Risk
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-slate-400">
                      <div>
                        <span className="text-slate-500 font-bold block uppercase font-mono">Category:</span>
                        <span className="text-slate-350">{selectedHoverDoc.category}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block uppercase font-mono">File Size:</span>
                        <span className="text-slate-350">{selectedHoverDoc.size}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight italic truncate">"{selectedHoverDoc.content}"</p>
                    <span className="text-[8px] text-indigo-400 block font-bold uppercase tracking-wider font-mono">ℹ️ Click Node to open Details</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[9.5px] font-mono uppercase text-slate-500 tracking-wider">Hover node bubbles to audit details</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Left/Right Sidebar: Classified risks and quick launch */}
        <div className="lg:col-span-4 bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-900 pb-2">
              <span className="text-[9px] font-mono text-amber-500 font-bold uppercase tracking-wider">SOVEREIGN WORKSPACE LIST</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-0.5">Documents Audited ({filteredDocs.length})</h3>
            </div>

            <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => {
                    onSelectDoc(doc);
                    showToast(`Selected ${doc.name}`);
                  }}
                  className="bg-slate-900 hover:bg-slate-850 p-2.5 rounded border border-slate-800 hover:border-slate-705 flex items-center justify-between gap-3 cursor-pointer group transition-all"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className={`w-4 h-4 shrink-0 ${doc.riskScore > 50 ? "text-red-400" : doc.riskScore > 20 ? "text-amber-400" : "text-emerald-400"}`} />
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-300 group-hover:text-white truncate">{doc.name}</p>
                      <p className="text-[9px] font-mono text-slate-500 uppercase">{doc.category} · {doc.size}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      doc.riskScore > 50 ? "bg-red-950/60 text-red-300 border border-red-900" :
                      doc.riskScore > 20 ? "bg-amber-950/60 text-amber-300 border border-amber-900" :
                      "bg-emerald-950/60 text-emerald-300 border border-emerald-900"
                    }`}>
                      {doc.riskScore}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-900 mt-4 space-y-2">
            <div className="bg-indigo-950/30 border border-indigo-900/60 p-3 rounded-lg">
              <div className="flex items-center gap-1.5 mb-1 text-slate-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: "10s" }} />
                <span className="text-[10px] font-black uppercase tracking-wider">Quick Redline Counsel</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-snug">
                Audit results can be instantly injected as parameters into the AI Counsel workspace for structural remediation.
              </p>
            </div>

            <button
              onClick={() => {
                onNavigateToTab("counsel");
                showToast("Co-Counsel Workspace activated.");
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase py-2.5 rounded-lg text-center transition-all shadow-md"
            >
              Consult AI Co-Counsel Now
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
