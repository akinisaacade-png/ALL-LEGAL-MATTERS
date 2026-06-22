export interface SubnationalJurisdiction {
  id: string;
  name: string;
  capital: string;
  legal_system_notes: string;
  official_legislation_portal_name: string;
  official_legislation_portal_url: string;
  highest_court_name: string;
  highest_court_url: string;
  justice_ministry_url?: string;
}

export interface SovereignJurisdiction {
  id: string;
  name: string;
  legal_system: string;
  constitution_name: string;
  constitution_url: string;
  federal_legislation_portal_name: string;
  federal_legislation_portal_url: string;
  supreme_court_name: string;
  supreme_court_url: string;
  research_guide: string;
  subnational?: SubnationalJurisdiction[];
}

export interface LegalClause {
  title: string;
  risk: "Low" | "Medium" | "High";
  text: string;
  analysis: string;
}

export interface RedlineSuggestion {
  original: string;
  replacement: string;
  reasoning: string;
}

export interface DocumentVersion {
  id: string;
  versionNumber: number;
  content: string;
  editedAt: string;
  editedBy: string;
  changeSummary: string;
  riskScore: number;
  clauses?: LegalClause[];
  suggestedRedlines?: RedlineSuggestion[];
}

export interface LegalDocument {
  id: string;
  name: string;
  category: string;
  uploadedBy: string;
  uploadedAt: string;
  size: string;
  riskScore: number;
  status: "Analyzing" | "Analyzed";
  content: string;
  changeSummary?: string;
  clauses?: LegalClause[];
  suggestedRedlines?: RedlineSuggestion[];
  versions?: DocumentVersion[];
  tags?: string[];
}

export interface ChatMessage {
  sender: "user" | "lawyer" | "system";
  text: string;
  timestamp: string;
}

export interface ConsultationBooking {
  id: string;
  lawyerId: string;
  lawyerName: string;
  duration: number;
  date: string;
  time: string;
  retainerFee: number;
  status: string;
  syncedWithCalendar: boolean;
}

export interface Attorney {
  id: string;
  name: string;
  title: string;
  jurisdiction: string;
  avatar: string;
  specialties: string[];
  hourlyRate: number;
  rating: number;
  availabilityMap: { [day: string]: number }; // percentage of availability 0-100 for Mon-Fri
  reviews: string[];
}
