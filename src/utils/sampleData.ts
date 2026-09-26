import { BidderInput, TenderDocuments, TenderMetadata } from "../types";

export const SAMPLE_TENDER_METADATA: TenderMetadata = {
  packageTitle: "Enter Case Name",
  tenderRefNo: "Enter Case No",
  organization: "Enter Organization Name",
  estimateValueCr: "Enter Estimated Value",
  completionPeriodMonths: "Enter Completion Period",
  tenderType: "EPC_TURNKEY",
};

export const SAMPLE_SBD_TEXT = `PUBLIC SECTOR ORGANIZATION - PROJECT CONTRACTS CELL
STANDARD BIDDING DOCUMENT (SBD) - GENERAL CONDITIONS OF CONTRACT (GCC) & SPECIAL CONDITIONS OF CONTRACT (SCC) FOR TURNKEY CONTRACTS

CHAPTER I: PRELIMINARY DEFINITIONS & GOVERNING LAW
Clause 1.0: "Employer" means the Public Sector Organization / Owner, acting through its General Manager (Projects) or authorized representative.
Clause 1.1: "Contractor" means the turnkey agency whose tender has been accepted by the Employer.
Clause 2.0: Governing Law: The Contract shall be interpreted and governed in accordance with the Laws of India. Courts at the project site location shall have exclusive jurisdiction.

CHAPTER II: CONTRACT SECURITY & PERFORMANCE GUARANTEE
Clause 13.0: Contract Performance Bank Guarantee (PBG):
13.1 Within thirty (30) days of issuance of Letter of Acceptance (LOA), the Contractor shall furnish a Contract Performance Bank Guarantee for an amount equal to 10% (ten percent) of the total Contract Price.
13.2 The PBG shall be issued by a Scheduled Commercial Indian Bank or State Bank of India in the prescribed Employer format on non-judicial stamp paper.
13.3 The PBG shall remain valid till ninety (90) days beyond the expiry of the Defect Liability Period (DLP) / Final Acceptance Certificate (FAC). If the contract period is extended for any reason, Contractor shall promptly extend the validity of PBG.

CHAPTER III: TERMS OF PAYMENT & MILESTONES
Clause 18.0: Terms of Payment (Turnkey Supply & Erection):
18.1 Advance Payment: 10% of the total equipment and civil contract price as interest-bearing advance against submission of an unconditional Advance Bank Guarantee (ABG) for 110% of the advance amount.
18.2 Progressive Supply Payment: 70% of the supply value pro-rata upon receipt of equipment and materials at Employer's plant site in good condition, accompanied by Material Receipt Certificate (MRC) signed by the Project Engineer, inspection release note, and original invoice.
18.3 Erection & Commissioning Milestones: 10% upon successful completion of erection, cold commissioning, and integrated dry run certified by Employer.
18.4 Final Acceptance & Performance Guarantee (PG) Test: 10% upon successful completion of Performance Guarantee (PG) test, achievement of guaranteed emissions and throughput, and issuance of Final Acceptance Certificate (FAC).

CHAPTER IV: PRICE BASIS & PRICE VARIATION
Clause 23.0: Contract Price:
23.1 The Contract Price shall be firm and fixed for the entire duration of the Contract including any extensions granted without default of the Contractor. No escalation or price adjustment on account of fluctuations in cost of labor, raw materials, steel, cement, fuel, or foreign exchange rate shall be payable.
23.2 Taxes and Duties: Quoted price shall be inclusive of all taxes except GST, which shall be reimbursed at statutory rates against GST-compliant tax invoices.

CHAPTER V: TIME OF COMPLETION, EXTENSION & LIQUIDATED DAMAGES
Clause 27.0: Time for Completion:
27.1 Time is the essence of the Contract. The entire scope of design, civil work, supply, erection, testing, commissioning, and PG test shall be completed within 20 (twenty) months from the zero date (date of issuance of LOA).
Clause 27.2: Liquidated Damages (LD) for Delay:
If the Contractor fails to achieve milestone completion or commercial commissioning within the stipulated schedule, the Contractor shall pay to the Employer, not as a penalty but as agreed Liquidated Damages, an amount equal to 0.5% (half percent) of the total Contract Value for each week of delay or part thereof, subject to a maximum ceiling of 10% (ten percent) of the total Contract Price.
27.3 Deduction of LD shall be made from any progressive bills, PBG, or retention money without prejudice to Employer's other contractual remedies.

CHAPTER VI: DEFECT LIABILITY & GUARANTEE
Clause 29.0: Defect Liability Period (DLP):
29.1 The Contractor warrants that all plant, machinery, structures, and electricals supplied under the Contract are new, unused, and free from design, material, and workmanship defects.
29.2 The Defect Liability Period shall be 12 (twelve) months from the date of issuance of Preliminary Acceptance Certificate (PAC) or 18 (eighteen) months from the date of commissioning, whichever is earlier.
29.3 Any part replaced or rectified during DLP shall have an extended warranty of 12 (twelve) months from the date of replacement.

CHAPTER VII: RISK & COST PURCHASE (DEFAULT)
Clause 32.0: Termination for Default and Risk Purchase:
32.1 If the Contractor fails to cure progress default within thirty (30) days of formal notice, Employer shall be entitled to terminate the Contract in whole or part and get the balance works executed through alternative agencies at the sole risk, responsibility, and financial cost of the Contractor.
32.2 Any extra expenditure incurred by Employer in executing the balance work through third party over and above the contracted rates shall be recovered from Contractor's pending dues or through legal proceedings.

CHAPTER VIII: LIMITATION OF LIABILITY
Clause 38.0: Limitation of Liability:
The aggregate maximum cumulative liability of the Contractor to the Employer for all claims under the Contract, whether in contract, tort, or indemnity, shall not exceed 100% of the total Contract Price. However, this limitation shall not apply in cases of gross negligence, willful misconduct, patent infringement indemnities, and statutory breach.`;

