import { GlossaryTerm } from "../types";

export const LEGAL_GLOSSARY_DATABASE: GlossaryTerm[] = [
  {
    id: "term-force-majeure",
    term: "Force Majeure",
    pronunciation: "FORS mah-ZHUR",
    latinRoot: "French: 'superior force' (vis major in Latin)",
    category: "Contracts",
    definition: "A contractual clause that frees both parties from liability or obligation when an extraordinary event or circumstance beyond the control of the parties—such as war, strike, riot, crime, epidemic, or sudden natural catastrophe—prevents one or both parties from fulfilling their obligations.",
    plainEnglish: "An 'act of God' or unforeseen disaster clause that excuses parties from performing their contractual duties without being sued for breach when events outside anyone's control make performance physically or legally impossible.",
    exampleUsage: "Due to the state-mandated port shutdown, the shipping carrier invoked the force majeure clause to suspend delivery guarantees without financial penalty.",
    relatedTerms: ["Impossibility of Performance", "Frustration of Purpose", "Act of God", "Material Adverse Change"]
  },
  {
    id: "term-indemnification",
    term: "Indemnification",
    pronunciation: "in-dem-nuh-fuh-KAY-shun",
    latinRoot: "From Latin 'indemnis' meaning unhurt or free from loss",
    category: "Contracts",
    definition: "A contractual commitment by one party (the indemnitor) to compensate or reimburse the other party (the indemnitee) for any loss, damage, legal expense, or liability incurred as a result of third-party claims or specified breaches.",
    plainEnglish: "A legal promise to 'cover the bill' or defend the other side if someone sues them because of something you did, created, or promised.",
    exampleUsage: "The software vendor agreed to defend and indemnify the client against any third-party intellectual property infringement claims arising from the platform's core code.",
    relatedTerms: ["Hold Harmless", "Duty to Defend", "Limitation of Liability", "Contribution"]
  },
  {
    id: "term-severability",
    term: "Severability",
    pronunciation: "sev-er-uh-BIL-ih-tee",
    category: "Contracts",
    definition: "A standard 'boilerplate' provision stating that if any specific term or clause in the contract is found to be illegal, invalid, or unenforceable by a court, the remainder of the contract remains in full legal force and effect.",
    plainEnglish: "A safeguard clause ensuring that even if one sentence or rule in a contract is thrown out by a judge, the rest of the contract stays alive and binding.",
    exampleUsage: "Although the non-compete paragraph was declared overbroad under California law, the contract's severability clause preserved the employee's ongoing confidentiality duties.",
    relatedTerms: ["Boilerplate", "Blue-Pencil Doctrine", "Reformation", "Enforceability"]
  },
  {
    id: "term-liquidated-damages",
    term: "Liquidated Damages",
    pronunciation: "LIK-wuh-day-tid DAM-ih-jiz",
    category: "Contracts",
    definition: "A predetermined, specified sum of money agreed upon by the contracting parties during contract formation to be paid by one party to the other in the event of a breach, reflecting a reasonable pre-estimate of anticipated damages rather than a punitive penalty.",
    plainEnglish: "An upfront price tag set in the agreement for what a party must pay if they break a specific rule (e.g. late delivery), avoiding the need to prove exact financial losses in court later.",
    exampleUsage: "The construction contractor agreed to pay liquidated damages of $1,500 for each calendar day completion was delayed past the September deadline.",
    relatedTerms: ["Compensatory Damages", "Penalty Clause", "Anticipatory Breach", "Specific Performance"]
  },
  {
    id: "term-consideration",
    term: "Consideration",
    pronunciation: "kuhn-sid-uh-RAY-shun",
    category: "Contracts",
    definition: "Something of legal value bargained for and given in exchange for a promise, required under common law to create a legally binding and enforceable contract. Can be money, goods, services, or a promise to refrain from doing something one has a right to do (forbearance).",
    plainEnglish: "The 'give and take' of a contract. For an agreement to be legally enforceable, both sides must give something up or provide some value—a purely one-sided gift promise is generally not enforceable.",
    exampleUsage: "Payment of $1.00 and mutual confidentiality undertakings constituted valid legal consideration between the founders.",
    relatedTerms: ["Promissory Estoppel", "Bilateral Contract", "Mutuality of Obligation", "Past Consideration"]
  },
  {
    id: "term-estoppel",
    term: "Promissory Estoppel",
    pronunciation: "PROM-uh-sor-ee eh-STOP-ul",
    category: "Contracts",
    definition: "An equitable doctrine that prevents a promisor from revoking or denying a promise if the promisee reasonably and foreseeably relied on that promise to their substantial economic detriment, even in the absence of formal consideration.",
    plainEnglish: "A legal rule preventing someone from going back on their word when they made a serious promise, knew you would rely on it, and you suffered financial harm by acting on it.",
    exampleUsage: "The court invoked promissory estoppel to enforce the company's pledge to pay moving costs after the engineer relocated across the country in reliance on their written offer.",
    relatedTerms: ["Detrimental Reliance", "Equitable Remedies", "Good Faith", "Unjust Enrichment"]
  },
  {
    id: "term-fiduciary-duty",
    term: "Fiduciary Duty",
    pronunciation: "fih-DOO-shee-air-ee DOO-tee",
    latinRoot: "From Latin 'fiducia' meaning trust or confidence",
    category: "Corporate",
    definition: "The highest legal and ethical standard of care owed by one party (the fiduciary, such as a corporate director, trustee, or attorney) to act strictly in the best interests of another party (the beneficiary, corporation, or client), encompassing duties of care, loyalty, and good faith.",
    plainEnglish: "A supreme legal duty requiring someone in a position of trust (like a CEO, business partner, or executor) to put the other person's or company's financial interests ahead of their own personal gain.",
    exampleUsage: "By secretly funneling corporate customer contracts to his personal side business, the managing director breached his fiduciary duty of loyalty.",
    relatedTerms: ["Duty of Loyalty", "Duty of Care", "Business Judgment Rule", "Self-Dealing"]
  },
  {
    id: "term-piercing-veil",
    term: "Piercing the Corporate Veil",
    pronunciation: "PEER-sing thuh KOR-per-it VAYL",
    category: "Corporate",
    definition: "A judicial ruling where a court disregards the limited liability protections of a corporation or LLC, holding the individual shareholders, directors, or parent entities personally liable for the company's debts, torts, or contractual obligations.",
    plainEnglish: "When a judge strips away a company's shield of limited liability because the owners treated the business like their personal piggy bank or committed fraud, allowing creditors to take the owners' personal homes and bank accounts.",
    exampleUsage: "Because the owner mingled company revenue with personal grocery bills and failed to hold formal shareholder meetings, the court pierced the corporate veil.",
    relatedTerms: ["Limited Liability", "Alter Ego Doctrine", "Commingling of Funds", "Undercapitalization"]
  },
  {
    id: "term-non-compete",
    term: "Non-Compete Covenant",
    pronunciation: "non kuhm-PEET",
    category: "Employment",
    definition: "A clause in an employment or commercial contract where an employee or business seller agrees not to enter into competition, work for a competitor, or launch a competing business within a specific geographic territory and timeframe following departure.",
    plainEnglish: "A restriction that prevents an ex-worker from working for a competing company or starting a rival business for a certain time after leaving their job.",
    exampleUsage: "Under California Business & Professions Code § 16600 and Ontario's ESA amendments, post-employment non-compete agreements are void and unlawful for typical employees.",
    relatedTerms: ["Non-Solicitation", "Trade Secrets", "Restrictive Covenant", "Garden Leave"]
  },
  {
    id: "term-injunction",
    term: "Injunction",
    pronunciation: "in-JUNK-shun",
    category: "Litigation",
    definition: "An equitable court order requiring a person or entity to either do a specific act (mandatory injunction) or refrain from doing a specific act (prohibitory injunction), granted when monetary damages alone would be inadequate to prevent irreparable harm.",
    plainEnglish: "A formal order signed by a judge commanding someone to immediately stop doing something (like selling copied code or tearing down a disputed wall) or forcing them to take an action.",
    exampleUsage: "The patent holder obtained an emergency preliminary injunction barring the competitor from shipping the infringing electronic units to retailers.",
    relatedTerms: ["Temporary Restraining Order (TRO)", "Preliminary Injunction", "Irreparable Harm", "Equitable Relief"]
  },
  {
    id: "term-tort",
    term: "Tort",
    pronunciation: "TORT",
    latinRoot: "From Latin 'tortum' meaning twisted or wrong",
    category: "Litigation",
    definition: "A civil wrong or injury—other than a breach of contract—committed against a person or property for which the law provides a legal remedy, typically in the form of monetary damages. Includes negligence, defamation, fraud, trespass, and strict liability.",
    plainEnglish: "A wrongful act (like careless driving, trespassing, fraud, or defaming someone's character) that hurts someone financially, physically, or emotionally, leading to a civil lawsuit for money damages.",
    exampleUsage: "The company filed an action for the economic tort of intentional interference with contractual relations.",
    relatedTerms: ["Negligence", "Defamation", "Strict Liability", "Proximate Cause"]
  },
  {
    id: "term-jurisdiction",
    term: "Jurisdiction",
    pronunciation: "joor-is-DIK-shun",
    latinRoot: "Latin 'juris' (law) + 'dictio' (speaking): the right to speak the law",
    category: "Litigation",
    definition: "The official authority or power of a court to hear a case, adjudicate legal disputes, and issue binding judgments, determined by geography (territorial), subject matter (nature of the case), and personal connection (in personam).",
    plainEnglish: "The legal power and territorial boundary within which a specific court has the right to decide a legal case and enforce its rulings.",
    exampleUsage: "The federal district court lacked subject matter jurisdiction because both parties were citizens of the same state and no federal statute was contested.",
    relatedTerms: ["Subject Matter Jurisdiction", "Personal Jurisdiction", "Venue", "Forum Non Conveniens"]
  },
  {
    id: "term-subpoena",
    term: "Subpoena",
    pronunciation: "suh-PEE-nuh",
    latinRoot: "Latin: 'sub poena' meaning 'under penalty'",
    category: "Litigation",
    definition: "A writ or formal legal summons issued by a court or authorized officer compelling an individual to appear in court to testify as a witness (subpoena ad testificandum) or produce physical documents and electronic evidence (subpoena duces tecum) under penalty of contempt.",
    plainEnglish: "A mandatory legal order requiring you to show up to court to testify or hand over specific emails, records, or files—disobeying it can result in fines or arrest.",
    exampleUsage: "The defense issued a subpoena duces tecum demanding unredacted financial ledgers and email communications from the accounting firm.",
    relatedTerms: ["Deposition", "Discovery", "Contempt of Court", "Warrant"]
  },
  {
    id: "term-statute-limitations",
    term: "Statute of Limitations",
    pronunciation: "STACH-oot uhv lim-ih-TAY-shunz",
    category: "Litigation",
    definition: "A statutory law establishing the maximum time period following an event, injury, or breach during which legal proceedings may be initiated. Once this deadline expires, the legal claim is permanently barred.",
    plainEnglish: "The legal expiration date on filing a lawsuit or prosecuting a crime. If you wait too long after an injury or breach occurred, you lose the right to sue forever.",
    exampleUsage: "Because the breach of written contract occurred over seven years ago, the plaintiff's claim was barred by the state's four-year statute of limitations.",
    relatedTerms: ["Tolling", "Accrual of Action", "Laches", "Discovery Rule"]
  },
  {
    id: "term-res-judicata",
    term: "Res Judicata",
    pronunciation: "RAYZ joo-dih-KAH-tuh",
    latinRoot: "Latin: 'a matter judged'",
    category: "Litigation",
    definition: "A fundamental civil procedure doctrine establishing that a final judgment rendered by a court of competent jurisdiction on the merits is conclusive as to the rights of the parties, barring any subsequent lawsuit involving the same parties and cause of action.",
    plainEnglish: "The 'no second bite at the apple' rule. Once a lawsuit between the same parties over the same dispute has been fully decided by a judge, you cannot sue them again for the same thing.",
    exampleUsage: "The appellate court dismissed the tenant's new lawsuit on grounds of res judicata, as their previous damage claim had already received final adjudication.",
    relatedTerms: ["Collateral Estoppel", "Double Jeopardy", "Claim Preclusion", "Issue Preclusion"]
  },
  {
    id: "term-summary-judgment",
    term: "Summary Judgment",
    pronunciation: "SUM-uh-ree JUHJ-muhnt",
    category: "Litigation",
    definition: "A procedural motion and judgment entered by a court in favor of one party without a full trial, granted when there is no genuine dispute as to any material fact and the moving party is entitled to judgment as a matter of law.",
    plainEnglish: "A win before trial. A judge decides the case early because the evidence is so clear on all key facts that having a trial with witnesses would be a waste of time.",
    exampleUsage: "The judge granted summary judgment to the employer because the signed release form unequivocally barred all severance claims.",
    relatedTerms: ["Motion to Dismiss", "Material Fact", "Burden of Proof", "Directed Verdict"]
  },
  {
    id: "term-quiet-enjoyment",
    term: "Covenant of Quiet Enjoyment",
    pronunciation: "KWAHY-it en-JOI-muhnt",
    category: "Real Estate",
    definition: "An implied or express contractual covenant in leases and deeds assuring that the tenant or buyer will be able to possess, occupy, and use the property peacefully without unlawful interference, disturbance, or eviction by the landlord or anyone with superior title.",
    plainEnglish: "A tenant's fundamental right to live or work on the rented property in peace without landlord harassment, unannounced intrusions, or hostile lockouts.",
    exampleUsage: "By shutting off heating in mid-winter and entering the apartment unannounced, the landlord breached the covenant of quiet enjoyment, justifying constructive eviction.",
    relatedTerms: ["Constructive Eviction", "Warranty of Habitability", "Sublease", "Tenancy at Will"]
  },
  {
    id: "term-escrow",
    term: "Escrow",
    pronunciation: "ES-kroh",
    category: "Real Estate",
    definition: "A financial arrangement in which a trusted, neutral third party holds funds, deeds, or assets on behalf of transacting parties until specific contractual conditions and closing criteria have been satisfied.",
    plainEnglish: "A secure holding zone where a neutral middleman holds the money and property deeds until both the buyer and seller fulfill every condition of the deal.",
    exampleUsage: "The buyer's deposit of $50,000 was placed into an insured title escrow account pending completion of the property environmental inspection.",
    relatedTerms: ["Earnest Money", "Title Insurance", "Closing", "Fiduciary Custody"]
  },
  {
    id: "term-easement",
    term: "Easement",
    pronunciation: "EEZ-muhnt",
    category: "Real Estate",
    definition: "A non-possessory property right giving an individual or entity the lawful privilege to enter and use another person's real estate for a specific, limited purpose, such as utility line access or a shared driveway.",
    plainEnglish: "A legal right allowing someone else (like the electric company or your neighbor) to cross or use a strip of your land for a specific purpose without owning it.",
    exampleUsage: "The deed included an express easement appurtenant granting the adjacent landlocked parcel access through the private driveway.",
    relatedTerms: ["Right-of-Way", "Encumbrance", "Servient Estate", "Dominant Estate"]
  },
  {
    id: "term-encumbrance",
    term: "Encumbrance",
    pronunciation: "en-KUM-bruns",
    category: "Real Estate",
    definition: "Any right to, interest in, or legal liability upon real property that does not prohibit the passing of title by the owner, but which diminishes the property's financial value or limits its transferability (e.g. mortgage, lien, easement, restriction).",
    plainEnglish: "A claim, lien, or restriction attached to a piece of real estate (like an unpaid contractor lien or unpaid property tax) that affects its title and value.",
    exampleUsage: "The title search revealed a mechanic's lien encumbrance recorded against the commercial building from an unpaid HVAC contractor.",
    relatedTerms: ["Lien", "Mortgage", "Cloud on Title", "Marketable Title"]
  },
  {
    id: "term-fair-use",
    term: "Fair Use",
    pronunciation: "FAIR YOOS",
    category: "Intellectual Property",
    definition: "A statutory doctrine under copyright law permitting the limited use of copyrighted material without acquiring permission from the rights holder, evaluated based on purpose (e.g. criticism, news, education), nature of work, amount taken, and effect on market value.",
    plainEnglish: "A legal safety valve allowing you to quote, review, satirize, or teach with small portions of copyrighted work without having to ask for permission or pay a fee.",
    exampleUsage: "The law professor's excerpt of three sentences from the tech agreement for academic critique fell squarely under fair use protection.",
    relatedTerms: ["Copyright Infringement", "Public Domain", "Transformative Use", "DMCA Safe Harbor"]
  },
  {
    id: "term-work-for-hire",
    term: "Work Made for Hire",
    pronunciation: "WURK mayd for HY-er",
    category: "Intellectual Property",
    definition: "A legal doctrine in copyright law where an employer or commissioning party is automatically deemed the original legal author and owner of a creative or technical work created by an employee within the scope of employment or an independent contractor under a signed agreement.",
    plainEnglish: "A rule stating that code, writing, or designs you create on the clock for your employer belong 100% to the company from day one, not to you.",
    exampleUsage: "The independent contractor agreement explicitly classified all source code modules and wireframe designs as a 'work made for hire'.",
    relatedTerms: ["IP Assignment", "Moral Rights", "Proprietary Information", "Scope of Employment"]
  },
  {
    id: "term-trade-secret",
    term: "Trade Secret",
    pronunciation: "TRAYD SEE-krit",
    category: "Intellectual Property",
    definition: "Confidential business information—such as a formula, practice, process, design, customer list, or code—that derives independent economic value from not being generally known, and for which the owner undertakes reasonable measures to keep secret under the Uniform Trade Secrets Act (UTSA) and Defend Trade Secrets Act (DTSA).",
    plainEnglish: "Valuable private business information (like the Coca-Cola formula or Google's search algorithm) that gives a company an advantage and is protected by keeping it locked down rather than publicly registering it.",
    exampleUsage: "The startup secured trade secret status for its compression pipeline by using encrypted repositories, role-based keys, and stringent non-disclosure agreements.",
    relatedTerms: ["Non-Disclosure Agreement (NDA)", "Misappropriation", "UTSA", "Confidential Information"]
  },
  {
    id: "term-habeas-corpus",
    term: "Habeas Corpus",
    pronunciation: "HAY-bee-us KOR-pus",
    latinRoot: "Latin: 'that you have the body'",
    category: "Constitutional",
    definition: "A fundamental constitutional writ used to challenge the legality of a person's detention or imprisonment, directing the official holding the prisoner to bring them before a judge to demonstrate lawful cause for the confinement.",
    plainEnglish: "The 'produce the body' legal safeguard against unlawful government detention. A prisoner can file this writ to make the government prove to a judge that their imprisonment is legally justified.",
    exampleUsage: "The defense attorney filed a petition for a writ of habeas corpus arguing the state detained the suspect beyond the statutory 48-hour arraignment window without formal charges.",
    relatedTerms: ["Due Process", "Constitutional Rights", "Unlawful Detention", "Civil Liberties"]
  },
  {
    id: "term-due-process",
    term: "Due Process of Law",
    pronunciation: "DOO PROH-ses",
    category: "Constitutional",
    definition: "A constitutional guarantee (U.S. 5th and 14th Amendments, Canadian Charter of Rights s. 7) ensuring that governments cannot deprive any person of life, liberty, or property without fair legal proceedings (procedural due process) and protection from arbitrary government action (substantive due process).",
    plainEnglish: "The promise that the government must follow fair, transparent rules before taking away your freedom, money, business license, or property.",
    exampleUsage: "Revoking the medical clinic's operating license without providing advance notice and a formal administrative hearing violated constitutional procedural due process.",
    relatedTerms: ["Fundamental Justice", "Equal Protection", "Procedural Due Process", "Substantive Due Process"]
  },
  {
    id: "term-ultra-vires",
    term: "Ultra Vires",
    pronunciation: "UHL-truh VY-reez",
    latinRoot: "Latin: 'beyond the powers'",
    category: "Constitutional",
    definition: "An act or decision performed beyond the scope of legal power or authority granted to a government body, public agency, or corporation by statute, charter, or constitution. Such actions are void ab initio (void from the beginning).",
    plainEnglish: "When a government official, city council, or corporate officer takes an action they legally had zero authority to take. The action is illegal and void from the start.",
    exampleUsage: "The court struck down the municipal ban on digital currencies, ruling that regulating financial instruments was ultra vires for municipal authorities.",
    relatedTerms: ["Intra Vires", "Void Ab Initio", "Jurisdiction", "Judicial Review"]
  },
  {
    id: "term-lex-loci",
    term: "Lex Loci",
    pronunciation: "LEKS LOH-kye",
    latinRoot: "Latin: 'the law of the place'",
    category: "International",
    definition: "A conflict-of-laws doctrine governing choice of law, referring to the law of the jurisdiction where an act, contract, or injury occurred (e.g. lex loci contractus for place of contracting, lex loci delicti for place of tort).",
    plainEnglish: "The legal principle that disputes or injuries are governed by the law of the physical country, state, or city where the event actually occurred.",
    exampleUsage: "Under the doctrine of lex loci delicti, the cross-border automobile injury claim was evaluated under Ontario statutory tort rules where the collision occurred.",
    relatedTerms: ["Choice of Law", "Conflict of Laws", "Lex Fori", "Sovereign Immunity"]
  },
  {
    id: "term-forum-non-conveniens",
    term: "Forum Non Conveniens",
    pronunciation: "FOR-um non kon-VEEN-ee-enz",
    latinRoot: "Latin: 'an inconvenient forum'",
    category: "International",
    definition: "A discretionary doctrine empowering a court to dismiss or transfer a civil case—even when it has technical jurisdiction—if an alternative court or foreign jurisdiction is significantly more appropriate and convenient for the parties and the administration of justice.",
    plainEnglish: "When a judge declines to hear a case and tells the parties to sue in another country or state because all the witnesses, property, and evidence are located there.",
    exampleUsage: "The New York court granted the dismissal motion on forum non conveniens grounds because all contractual performance and evidence were located in London, UK.",
    relatedTerms: ["Venue", "Jurisdiction", "Choice of Forum", "Comity"]
  }
];
