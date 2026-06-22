import React, { useState, useEffect } from "react";
import { 
  Globe, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  ExternalLink, 
  FileText, 
  Scale, 
  Building2, 
  Check, 
  AlertCircle,
  HelpCircle,
  Database
} from "lucide-react";
import { 
  EuropeJurisdiction, 
  getEuropeJurisdictions, 
  seedEuropeJurisdictions,
  saveEuropeJurisdiction,
  deleteEuropeJurisdiction,
  INITIAL_EUROPE_JURISDICTIONS
} from "../utils/europeJurisdictions";

interface EuropeJurisdictionsPanelProps {
  currentUser: { email: string; name: string; isAdmin?: boolean } | null;
  showToast: (msg: string) => void;
}

export default function EuropeJurisdictionsPanel({ currentUser, showToast }: EuropeJurisdictionsPanelProps) {
  const [jurisdictions, setJurisdictions] = useState<EuropeJurisdiction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<EuropeJurisdiction | null>(null);

  // Form parameters
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [id, setId] = useState("");
  const [country, setCountry] = useState("");
  const [systemType, setSystemType] = useState("");
  const [constitutionalFoundation, setConstitutionalFoundation] = useState("");
  const [legislationUrl, setLegislationUrl] = useState("");
  const [caseLawUrl, setCaseLawUrl] = useState("");
  const [additionalCaseLawArchive, setAdditionalCaseLawArchive] = useState("");
  const [constitutionalCourtUrl, setConstitutionalCourtUrl] = useState("");
  const [administrativeCourtUrl, setAdministrativeCourtUrl] = useState("");
  const [complianceBodies, setComplianceBodies] = useState("");
  const [languages, setLanguages] = useState("");
  const [researchGuide, setResearchGuide] = useState("");

  const refreshList = async () => {
    setLoading(true);
    try {
      const data = await getEuropeJurisdictions();
      setJurisdictions(data);
      if (data.length > 0 && !selectedItem) {
        setSelectedItem(data[0]);
      } else if (selectedItem) {
        const updatedSelected = data.find((x) => x.id === selectedItem.id);
        if (updatedSelected) setSelectedItem(updatedSelected);
      }
    } catch (e) {
      showToast("Error loading European jurisdictions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshList();
  }, []);

  const handleSeed = async () => {
    setLoading(true);
    try {
      await seedEuropeJurisdictions(true); // Force seeding
      showToast("Seeded 7 Europe core jurisdictions in Firestore.");
      await refreshList();
    } catch (e) {
      showToast("Error seeding collection.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setId("");
    setCountry("");
    setSystemType("");
    setConstitutionalFoundation("");
    setLegislationUrl("");
    setCaseLawUrl("");
    setAdditionalCaseLawArchive("");
    setConstitutionalCourtUrl("");
    setAdministrativeCourtUrl("");
    setComplianceBodies("");
    setLanguages("");
    setResearchGuide("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: EuropeJurisdiction) => {
    setIsEditing(true);
    setId(item.id);
    setCountry(item.country);
    setSystemType(item.system_type);
    setConstitutionalFoundation(item.constitutional_foundation.join(", "));
    setLegislationUrl(item.legislation_url);
    setCaseLawUrl(item.case_law_url);
    setAdditionalCaseLawArchive(item.additional_case_law_archive || "");
    setConstitutionalCourtUrl(item.constitutional_court_url || "");
    setAdministrativeCourtUrl(item.administrative_court_url || "");
    setComplianceBodies(item.compliance_bodies.join(", "));
    setLanguages(item.languages.join(", "));
    setResearchGuide(item.research_guide);
    setIsFormOpen(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm(`Are you sure you want to delete ${itemId}?`)) return;
    setLoading(true);
    try {
      await deleteEuropeJurisdiction(itemId);
      showToast(`Deleted ${itemId} from Firestore`);
      if (selectedItem?.id === itemId) {
        setSelectedItem(null);
      }
      await refreshList();
    } catch (e) {
      showToast("Delete failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !country) {
      showToast("Please supply a valid ID code and Country name.");
      return;
    }
    setLoading(true);
    
    const parsedFoundations = constitutionalFoundation
      .split(",")
      .map(x => x.trim())
      .filter(Boolean);
    const parsedCompliance = complianceBodies
      .split(",")
      .map(x => x.trim())
      .filter(Boolean);
    const parsedLanguages = languages
      .split(",")
      .map(x => x.trim())
      .filter(Boolean);

    const record: EuropeJurisdiction = {
      id: id.toUpperCase().trim(),
      country: country.trim(),
      system_type: systemType.trim(),
      constitutional_foundation: parsedFoundations,
      legislation_url: legislationUrl.trim(),
      case_law_url: caseLawUrl.trim(),
      additional_case_law_archive: additionalCaseLawArchive.trim() || undefined,
      constitutional_court_url: constitutionalCourtUrl.trim() || undefined,
      administrative_court_url: administrativeCourtUrl.trim() || undefined,
      compliance_bodies: parsedCompliance,
      languages: parsedLanguages,
      research_guide: researchGuide.trim()
    };

    try {
      await saveEuropeJurisdiction(record);
      showToast(`Saved ${country} to Firestore successfully!`);
      setIsFormOpen(false);
      setSelectedItem(record);
      await refreshList();
    } catch (err) {
      showToast("Error writing to Firestore.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = jurisdictions.filter((x) => {
    const q = searchQuery.toLowerCase();
    return (
      x.id.toLowerCase().includes(q) ||
      x.country.toLowerCase().includes(q) ||
      x.system_type.toLowerCase().includes(q) ||
      x.research_guide.toLowerCase().includes(q)
    );
  });

  return (
    <div id="europe-jurisdictions-hub" className="space-y-6">
      
      {/* Search & Actions Header Card */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-indigo-950 border border-indigo-700 text-indigo-300 font-bold px-2 py-0.5 rounded font-mono">
                FIRESTORE LIVE COLL
              </span>
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <Globe className="w-5 h-5 text-indigo-400 rotate-12" />
                Europe Core Jurisdictions
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Synchronized directly with the <code className="text-pink-400 font-mono">jurisdictions_europe_core</code> Firestore Collection. Supports dynamic reading, editing, seeding, and deletions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={refreshList}
              disabled={loading}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2 px-3 rounded border border-slate-705 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Live</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-3 rounded transition shadow-lg shadow-indigo-950/40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Jurisdiction</span>
            </button>

            <button
              onClick={handleSeed}
              disabled={loading}
              title="Reset the Firestore collection by loading the original 7 core European datasets."
              className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-900 border border-amber-900/40 text-amber-500 hover:text-amber-400 font-mono text-[10px] font-bold py-2 px-3 rounded transition"
            >
              <Database className="w-3.5 h-3.5 text-amber-500" />
              <span>Seed Default 7</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-500" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Europe firestore records... (e.g. United Kingdom, Civil law, DE, BOE)"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
          />
        </div>
      </div>

      {isFormOpen && (
        <div className="bg-slate-900 border border-indigo-900/60 p-6 rounded-xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-sm text-indigo-400">
              {isEditing ? `📝 Modify Jurisdiction: ${country}` : "🆕 Add New European Jurisdiction"}
            </span>
            <button 
              onClick={() => setIsFormOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close Form
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-400 font-mono">ID / Alpha-2 Code</label>
              <input
                type="text"
                disabled={isEditing}
                maxLength={3}
                placeholder="e.g. UK, DE, IE"
                required
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white font-mono disabled:opacity-40"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-400 font-mono">Country Name</label>
              <input
                type="text"
                placeholder="e.g. Ireland"
                required
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-400 font-mono">System Type / Family</label>
              <input
                type="text"
                placeholder="e.g. Common Law system with statutes..."
                required
                value={systemType}
                onChange={(e) => setSystemType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white"
              />
            </div>

            <div className="space-y-1 md:col-span-3">
              <label className="block text-[10px] font-bold uppercase text-slate-400 font-mono">Constitutional Foundation (comma separated)</label>
              <input
                type="text"
                placeholder="e.g. Irish Constitution of 1937, Bunreacht na hÉireann"
                value={constitutionalFoundation}
                onChange={(e) => setConstitutionalFoundation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-400 font-mono">Official Legislation URL</label>
              <input
                type="url"
                placeholder="https://..."
                required
                value={legislationUrl}
                onChange={(e) => setLegislationUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-400 font-mono">Primary Case Law URL</label>
              <input
                type="url"
                placeholder="https://..."
                required
                value={caseLawUrl}
                onChange={(e) => setCaseLawUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-400 font-mono">Additional Case Archive (Optional)</label>
              <input
                type="url"
                placeholder="https://..."
                value={additionalCaseLawArchive}
                onChange={(e) => setAdditionalCaseLawArchive(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-400 font-mono">Constitutional Court (Optional)</label>
              <input
                type="url"
                placeholder="https://..."
                value={constitutionalCourtUrl}
                onChange={(e) => setConstitutionalCourtUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-400 font-mono">Administrative Court (Optional)</label>
              <input
                type="url"
                placeholder="https://..."
                value={administrativeCourtUrl}
                onChange={(e) => setAdministrativeCourtUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-400 font-mono">Research Guide Resource Description</label>
              <input
                type="text"
                placeholder="e.g. Irish Legal Systems Guide"
                value={researchGuide}
                onChange={(e) => setResearchGuide(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-slate-400 font-mono">Compliance Bodies / Regulators (comma separated)</label>
              <input
                type="text"
                placeholder="e.g. Data Protection Commission (DPC), Central Bank"
                value={complianceBodies}
                onChange={(e) => setComplianceBodies(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-400 font-mono">Languages (comma separated)</label>
              <input
                type="text"
                placeholder="e.g. Irish, English"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white"
              />
            </div>

            <div className="md:col-span-3 flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-705 px-4 py-2 text-xs text-slate-300 rounded font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-xs rounded font-bold transition flex items-center gap-1"
              >
                {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Database Record</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Split Layout: Jurisdictions List vs Deep-Dive Display Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Europe Collection List */}
        <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
            Firestore Records ({filtered.length})
          </span>
          
          {loading && jurisdictions.length === 0 ? (
            <div className="py-20 text-center text-slate-500 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto mb-2" />
              <span>Querying cloud Firestore...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-slate-500 rounded bg-slate-900 border border-dashed border-slate-800 text-xs p-4">
              <AlertCircle className="w-8 h-8 text-amber-500/80 mx-auto mb-2" />
              <p className="font-bold">No Europe core documents found</p>
              <p className="text-[11px] text-slate-400 mt-1">Seeding the default dataset will instantly populate this collection.</p>
              <button
                onClick={handleSeed}
                className="mt-4 bg-amber-600/25 hover:bg-amber-600 text-amber-300 hover:text-white px-3 py-1.5 rounded text-[10px] font-bold font-mono transition"
              >
                Run Seed Now
              </button>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`group w-full p-3 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between ${
                    selectedItem?.id === item.id 
                      ? "bg-indigo-950/60 border-indigo-500" 
                      : "bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-bold text-slate-200 text-sm">{item.country}</span>
                      <span className="text-[9px] font-mono font-black uppercase bg-slate-950 text-slate-500 px-1.5 py-0.5 rounded border border-slate-800">
                        {item.id}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-1 max-w-[170px]">
                      {item.system_type}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(item);
                      }}
                      title="Edit Doc"
                      className="p-1 hover:bg-slate-800 rounded text-amber-400 hover:text-amber-300"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      title="Delete Doc"
                      className="p-1 hover:bg-slate-800 rounded text-rose-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Deep-Dive Details */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-xl p-6">
          {selectedItem ? (
            <div className="space-y-6">
              
              {/* Header Info */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-1.5 text-indigo-400 font-mono text-[10px] uppercase font-bold">
                    <Globe className="w-3 h-3 text-emerald-400 animate-spin" style={{ animationDuration: "15s" }} />
                    Sovereign Legal System Profiles
                  </div>
                  <h3 className="text-2xl font-black text-white mt-1">{selectedItem.country}</h3>
                  <p className="text-xs text-amber-400 mt-1.5 font-bold bg-slate-900 border border-slate-800 py-1.5 px-3 rounded inline-block">
                    🔧 {selectedItem.system_type}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-4xl font-extrabold text-slate-800 select-all">{selectedItem.id}</span>
                  <div className="text-[9px] text-slate-500 font-mono mt-1">FIRESTORE ID</div>
                </div>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Constitutional Foundations */}
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800/80">
                  <div className="flex items-center gap-2 mb-2 text-indigo-300">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider font-mono text-[10px]">Constitutional Foundations</span>
                  </div>
                  <ul className="space-y-1">
                    {selectedItem.constitutional_foundation && selectedItem.constitutional_foundation.map((found, i) => (
                      <li key={i} className="text-xs text-slate-200 flex items-start gap-1 pb-1">
                        <span className="text-indigo-400 font-bold">•</span>
                        <span>{found}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Regional Compliance Regulators */}
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800/80">
                  <div className="flex items-center gap-2 mb-2 text-emerald-300">
                    <Building2 className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider font-mono text-[10px]">Compliance Bodies & Regulators</span>
                  </div>
                  <ul className="space-y-1">
                    {selectedItem.compliance_bodies && selectedItem.compliance_bodies.map((body, i) => (
                      <li key={i} className="text-xs text-slate-200 flex items-start gap-1 pb-1">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{body}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Primary Access Web Channels */}
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800/80 md:col-span-2 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-1.5 text-sky-300">
                    <Scale className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider font-mono text-[10px]">Official Justice Web Portals</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <a
                      href={selectedItem.legislation_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded bg-slate-950 border border-slate-800 hover:border-sky-500 transition-all font-sans font-semibold text-slate-200 flex items-center justify-between"
                    >
                      <span className="truncate">Legislation Portal</span>
                      <ExternalLink className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    </a>

                    <a
                      href={selectedItem.case_law_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded bg-slate-950 border border-slate-800 hover:border-sky-500 transition-all font-sans font-semibold text-slate-200 flex items-center justify-between"
                    >
                      <span className="truncate">Supreme Appellate / Case Law</span>
                      <ExternalLink className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    </a>

                    {selectedItem.additional_case_law_archive && (
                      <a
                        href={selectedItem.additional_case_law_archive}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded bg-slate-950 border border-slate-800 hover:border-sky-500 transition-all font-sans font-semibold text-slate-200 flex items-center justify-between"
                      >
                        <span className="truncate">Additional Case Archive</span>
                        <ExternalLink className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      </a>
                    )}

                    {selectedItem.constitutional_court_url && (
                      <a
                        href={selectedItem.constitutional_court_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded bg-slate-950 border border-slate-800 hover:border-sky-500 transition-all font-sans font-semibold text-slate-200 flex items-center justify-between"
                      >
                        <span className="truncate">Constitutional Court</span>
                        <ExternalLink className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      </a>
                    )}

                    {selectedItem.administrative_court_url && (
                      <a
                        href={selectedItem.administrative_court_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded bg-slate-950 border border-slate-800 hover:border-sky-500 transition-all font-sans font-semibold text-slate-200 flex items-center justify-between"
                      >
                        <span className="truncate">Administrative Court</span>
                        <ExternalLink className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      </a>
                    )}
                  </div>
                </div>

                {/* More Details (Languages, Guides) */}
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800/80 md:col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                      OFFICIAL STATE LANGUAGE(S)
                    </span>
                    <p className="text-xs text-white font-bold mt-1">
                      {selectedItem.languages ? selectedItem.languages.join(", ") : "N/A"}
                    </p>
                  </div>

                  <div>
                    <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                      ACADEMIC RESEARCH GUIDE
                    </span>
                    <p className="text-xs text-white font-bold mt-1">
                      📚 {selectedItem.research_guide}
                    </p>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col justify-center items-center text-center text-slate-500 py-20">
              <HelpCircle className="w-12 h-12 text-slate-700 mb-2 animate-bounce" />
              <p className="font-sans text-sm font-semibold">No European Document Selected</p>
              <p className="text-xs text-slate-400 mt-1">Select any country record from the left Firestore catalogue to dive into full details.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
