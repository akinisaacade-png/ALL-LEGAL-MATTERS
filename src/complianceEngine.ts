export interface ComplianceAlert {
  id: string;
  severity: "critical" | "warning" | "advisory";
  ruleName: string;
  sourceStatute: string;
  jurisdiction: string;
  description: string;
  matchingSnippet: string;
  remedyOriginal: string;
  remedyReplacement: string;
  remedyAction: string;
}

/**
 * Monitors and scans a document's content against subnational jurisdiction guidelines
 */
export function scanDocumentCompliance(
  text: string,
  jurisdictionCode: string
): ComplianceAlert[] {
  const alerts: ComplianceAlert[] = [];
  if (!text) return alerts;

  const textLower = text.toLowerCase();

  // General check that applies to California (US-CA)
  if (jurisdictionCode === "US-CA" || jurisdictionCode === "US") {
    // California Non-Compete Clauses are Void & Illegal (B&P Code 16600)
    const matchNonCompete = textLower.match(/(non[- ]?compete|not compete|restrictive covenant|barred from working|prevented from working|shall not engage in any business)/i);
    if (matchNonCompete) {
      alerts.push({
        id: "alert-ca-noncompete",
        severity: "critical",
        ruleName: "Prohibited Post-Employment Restrictive Covenant",
        sourceStatute: "California Business and Professions Code § 16600",
        jurisdiction: "California, USA",
        description: "Post-employment non-compete clauses are strictly illegal and contractually void in California, exposing employers to statutory penalties under AB 1076 & SB 699.",
        matchingSnippet: matchNonCompete[0],
        remedyOriginal: matchNonCompete[0],
        remedyReplacement: "is permitted to engage in any lawful trade, business, or profession of their choosing",
        remedyAction: "Abolish the post-employment work restriction clause to align with California B&P 16600."
      });
    }

    // Landlord entry without 24-hr advance notice (CC 1954)
    const matchEntry = textLower.match(/(without notice|enter at any hour|without prior warning|immediate right to inspect)/i);
    if (matchEntry) {
      alerts.push({
        id: "alert-ca-landlord-entry",
        severity: "warning",
        ruleName: "Unlawful Residential Right of Entry Directive",
        sourceStatute: "California Civil Code § 1954",
        jurisdiction: "California, USA",
        description: "Except in emergencies or abandonment, a landlord can enter residential premises only during normal business hours and must give at least 24 hours written notice.",
        matchingSnippet: matchEntry[0],
        remedyOriginal: matchEntry[0],
        remedyReplacement: "upon providing 24-hour advance written notice, during ordinary business hours,",
        remedyAction: "Amend to specify 24-hour notice before entry, except in critical emergencies."
      });
    }
  }

  // General check that applies to Ontario (CA-ON)
  if (jurisdictionCode === "CA-ON" || jurisdictionCode === "CA") {
    // Ontario Residential non-refundable fee or arbitrary deposit (RTA s. 134)
    const matchDeposit = textLower.match(/(non-refundable deposit|forfeits reservation fee|damage deposit|holding fee|retains hold fee)/i);
    if (matchDeposit) {
      alerts.push({
        id: "alert-on-illegal-fee",
        severity: "critical",
        ruleName: "Illegal Landlord Premium or Non-Refundable Deposit",
        sourceStatute: "Ontario Residential Tenancies Act, 2006, s. 134 & s. 105",
        jurisdiction: "Ontario, Canada",
        description: "Charging fee premiums, non-refundable holds, or damage deposits violates Ontario tenancy guidelines. Only standard last-month rent is permitted.",
        matchingSnippet: matchDeposit[0],
        remedyOriginal: matchDeposit[0],
        remedyReplacement: "security deposit is capped exactly at the rent amount and is returnable upon exit",
        remedyAction: "Strike down the non-refundable premium; hold deposits in escrow returnable upon tenancy exit."
      });
    }

    // Ontario Employment Standards Act - Non-Competes are banned (except executives/sale of business)
    const matchOnNonCompete = textLower.match(/(non[- ]?compete|shall not compete|barred from working in the global)/i);
    if (matchOnNonCompete) {
      alerts.push({
        id: "alert-on-compete-ban",
        severity: "critical",
        ruleName: "Prohibited Working Non-Compete Agreements",
        sourceStatute: "Ontario Employment Standards Act, 2000, S.O. 2000, c. 41, s. 67.2",
        jurisdiction: "Ontario, Canada",
        description: "Effective October 25, 2021, Ontario employers are prohibited from entering into non-compete agreements with employees, except under strict sale-of-business or executive carveouts.",
        matchingSnippet: matchOnNonCompete[0],
        remedyOriginal: matchOnNonCompete[0],
        remedyReplacement: "subject to standard, reasonable confidentiality requirements and protection of trade secrets",
        remedyAction: "Convert the non-compete restriction to standard solicitation and intellectual property covenants."
      });
    }
  }

  // General check that applies to New York (US-NY)
  if (jurisdictionCode === "US-NY") {
    const matchNYforum = textLower.match(/(exclusive forum in london|dispute.*heard exclusively in|judicial dispute resolution outside of new york)/i);
    if (matchNYforum) {
      alerts.push({
        id: "alert-ny-overreaching-forum",
        severity: "warning",
        ruleName: "Overreaching Foreign Dispute Forum Clause",
        sourceStatute: "New York General Obligations Law & NY Civil practice advisory",
        jurisdiction: "New York, USA",
        description: "Forcing local consumers or small entities into foreign dispute forums like London can lead to unconscionable enforceability assessments.",
        matchingSnippet: matchNYforum[0],
        remedyOriginal: matchNYforum[0],
        remedyReplacement: "heard in a court of competent jurisdiction inside New York State",
        remedyAction: "Revise to state court of competent jurisdiction within New York to guarantee standard local convenience."
      });
    }
  }

  // Universal fallback rule checks (Unilateral Governing Law to offshore tax havens etc.)
  const matchTaxHaven = textLower.match(/(cayman islands|bahamas|offshore|tax haven|panama)/i);
  if (matchTaxHaven) {
    alerts.push({
      id: "alert-universal-tax-haven",
      severity: "warning",
      ruleName: "High-Risk Offshore Tax Jurisdiction Selection",
      sourceStatute: "International Regulatory Oversight & AML Compact Guidelines",
      jurisdiction: "Global sovereign advisory",
      description: "Arbitration or governing laws based in classified tax havens attract higher scrutiny from tax authorities and are frequently challenged as bad-faith constructs.",
      matchingSnippet: matchTaxHaven[0],
      remedyOriginal: matchTaxHaven[0],
      remedyReplacement: "governed by domestic law in the local subnational province or state",
      remedyAction: "Amend governing jurisdiction to standard, transparent domestic bodies."
    });
  }

  return alerts;
}
