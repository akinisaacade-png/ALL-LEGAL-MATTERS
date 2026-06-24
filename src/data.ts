import { Attorney, SovereignJurisdiction } from "./types";

export const JURISDICTIONS_DATA: { [key: string]: SovereignJurisdiction } = {
  "CA": {
    id: "CA",
    name: "Canada",
    legal_system: "Mixed: Common law (all provinces) + Civil law (Québec)",
    constitution_name: "Constitution Acts, 1867 to 1982",
    constitution_url: "https://laws-lois.justice.gc.ca/eng/Const/index.html",
    federal_legislation_portal_name: "Justice Laws Website",
    federal_legislation_portal_url: "https://laws-lois.justice.gc.ca",
    supreme_court_name: "Supreme Court of Canada",
    supreme_court_url: "https://www.scc-csc.ca",
    research_guide: "https://www.worldlii.org/ca/",
    subnational: [
      {
        id: "CA-AB",
        name: "Alberta",
        capital: "Edmonton",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Alberta King's Printer Open Legislation",
        official_legislation_portal_url: "https://www.qp.alberta.ca",
        highest_court_name: "Court of Appeal of Alberta",
        highest_court_url: "https://www.albertacourts.ca",
        justice_ministry_url: "https://www.justice.alberta.ca"
      },
      {
        id: "CA-BC",
        name: "British Columbia",
        capital: "Victoria",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "BC Laws Portal",
        official_legislation_portal_url: "https://www.bclaws.gov.bc.ca",
        highest_court_name: "Court of Appeal of British Columbia",
        highest_court_url: "https://www.bccourts.ca",
        justice_ministry_url: "https://www2.gov.bc.ca/gov/content/governments/organizational-structure/ministries-organizations/ministries/attorney-general"
      },
      {
        id: "CA-MB",
        name: "Manitoba",
        capital: "Winnipeg",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Manitoba Laws Portal",
        official_legislation_portal_url: "https://web2.gov.mb.ca/laws",
        highest_court_name: "Court of Appeal of Manitoba",
        highest_court_url: "https://www.manitobacourts.mb.ca",
        justice_ministry_url: "https://www.gov.mb.ca/justice"
      },
      {
        id: "CA-NB",
        name: "New Brunswick",
        capital: "Fredericton",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "New Brunswick Acts & Regulations",
        official_legislation_portal_url: "https://laws.gnb.ca",
        highest_court_name: "Court of Appeal of New Brunswick",
        highest_court_url: "https://www.gnb.ca/cour",
        justice_ministry_url: "https://www2.gnb.ca/content/gnb/en/departments/jps.html"
      },
      {
        id: "CA-NL",
        name: "Newfoundland and Labrador",
        capital: "St. John's",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "House of Assembly Legislation",
        official_legislation_portal_url: "https://www.assembly.nl.ca/Legislation",
        highest_court_name: "Supreme Court of Newfoundland and Labrador",
        highest_court_url: "https://court.nl.ca",
        justice_ministry_url: "https://www.gov.nl.ca/jps"
      },
      {
        id: "CA-NS",
        name: "Nova Scotia",
        capital: "Halifax",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Nova Scotia Legislature Portal",
        official_legislation_portal_url: "https://nslegislature.ca/legc",
        highest_court_name: "Court of Appeal of Nova Scotia",
        highest_court_url: "https://www.courts.ns.ca",
        justice_ministry_url: "https://novascotia.ca/just"
      },
      {
        id: "CA-ON",
        name: "Ontario",
        capital: "Toronto",
        legal_system_notes: "Common law; subject to Canadian Charter of Rights.",
        official_legislation_portal_name: "e-Laws Ontario",
        official_legislation_portal_url: "https://www.ontario.ca/laws",
        highest_court_name: "Court of Appeal for Ontario",
        highest_court_url: "https://www.ontariocourts.ca/coa/en/",
        justice_ministry_url: "https://www.attorneygeneral.jus.gov.on.ca"
      },
      {
        id: "CA-PE",
        name: "Prince Edward Island",
        capital: "Charlottetown",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Prince Edward Island Legislative Portal",
        official_legislation_portal_url: "https://www.princeedwardisland.ca/en/legislation",
        highest_court_name: "Court of Appeal of Prince Edward Island",
        highest_court_url: "https://www.courts.pe.ca",
        justice_ministry_url: "https://www.princeedwardisland.ca/en/topic/justice-and-public-safety"
      },
      {
        id: "CA-QC",
        name: "Quebec",
        capital: "Québec City",
        legal_system_notes: "Civil law (private law) + Common law (public law)",
        official_legislation_portal_name: "LégisQuébec",
        official_legislation_portal_url: "https://www.legisquebec.gouv.qc.ca",
        highest_court_name: "Court of Appeal of Québec",
        highest_court_url: "https://courdappelduquebec.ca",
        justice_ministry_url: "https://www.justice.gouv.qc.ca"
      },
      {
        id: "CA-SK",
        name: "Saskatchewan",
        capital: "Regina",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Publications Saskatchewan Legislation Hub",
        official_legislation_portal_url: "https://publications.saskatchewan.ca/#/categories/9",
        highest_court_name: "Court of Appeal of Saskatchewan",
        highest_court_url: "https://sasklawcourts.ca",
        justice_ministry_url: "https://www.saskatchewan.ca/government/government-structure/ministries/justice-and-attorney-general"
      },
      {
        id: "CA-NT",
        name: "Northwest Territories",
        capital: "Yellowknife",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "NWT Laws & Regulations",
        official_legislation_portal_url: "https://www.justice.gov.nt.ca/en/laws-and-regulations",
        highest_court_name: "Court of Appeal of Northwest Territories",
        highest_court_url: "https://www.nwtcourts.ca",
        justice_ministry_url: "https://www.justice.gov.nt.ca"
      },
      {
        id: "CA-NU",
        name: "Nunavut",
        capital: "Iqaluit",
        legal_system_notes: "Common law + Inuit customary law",
        official_legislation_portal_name: "Nunavut Legislation Portal",
        official_legislation_portal_url: "https://www.nunavutlegislation.ca",
        highest_court_name: "Nunavut Court of Justice",
        highest_court_url: "https://www.nunavutcourts.ca",
        justice_ministry_url: "https://www.gov.nu.ca/justice"
      },
      {
        id: "CA-YT",
        name: "Yukon",
        capital: "Whitehorse",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Yukon Legislation Portal",
        official_legislation_portal_url: "https://laws.yukon.ca",
        highest_court_name: "Court of Appeal of Yukon",
        highest_court_url: "https://www.yukoncourts.ca",
        justice_ministry_url: "https://yukon.ca/en/justice"
      }
    ]
  },
  "US": {
    id: "US",
    name: "United States of America",
    legal_system: "Common law",
    constitution_name: "Constitution of the United States",
    constitution_url: "https://www.archives.gov/founding-docs/constitution",
    federal_legislation_portal_name: "U.S. Code (House Office of Law Revision)",
    federal_legislation_portal_url: "https://uscode.house.gov",
    supreme_court_name: "Supreme Court of the United States",
    supreme_court_url: "https://www.supremecourt.gov",
    research_guide: "https://www.loc.gov/research-centers/law-library-of-congress/about-this-research-center/",
    subnational: [
      {
        id: "US-AL",
        name: "Alabama",
        capital: "Montgomery",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Alabama Legislative Information System",
        official_legislation_portal_url: "https://alisondb.legislature.state.al.us",
        highest_court_name: "Supreme Court of Alabama",
        highest_court_url: "https://judicial.alabama.gov",
        justice_ministry_url: "https://www.alabamaag.gov"
      },
      {
        id: "US-AK",
        name: "Alaska",
        capital: "Juneau",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Alaska State Legislature Portal",
        official_legislation_portal_url: "http://www.akleg.gov/basis/Home/Legislation",
        highest_court_name: "Supreme Court of Alaska",
        highest_court_url: "https://courts.alaska.gov",
        justice_ministry_url: "https://law.alaska.gov"
      },
      {
        id: "US-AZ",
        name: "Arizona",
        capital: "Phoenix",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Arizona Revised Statutes Portal",
        official_legislation_portal_url: "https://www.azleg.gov/ars",
        highest_court_name: "Arizona Supreme Court",
        highest_court_url: "https://www.azcourts.gov",
        justice_ministry_url: "https://www.azag.gov"
      },
      {
        id: "US-AR",
        name: "Arkansas",
        capital: "Little Rock",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Arkansas State Legislature System",
        official_legislation_portal_url: "https://arkleg.state.ar.us",
        highest_court_name: "Arkansas Supreme Court",
        highest_court_url: "https://arcourts.gov",
        justice_ministry_url: "https://arkansasag.gov"
      },
      {
        id: "US-CA",
        name: "California",
        capital: "Sacramento",
        legal_system_notes: "Common law; statutory codes govern specific legal sections.",
        official_legislation_portal_name: "California Legislative Info Portal",
        official_legislation_portal_url: "https://leginfo.legislature.ca.gov",
        highest_court_name: "Supreme Court of California",
        highest_court_url: "https://www.courts.ca.gov",
        justice_ministry_url: "https://oag.ca.gov"
      },
      {
        id: "US-CO",
        name: "Colorado",
        capital: "Denver",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Colorado General Assembly Portal",
        official_legislation_portal_url: "https://leg.colorado.gov",
        highest_court_name: "Colorado Supreme Court",
        highest_court_url: "https://www.courts.state.co.us",
        justice_ministry_url: "https://coag.gov"
      },
      {
        id: "US-CT",
        name: "Connecticut",
        capital: "Hartford",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Connecticut General Assembly System",
        official_legislation_portal_url: "https://www.cga.ct.gov",
        highest_court_name: "Connecticut Supreme Court",
        highest_court_url: "https://jud.ct.gov",
        justice_ministry_url: "https://portal.ct.gov/AG"
      },
      {
        id: "US-DE",
        name: "Delaware",
        capital: "Dover",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Delaware Code Online Portal",
        official_legislation_portal_url: "https://delcode.delaware.gov",
        highest_court_name: "Delaware Supreme Court",
        highest_court_url: "https://courts.delaware.gov",
        justice_ministry_url: "https://attorneygeneral.delaware.gov"
      },
      {
        id: "US-FL",
        name: "Florida",
        capital: "Tallahassee",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Online Sunshine Legislation",
        official_legislation_portal_url: "https://www.leg.state.fl.us",
        highest_court_name: "Florida Supreme Court",
        highest_court_url: "https://www.flcourts.gov",
        justice_ministry_url: "https://www.myfloridalegal.com"
      },
      {
        id: "US-GA",
        name: "Georgia",
        capital: "Atlanta",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Georgia General Assembly Portal",
        official_legislation_portal_url: "https://www.legis.ga.gov",
        highest_court_name: "Supreme Court of Georgia",
        highest_court_url: "https://www.gasupreme.us",
        justice_ministry_url: "https://law.georgia.gov"
      },
      {
        id: "US-HI",
        name: "Hawaii",
        capital: "Honolulu",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Hawaii State Capitol Portal",
        official_legislation_portal_url: "https://www.capitol.hawaii.gov",
        highest_court_name: "State of Hawaii Supreme Court",
        highest_court_url: "https://www.courts.state.hi.us",
        justice_ministry_url: "https://ag.hawaii.gov"
      },
      {
        id: "US-ID",
        name: "Idaho",
        capital: "Boise",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Idaho Statutes & Rules",
        official_legislation_portal_url: "https://legislature.idaho.gov/statutesrules",
        highest_court_name: "Idaho Supreme Court",
        highest_court_url: "https://isc.idaho.gov",
        justice_ministry_url: "https://ag.idaho.gov"
      },
      {
        id: "US-IL",
        name: "Illinois",
        capital: "Springfield",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Illinois General Assembly Portal",
        official_legislation_portal_url: "https://www.ilga.gov",
        highest_court_name: "Supreme Court of Illinois",
        highest_court_url: "https://www.illinoiscourts.gov",
        justice_ministry_url: "https://illinoisattorneygeneral.gov"
      },
      {
        id: "US-IN",
        name: "Indiana",
        capital: "Indianapolis",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Indiana General Assembly System",
        official_legislation_portal_url: "https://iga.in.gov",
        highest_court_name: "Indiana Supreme Court",
        highest_court_url: "https://www.in.gov/courts",
        justice_ministry_url: "https://www.in.gov/attorneygeneral"
      },
      {
        id: "US-IA",
        name: "Iowa",
        capital: "Des Moines",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Iowa Legislature Portal",
        official_legislation_portal_url: "https://www.legis.iowa.gov",
        highest_court_name: "Iowa Supreme Court",
        highest_court_url: "https://www.iowacourts.gov",
        justice_ministry_url: "https://www.iowaattorneygeneral.gov"
      },
      {
        id: "US-KS",
        name: "Kansas",
        capital: "Topeka",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Kansas Legislature Portal",
        official_legislation_portal_url: "http://kslegislature.org",
        highest_court_name: "Kansas Supreme Court",
        highest_court_url: "https://www.kscourts.org",
        justice_ministry_url: "https://ag.ks.gov"
      },
      {
        id: "US-KY",
        name: "Kentucky",
        capital: "Frankfort",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Kentucky General Assembly Laws",
        official_legislation_portal_url: "https://legislature.ky.gov",
        highest_court_name: "Kentucky Supreme Court",
        highest_court_url: "https://kycourts.gov",
        justice_ministry_url: "https://ag.ky.gov"
      },
      {
        id: "US-LA",
        name: "Louisiana",
        capital: "Baton Rouge",
        legal_system_notes: "Civil law + Common law hybrid",
        official_legislation_portal_name: "Louisiana State Legislature System",
        official_legislation_portal_url: "https://www.legis.la.gov",
        highest_court_name: "Supreme Court of Louisiana",
        highest_court_url: "https://www.lasc.org",
        justice_ministry_url: "https://www.ag.state.la.us"
      },
      {
        id: "US-ME",
        name: "Maine",
        capital: "Augusta",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Maine Legislature Portal",
        official_legislation_portal_url: "https://legislature.maine.gov",
        highest_court_name: "Maine Supreme Judicial Court",
        highest_court_url: "https://www.courts.maine.gov",
        justice_ministry_url: "https://www.maine.gov/ag"
      },
      {
        id: "US-MD",
        name: "Maryland",
        capital: "Annapolis",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Maryland General Assembly Portal",
        official_legislation_portal_url: "https://mgaleg.maryland.gov",
        highest_court_name: "Supreme Court of Maryland",
        highest_court_url: "https://mdcourts.gov",
        justice_ministry_url: "https://www.marylandattorneygeneral.gov"
      },
      {
        id: "US-MA",
        name: "Massachusetts",
        capital: "Boston",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Massachusetts General Court Portal",
        official_legislation_portal_url: "https://malegislature.gov",
        highest_court_name: "Massachusetts Supreme Judicial Court",
        highest_court_url: "https://www.mass.gov/courts",
        justice_ministry_url: "https://www.mass.gov/orgs/office-of-the-attorney-general"
      },
      {
        id: "US-MI",
        name: "Michigan",
        capital: "Lansing",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Michigan Legislature Portal",
        official_legislation_portal_url: "https://www.legislature.mi.gov",
        highest_court_name: "Michigan Supreme Court",
        highest_court_url: "https://courts.michigan.gov",
        justice_ministry_url: "https://www.michigan.gov/ag"
      },
      {
        id: "US-MN",
        name: "Minnesota",
        capital: "St. Paul",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Minnesota Office of the Revisor",
        official_legislation_portal_url: "https://www.revisor.mn.gov",
        highest_court_name: "Minnesota Supreme Court",
        highest_court_url: "https://www.mncourts.gov",
        justice_ministry_url: "https://www.ag.state.mn.us"
      },
      {
        id: "US-MS",
        name: "Mississippi",
        capital: "Jackson",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Mississippi Bill Status & Laws",
        official_legislation_portal_url: "http://billstatus.ls.state.ms.us",
        highest_court_name: "Mississippi Supreme Court",
        highest_court_url: "https://courts.ms.gov",
        justice_ministry_url: "https://www.ago.state.ms.us"
      },
      {
        id: "US-MO",
        name: "Missouri",
        capital: "Jefferson City",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Revisor of Missouri Legislation",
        official_legislation_portal_url: "https://revisor.mo.gov",
        highest_court_name: "Supreme Court of Missouri",
        highest_court_url: "https://www.courts.mo.gov",
        justice_ministry_url: "https://ago.mo.gov"
      },
      {
        id: "US-MT",
        name: "Montana",
        capital: "Helena",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Montana Legislature Laws",
        official_legislation_portal_url: "https://leg.mt.gov",
        highest_court_name: "Montana Supreme Court",
        highest_court_url: "https://courts.mt.gov",
        justice_ministry_url: "https://dojmt.gov"
      },
      {
        id: "US-NE",
        name: "Nebraska",
        capital: "Lincoln",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Nebraska Legislature Portal",
        official_legislation_portal_url: "https://nebraskalegislature.gov",
        highest_court_name: "Nebraska Supreme Court",
        highest_court_url: "https://supremecourt.nebraska.gov",
        justice_ministry_url: "https://ago.nebraska.gov"
      },
      {
        id: "US-NV",
        name: "Nevada",
        capital: "Carson City",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Nevada Legislature Laws Portal",
        official_legislation_portal_url: "https://www.leg.state.nv.us",
        highest_court_name: "Supreme Court of Nevada",
        highest_court_url: "https://nvcourts.gov",
        justice_ministry_url: "https://ag.nv.gov"
      },
      {
        id: "US-NH",
        name: "New Hampshire",
        capital: "Concord",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "New Hampshire General Court Portal",
        official_legislation_portal_url: "https://www.gencourt.state.nh.us",
        highest_court_name: "New Hampshire Supreme Court",
        highest_court_url: "https://www.courts.nh.gov",
        justice_ministry_url: "https://www.doj.nh.gov"
      },
      {
        id: "US-NJ",
        name: "New Jersey",
        capital: "Trenton",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "New Jersey Legislature Laws",
        official_legislation_portal_url: "https://www.njleg.state.nj.us",
        highest_court_name: "Supreme Court of New Jersey",
        highest_court_url: "https://www.njcourts.gov",
        justice_ministry_url: "https://www.njoag.gov"
      },
      {
        id: "US-NM",
        name: "New Mexico",
        capital: "Santa Fe",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "New Mexico Legislature System",
        official_legislation_portal_url: "https://www.nmlegis.gov",
        highest_court_name: "New Mexico Supreme Court",
        highest_court_url: "https://www.nmcourts.gov",
        justice_ministry_url: "https://www.nmag.gov"
      },
      {
        id: "US-NY",
        name: "New York",
        capital: "Albany",
        legal_system_notes: "Common law; governed by U.S. and NY Constitution.",
        official_legislation_portal_name: "NY Consolidated Laws Portal",
        official_legislation_portal_url: "https://public.leginfo.state.ny.us",
        highest_court_name: "New York Court of Appeals",
        highest_court_url: "https://www.nycourts.gov/ctapps/",
        justice_ministry_url: "https://ag.ny.gov"
      },
      {
        id: "US-NC",
        name: "North Carolina",
        capital: "Raleigh",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "North Carolina General Assembly Portal",
        official_legislation_portal_url: "https://www.ncleg.gov",
        highest_court_name: "Supreme Court of North Carolina",
        highest_court_url: "https://www.nccourts.gov",
        justice_ministry_url: "https://ncdoj.gov"
      },
      {
        id: "US-ND",
        name: "North Dakota",
        capital: "Bismarck",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "North Dakota Legislative Council",
        official_legislation_portal_url: "https://www.legis.nd.gov",
        highest_court_name: "North Dakota Supreme Court",
        highest_court_url: "https://www.ndcourts.gov",
        justice_ministry_url: "https://attorneygeneral.nd.gov"
      },
      {
        id: "US-OH",
        name: "Ohio",
        capital: "Columbus",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Ohio General Assembly Legislation Portal",
        official_legislation_portal_url: "https://www.legislature.ohio.gov",
        highest_court_name: "Supreme Court of Ohio",
        highest_court_url: "https://www.supremecourt.ohio.gov",
        justice_ministry_url: "https://www.ohioattorneygeneral.gov"
      },
      {
        id: "US-OK",
        name: "Oklahoma",
        capital: "Oklahoma City",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Oklahoma Supreme Court Network",
        official_legislation_portal_url: "https://www.oklegislature.gov",
        highest_court_name: "Oklahoma Supreme Court",
        highest_court_url: "https://www.oscn.net",
        justice_ministry_url: "https://www.oag.ok.gov"
      },
      {
        id: "US-OR",
        name: "Oregon",
        capital: "Salem",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Oregon State Legislature Portal",
        official_legislation_portal_url: "https://www.oregonlegislature.gov",
        highest_court_name: "Oregon Supreme Court",
        highest_court_url: "https://www.courts.oregon.gov",
        justice_ministry_url: "https://www.doj.state.or.us"
      },
      {
        id: "US-PA",
        name: "Pennsylvania",
        capital: "Harrisburg",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Pennsylvania General Assembly Portal",
        official_legislation_portal_url: "https://www.legis.state.pa.us",
        highest_court_name: "Supreme Court of Pennsylvania",
        highest_court_url: "https://www.pacourts.us",
        justice_ministry_url: "https://www.attorneygeneral.gov"
      },
      {
        id: "US-RI",
        name: "Rhode Island",
        capital: "Providence",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Rhode Island State Legislature Portal",
        official_legislation_portal_url: "https://www.rilegislature.gov",
        highest_court_name: "Supreme Court of Rhode Island",
        highest_court_url: "https://www.courts.ri.gov",
        justice_ministry_url: "https://riag.ri.gov"
      },
      {
        id: "US-SC",
        name: "South Carolina",
        capital: "Columbia",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "South Carolina Legislature Portal",
        official_legislation_portal_url: "https://www.scstatehouse.gov",
        highest_court_name: "Supreme Court of South Carolina",
        highest_court_url: "https://www.sccourts.org",
        justice_ministry_url: "https://www.scag.gov"
      },
      {
        id: "US-SD",
        name: "South Dakota",
        capital: "Pierre",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "South Dakota Legislative Research Council",
        official_legislation_portal_url: "https://sdlegislature.gov",
        highest_court_name: "South Dakota Supreme Court",
        highest_court_url: "https://ujs.sd.gov",
        justice_ministry_url: "https://atg.sd.gov"
      },
      {
        id: "US-TN",
        name: "Tennessee",
        capital: "Nashville",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Tennessee General Assembly Portal",
        official_legislation_portal_url: "https://www.capitol.tn.gov",
        highest_court_name: "Supreme Court of Tennessee",
        highest_court_url: "https://www.tncourts.gov",
        justice_ministry_url: "https://www.tn.gov/attorneygeneral"
      },
      {
        id: "US-TX",
        name: "Texas",
        capital: "Austin",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Texas Legislature Online",
        official_legislation_portal_url: "https://capitol.texas.gov",
        highest_court_name: "Supreme Court of Texas",
        highest_court_url: "https://www.txcourts.gov",
        justice_ministry_url: "https://www.texasattorneygeneral.gov"
      },
      {
        id: "US-UT",
        name: "Utah",
        capital: "Salt Lake City",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Utah State Legislature Portal",
        official_legislation_portal_url: "https://le.utah.gov",
        highest_court_name: "Utah Supreme Court",
        highest_court_url: "https://www.utcourts.gov",
        justice_ministry_url: "https://attorneygeneral.utah.gov"
      },
      {
        id: "US-VT",
        name: "Vermont",
        capital: "Montpelier",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Vermont General Assembly Portal",
        official_legislation_portal_url: "https://legislature.vermont.gov",
        highest_court_name: "Vermont Supreme Court",
        highest_court_url: "https://www.vermontjudiciary.org",
        justice_ministry_url: "https://ago.vermont.gov"
      },
      {
        id: "US-VA",
        name: "Virginia",
        capital: "Richmond",
        legal_system_notes: "Common law",
        official_legislation_portal_name: "Virginia Legislative Information System",
        official_legislation_portal_url: "https://lis.virginia.gov",
        highest_court_name: "Supreme Court of Virginia",
        highest_court_url: "https://www.vacourts.gov",
        justice_ministry_url: "https://www.oag.state.va.us"
      }
    ]
  },
  "MX": {
    id: "MX",
    name: "Mexico",
    legal_system: "Civil law",
    constitution_name: "Constitución Política de los Estados Unidos Mexicanos",
    constitution_url: "https://www.diputados.gob.mx/LeyesBiblio/pdf_mov/Constitucion_Politica.pdf",
    federal_legislation_portal_name: "Cámara de Diputados – Leyes Federales",
    federal_legislation_portal_url: "https://www.diputados.gob.mx/LeyesBiblio/index.htm",
    supreme_court_name: "Suprema Corte de Justicia de la Nación",
    supreme_court_url: "https://www.scjn.gob.mx",
    research_guide: "https://www.worldlii.org/mx/",
    subnational: [
      {
        id: "MX-CMX",
        name: "Ciudad de México",
        capital: "Ciudad de México",
        legal_system_notes: "Civil law; subject to the federal Constitution and local charter.",
        official_legislation_portal_name: "Gaceta Oficial de la Ciudad de México",
        official_legislation_portal_url: "https://www.consejeria.cdmx.gob.mx/gaceta-oficial",
        highest_court_name: "Tribunal Superior de Justicia de la Ciudad de México",
        highest_court_url: "https://www.tsjcdmx.gob.mx"
      }
    ]
  },
  "EU": {
    id: "EU",
    name: "European Union",
    legal_system: "Supranational legal order with direct effect & supremacy",
    constitution_name: "Treaties (TEU, TFEU) & Charter of Fundamental Rights",
    constitution_url: "https://eur-lex.europa.eu/collection/eu-law/treaties.html",
    federal_legislation_portal_name: "EUR-Lex - Access to EU Law",
    federal_legislation_portal_url: "https://eur-lex.europa.eu",
    supreme_court_name: "Court of Justice of the European Union (CJEU)",
    supreme_court_url: "https://curia.europa.eu",
    research_guide: "https://eur-lex.europa.eu/content/welcome/access_to_eu_law.pdf"
  },
  "NG": {
    id: "NG",
    name: "Nigeria",
    legal_system: "Common law combined with customary and Sharia law",
    constitution_name: "Constitution of the Federal Republic of Nigeria, 1999",
    constitution_url: "https://lawsofnigeria.placng.org",
    federal_legislation_portal_name: "Laws of the Federation of Nigeria (Laws.Africa)",
    federal_legislation_portal_url: "https://laws.africa/ng",
    supreme_court_name: "Supreme Court of Nigeria",
    supreme_court_url: "https://supremecourt.gov.ng",
    research_guide: "https://laws.africa/ng"
  },
  "GH": {
    id: "GH",
    name: "Ghana",
    legal_system: "Mixed system: common law, customary law, constitutional law",
    constitution_name: "Constitution of the Republic of Ghana, 1992",
    constitution_url: "https://lawsghana.com",
    federal_legislation_portal_name: "Laws of Ghana (GhaLII / Laws.Africa)",
    federal_legislation_portal_url: "https://laws.africa/gh",
    supreme_court_name: "Supreme Court of Ghana",
    supreme_court_url: "https://www.judicial.gov.gh",
    research_guide: "https://ghalii.org"
  },
  "KE": {
    id: "KE",
    name: "Kenya",
    legal_system: "Mixed system: common law, customary law, Islamic law",
    constitution_name: "Constitution of Kenya, 2010",
    constitution_url: "http://www.kenyalaw.org/lex/actview.xhtml?actid=Const2010",
    federal_legislation_portal_name: "Laws of Kenya – Kenya Law Reports",
    federal_legislation_portal_url: "http://kenyalaw.org",
    supreme_court_name: "Supreme Court of Kenya",
    supreme_court_url: "https://www.judiciary.go.ke",
    research_guide: "https://laws.africa/ke"
  },
  "ZA": {
    id: "ZA",
    name: "South Africa",
    legal_system: "Mixed legal system (Roman-Dutch common law and African customary law)",
    constitution_name: "Constitution of the Republic of South Africa, 1996",
    constitution_url: "https://www.gov.za/documents/constitution/constitution-republic-south-africa-1996",
    federal_legislation_portal_name: "South African Legislation (SAFLII / Laws.Africa)",
    federal_legislation_portal_url: "https://laws.africa/za",
    supreme_court_name: "Constitutional Court of South Africa",
    supreme_court_url: "https://www.concourt.org.za",
    research_guide: "https://saflii.org"
  },
  "SB": {
    id: "SB",
    name: "Solomon Islands",
    legal_system: "Mixed (Common law and Customary law)",
    constitution_name: "Constitution of Solomon Islands (1978)",
    constitution_url: "https://www.paclii.org/sb/legis/consol_act/cosi354/",
    federal_legislation_portal_name: "Solomon Islands Legislation (PacLII)",
    federal_legislation_portal_url: "https://www.paclii.org/sb/legis/consol_act/",
    supreme_court_name: "Court of Appeal & High Court of Solomon Islands",
    supreme_court_url: "https://www.paclii.org/sb/courts.html",
    research_guide: "https://www.paclii.org"
  },
  "AU": {
    id: "AU",
    name: "Australia",
    legal_system: "Common law with federal division of powers",
    constitution_name: "Commonwealth of Australia Constitution Act 1900",
    constitution_url: "https://www.legislation.gov.au/Details/C2005Q00193",
    federal_legislation_portal_name: "Federal Register of Legislation",
    federal_legislation_portal_url: "https://www.legislation.gov.au",
    supreme_court_name: "High Court of Australia",
    supreme_court_url: "https://www.hcourt.gov.au",
    research_guide: "https://www.austlii.edu.au"
  },
  "NZ": {
    id: "NZ",
    name: "New Zealand",
    legal_system: "Common law with unwritten/partially codified constitution",
    constitution_name: "Constitution Act 1986 & NZ Bill of Rights Act 1990",
    constitution_url: "https://www.legislation.govt.nz",
    federal_legislation_portal_name: "New Zealand Legislation Portal",
    federal_legislation_portal_url: "https://www.legislation.govt.nz",
    supreme_court_name: "Supreme Court of New Zealand",
    supreme_court_url: "https://www.courtsofnz.govt.nz",
    research_guide: "https://www.nzlii.org"
  }
};

