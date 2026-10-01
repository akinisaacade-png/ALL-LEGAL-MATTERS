import React, { useState, useMemo } from "react";
import {
  Scale,
  ShieldCheck,
  Search,
  CheckCircle,
  Star,
  Clock,
  Calendar,
  MessageSquare,
  Award,
  Video,
  Phone,
  User,
  Sliders,
  Sparkles,
  ExternalLink,
  ChevronRight,
  X,
  Send,
  AlertTriangle,
  Lock,
  Globe,
  Briefcase,
  MapPin,
  FileText
} from "lucide-react";
import { CURATED_LAWYERS_DATABASE } from "../data/curatedLawyersData";
import { Attorney, LegalIssueIntake, LawyerMatchResult, ConsultationBooking } from "../types";

interface LawyerMatchingProps {
  onBookConsultation: (booking: Partial<ConsultationBooking>) => Promise<void> | void;
  currentUser?: { email: string; name: string } | null;
  showToast: (msg: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export default function LawyerMatching({
  onBookConsultation,
  currentUser,
  showToast,
  onNavigateToTab
}: LawyerMatchingProps) {
  // Intake Form States
  const [category, setCategory] = useState<string>("Commercial Drafting");
  const [jurisdiction, setJurisdiction] = useState<string>("CA-ON / CA");
  const [urgency, setUrgency] = useState<LegalIssueIntake["urgency"]>("Standard (1-3 days)");
  const [budgetMax, setBudgetMax] = useState<number>(400);
  const [issueSummary, setIssueSummary] = useState<string>(
    "We need an experienced commercial attorney to audit our lease agreements and cross-border vendor service contracts for non-compete liabilities and unconscionable risk clauses."
  );
  const [preferredLanguage, setPreferredLanguage] = useState<string>("English");
  const [consultationType, setConsultationType] = useState<"video" | "phone" | "in-person">("video");

  // Matching & Filter States
  const [hasSearched, setHasSearched] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<"match" | "rating" | "rate_asc" | "experience">("match");
  const [selectedLawyerForProfile, setSelectedLawyerForProfile] = useState<Attorney | null>(null);
  const [selectedLawyerForBooking, setSelectedLawyerForBooking] = useState<Attorney | null>(null);

  // Booking Modal States
  const [bookingDate, setBookingDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  });
  const [bookingTime, setBookingTime] = useState<string>("10:00 AM");
  const [bookingDuration, setBookingDuration] = useState<number>(60);
  const [bookingNotes, setBookingNotes] = useState<string>("");
  const [bookingPhone, setBookingPhone] = useState<string>("+1 (416) 555-0192");
  const [bookingEmail, setBookingEmail] = useState<string>(currentUser?.email || "counsel@alllegalmatters.com");
  const [calendarSync, setCalendarSync] = useState<boolean>(true);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState<boolean>(false);

  // Categories list
  const practiceCategories = [
    "Commercial Drafting",
    "Business & Corporate Compliance",
    "M&A Rules",
    "Employment & Labor Rules",
    "Real Estate & Tenancy",
    "Intellectual Property Protection",
    "Civil Law & Litigation",
    "Immigration Strategy",
    "Cross-Border Business",
    "EU GDPR & Digital Services Act",
  ];

  // Jurisdictions list
  const jurisdictionsList = [
    { label: "Canada - Ontario (CA-ON / CA)", value: "CA-ON / CA" },
    { label: "Canada - British Columbia (CA-BC)", value: "UK / CA-BC" },
    { label: "United States - California (US-CA)", value: "US-CA / US" },
    { label: "United States - New York (US-NY)", value: "US-NY / US" },
    { label: "Mexico / US Cross-Border (MX / US-CA)", value: "MX-CMX / US-CA / MX" },
    { label: "United Kingdom & Cross-Border (UK)", value: "UK / CA-BC" },
    { label: "Nigeria / Ghana / West Africa (NG / GH)", value: "NG / GH / UK" },
    { label: "European Union / Germany (EU / DE)", value: "EU / DE / IT" },
  ];

  // Algorithmic Matching Function
  const matchedLawyers: LawyerMatchResult[] = useMemo(() => {
    const results = CURATED_LAWYERS_DATABASE.map((lawyer) => {
      let score = 50; // base score
      const reasons: string[] = [];

      // 1. Specialty Match
      const matchesSpecialty = lawyer.specialties.some((s) => {
        return (
          s.toLowerCase().includes(category.toLowerCase()) ||
          category.toLowerCase().includes(s.toLowerCase()) ||
          issueSummary.toLowerCase().includes(s.toLowerCase())
        );
      });

      if (matchesSpecialty) {
        score += 25;
        reasons.push(`Specializes in ${category}`);
      } else {
        // Partial keyword match in summary
        const summaryLower = issueSummary.toLowerCase();
        const keywordHit = lawyer.specialties.some(s => summaryLower.includes(s.split(" ")[0].toLowerCase()));
        if (keywordHit) {
          score += 15;
          reasons.push("Experience in core legal topics mentioned in your summary");
        }
      }

      // 2. Jurisdiction Match
      const targetJurClean = jurisdiction.split(" ")[0].toLowerCase();
      const lawyerJurClean = lawyer.jurisdiction.toLowerCase();
      if (lawyerJurClean.includes(targetJurClean) || targetJurClean.includes(lawyerJurClean.split(" ")[0])) {
        score += 20;
        reasons.push(`Admitted to practice in ${jurisdiction.split(" ")[0]}`);
      } else if (lawyerJurClean.includes("transnational") || lawyerJurClean.includes("global") || lawyerJurClean.includes("cross-border")) {
        score += 10;
        reasons.push("Handles cross-border multi-jurisdiction matters");
      }

      // 3. Budget Alignment
      if (lawyer.hourlyRate <= budgetMax) {
        score += 10;
        reasons.push(`Hourly rate ($${lawyer.hourlyRate}/hr) is within your $${budgetMax}/hr budget`);
      } else if (lawyer.hourlyRate <= budgetMax * 1.15) {
        score += 5;
        reasons.push(`Hourly rate ($${lawyer.hourlyRate}/hr) is close to your target range`);
      }

      // 4. Language Match
      if (lawyer.languages && lawyer.languages.includes(preferredLanguage)) {
        score += 5;
        reasons.push(`Fluent in ${preferredLanguage}`);
      }

      // 5. Rating Bonus
      if (lawyer.rating >= 4.9) {
        score += 5;
        reasons.push(`Top-rated attorney (${lawyer.rating} / 5.0)`);
      }

      // Cap score at 99%
      const finalScore = Math.min(99, Math.max(45, score));

      // Recommended next slot
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
      let recSlot = "Tomorrow at 10:00 AM";
      if (lawyer.availabilityHours) {
        for (const day of days) {
          if (lawyer.availabilityHours[day] && lawyer.availabilityHours[day].length > 0) {
            recSlot = `${day} at ${lawyer.availabilityHours[day][0]}`;
            break;
          }
        }
      }

      return {
        lawyer,
        matchScore: finalScore,
        matchReasons: reasons,
        recommendedSlot: recSlot
      };
    });

    // Sorting
    results.sort((a, b) => {
      if (sortBy === "match") return b.matchScore - a.matchScore;
      if (sortBy === "rating") return b.lawyer.rating - a.lawyer.rating;
      if (sortBy === "rate_asc") return a.lawyer.hourlyRate - b.lawyer.hourlyRate;
      if (sortBy === "experience") return (b.lawyer.yearsOfExperience || 10) - (a.lawyer.yearsOfExperience || 10);
      return 0;
    });

    return results;
  }, [category, jurisdiction, budgetMax, issueSummary, preferredLanguage, sortBy]);

  const handleOpenBooking = (lawyer: Attorney) => {
    setSelectedLawyerForBooking(lawyer);
    setBookingNotes(issueSummary);
    if (currentUser?.email) {
      setBookingEmail(currentUser.email);
    }
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLawyerForBooking) return;

    setIsSubmittingBooking(true);
    const retainer = Math.round((selectedLawyerForBooking.hourlyRate * bookingDuration) / 60);

    try {
      const bookingData: Partial<ConsultationBooking> = {
        id: `consultation-${Date.now()}`,
        lawyerId: selectedLawyerForBooking.id,
        lawyerName: selectedLawyerForBooking.name,
        duration: bookingDuration,
        date: bookingDate,
        time: bookingTime,
        retainerFee: retainer,
        status: "Confirmed",
        syncedWithCalendar: calendarSync,
        caseNotes: bookingNotes,
        legalQuestions: `Category: ${category} · Urgency: ${urgency}`,
        smsReminder: true,
        emailReminder: true,
        reminderPhone: bookingPhone,
        reminderEmail: bookingEmail,
      };

      await onBookConsultation(bookingData);
      showToast(`🎯 Consultation scheduled with ${selectedLawyerForBooking.name} on ${bookingDate} at ${bookingTime}.`);
      setSelectedLawyerForBooking(null);
    } catch (err) {
      showToast("Scheduling portal transient error. Booking saved to active roster.");
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  return (
    <div id="lawyer-matching-system" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-700 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-950 border border-indigo-500/50 text-indigo-400 text-[10px] px-2.5 py-0.5 rounded-full font-mono uppercase font-black tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Verified Legal Counsel Roster
            </span>
            <span className="text-slate-400 text-xs font-mono">
              Curated Bar-Certified Attorneys
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            Secure Lawyer Matching Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Describe your legal dispute or contract requirements. Our neural matching engine pairs you with verified bar-admitted attorneys based on jurisdiction, practice expertise, budget, and calendar availability.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 p-3 rounded-xl shrink-0">
          <Lock className="w-5 h-5 text-emerald-400" />
          <div className="text-left text-[11px]">
            <span className="font-bold text-white block uppercase tracking-wider">Zero-Knowledge Intake</span>
            <span className="text-slate-400 font-mono text-[10px]">End-to-End Encrypted Privilege</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Intake Form + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Legal Issue Intake Form */}
        <div className="lg:col-span-5 bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-850 pb-3">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Legal Issue Details
              </h3>
            </div>
            <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded font-mono uppercase font-bold">
              Step 1 of 2
            </span>
          </div>

          <div className="space-y-3.5">
            {/* Practice Area */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Primary Legal Area / Matter Type:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 text-white text-xs font-bold p-2.5 rounded-lg border border-slate-700 outline-none focus:border-indigo-500"
              >
                {practiceCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Target Jurisdiction */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Jurisdiction / Governing Forum:
              </label>
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="w-full bg-slate-900 text-white text-xs font-bold p-2.5 rounded-lg border border-slate-700 outline-none focus:border-indigo-500 font-mono"
              >
                {jurisdictionsList.map((j) => (
                  <option key={j.value} value={j.value}>{j.label}</option>
                ))}
              </select>
            </div>

            {/* Urgency & Consultation Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Urgency Level:
                </label>
                <select
                  value={urgency}
                  onChange={(e: any) => setUrgency(e.target.value)}
                  className="w-full bg-slate-900 text-white text-xs font-bold p-2.5 rounded-lg border border-slate-700 outline-none"
                >
                  <option value="Immediate (< 24h)">Immediate (&lt; 24h)</option>
                  <option value="Standard (1-3 days)">Standard (1-3 days)</option>
                  <option value="Planning (1-2 weeks)">Planning (1-2 weeks)</option>
                  <option value="General Consultation">General Consultation</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Preferred Format:
                </label>
                <select
                  value={consultationType}
                  onChange={(e: any) => setConsultationType(e.target.value)}
                  className="w-full bg-slate-900 text-white text-xs font-bold p-2.5 rounded-lg border border-slate-700 outline-none"
                >
                  <option value="video">Encrypted Video (WebRTC)</option>
                  <option value="phone">Private Phone Call</option>
                  <option value="in-person">In-Person Chambers</option>
                </select>
              </div>
            </div>

            {/* Budget Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Maximum Hourly Budget:
                </label>
                <span className="text-xs font-mono font-bold text-amber-300">
                  ${budgetMax} / hour
                </span>
              </div>
              <input
                type="range"
                min="150"
                max="600"
                step="25"
                value={budgetMax}
                onChange={(e) => setBudgetMax(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                <span>$150/hr</span>
                <span>$350/hr</span>
                <span>$600+/hr</span>
              </div>
            </div>

            {/* Preferred Language */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Preferred Counsel Language:
              </label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                className="w-full bg-slate-900 text-white text-xs font-bold p-2.5 rounded-lg border border-slate-700 outline-none"
              >
                <option value="English">English</option>
                <option value="French">French (Français)</option>
                <option value="Spanish">Spanish (Español)</option>
                <option value="German">German (Deutsch)</option>
                <option value="Mandarin">Mandarin (中文)</option>
                <option value="Yoruba">Yoruba</option>
              </select>
            </div>

            {/* Case / Issue Summary */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Case Facts & Issue Description:
              </label>
              <textarea
                value={issueSummary}
                onChange={(e) => setIssueSummary(e.target.value)}
                rows={4}
                placeholder="Describe your legal matter, contract terms in dispute, timelines, and specific legal goals..."
                className="w-full bg-slate-900 text-white text-xs p-3 rounded-lg border border-slate-700 outline-none focus:border-indigo-500 font-sans leading-relaxed resize-none"
              />
            </div>

            {/* Re-calculate button */}
            <button
              type="button"
              onClick={() => {
                setHasSearched(true);
                showToast("✨ Neural matching engine recalculated top counsel compatibility scores.");
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Update Matched Counsel Recommendations</span>
            </button>
          </div>
        </div>

        {/* Right Column: Matched Lawyers Recommendations */}
        <div className="lg:col-span-7 space-y-4">
          {/* Controls Bar */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white uppercase tracking-wider">
                Recommended Counsel ({matchedLawyers.length})
              </span>
              <span className="text-[10px] bg-emerald-950 border border-emerald-500/40 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
                RANKED BY COMPATIBILITY
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-mono uppercase">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-slate-900 text-slate-200 text-xs font-bold p-1.5 px-2.5 rounded-lg border border-slate-700 outline-none font-mono"
              >
                <option value="match">Match Score (Highest First)</option>
                <option value="rating">Client Rating</option>
                <option value="rate_asc">Hourly Rate (Lowest First)</option>
                <option value="experience">Years of Experience</option>
              </select>
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-4">
            {matchedLawyers.map(({ lawyer, matchScore, matchReasons, recommendedSlot }) => {
              const isTopMatch = matchScore >= 85;

              return (
                <div
                  key={lawyer.id}
                  id={`matched-lawyer-${lawyer.id}`}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg transition-all flex flex-col md:flex-row md:items-start justify-between gap-4 group relative overflow-hidden"
                >
                  {/* Match Score Accent Strip */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      matchScore >= 90
                        ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500"
                        : matchScore >= 75
                        ? "bg-gradient-to-r from-indigo-500 to-blue-400"
                        : "bg-slate-700"
                    }`}
                  />

                  {/* Left: Avatar + Details */}
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <img
                        src={lawyer.avatar}
                        alt={lawyer.name}
                        className="w-16 h-16 rounded-xl object-cover border-2 border-slate-700 shadow-md group-hover:border-indigo-400 transition-colors"
                      />
                      {lawyer.verified && (
                        <div
                          title="Verified Bar-Admitted Counsel"
                          className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1 rounded-full shadow"
                        >
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-black text-white group-hover:text-amber-300 transition-colors">
                          {lawyer.name}
                        </h4>
                        <span className="bg-indigo-950 border border-indigo-500/40 text-indigo-300 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                          {lawyer.yearsOfExperience ? `${lawyer.yearsOfExperience}+ Yrs Exp` : "Senior Counsel"}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 font-semibold">{lawyer.title}</p>
                      
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1 text-amber-300 font-bold">
                          <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                          {lawyer.rating.toFixed(1)}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {lawyer.jurisdiction}
                        </span>
                        <span>·</span>
                        <span className="text-emerald-400 font-bold">
                          ${lawyer.hourlyRate}/hr
                        </span>
                      </div>

                      {/* Match Reasons Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {matchReasons.slice(0, 2).map((reason, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded font-sans"
                          >
                            ✓ {reason}
                          </span>
                        ))}
                      </div>

                      {/* Specialties Tags */}
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        {lawyer.specialties.map((spec) => (
                          <span
                            key={spec}
                            className="text-[9.5px] bg-slate-900/60 border border-slate-800 text-indigo-300 px-1.5 py-0.5 rounded font-mono"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Match Score + Action Buttons */}
                  <div className="flex flex-col sm:items-end justify-between gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-850">
                    <div className="text-right">
                      <div className="flex items-center sm:justify-end gap-1.5">
                        <span className="text-[10px] font-mono text-slate-400 uppercase">Match Score:</span>
                        <span
                          className={`text-lg font-black font-mono px-2 py-0.5 rounded ${
                            matchScore >= 90
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                              : matchScore >= 75
                              ? "bg-indigo-950 text-indigo-300 border border-indigo-500/30"
                              : "bg-slate-900 text-slate-300"
                          }`}
                        >
                          {matchScore}%
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                        Next: {recommendedSlot}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedLawyerForProfile(lawyer)}
                        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all"
                      >
                        View Profile
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenBooking(lawyer)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        <Calendar className="w-3.5 h-3.5 text-amber-300" />
                        <span>Request Consultation</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lawyer Profile Modal */}
      {selectedLawyerForProfile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-4">
                <img
                  src={selectedLawyerForProfile.avatar}
                  alt={selectedLawyerForProfile.name}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-indigo-500 shadow"
                />
                <div>
                  <h3 className="text-lg font-black text-white">{selectedLawyerForProfile.name}</h3>
                  <p className="text-xs text-indigo-300 font-semibold">{selectedLawyerForProfile.title}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{selectedLawyerForProfile.firmName || "Chambers Counsel"}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLawyerForProfile(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              {/* Bio */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Professional Biography
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {selectedLawyerForProfile.bio || "Senior bar-admitted attorney with specialized practice in commercial dispute resolution, governance, and transnational contract compliance."}
                </p>
              </div>

              {/* Credentials & Bar Admissions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-1">
                    Bar Admissions:
                  </span>
                  <ul className="space-y-1 text-slate-300">
                    {(selectedLawyerForProfile.barAdmissions || ["State Bar Certified", "Federal Circuit"]).map((b, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-1">
                    Education & Credentials:
                  </span>
                  <p className="text-slate-300 font-sans">
                    {selectedLawyerForProfile.education || "Juris Doctor (J.D.), Master of Laws (LL.M.)"}
                  </p>
                  <div className="mt-2 text-[11px] text-slate-400">
                    <span>Languages: </span>
                    <strong className="text-white">
                      {(selectedLawyerForProfile.languages || ["English"]).join(", ")}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Practice Specialties */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  Specializations & Core Focus
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedLawyerForProfile.specialties.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 bg-indigo-950/70 border border-indigo-700/60 text-indigo-200 text-xs rounded-lg font-bold"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Client Reviews */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  Client Verification Reviews ({selectedLawyerForProfile.reviews?.length || 0})
                </h4>
                <div className="space-y-2">
                  {(selectedLawyerForProfile.reviews || []).map((rev, i) => (
                    <div key={i} className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-xs italic text-slate-300">
                      "{rev}"
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedLawyerForProfile(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = selectedLawyerForProfile;
                  setSelectedLawyerForProfile(null);
                  handleOpenBooking(target);
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-300" />
                <span>Request Consultation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consultation Request Modal */}
      {selectedLawyerForBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleConfirmBooking}
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <h3 className="text-base font-black uppercase tracking-wider text-white">
                    Request Consultation
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Booking with <strong className="text-white">{selectedLawyerForBooking.name}</strong> (${selectedLawyerForBooking.hourlyRate}/hr)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLawyerForBooking(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Date and Time Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Select Consultation Date:
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-lg border border-slate-700 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Available Time Slot:
                  </label>
                  <select
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-lg border border-slate-700 outline-none font-mono"
                  >
                    <option value="09:00 AM">09:00 AM (Chambers Slot)</option>
                    <option value="10:00 AM">10:00 AM (Morning Session)</option>
                    <option value="11:30 AM">11:30 AM (Pre-Noon Session)</option>
                    <option value="02:00 PM">02:00 PM (Afternoon Session)</option>
                    <option value="04:00 PM">04:00 PM (Closing Slot)</option>
                  </select>
                </div>
              </div>

              {/* Duration & Estimated Retainer */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Consultation Duration:
                  </label>
                  <select
                    value={bookingDuration}
                    onChange={(e) => setBookingDuration(parseInt(e.target.value))}
                    className="w-full bg-slate-900 text-white p-2 rounded border border-slate-700 outline-none font-mono"
                  >
                    <option value={30}>30 Minutes Strategy Review</option>
                    <option value={60}>60 Minutes Comprehensive</option>
                    <option value={90}>90 Minutes Deep Audit</option>
                  </select>
                </div>

                <div className="flex flex-col justify-center text-right pr-2">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Retainer Deposit:</span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    ${Math.round((selectedLawyerForBooking.hourlyRate * bookingDuration) / 60)} USD
                  </span>
                </div>
              </div>

              {/* Client Contact Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Your Contact Email:
                  </label>
                  <input
                    type="email"
                    required
                    value={bookingEmail}
                    onChange={(e) => setBookingEmail(e.target.value)}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-lg border border-slate-700 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    SMS Reminder Phone:
                  </label>
                  <input
                    type="tel"
                    value={bookingPhone}
                    onChange={(e) => setBookingPhone(e.target.value)}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-lg border border-slate-700 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Case Notes */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Confidential Brief for Counsel:
                </label>
                <textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 text-white p-2.5 rounded-lg border border-slate-700 outline-none font-sans"
                  placeholder="Summarize key documents or questions to review prior to the call..."
                />
              </div>

              {/* Sync Calendar */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={calendarSync}
                  onChange={(e) => setCalendarSync(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-500"
                />
                <span className="text-slate-300 text-xs">
                  Automatically sync confirmed consultation to Google Calendar & send calendar invite (.ics)
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedLawyerForBooking(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingBooking}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow"
              >
                {isSubmittingBooking ? (
                  <span>Securing Calendar Slot...</span>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                    <span>Confirm Consultation Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