export const SAMPLE_NIT_TEXT = `NOTICE INVITING TENDER (NIT) & INSTRUCTIONS TO BIDDERS (ITB)
TENDER NO: Enter Case No

1. SCOPE OF BID:
Turnkey design, detailed engineering, manufacturing, supply, civil foundations, structural fabrication, erection, testing, cold & hot commissioning, PG testing, and handing over of Turnkey EPC Package at the project plant site.

2. SUBMISSION OF DEVIATIONS (ITB CLAUSE 14):
14.1 Bidders are advised to submit bids strictly in conformity with the Tender SBD (GCC & SCC) requirements.
14.2 If any deviations are inevitable, the same must be explicitly listed in the prescribed "Schedule of Technical Deviations (Annexure-IV)" and "Schedule of Commercial Deviations (Annexure-V)".
14.3 Deviations mentioned anywhere else in the proposal but not included in Annexure IV/V shall be deemed null, void, and not binding on the Employer.
14.4 Bidders shall note that commercial deviations on Liquidated Damages, PBG value, and Risk & Cost purchase are normally unacceptable and may render the bid non-responsive if not unconditionally withdrawn.

3. EARNEST MONEY DEPOSIT (EMD):
EMD as stipulated in the tender notification in the form of Bank Guarantee or RTGS.

4. CRITICAL TIMELINES:
Completion schedule: Enter Completion Period. Pre-bid clarification meeting: Date 14 days prior to submission.`;