export const MOCH_ATTORNEYS: Attorney[] = [
  {
    id: "attorney-clara",
    name: "Hon. Clara Sterling, QC",
    title: "Senior Partner - Corporate & Commercial Law",
    jurisdiction: "CA-ON / CA",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200",
    specialties: ["Commercial Drafting", "SME Compliance", "M&A Rules"],
    hourlyRate: 350,
    rating: 4.9,
    availabilityMap: { "Mon": 85, "Tue": 90, "Wed": 30, "Thu": 75, "Fri": 15 },
    availabilityHours: {
      "Mon": ["09:00 AM", "10:00 AM", "11:30 AM", "02:00 PM"],
      "Tue": ["09:00 AM", "10:00 AM", "11:30 AM", "02:00 PM", "04:00 PM"],
      "Wed": ["10:00 AM", "11:30 AM"],
      "Thu": ["09:00 AM", "10:00 AM", "02:00 PM", "04:00 PM"],
      "Fri": ["11:30 AM", "02:00 PM"],
      "Sat": [],
      "Sun": []
    },
    reviews: [
      "Clara reviewed our lease sublease contract and spotted critical issues in 10 minutes.",
      "Extremely sharp advisory regarding Ontario Business Corporations Act."
    ]
  },
  {
    id: "attorney-lawrence",
    name: "Lawrence Nwosu, Esq.",
    title: "Principal Counsel - Global Trade & Compliance",
    jurisdiction: "NG / GH",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200",
    specialties: ["African Customary Law", "Cross-Border Business", "Trade Tariffs"],
    hourlyRate: 280,
    rating: 4.8,
    availabilityMap: { "Mon": 40, "Tue": 60, "Wed": 95, "Thu": 40, "Fri": 80 },
    availabilityHours: {
      "Mon": ["10:00 AM", "02:00 PM", "04:00 PM"],
      "Tue": ["09:00 AM", "10:00 AM", "11:30 AM"],
      "Wed": ["09:00 AM", "10:00 AM", "11:30 AM", "02:00 PM", "04:00 PM"],
      "Thu": ["10:00 AM", "02:00 PM"],
      "Fri": ["09:00 AM", "11:30 AM", "04:00 PM"],
      "Sat": ["10:00 AM", "02:00 PM"],
      "Sun": []
    },
    reviews: [
      "Invaluable advice on setting up a subsidiary in Lagos, Nigeria.",
      "Clear, actionable strategy on Nigerian custom guidelines and tax rules."
    ]
  },
  {
    id: "attorney-alejandro",
    name: "Dr. Alejandro Ruiz",
    title: "Senior Litigator - Civil & Real Estate Law",
    jurisdiction: "MX-CMX / US-CA",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    specialties: ["Cross-Border Property", "Civil Practice Code", "Litigation Defense"],
    hourlyRate: 300,
    rating: 4.7,
    availabilityMap: { "Mon": 20, "Tue": 30, "Wed": 40, "Thu": 90, "Fri": 95 },
    availabilityHours: {
      "Mon": ["09:00 AM"],
      "Tue": ["09:00 AM", "02:00 PM"],
      "Wed": ["11:30 AM", "02:00 PM", "04:00 PM"],
      "Thu": ["09:00 AM", "10:00 AM", "11:30 AM", "02:00 PM", "04:00 PM"],
      "Fri": ["09:00 AM", "10:00 AM", "11:30 AM", "02:00 PM", "04:00 PM"],
      "Sat": [],
      "Sun": []
    },
    reviews: [
      "Helped us resolve a complex real estate dispute in Guadalajara perfectly.",
      "Perfect translation and explanation of Mexican Federal Civil procedures."
    ]
  }
];

export const LEGAL_DOMAINS = [
  "Criminal Law",
  "Civil Law & Litigation",
  "Family & Divorce Law",
  "Immigration Strategy",
  "Employment & Labor Rules",
  "Business & Corporate Compliance",
  "Real Estate & Tenancy",
  "Intellectual Property Protection",
  "Tax Advisory & Revenue Code",
  "Human Rights & Constitutional Law"
];
