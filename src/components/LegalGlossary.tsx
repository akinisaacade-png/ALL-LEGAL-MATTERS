import React, { useState, useMemo } from "react";
import { 
  Search, 
  BookOpen, 
  Sparkles, 
  Copy, 
  Check, 
  ArrowRight, 
  Bookmark, 
  SlidersHorizontal,
  Info,
  Layers,
  Scale
} from "lucide-react";
import { LEGAL_GLOSSARY_DATABASE } from "../data/legalGlossaryData";
import { GlossaryTerm } from "../types";

interface LegalGlossaryProps {
  onAskCounsel?: (query: string) => void;
  showToast: (msg: string) => void;
}

export default function LegalGlossary({ onAskCounsel, showToast }: LegalGlossaryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedLetter, setSelectedLetter] = useState<string>("All");
  const [copiedTermId, setCopiedTermId] = useState<string | null>(null);
  const [expandedTermId, setExpandedTermId] = useState<string | null>(null);

  const categories = [
    "All",
    "Contracts",
    "Corporate",
    "Litigation",
    "Real Estate",
    "Intellectual Property",
    "Constitutional",
    "Employment",
    "International",
  ];

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const filteredTerms = useMemo(() => {
    return LEGAL_GLOSSARY_DATABASE.filter((term) => {
      // Category filter
      if (selectedCategory !== "All" && term.category !== selectedCategory) {
        return false;
      }

      // Letter filter
      if (selectedLetter !== "All") {
        if (!term.term.toUpperCase().startsWith(selectedLetter)) {
          return false;
        }
      }

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTerm = term.term.toLowerCase().includes(q);
        const matchesDef = term.definition.toLowerCase().includes(q);
        const matchesPlain = term.plainEnglish.toLowerCase().includes(q);
        const matchesExample = term.exampleUsage.toLowerCase().includes(q);
        const matchesLatin = term.latinRoot ? term.latinRoot.toLowerCase().includes(q) : false;
        const matchesRelated = term.relatedTerms.some((r) => r.toLowerCase().includes(q));

        return matchesTerm || matchesDef || matchesPlain || matchesExample || matchesLatin || matchesRelated;
      }

      return true;
    });
  }, [searchQuery, selectedCategory, selectedLetter]);

  const handleCopy = (term: GlossaryTerm) => {
    const textToCopy = `${term.term.toUpperCase()} (${term.category} Law):\n\nDefinition: ${term.definition}\n\nIn Plain Terms: ${term.plainEnglish}\n\nExample: ${term.exampleUsage}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedTermId(term.id);
    showToast(`📋 Copied definition of "${term.term}" to clipboard.`);
    setTimeout(() => {
      setCopiedTermId(null);
    }, 2500);
  };

  const handleQueryCounsel = (term: GlossaryTerm) => {
    if (onAskCounsel) {
      onAskCounsel(`Explain the legal doctrine of "${term.term}" under common law and civil law precedents. Provide practical contract drafting advice.`);
      showToast(`Prompt created for ${term.term}. Navigating to AI Co-Counsel...`);
    }
  };

  return (
    <div id="legal-glossary-panel" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-700 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-950 border border-emerald-500/50 text-emerald-400 text-[10px] px-2.5 py-0.5 rounded-full font-mono uppercase font-black tracking-wider flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-emerald-400" />
              Sovereign Lexicon
            </span>
            <span className="text-slate-400 text-xs font-mono">
              {LEGAL_GLOSSARY_DATABASE.length} Comprehensive Entries
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            Searchable Legal Glossary
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Plain-English translations of complex jurisprudence, contract clauses, procedural doctrines, and statutory Latin roots. Search by term keyword or browse by legal category.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-mono block uppercase">Terms Filtered</span>
              <span className="text-lg font-black text-emerald-400 font-mono leading-none">
                {filteredTerms.length} / {LEGAL_GLOSSARY_DATABASE.length}
              </span>
            </div>
            <Scale className="w-8 h-8 text-amber-400/80" />
          </div>
        </div>
      </div>

      {/* Search and Filter Ribbon */}
      <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
        {/* Main Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="glossary-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search legal terms, Latin roots, plain-English definitions, or clause examples (e.g. 'Force Majeure', 'severability', 'breach')..."
            className="w-full bg-slate-900 border border-slate-700 text-white pl-11 pr-24 py-3 rounded-xl text-sm outline-none font-sans focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded font-mono"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[10px] text-slate-400 font-mono font-bold uppercase shrink-0 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-indigo-400" />
            Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 uppercase tracking-tight ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white shadow-md border border-indigo-400"
                  : "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* A-Z Alphabet Quick Jumps */}
        <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-900">
          <span className="text-[10px] text-slate-500 font-mono font-bold uppercase mr-1">A-Z Jump:</span>
          <button
            onClick={() => setSelectedLetter("All")}
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
              selectedLetter === "All" ? "bg-amber-400 text-slate-950 font-black shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            ALL
          </button>
          {alphabet.map((letter) => {
            const hasMatches = LEGAL_GLOSSARY_DATABASE.some((t) => t.term.toUpperCase().startsWith(letter));
            return (
              <button
                key={letter}
                onClick={() => setSelectedLetter(letter)}
                disabled={!hasMatches}
                className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-mono font-bold transition-all ${
                  selectedLetter === letter
                    ? "bg-indigo-600 text-white font-black ring-1 ring-amber-400 shadow"
                    : hasMatches
                    ? "text-slate-300 hover:bg-slate-800 hover:text-amber-300"
                    : "text-slate-700 cursor-not-allowed"
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Terms Grid */}
      {filteredTerms.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTerms.map((item) => {
            const isCopied = copiedTermId === item.id;
            const isExpanded = expandedTermId === item.id;

            return (
              <div
                key={item.id}
                id={`term-card-${item.id}`}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition-all shadow-md hover:shadow-xl flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="space-y-3">
                  {/* Top Bar: Term Name & Category */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors">
                          {item.term}
                        </h3>
                        {item.pronunciation && (
                          <span className="text-[10px] text-slate-400 font-mono italic">
                            /{item.pronunciation}/
                          </span>
                        )}
                      </div>
                      {item.latinRoot && (
                        <p className="text-[10px] text-amber-400/90 font-mono mt-0.5">
                          {item.latinRoot}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider bg-slate-900 border border-slate-700 text-indigo-300">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  {/* Formal Legal Definition */}
                  <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-850">
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 font-mono block mb-1 flex items-center gap-1">
                      <Bookmark className="w-3 h-3 text-indigo-400" />
                      Formal Legal Definition
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">
                      {item.definition}
                    </p>
                  </div>

                  {/* Plain English "What it means for you" */}
                  <div className="bg-emerald-950/20 p-3 rounded-lg border border-emerald-500/25">
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-emerald-400 font-mono block mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      In Plain Terms (What it means for you)
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans font-medium">
                      {item.plainEnglish}
                    </p>
                  </div>

                  {/* Practical Clause Example */}
                  <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 font-mono block mb-0.5">
                      Practical Example / Clause Usage:
                    </span>
                    <p className="text-[11px] text-slate-400 italic font-mono leading-relaxed">
                      "{item.exampleUsage}"
                    </p>
                  </div>

                  {/* Related Terms */}
                  {item.relatedTerms && item.relatedTerms.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[9.5px] text-slate-500 font-mono uppercase font-bold">Related:</span>
                      {item.relatedTerms.map((rt) => (
                        <button
                          key={rt}
                          onClick={() => setSearchQuery(rt)}
                          className="text-[10px] text-indigo-300 hover:text-white bg-slate-900 hover:bg-indigo-950 px-2 py-0.5 rounded border border-slate-800 transition-colors font-mono"
                        >
                          {rt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Action Ribbon */}
                <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-slate-900">
                  <button
                    type="button"
                    onClick={() => handleCopy(item)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 font-bold transition-all"
                    title="Copy full definition"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Definition</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQueryCounsel(item)}
                    className="flex items-center gap-1.5 text-xs text-indigo-300 hover:text-white px-3 py-1.5 rounded bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-700/50 font-black transition-all uppercase tracking-tight"
                  >
                    <span>Query in AI Counsel</span>
                    <ArrowRight className="w-3 h-3 text-amber-300" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-950 p-12 text-center rounded-2xl border border-dashed border-slate-800 space-y-3">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
          <h3 className="text-base font-bold text-white uppercase">No Legal Terms Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No terms match your search filter "{searchQuery}". Try selecting another category or clear the search input.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All");
              setSelectedLetter("All");
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