export const SAMPLE_BIDDER_1_DEVIATIONS = `BIDDER: Bidder 1
SCHEDULE OF COMMERCIAL & TECHNICAL DEVIATIONS (ANNEXURE-IV & V)

1. Clause Ref: SBD GCC Clause 27.2 - Liquidated Damages
Quoted Deviation: Bidder requests that Liquidated Damages should be applicable @ 0.5% per week of delay of the uncompleted and delayed portion of work only, instead of the total contract value. Further, the maximum ceiling of LD should be capped at 5% (five percent) of contract value instead of 10%.
Justification: Industry EPC norm for turnkey packages where substantial portions are handed over progressively.

2. Clause Ref: SBD GCC Clause 18.2 - Supply Payment Milestones
Quoted Deviation: Bidder requests that 70% supply payment be released against submission of dispatch documents (LR/RR, Inspection Certificate, and Dispatch Clearance Note from Employer's inspection agency) rather than physical receipt at site and MRC issuance.
Justification: Delays in unloading, site storage, and gate entry at project site lead to working capital blockage.

3. Clause Ref: SBD GCC Clause 13.1 - Performance Bank Guarantee
Quoted Deviation: Bidder proposes submission of PBG for 5% of contract value initially, to be made 10% only after civil foundations completion. Also, PBG validity should expire immediately upon PAC, with a separate 5% Warranty BG submitted for DLP.

4. Clause Ref: SBD GCC Clause 38.0 - Limitation of Liability
Quoted Deviation: Bidder requests that aggregate liability shall be capped at 50% of the total contract price, and consequential/indirect damages (including loss of production, loss of revenue, loss of profit) shall be expressly excluded for both parties without any exception.

5. Clause Ref: Technical Spec Section 3.2 - Bag Filter Filtering Velocity
Quoted Deviation: Bidder proposes air-to-cloth ratio of 1.1 m/min with PTFE membrane needle felt bags instead of tender specification of 0.85 m/min.
Justification: Proven design at industrial turnkey plants; saves plot area and structural weight without compromising guaranteed performance parameters.`;

export const SAMPLE_BIDDER_2_DEVIATIONS = `BIDDER: Bidder 2
SCHEDULE OF COMMERCIAL & TECHNICAL DEVIATIONS (ANNEXURE-IV & V)

1. Clause Ref: SBD GCC Clause 23.1 - Firm Price Basis & Price Variation
Quoted Deviation: Bidder requests inclusion of Price Variation Clause (PVC) as per standard RBI indices for structural steel, reinforcing bars, cement, and electrical copper cabling. Fixed price basis cannot be maintained for 20-month duration given current international commodity volatility.
Alternative Proposal: If fixed price is insisted upon, Bidder will have to load 8.5% contingency buffer in price bid.

2. Clause Ref: SBD GCC Clause 27.2 - Liquidated Damages
Quoted Deviation: Bidder accepts LD @ 0.5% per week but requests maximum ceiling to be capped at 7.5% of contract value. Also, grace period of 30 days should be granted before LD accrual starts.

3. Clause Ref: SBD GCC Clause 32.0 - Risk & Cost Purchase
Quoted Deviation: Bidder requests that the maximum risk purchase liability over and above the contract price shall be limited to 15% of the unexecuted contract value, and prior notice period for termination should be increased from 30 days to 60 days.

4. Clause Ref: SBD GCC Clause 29.3 - Extended DLP for Replaced Parts
Quoted Deviation: Bidder requests that extended defect liability for any replaced component shall not exceed an overall cumulative period of 24 months from the initial commissioning date.
Justification: Unlimited rolling warranty on replaced parts creates indefinite contingent liability.

5. Clause Ref: SBD GCC Clause 18.1 - Advance Payment & Interest
Quoted Deviation: Bidder requests 10% Advance payment to be interest-free, or interest rate to be capped at Repo Rate rather than SBI MCLR + 2%. Advance BG should be for 100% of advance instead of 110%.`;

