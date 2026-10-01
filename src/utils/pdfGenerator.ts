import { jsPDF } from "jspdf";
import { LegalDocument } from "../types";
import { ComplianceAlert } from "../complianceEngine";

export interface GeneratePdfOptions {
  document: LegalDocument;
  alerts?: ComplianceAlert[];
  jurisdiction?: string;
  currentUser?: { name?: string; email?: string } | null;
}

export interface GenerateBulkPdfOptions {
  documents: LegalDocument[];
  jurisdiction?: string;
  currentUser?: { name?: string; email?: string } | null;
  bundleTitle?: string;
  filename?: string;
}

/**
 * Builds a formatted jsPDF instance for an active document
 * complete with executive metadata, compliance audit findings, risk indicators,
 * suggested redlines, and paginated document body text.
 */
export function buildDocumentPdf({
  document,
  alerts = [],
  jurisdiction = "CA-ON / Transnational",
  currentUser,
}: GeneratePdfOptions): jsPDF {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  let currentY = 12;

  // Helper for adding footer with page numbers
  const addFooter = (pageNum: number) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    pdf.text(
      "CONFIDENTIAL & PRIVILEGED · ALL LEGAL MATTERS SOVEREIGN PLATFORM · ISO 27001 / SOC2 COMPLIANT",
      margin,
      pageHeight - 8
    );
    pdf.text(`Page ${pageNum}`, pageWidth - margin - 15, pageHeight - 8);
  };

  let pageCount = 1;

  // Header Banner
  pdf.setFillColor(15, 23, 42); // slate-900
  pdf.rect(margin, currentY, contentWidth, 32, "F");

  // Border frame
  pdf.setDrawColor(245, 158, 11); // amber-500 accent
  pdf.setLineWidth(0.8);
  pdf.rect(margin, currentY, contentWidth, 32);

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("ALL LEGAL MATTERS · SOVEREIGN VAULT", margin + 6, currentY + 11);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(245, 158, 11);
  pdf.text("EXECUTIVE COMPLIANCE AUDIT & VERIFIED DOCUMENT REPORT", margin + 6, currentY + 18);

  pdf.setTextColor(203, 213, 225);
  pdf.setFontSize(7.5);
  const auditorName = currentUser?.name || "Verified Legal Operator";
  const auditorEmail = currentUser?.email || "counsel@alllegalmatters.com";
  pdf.text(`Exported: ${new Date().toLocaleString()} · Target Auditor: ${auditorName} (${auditorEmail})`, margin + 6, currentY + 25);

  currentY += 38;

  // Metadata Grid Block
  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, currentY, contentWidth, 36, "F");
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.3);
  pdf.rect(margin, currentY, contentWidth, 36);

  pdf.setTextColor(15, 23, 42);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5);
  pdf.text("ESTABLISHED DOCUMENT METADATA", margin + 4, currentY + 7);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(51, 65, 85);

  const col1X = margin + 4;
  const col2X = margin + 70;
  const col3X = margin + 130;

  pdf.text(`Document Name:`, col1X, currentY + 15);
  pdf.setFont("helvetica", "bold");
  const truncatedName = document.name.length > 28 ? document.name.substring(0, 25) + "..." : document.name;
  pdf.text(truncatedName, col1X + 26, currentY + 15);
  pdf.setFont("helvetica", "normal");

  pdf.text(`Category:`, col1X, currentY + 22);
  pdf.setFont("helvetica", "bold");
  pdf.text((document.category || "General Legal").toUpperCase(), col1X + 26, currentY + 22);
  pdf.setFont("helvetica", "normal");

  pdf.text(`Jurisdiction:`, col1X, currentY + 29);
  pdf.setFont("helvetica", "bold");
  pdf.text(jurisdiction, col1X + 26, currentY + 29);
  pdf.setFont("helvetica", "normal");

  pdf.text(`Uploaded By:`, col2X, currentY + 15);
  pdf.text(document.uploadedBy || "Sovereign Portal", col2X + 22, currentY + 15);

  pdf.text(`Upload Date:`, col2X, currentY + 22);
  pdf.text(document.uploadedAt ? new Date(document.uploadedAt).toLocaleDateString() : new Date().toLocaleDateString(), col2X + 22, currentY + 22);

  pdf.text(`File Size:`, col2X, currentY + 29);
  pdf.text(document.size || "240 KB", col2X + 22, currentY + 29);

  // Risk Score Box
  const riskScore = document.riskScore ?? 25;
  const isHighRisk = riskScore >= 50;
  const isMedRisk = riskScore >= 25 && riskScore < 50;

  const badgeColor = isHighRisk ? [239, 68, 68] : isMedRisk ? [245, 158, 11] : [16, 185, 129];
  pdf.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  pdf.rect(col3X, currentY + 8, 50, 22, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("AUDIT RISK EXPOSURE", col3X + 4, currentY + 14);
  pdf.setFontSize(14);
  pdf.text(`${riskScore}%`, col3X + 4, currentY + 23);
  pdf.setFontSize(7.5);
  pdf.text(isHighRisk ? "CRITICAL RISK" : isMedRisk ? "MODERATE RISK" : "COMPLIANT / LOW", col3X + 20, currentY + 23);

  currentY += 42;

  // Compliance Audit Findings Section
  pdf.setTextColor(15, 23, 42);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("1. COMPLIANCE AUDIT FINDINGS & CLAUSE ASSESSMENT", margin, currentY);
  currentY += 6;

  // Merge document clauses & scan alerts
  const highRiskClauses = (document.clauses || []).filter((c) => c.risk === "High");
  const medRiskClauses = (document.clauses || []).filter((c) => c.risk === "Medium");

  if (alerts.length > 0 || highRiskClauses.length > 0 || medRiskClauses.length > 0) {
    // Render alerts
    alerts.forEach((alert, idx) => {
      if (currentY > pageHeight - 35) {
        addFooter(pageCount);
        pdf.addPage();
        pageCount++;
        currentY = margin;
      }

      const alertBg = alert.severity === "critical" ? [254, 242, 242] : [255, 251, 235];
      const alertBorder = alert.severity === "critical" ? [239, 68, 68] : [245, 158, 11];

      pdf.setFillColor(alertBg[0], alertBg[1], alertBg[2]);
      pdf.setDrawColor(alertBorder[0], alertBorder[1], alertBorder[2]);
      pdf.setLineWidth(0.4);
      pdf.rect(margin, currentY, contentWidth, 24, "FD");

      pdf.setTextColor(alertBorder[0], alertBorder[1], alertBorder[2]);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.text(`FLAG [${alert.severity.toUpperCase()}]: ${alert.ruleName}`, margin + 3, currentY + 5);

      pdf.setTextColor(51, 65, 85);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      const descLines = pdf.splitTextToSize(`Statute: ${alert.sourceStatute} · Analysis: ${alert.description}`, contentWidth - 6);
      pdf.text(descLines, margin + 3, currentY + 10);

      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(79, 70, 229);
      pdf.text(`Remediation: ${alert.remedyAction}`, margin + 3, currentY + 20);

      currentY += 27;
    });

    // Render high risk clauses from document
    highRiskClauses.forEach((c) => {
      if (currentY > pageHeight - 30) {
        addFooter(pageCount);
        pdf.addPage();
        pageCount++;
        currentY = margin;
      }

      pdf.setFillColor(254, 242, 242);
      pdf.setDrawColor(220, 38, 38);
      pdf.rect(margin, currentY, contentWidth, 18, "FD");

      pdf.setTextColor(185, 28, 28);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.text(`HIGH RISK CLAUSE: ${c.title}`, margin + 3, currentY + 5);

      pdf.setTextColor(51, 65, 85);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.text(`Snippet: "${c.text.length > 80 ? c.text.substring(0, 77) + "..." : c.text}"`, margin + 3, currentY + 10);
      pdf.text(`Legal Assessment: ${c.analysis}`, margin + 3, currentY + 15);

      currentY += 21;
    });
  } else {
    pdf.setFillColor(240, 253, 244);
    pdf.setDrawColor(34, 197, 94);
    pdf.rect(margin, currentY, contentWidth, 14, "FD");
    pdf.setTextColor(21, 128, 61);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.text("NO CRITICAL COMPLIANCE VIOLATIONS DETECTED", margin + 4, currentY + 6);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text("All contractual terms satisfy subnational and federal regulatory benchmarks.", margin + 4, currentY + 11);
    currentY += 18;
  }

  // Section 2: Redline Suggestions if any
  if (document.suggestedRedlines && document.suggestedRedlines.length > 0) {
    if (currentY > pageHeight - 45) {
      addFooter(pageCount);
      pdf.addPage();
      pageCount++;
      currentY = margin;
    }

    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("2. RECOMMENDED REDLINE REPLACEMENTS", margin, currentY);
    currentY += 6;

    document.suggestedRedlines.forEach((redline) => {
      if (currentY > pageHeight - 30) {
        addFooter(pageCount);
        pdf.addPage();
        pageCount++;
        currentY = margin;
      }

      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(203, 213, 225);
      pdf.rect(margin, currentY, contentWidth, 20, "FD");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(220, 38, 38);
      pdf.text(`(-) ORIGINAL: "${redline.original}"`, margin + 3, currentY + 5);

      pdf.setTextColor(22, 163, 74);
      pdf.text(`(+) REPLACEMENT: "${redline.replacement}"`, margin + 3, currentY + 10);

      pdf.setTextColor(71, 85, 105);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Reasoning: ${redline.reasoning}`, margin + 3, currentY + 16);

      currentY += 23;
    });
  }

  // Section 3: Document Content Text Body
  if (currentY > pageHeight - 40) {
    addFooter(pageCount);
    pdf.addPage();
    pageCount++;
    currentY = margin;
  }

  pdf.setTextColor(15, 23, 42);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("3. PRIMARY DOCUMENT CONTENT BODY SCAN", margin, currentY);
  currentY += 6;

  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(226, 232, 240);
  pdf.setFont("courier", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(30, 41, 59);

  const splitText = pdf.splitTextToSize(document.content || "(No content recorded)", contentWidth - 8);

  // Print lines with auto page break
  const lineHeight = 4.2;
  const startBoxY = currentY;
  let linesOnCurrentPage = 0;

  splitText.forEach((line: string) => {
    if (currentY + lineHeight > pageHeight - 20) {
      addFooter(pageCount);
      pdf.addPage();
      pageCount++;
      currentY = margin + 5;
      linesOnCurrentPage = 0;
    }
    pdf.text(line, margin + 4, currentY);
    currentY += lineHeight;
    linesOnCurrentPage++;
  });

  currentY += 8;

  // Add final footer to the last page
  addFooter(pageCount);

  return pdf;
}

/**
 * Generates and downloads a formatted, multi-page PDF for an active document.
 */
export function downloadDocumentAsPdf(options: GeneratePdfOptions): void {
  const pdf = buildDocumentPdf(options);
  const sanitizedTitle = options.document.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  pdf.save(`${sanitizedTitle}_Compliance_Audit.pdf`);
}

/**
 * Generates an actual PDF Blob for in-app embedded viewing.
 */
export function generateDocumentPdfBlob(options: GeneratePdfOptions): Blob {
  const pdf = buildDocumentPdf(options);
  return pdf.output("blob");
}

/**
 * Generates a Blob URL for rendering the PDF inside an iframe or object viewer without leaving the platform.
 */
export function generateDocumentPdfBlobUri(options: GeneratePdfOptions): string {
  const blob = generateDocumentPdfBlob(options);
  return URL.createObjectURL(blob);
}

/**
 * Generates and downloads a single, combined multi-page PDF containing all selected documents,
 * complete with an executive portfolio table of contents, individual metadata registers,
 * compliance findings, and full paginated document bodies.
 */
export function downloadBulkDocumentsAsPdf({
  documents,
  jurisdiction = "CA-ON / Transnational",
  currentUser,
  bundleTitle,
  filename,
}: GenerateBulkPdfOptions): void {
  if (!documents || documents.length === 0) return;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  let pageCount = 1;

  const addFooter = (pageNum: number) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    pdf.text(
      "CONFIDENTIAL & PRIVILEGED · ALL LEGAL MATTERS SOVEREIGN VAULT · BULK PRINT PORTFOLIO",
      margin,
      pageHeight - 8
    );
    pdf.text(`Page ${pageNum}`, pageWidth - margin - 15, pageHeight - 8);
  };

  // --- PAGE 1: COVER & TABLE OF CONTENTS ---
  let currentY = 12;

  // Header Banner
  pdf.setFillColor(15, 23, 42); // slate-900
  pdf.rect(margin, currentY, contentWidth, 34, "F");
  pdf.setDrawColor(245, 158, 11); // amber-500
  pdf.setLineWidth(0.8);
  pdf.rect(margin, currentY, contentWidth, 34);

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("ALL LEGAL MATTERS · SOVEREIGN VAULT", margin + 6, currentY + 11);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(245, 158, 11);
  const displayedTitle = bundleTitle
    ? bundleTitle.toUpperCase()
    : "COMBINED LEGAL PORTFOLIO · BULK EXPORT PRINT BUNDLE";
  pdf.text(displayedTitle, margin + 6, currentY + 18);

  pdf.setTextColor(203, 213, 225);
  pdf.setFontSize(7.5);
  const auditorName = currentUser?.name || "Verified Legal Operator";
  const auditorEmail = currentUser?.email || "counsel@alllegalmatters.com";
  pdf.text(
    `Exported: ${new Date().toLocaleString()} · Prepared For: ${auditorName} (${auditorEmail}) · Documents: ${documents.length}`,
    margin + 6,
    currentY + 26
  );

  currentY += 40;

  // Portfolio Overview Summary Box
  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, currentY, contentWidth, 26, "F");
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.3);
  pdf.rect(margin, currentY, contentWidth, 26);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text("PORTFOLIO COMPENDIUM METRICS", margin + 4, currentY + 7);

  const avgRisk = Math.round(
    documents.reduce((acc, d) => acc + (d.riskScore || 0), 0) / documents.length
  );
  const highRiskCount = documents.filter((d) => (d.riskScore || 0) >= 50).length;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(51, 65, 85);
  pdf.text(`Total Bundled Documents: ${documents.length}`, margin + 4, currentY + 15);
  pdf.text(`Average Portfolio Risk Index: ${avgRisk}%`, margin + 4, currentY + 21);
  pdf.text(`Critical Violation Alerts: ${highRiskCount}`, margin + 70, currentY + 15);
  pdf.text(`Applicable Jurisdiction: ${jurisdiction}`, margin + 70, currentY + 21);

  currentY += 32;

  // Table of Contents Header
  pdf.setTextColor(15, 23, 42);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("TABLE OF CONTENTS / BUNDLED DOCUMENTS REGISTER", margin, currentY);
  currentY += 6;

  // Table Headers
  pdf.setFillColor(241, 245, 249);
  pdf.rect(margin, currentY, contentWidth, 8, "F");
  pdf.setDrawColor(203, 213, 225);
  pdf.rect(margin, currentY, contentWidth, 8);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(30, 41, 59);
  pdf.text("#", margin + 3, currentY + 5.5);
  pdf.text("Document Name", margin + 12, currentY + 5.5);
  pdf.text("Category", margin + 95, currentY + 5.5);
  pdf.text("Upload Date", margin + 130, currentY + 5.5);
  pdf.text("Risk Score", margin + 165, currentY + 5.5);

  currentY += 8;

  // Table Rows
  documents.forEach((doc, idx) => {
    if (currentY + 10 > pageHeight - 18) {
      addFooter(pageCount);
      pdf.addPage();
      pageCount++;
      currentY = margin + 5;
    }

    pdf.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    pdf.rect(margin, currentY, contentWidth, 7.5, "F");
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, currentY, contentWidth, 7.5);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(51, 65, 85);
    pdf.text(`${idx + 1}`, margin + 3, currentY + 5);

    pdf.setFont("helvetica", "bold");
    const truncatedName = doc.name.length > 40 ? doc.name.substring(0, 38) + "..." : doc.name;
    pdf.text(truncatedName, margin + 12, currentY + 5);

    pdf.setFont("helvetica", "normal");
    pdf.text((doc.category || "General").toUpperCase(), margin + 95, currentY + 5);
    const dateFormatted = doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : "-";
    pdf.text(dateFormatted, margin + 130, currentY + 5);

    const docRisk = doc.riskScore || 0;
    if (docRisk >= 50) {
      pdf.setTextColor(220, 38, 38);
    } else if (docRisk >= 25) {
      pdf.setTextColor(217, 119, 6);
    } else {
      pdf.setTextColor(22, 163, 74);
    }
    pdf.setFont("helvetica", "bold");
    pdf.text(`${docRisk}% Risk`, margin + 165, currentY + 5);

    currentY += 7.5;
  });

  addFooter(pageCount);

  // --- SUBSEQUENT PAGES: EACH DOCUMENT IN DETAIL ---
  documents.forEach((docItem, docIndex) => {
    pdf.addPage();
    pageCount++;
    currentY = 12;

    // Document Header
    pdf.setFillColor(15, 23, 42);
    pdf.rect(margin, currentY, contentWidth, 22, "F");
    pdf.setDrawColor(245, 158, 11);
    pdf.setLineWidth(0.6);
    pdf.rect(margin, currentY, contentWidth, 22);

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(`DOCUMENT ${docIndex + 1} OF ${documents.length}`, margin + 5, currentY + 8);

    pdf.setFontSize(13);
    pdf.setTextColor(245, 158, 11);
    const truncatedDocTitle = docItem.name.length > 50 ? docItem.name.substring(0, 47) + "..." : docItem.name;
    pdf.text(truncatedDocTitle, margin + 5, currentY + 16);

    currentY += 28;

    // Document Metadata Box
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, currentY, contentWidth, 26, "F");
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.3);
    pdf.rect(margin, currentY, contentWidth, 26);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text("METADATA & RISK AUDIT PROFILE", margin + 4, currentY + 6);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(51, 65, 85);

    pdf.text(`Category: ${(docItem.category || "General").toUpperCase()}`, margin + 4, currentY + 13);
    pdf.text(`File Size: ${docItem.size || "Standard"}`, margin + 4, currentY + 19);
    pdf.text(`Uploaded By: ${docItem.uploadedBy || "System Vault"}`, margin + 65, currentY + 13);
    pdf.text(`Upload Date: ${docItem.uploadedAt ? new Date(docItem.uploadedAt).toLocaleDateString() : "-"}`, margin + 65, currentY + 19);

    const docRisk = docItem.riskScore ?? 25;
    const isHigh = docRisk >= 50;
    const isMed = docRisk >= 25 && docRisk < 50;
    const badgeColor = isHigh ? [239, 68, 68] : isMed ? [245, 158, 11] : [16, 185, 129];

    pdf.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
    pdf.rect(margin + 135, currentY + 4, 45, 18, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.text("COMPLIANCE RATING", margin + 138, currentY + 9);
    pdf.setFontSize(12);
    pdf.text(`${docRisk}%`, margin + 138, currentY + 17);
    pdf.setFontSize(7);
    pdf.text(isHigh ? "CRITICAL" : isMed ? "MODERATE" : "COMPLIANT", margin + 152, currentY + 17);

    currentY += 32;

    // Compliance Clauses / Risk Findings (if any)
    const clauses = docItem.clauses || [];
    if (clauses.length > 0) {
      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      pdf.text("IDENTIFIED COMPLIANCE CLAUSES & AUDIT FLAGS", margin, currentY);
      currentY += 5;

      clauses.forEach((c) => {
        if (currentY > pageHeight - 30) {
          addFooter(pageCount);
          pdf.addPage();
          pageCount++;
          currentY = margin + 5;
        }

        const isCrit = c.risk === "High";
        pdf.setFillColor(isCrit ? 254 : 255, isCrit ? 242 : 251, isCrit ? 242 : 235);
        pdf.setDrawColor(isCrit ? 239 : 245, isCrit ? 68 : 158, isCrit ? 68 : 11);
        pdf.setLineWidth(0.3);
        pdf.rect(margin, currentY, contentWidth, 16, "FD");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(isCrit ? 185 : 180, isCrit ? 28 : 83, isCrit ? 28 : 9);
        pdf.text(`[${c.risk.toUpperCase()} RISK] ${c.title}`, margin + 3, currentY + 5);

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(71, 85, 105);
        pdf.text(`Snippet: "${c.text.length > 75 ? c.text.substring(0, 72) + "..." : c.text}"`, margin + 3, currentY + 9.5);
        pdf.text(`Assessment: ${c.analysis}`, margin + 3, currentY + 13.5);

        currentY += 19;
      });
    }

    // Document Body Content
    if (currentY > pageHeight - 35) {
      addFooter(pageCount);
      pdf.addPage();
      pageCount++;
      currentY = margin + 5;
    }

    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.5);
    pdf.text("DOCUMENT TEXT CONTENT", margin, currentY);
    currentY += 5;

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.setFont("courier", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(30, 41, 59);

    const splitText = pdf.splitTextToSize(docItem.content || "(No content recorded)", contentWidth - 6);
    const lineHeight = 3.8;

    splitText.forEach((line: string) => {
      if (currentY + lineHeight > pageHeight - 18) {
        addFooter(pageCount);
        pdf.addPage();
        pageCount++;
        currentY = margin + 5;
      }
      pdf.text(line, margin + 3, currentY);
      currentY += lineHeight;
    });

    currentY += 6;
    addFooter(pageCount);
  });

  // Save the combined PDF
  const finalFilename = filename
    ? (filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`)
    : `Combined_Vault_Bundle_${documents.length}_Documents.pdf`;
  pdf.save(finalFilename);
}

