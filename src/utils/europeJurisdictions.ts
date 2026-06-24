import { collection, getDocs, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

export interface EuropeJurisdiction {
  id: string; // e.g. "UK", "DE"
  country: string; // Keep for compatibility
  name?: string; // Standard name
  system_type: string;
  constitutional_foundation: string[];
  legislation_url: string;
  case_law_url: string;
  additional_case_law_archive?: string;
  additional_case_law_url?: string;
  constitutional_court_url?: string;
  administrative_court_url?: string;
  compliance_bodies: string[];
  languages: string[];
  research_guide: string;
  eu_member?: boolean;
}

export const INITIAL_EUROPE_JURISDICTIONS: EuropeJurisdiction[] = [
  {
    "id": "UK",
    "country": "United Kingdom",
    "name": "United Kingdom",
    "system_type": "Common law system with constitutional conventions, statutes, and judicial precedent.",
    "constitutional_foundation": [
      "Acts of Parliament",
      "Common law",
      "Constitutional conventions",
      "Constitutional instruments (e.g., Magna Carta, Bill of Rights 1689)"
    ],
    "legislation_url": "https://www.legislation.gov.uk",
    "case_law_url": "https://www.supremecourt.uk",
    "additional_case_law_archive": "https://www.bailii.org",
    "additional_case_law_url": "https://www.bailii.org",
    "compliance_bodies": [
      "Financial Conduct Authority (FCA)",
      "Information Commissioner's Office (ICO)",
      "HM Revenue & Customs (HMRC)"
    ],
    "languages": ["English", "Welsh", "Scots Gaelic", "Irish"],
    "research_guide": "UK Law Research Guides (Oxford, LSE, etc.)",
    "eu_member": false
  },
  {
    "id": "DE",
    "country": "Germany",
    "name": "Germany",
    "system_type": "Civil law system with strong constitutional supremacy.",
    "constitutional_foundation": ["Grundgesetz (Basic Law)"],
    "legislation_url": "https://www.gesetze-im-internet.de",
    "case_law_url": "https://www.bundesgerichtshof.de",
    "constitutional_court_url": "https://www.bundesverfassungsgericht.de",
    "compliance_bodies": [
      "BaFin (Federal Financial Supervisory Authority)",
      "BfDI (Federal Data Protection Commissioner)"
    ],
    "languages": ["German"],
    "research_guide": "German Law Research Guides (Max Planck, university portals)",
    "eu_member": true
  },
  {
    "id": "FR",
    "country": "France",
    "name": "France",
    "system_type": "Civil law system rooted in the Napoleonic Code.",
    "constitutional_foundation": ["Constitution of the Fifth Republic (1958)"],
    "legislation_url": "https://www.legifrance.gouv.fr",
    "case_law_url": "https://www.courdecassation.fr",
    "administrative_court_url": "https://www.conseil-etat.fr",
    "compliance_bodies": [
      "CNIL (Data Protection Authority)",
      "AMF (Financial Markets Authority)"
    ],
    "languages": ["French"],
    "research_guide": "Légifrance Research Portal",
    "eu_member": true
  },
  {
    "id": "IT",
    "country": "Italy",
    "name": "Italy",
    "system_type": "Civil law system with constitutional supremacy.",
    "constitutional_foundation": ["Constitution of the Italian Republic (1948)"],
    "legislation_url": "https://www.normattiva.it",
    "case_law_url": "https://www.cortedicassazione.it",
    "constitutional_court_url": "https://www.cortecostituzionale.it",
    "compliance_bodies": [
      "Garante Privacy (Data Protection Authority)",
      "CONSOB (Financial Regulation Authority)"
    ],
    "languages": ["Italian"],
    "research_guide": "Italian Law Research Guides",
    "eu_member": true
  },
  {
    "id": "ES",
    "country": "Spain",
    "name": "Spain",
    "system_type": "Civil law system with autonomous communities.",
    "constitutional_foundation": ["Spanish Constitution (1978)"],
    "legislation_url": "https://www.boe.es",
    "case_law_url": "https://www.poderjudicial.es",
    "constitutional_court_url": "https://www.tribunalconstitucional.es",
    "compliance_bodies": [
      "AEPD (Data Protection Authority)",
      "CNMV (Financial Markets Authority)"
    ],
    "languages": ["Spanish (Castilian)", "Catalan", "Basque", "Galician"],
    "research_guide": "BOE Legal Research Portal",
    "eu_member": true
  },
  {
    "id": "PT",
    "country": "Portugal",
    "name": "Portugal",
    "system_type": "Civil law system with constitutional supremacy.",
    "constitutional_foundation": ["Constitution of the Portuguese Republic (1976)"],
    "legislation_url": "https://dre.pt",
    "case_law_url": "https://www.stj.pt",
    "constitutional_court_url": "https://www.tribunalconstitucional.pt",
    "compliance_bodies": [
      "CNPD (Data Protection Authority)",
      "CMVM (Financial Markets Authority)"
    ],
    "languages": ["Portuguese"],
    "research_guide": "Portuguese Legal Research Guides",
    "eu_member": true
  },
  {
    "id": "NL",
    "country": "Netherlands",
    "name": "Netherlands",
    "system_type": "Civil law system with constitutional monarchy.",
    "constitutional_foundation": ["Grondwet (Dutch Constitution)"],
    "legislation_url": "https://www.overheid.nl",
    "case_law_url": "https://www.hogeraad.nl",
    "administrative_court_url": "https://www.raadvanstate.nl",
    "compliance_bodies": [
      "Autoriteit Persoonsgegevens (AP)",
      "AFM (Financial Markets Authority)"
    ],
    "languages": ["Dutch"],
    "research_guide": "Dutch Law Research Guides",
    "eu_member": true
  }
];

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Loads Europe core jurisdictions from Firestore.
 */
export async function getEuropeJurisdictions(): Promise<EuropeJurisdiction[]> {
  const colPath = "jurisdictions_europe_core";
  try {
    const colRef = collection(db, colPath);
    const snap = await getDocs(colRef);
    const results: EuropeJurisdiction[] = [];
    snap.forEach((doc) => {
      const d = doc.data();
      results.push({
        id: doc.id,
        country: d.country || d.name || "",
        name: d.name || d.country || "",
        system_type: d.system_type || "",
        constitutional_foundation: d.constitutional_foundation || [],
        legislation_url: d.legislation_url || "",
        case_law_url: d.case_law_url || "",
        additional_case_law_archive: d.additional_case_law_archive || d.additional_case_law_url || "",
        additional_case_law_url: d.additional_case_law_url || d.additional_case_law_archive || "",
        constitutional_court_url: d.constitutional_court_url || "",
        administrative_court_url: d.administrative_court_url || "",
        compliance_bodies: d.compliance_bodies || [],
        languages: d.languages || [],
        research_guide: d.research_guide || "",
        eu_member: d.eu_member !== undefined ? d.eu_member : undefined
      });
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
    return [];
  }
}

/**
 * Seeds Europe core jurisdictions into Firestore if not already present or forced.
 */
export async function seedEuropeJurisdictions(force = false): Promise<void> {
  const colPath = "jurisdictions_europe_core";
  try {
    if (!force) {
      const existing = await getEuropeJurisdictions();
      if (existing.length > 0) {
        console.log("Europe Jurisdictions already seeded in Firestore");
        return;
      }
    }

    console.log("Seeding Europe Jurisdictions to Firestore...");
    for (const item of INITIAL_EUROPE_JURISDICTIONS) {
      const docRef = doc(db, colPath, item.id);
      await setDoc(docRef, item);
    }
    console.log("Seeding completed successfully!");
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, colPath);
  }
}

/**
 * Saves a single custom European jurisdiction
 */
export async function saveEuropeJurisdiction(item: EuropeJurisdiction): Promise<void> {
  const colPath = "jurisdictions_europe_core";
  try {
    const docRef = doc(db, colPath, item.id);
    await setDoc(docRef, item);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${colPath}/${item.id}`);
  }
}

/**
 * Deletes a single European jurisdiction
 */
export async function deleteEuropeJurisdiction(id: string): Promise<void> {
  const colPath = "jurisdictions_europe_core";
  try {
    const docRef = doc(db, colPath, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${colPath}/${id}`);
  }
}

export interface EuropeSubnational {
  id: string; // e.g. "UK-SCT"
  country_id: string; // e.g. "UK"
  name: string;
  type: string;
  constitutional_basis: string;
  legislation_url: string;
  parliament_url?: string;
  highest_court_url: string;
  notes: string;
}

export const INITIAL_EUROPE_SUBNATIONAL: EuropeSubnational[] = [
  {
    "id": "UK-SCT",
    "country_id": "UK",
    "name": "Scotland",
    "type": "Devolved nation",
    "constitutional_basis": "Scotland Act 1998 and subsequent devolution legislation",
    "legislation_url": "https://www.legislation.gov.uk",
    "parliament_url": "https://www.parliament.scot",
    "highest_court_url": "https://www.supremecourt.uk",
    "notes": "Devolved legislature with reserved matters at UK level."
  },
  {
    "id": "UK-WLS",
    "country_id": "UK",
    "name": "Wales",
    "type": "Devolved nation",
    "constitutional_basis": "Government of Wales Acts 1998, 2006 and subsequent reforms",
    "legislation_url": "https://www.legislation.gov.uk",
    "parliament_url": "https://senedd.wales",
    "highest_court_url": "https://www.supremecourt.uk",
    "notes": "Devolved legislature; UK Parliament retains sovereignty."
  },
  {
    "id": "DE-BY",
    "country_id": "DE",
    "name": "Bavaria",
    "type": "Land (federal state)",
    "constitutional_basis": "Bavarian Constitution (Bayerische Verfassung)",
    "legislation_url": "https://www.gesetze-bayern.de",
    "highest_court_url": "https://www.bundesgerichtshof.de",
    "notes": "Part of German federal system; subject to Grundgesetz supremacy."
  },
  {
    "id": "ES-CAT",
    "country_id": "ES",
    "name": "Catalonia",
    "type": "Autonomous community",
    "constitutional_basis": "Spanish Constitution (1978) and Statute of Autonomy of Catalonia",
    "legislation_url": "https://dogc.gencat.cat",
    "highest_court_url": "https://www.poderjudicial.es",
    "notes": "Autonomous legislative powers within Spanish constitutional framework."
  },
  {
    "id": "IT-LOM",
    "country_id": "IT",
    "name": "Lombardy",
    "type": "Region",
    "constitutional_basis": "Italian Constitution and regional statutes",
    "legislation_url": "https://www.normattiva.it",
    "highest_court_url": "https://www.cortedicassazione.it",
    "notes": "Region with legislative powers in certain subject matters."
  },
  {
    "id": "NL-NH",
    "country_id": "NL",
    "name": "North Holland",
    "type": "Province",
    "constitutional_basis": "Dutch Constitution and provincial law",
    "legislation_url": "https://www.overheid.nl",
    "highest_court_url": "https://www.hogeraad.nl",
    "notes": "Provincial administration within unitary constitutional monarchy."
  }
];

/**
 * Loads Europe subnational jurisdictions from Firestore.
 */
export async function getEuropeSubnationalJurisdictions(): Promise<EuropeSubnational[]> {
  const colPath = "Europe_subnational";
  try {
    const colRef = collection(db, colPath);
    const snap = await getDocs(colRef);
    const results: EuropeSubnational[] = [];
    snap.forEach((doc) => {
      const d = doc.data();
      results.push({
        id: doc.id,
        country_id: d.country_id || "",
        name: d.name || "",
        type: d.type || "",
        constitutional_basis: d.constitutional_basis || "",
        legislation_url: d.legislation_url || "",
        parliament_url: d.parliament_url || "",
        highest_court_url: d.highest_court_url || "",
        notes: d.notes || ""
      });
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
    return [];
  }
}

/**
 * Seeds Europe subnational jurisdictions into Firestore if not already present or forced.
 */
export async function seedEuropeSubnationalJurisdictions(force = false): Promise<void> {
  const colPath = "Europe_subnational";
  try {
    if (!force) {
      const existing = await getEuropeSubnationalJurisdictions();
      if (existing.length > 0) {
        console.log("Europe Subnational Jurisdictions already seeded in Firestore");
        return;
      }
    }

    console.log("Seeding Europe Subnational Jurisdictions to Firestore...");
    for (const item of INITIAL_EUROPE_SUBNATIONAL) {
      const docRef = doc(db, colPath, item.id);
      await setDoc(docRef, item);
    }
    console.log("Europe Subnational Seeding completed successfully!");
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, colPath);
  }
}

/**
 * Saves a single custom European subnational jurisdiction
 */
export async function saveEuropeSubnationalJurisdiction(item: EuropeSubnational): Promise<void> {
  const colPath = "Europe_subnational";
  try {
    const docRef = doc(db, colPath, item.id);
    await setDoc(docRef, item);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${colPath}/${item.id}`);
  }
}

/**
 * Deletes a single European subnational jurisdiction
 */
export async function deleteEuropeSubnationalJurisdiction(id: string): Promise<void> {
  const colPath = "Europe_subnational";
  try {
    const docRef = doc(db, colPath, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${colPath}/${id}`);
  }
}