export const SAMPLE_BIDDER_3_DEVIATIONS = `BIDDER: Bidder 3
SCHEDULE OF COMMERCIAL & TECHNICAL DEVIATIONS (ANNEXURE-IV & V)

1. Clause Ref: SBD GCC Clause 18.0 - Payment Milestones & Retention
Quoted Deviation: Bidder proposes that 10% final milestone should be payable against PAC + submission of equivalent Bank Guarantee, instead of holding payment till Final Acceptance Certificate (FAC) after 12 months.
Justification: PG test is completed within 3 months of commissioning; waiting 12 months for 10% payment creates cash crunch for turnkey consortium.

2. Clause Ref: SBD GCC Clause 27.2 - Liquidated Damages
Quoted Deviation: Bidder requests that LD should only be levied on final completion date of the entire package and not on intermediate milestone delays. If intermediate milestone is delayed but overall completion is on schedule, any withheld LD must be refunded immediately without interest.

3. Clause Ref: SBD GCC Clause 13.3 - PBG Claim Period
Quoted Deviation: Request reduction of claim period from 90 days to 30 days beyond PBG validity date in line with standard ICC URDG 758 / IBA guidelines.

4. Clause Ref: SBD SCC Clause 41.2 - Force Majeure
Quoted Deviation: Request inclusion of "unprecedented ocean freight disruption, international port lockouts, and import customs clearance delays beyond 45 days" under Force Majeure relief.

5. Clause Ref: Technical Spec Section 4.5 - ID Fan Redundancy
Quoted Deviation: Propose 2 x 60% capacity Induced Draft (ID) fans instead of 3 x 50% specified in NIT.
Justification: High-efficiency variable speed drives offer 99.2% availability and save ₹ 14 Crores in capex and substational auxiliary power.`;

export const DEFAULT_SAMPLE_BIDDERS: BidderInput[] = [
  {
    id: "bidder-1",
    name: "Bidder 1",
    deviationFileName: "Bidder_1_Deviations.docx",
    deviationFileText: SAMPLE_BIDDER_1_DEVIATIONS,
    deviationFileFormat: "docx",
    uploadDate: "2026-09-20",
  },
  {
    id: "bidder-2",
    name: "Bidder 2",
    deviationFileName: "Bidder_2_Deviations.xlsx",
    deviationFileText: SAMPLE_BIDDER_2_DEVIATIONS,
    deviationFileFormat: "xlsx",
    uploadDate: "2026-09-21",
  },
  {
    id: "bidder-3",
    name: "Bidder 3",
    deviationFileName: "Bidder_3_Deviations.pdf",
    deviationFileText: SAMPLE_BIDDER_3_DEVIATIONS,
    deviationFileFormat: "pdf",
    uploadDate: "2026-09-22",
  },
];

export const DEFAULT_SAMPLE_DOCUMENTS: TenderDocuments = {
  sbdName: "Standard_Bidding_Document_GCC_SCC_Turnkey.docx",
  sbdText: SAMPLE_SBD_TEXT,
  sbdCharCount: SAMPLE_SBD_TEXT.length,
  sbdSource: "sample",
  nitName: "NIT_Turnkey_EPC_Package.docx",
  nitText: SAMPLE_NIT_TEXT,
  nitCharCount: SAMPLE_NIT_TEXT.length,
  nitSource: "sample",
};

// Generic Case Templates (Applicable for Turnkey, Works & EPC cases)
export const GENERIC_TENDER_METADATA: TenderMetadata = {
  packageTitle: "Enter Case Name",
  tenderRefNo: "Enter Case No",
  organization: "Enter Organization Name",
  estimateValueCr: "Enter Estimated Value",
  completionPeriodMonths: "Enter Completion Period",
  tenderType: "EPC_TURNKEY",
};

export const GENERIC_BIDDERS: BidderInput[] = [
  {
    id: "bidder-1",
    name: "Bidder 1",
    deviationFileName: "Bidder_1_Deviations.docx",
    deviationFileText: `COMMERCIAL & TECHNICAL DEVIATIONS SCHEDULE
Tender Ref: Enter Case No

1. Clause Ref: GCC Clause 27.2 - Liquidated Damages
Quoted Deviation: LD to be computed @ 0.5% per week on delayed milestone value only, not on total contract value. Maximum LD ceiling to be 5% instead of 10%.
Justification: Intermediate supplies delivered on time are usable by Buyer; levying LD on full contract value is excessive.

2. Clause Ref: GCC Clause 18.2 - Payment Terms & Milestones
Quoted Deviation: 75% payment against dispatch proof (LR/RR) through Letter of Credit (LC) without waiting for physical site receipt.
Justification: Equipment transit takes 30-45 days, causing severe working capital blockage for manufacturers.

3. Clause Ref: GCC Clause 38.0 - Limitation of Liability
Quoted Deviation: Aggregate liability to be capped at 50% of Contract Value with mutual exclusion of indirect and consequential damages.`,
    deviationFileFormat: "docx",
    uploadDate: "2026-09-22",
  },
  {
    id: "bidder-2",
    name: "Bidder 2",
    deviationFileName: "Bidder_2_Deviations.xlsx",
    deviationFileText: `SCHEDULE OF DEVIATIONS AGAINST SBD/NIT

1. Clause Ref: GCC Clause 18.1 - Advance Payment
Quoted Deviation: Bidder requests 10% Interest-free advance against Advance Bank Guarantee (ABG).
Justification: Mobilization of engineering teams and raw material procurement requires upfront liquidity without interest overhead.

2. Clause Ref: GCC Clause 27.2 - Liquidated Damages
Quoted Deviation: 30 days grace period before Liquidated Damages are computed. LD to apply only to the delayed portion.

3. Clause Ref: GCC Clause 12.0 - Performance Bank Guarantee
Quoted Deviation: Reduction of PBG quantum from 10% to 5% upon preliminary acceptance / commercial commissioning.`,
    deviationFileFormat: "xlsx",
    uploadDate: "2026-09-22",
  },
  {
    id: "bidder-3",
    name: "Bidder 3",
    deviationFileName: "Bidder_3_Deviations.pdf",
    deviationFileText: `CONSOLIDATED DEVIATION STATEMENT

1. Clause Ref: GCC Clause 29.0 - Defect Liability Period (DLP)
Quoted Deviation: Warranty for repaired or replaced parts to be capped at a maximum of 24 months from original commissioning date.
Justification: Indefinite extension of warranty for replaced parts prevents final contract closure.

2. Clause Ref: GCC Clause 38.0 - Aggregate Liability
Quoted Deviation: Accepts 100% liability cap, but requests clear mutual waiver of indirect, incidental, and consequential damages (loss of production/profit).

3. Clause Ref: SCC Clause 8.0 - Price Variation Clause (PVC)
Quoted Deviation: Requests Price Variation indexing on steel and copper as per RBI Wholesale Price Index due to 18-month execution period.`,
    deviationFileFormat: "pdf",
    uploadDate: "2026-09-22",
  },
];

// Preset: Operations & Maintenance / Non-Consultancy Services (Generic, no specific company names)
export const SERVICES_TENDER_METADATA: TenderMetadata = {
  packageTitle: "Operations & Maintenance (O&M) and Facility Management Services",
  tenderRefNo: "Enter Case No",
  organization: "Enter Organization Name",
  estimateValueCr: "Enter Estimated Value",
  completionPeriodMonths: "36",
  tenderType: "SERVICES_O_AND_M",
};

export const SERVICES_SAMPLE_DOCUMENTS: TenderDocuments = {
  sbdName: "SBD_Services_O&M_GCC_SCC.docx",
  sbdText: `STANDARD BIDDING DOCUMENT (SBD) FOR COMPREHENSIVE OPERATIONS & MAINTENANCE (O&M) SERVICES

CLAUSE 2.0: SERVICE LEVEL AGREEMENT (SLA) & AVAILABILITY
2.1 Service Provider shall ensure minimum 98.5% uninterrupted system availability on a 24x7x365 basis.
2.2 Downtime exceeding 4 hours shall attract penalty of 1% of monthly billing per occurrence, subject to a maximum of 10% monthly service fee.

CLAUSE 5.0: BILLING CYCLE & PAYMENT TERMS
5.1 Monthly running billing based on joint SLA performance verification and statutory compliance certificates (EPF, ESI, Minimum Wages deposit receipts).
5.2 100% monthly fee disbursed within 30 days of verified monthly invoice submission.

CLAUSE 9.0: STATUTORY WAGES ESCALATION
9.1 Quoted service margin/charges shall remain firm throughout the 36-month tenure.
9.2 Any statutory revision in Minimum Wages, VDA, or employer EPF/ESI contributions notified by Ministry of Labour shall be reimbursed at actuals.

CLAUSE 14.0: CONTRACT PERFORMANCE SECURITY
14.1 Service provider shall submit PBG for 5% of total 3-year contract value valid up to 60 days beyond completion of 36 months tenure.

CLAUSE 21.0: INDEMNITY & THIRD-PARTY LIABILITIES
21.1 Service Provider shall fully indemnify Employer against all claims arising out of industrial disputes, accidents, workplace injuries, or damage to Employer's assets due to negligence of deployed personnel.`,
  sbdCharCount: 1580,
  sbdSource: "sample",
  nitName: "NIT_Services_Procurement.pdf",
  nitText: `NOTICE INVITING TENDER FOR COMPREHENSIVE O&M SERVICES
TENDER REF: Enter Case No
Scope: Deployment of skilled supervisory and maintenance workforce, preventive maintenance, breakdown repairs, and consumable replenishment for 36 months.`,
  nitCharCount: 380,
  nitSource: "sample",
};

export const SERVICES_SAMPLE_BIDDERS: BidderInput[] = [
  {
    id: "bidder-s1",
    name: "Bidder 1",
    deviationFileName: "Bidder_1_Deviations_Services.docx",
    deviationFileText: `SCHEDULE OF SERVICE DEVIATIONS & QUALIFICATIONS
1. Clause Ref: SBD Clause 2.1 & 2.2 - SLA Downtime Penalty
Quoted Deviation: Service provider requests SLA availability benchmark of 95% instead of 98.5%. Maximum monthly penalty ceiling to be capped at 5% of monthly bill.
Justification: Power grid supply fluctuations outside contractor control should not count towards SLA penalty.

2. Clause Ref: SBD Clause 5.1 - Monthly Billing & Payment
Quoted Deviation: Payment within 15 days of invoice submission with interest @ 12% p.a. for delayed release. EPF/ESI deposit challans to be submitted within 60 days rather than concurrent with invoice.

3. Clause Ref: SBD Clause 21.1 - Indemnity & Liability
Quoted Deviation: Total aggregate liability for any operational damage or third-party claim to be limited to 3 months of service billing fees.`,
    deviationFileFormat: "docx",
    uploadDate: "2026-09-24",
  },
  {
    id: "bidder-s2",
    name: "Bidder 2",
    deviationFileName: "Bidder_2_Deviations_Services.pdf",
    deviationFileText: `COMMERCIAL & LEGAL DEVIATIONS
1. Clause Ref: SBD Clause 9.1 - Management Fee Escalation
Quoted Deviation: Fixed service fee to be subject to annual escalation of 7% per annum to offset overhead and administrative inflation over the 3-year tenure.

2. Clause Ref: SBD Clause 14.1 - Performance Security
Quoted Deviation: Proposes deduction of 5% security deposit from monthly running bills instead of upfront Performance Bank Guarantee (PBG).

3. Clause Ref: SBD Clause 22.0 - Exit & Termination Notice
Quoted Deviation: Mutual termination for convenience with 30 days notice by either party without forfeiture of performance security.`,
    deviationFileFormat: "pdf",
    uploadDate: "2026-09-24",
  },
];

export const BLANK_TENDER_METADATA: TenderMetadata = {
  packageTitle: "",
  tenderRefNo: "",
  organization: "Public Sector Undertaking (PSU) - Project Contracts Cell",
  estimateValueCr: "",
  completionPeriodMonths: "",
  tenderType: "EPC_TURNKEY",
};

export const BLANK_DOCUMENTS: TenderDocuments = {
  sbdName: "",
  sbdText: "",
  sbdCharCount: 0,
  sbdSource: "pc",
  nitName: "",
  nitText: "",
  nitCharCount: 0,
  nitSource: "pc",
};

export const BLANK_BIDDERS: BidderInput[] = [
  {
    id: "bidder-1",
    name: "Bidder 1",
    deviationFileText: "",
  },
];

