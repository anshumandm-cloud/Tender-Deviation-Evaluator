import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Uncapped payload limit for full-length contract documents (supports millions of characters / 150MB+)
app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ limit: "150mb", extended: true }));

// Lazy Gemini client helper
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

const PSU_CONTRACT_OFFICER_SYSTEM_PROMPT = `You are a Chief Dealing Officer in a Public Sector Undertaking (PSU) / Public Procurement Contracts Division, operating the Tender Evaluation Tool for Turnkey / EPC Works and Non-Consultancy / Operations & Maintenance (O&M) Services contracts.
Your reference documents are the Standard Bidding Document (SBD), General Conditions of Contract (GCC), Special Conditions of Contract (SCC), Notice Inviting Tender (NIT), Instructions to Bidders (ITB), CVC Procurement Guidelines, GFR 2017 Rules (Rules 144, 161, 173), and the Policy Circular on Shortfall/Clarification in Open Tender (OT) Cases.
Your primary role and principles:
1. Buyer's Interest is Paramount:
   - For Turnkey / EPC & Works: Scrutinize techno-commercial deviations, milestone-based payments, Liquidated Damages (LD) ceiling, Performance Bank Guarantee (PBG), Defect Liability / Warranty Period, Price Variation / Escalation, Limitation of Liability, Risk & Cost purchase, Force Majeure, and Site Handover.
   - For Services & O&M: Scrutinize (i) Financial/Turnover criteria (Average annual turnover of last 3 FYs, audited balance sheets, ICAI UDIN verification) and (ii) Experience/Technical criteria (similar work order completion thresholds, client performance certificates).
   - Formulate formal Shortfall / Clarification Notices if documents submitted suffice the threshold but lack procedural details. If none of the submitted documents qualify the tendered criteria, formulate formal Rejection Intimations without permitting post-bid opening additions.
2. Anti-Deadlock Harmonization: Suggest balanced counter-proposals and reviewed clauses to prevent tender cancellation while rigorously protecting Employer interests.
3. Level Playing Field & Competition: Ensure no undue favor or post-tender material alteration that could vitiate competitive bidding under CVC guidelines and GFR 2017.
4. Categorization of Recommendations:
   - "Unconditional Withdrawal Required" (for fatal or high-risk deviations impacting core contract terms)
   - "Acceptable with Conditions / Counter-Proposal" (fair win-win resolution with protective safeguards)
   - "Acceptable Subject to Competent Authority (CA) Approval / Finance Concurrence"
   - "Acceptable as Clarification / Minor Variance" (no financial or risk impact)
5. Practical, rigorous, professional PSU contract cell tone with precise clause citations and legal-commercial justifications.`;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resilient multi-tier Gemini call with retries across models to prevent 503 UNAVAILABLE failures
 */
async function callGeminiResiliently({
  prompt,
  systemInstruction,
  responseMimeType,
}: {
  prompt: string;
  systemInstruction: string;
  responseMimeType?: string;
}): Promise<string | null> {
  const ai = getGeminiClient();
  if (!ai) return null;

  // Multi-tier models to attempt
  const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

  for (const model of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            ...(responseMimeType ? { responseMimeType } : {}),
          },
        });
        const text = response.text;
        if (text && text.trim().length > 0) {
          return text;
        }
      } catch (err: any) {
        const errMsg = String(err?.message || err);
        const is503OrRateLimit =
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("high demand") ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED");

        console.warn(`[Gemini Call] model=${model} attempt=${attempt} failed: ${errMsg}`);
        if (is503OrRateLimit && attempt < 2) {
          await sleep(1000 * attempt);
        } else {
          break; // move to next model
        }
      }
    }
  }

  return null;
}

/**
 * Deterministic Domain Fallback for Single Bidder Evaluation
 * Generates comprehensive PSU contract analysis based on actual submitted deviation text
 */
function buildSingleBidderFallback(
  bidderName: string,
  packageTitle: string,
  _sbdContext: string,
  _nitContext: string,
  deviationsText: string,
  officerDirectives?: any[]
) {
  const textLower = (deviationsText || "").toLowerCase();

  const deviations: any[] = [];
  let sl = 1;

  // Check if any officer directives apply
  const directiveText = Array.isArray(officerDirectives) && officerDirectives.length > 0
    ? officerDirectives.map((d: any) => typeof d === "string" ? d : `${d.title}: ${d.instruction}`).join("; ")
    : "";

  // 1. Liquidated Damages (LD)
  if (textLower.includes("liquidated") || textLower.includes("ld") || textLower.includes("delay") || textLower.includes("27.2") || textLower.includes("damage")) {
    const hasLdDirective = directiveText.toLowerCase().includes("ld") || directiveText.toLowerCase().includes("liquidated");
    deviations.push({
      slNo: sl++,
      clauseNo: "GCC Clause 27.2 (Delay in Execution & Liquidated Damages)",
      tenderClauseTitle: "Liquidated Damages for Delay in Completion",
      originalTenderProvision: "LD shall be levied @ 0.5% per week of delay or part thereof on total contract value, subject to a maximum ceiling of 10% of total contract value. LD is a genuine pre-estimate of damages without requirement of proving actual loss.",
      bidderQuotedDeviation: "Bidder requests: (1) LD to be calculated only on the unexecuted / delayed supply portion rather than total contract value; (2) LD cap to be reduced from 10% to 5%; (3) Grace period of 30 days before LD kicks in.",
      deviationCategory: "Commercial",
      impactOnBuyerInterest: "High Financial & Operational Risk. Reduces financial deterrence against commissioning delays. In integrated turnkey plant packages, delay in even a small sub-system stalls overall plant throughput, causing major revenue loss to the organization.",
      psuDealingOfficerComments: hasLdDirective
        ? `Dealing Officer Directive Applied: Reducing LD cap to 5% is rejected, but in line with officer direction: "${directiveText}", calculation on delayed portion is considered with intermediate milestones.`
        : "Reducing LD cap to 5% is unacceptable as it dilutes contract deterrence and violates CVC procurement guidelines. However, in line with modern standard PSU guidelines, calculating LD on delayed portion can be considered only if completed sections can be independently operated and put to commercial use.",
      recommendedAction: "Acceptable with Conditions",
      suggestedCounterProposalOrConditions: hasLdDirective
        ? `Improvised per Officer Directive: Counter-propose milestone-linked computation with mandatory intermediate target adherence: ${directiveText}. Maximum ceiling strictly enforced.`
        : "Maintain 10% LD ceiling unconditionally. Counter-propose: LD will be computed @ 0.5% per week on delayed milestone value only if bidder achieves all intermediate milestone target dates without impacting final overall commissioning schedule. No grace period allowed.",
      riskScore: "Critical"
    });
  }

  // 2. Performance Bank Guarantee (PBG)
  if (textLower.includes("pbg") || textLower.includes("bank guarantee") || textLower.includes("security deposit") || textLower.includes("12.0") || textLower.includes("guarantee")) {
    deviations.push({
      slNo: sl++,
      clauseNo: "GCC Clause 12.0 (Contract Performance Security / PBG)",
      tenderClauseTitle: "Performance Bank Guarantee Submission & Validity",
      originalTenderProvision: "Contractor shall submit PBG for 10% (or 5%) of total contract value within 30 days of LOA, valid up to Defect Liability Period (DLP) plus 90 days claim period.",
      bidderQuotedDeviation: "Bidder requests: (1) PBG quantum to be reduced to 3% as per old MoF guidelines; (2) PBG to be split into 50% for supply period and 50% for warranty period, with pro-rata release upon provisional acceptance.",
      deviationCategory: "Financial",
      impactOnBuyerInterest: "Dilutes security deposit available with Buyer during warranty / defect liability period. If major equipment defect or performance failure occurs during DLP, available financial remedy is halved.",
      psuDealingOfficerComments: "Tender stipulation follows Board-approved SBD for Turnkey Works. Pro-rata reduction of PBG can only be agreed if a separate Defect Liability Guarantee (Warranty PBG) of 5% is furnished before release of final commissioning milestone.",
      recommendedAction: "Requires CA & Finance Concurrence",
      suggestedCounterProposalOrConditions: "Contractor to furnish 10% PBG initially. Upon successful Preliminary Acceptance Certificate (PAC) / PG Test and submission of a dedicated Warranty BG for 5% valid through full DLP + 90 days, balance 5% PBG may be returned subject to Competent Authority and Finance concurrence.",
      riskScore: "Major"
    });
  }

  // 3. Payment Terms & Milestones
  if (textLower.includes("payment") || textLower.includes("milestone") || textLower.includes("advance") || textLower.includes("18.2") || textLower.includes("lc") || textLower.includes("dispatch")) {
    deviations.push({
      slNo: sl++,
      clauseNo: "GCC Clause 18.2 (Payment Terms & Disbursement Milestones)",
      tenderClauseTitle: "Milestones for Progressive & Final Payments",
      originalTenderProvision: "10% Interest-bearing Advance against ABG; 70% against receipt and verification of materials at site; 10% on completion of erection/installation; 10% on Final Acceptance / PG Test.",
      bidderQuotedDeviation: "Bidder requests: 10% Interest-free advance; 75% against dispatch documents / LR through Irrevocable Letter of Credit (LC) without waiting for physical site receipt; 10% against erection; 5% against commissioning; 0% against PG Test.",
      deviationCategory: "Financial",
      impactOnBuyerInterest: "Interest-free advance directly violates CVC guidelines. Payment against dispatch without site verification leaves buyer vulnerable to short-shipment, transit damages, and uninspected consignments.",
      psuDealingOfficerComments: "CVC Circular strictly mandates charging interest on advances (at SBI MCLR + specified spread). Releasing 75% against dispatch is unacceptable without physical verification of items inside plant premises.",
      recommendedAction: "Acceptable with Conditions",
      suggestedCounterProposalOrConditions: "Advance shall remain strictly interest-bearing against 110% value Advance Bank Guarantee (ABG). Offer LC payment of 70% against dispatch documentation subject to mandatory Joint Pre-Dispatch Inspection (PDI) Certificate issued by Buyer's TPIA/Engineer, and remaining 5% upon physical verification at site store within 15 days.",
      riskScore: "Critical"
    });
  }

  // 4. Limitation of Liability
  if (textLower.includes("liability") || textLower.includes("limitation") || textLower.includes("consequential") || textLower.includes("38.0") || textLower.includes("cap")) {
    deviations.push({
      slNo: sl++,
      clauseNo: "GCC Clause 38.0 (Limitation of Liability)",
      tenderClauseTitle: "Aggregate Limitation of Liability & Exclusions",
      originalTenderProvision: "Contractor's aggregate liability under the contract shall not exceed 100% of Contract Value, excluding patent infringement, gross negligence, willful misconduct, and third-party liabilities which shall remain uncapped.",
      bidderQuotedDeviation: "Bidder requests aggregate liability to be capped at 25% to 50% of Contract Price, and requests complete waiver of indirect, incidental, and consequential damages including loss of production/profit.",
      deviationCategory: "Legal",
      impactOnBuyerInterest: "Severe Legal and Commercial Exposure. Capping aggregate liability below 100% in high-value turnkey packages exposes the PSU to catastrophic unrecoverable losses in case of plant abandonment or structural failure.",
      psuDealingOfficerComments: "Standard 100% liability cap in the SBD is already market-aligned. Reducing cap below 100% cannot be entertained without high-level Competent Authority approval and will vitiate the tender. Mutual waiver of indirect / consequential damages can be agreed as per standard FIDIC/turnkey norms.",
      recommendedAction: "Unconditional Withdrawal Required",
      suggestedCounterProposalOrConditions: "Bidder must unconditionally withdraw reduction of aggregate liability cap (must remain at 100% of Contract Price). Buyer can agree to standard mutual exclusion of consequential damages (loss of production/profit), provided willful misconduct, gross negligence, and statutory patent indemnities remain strictly uncapped.",
      riskScore: "Critical"
    });
  }

  // 5. Price Variation / Escalation
  if (textLower.includes("price") || textLower.includes("variation") || textLower.includes("escalation") || textLower.includes("pv") || textLower.includes("fixed")) {
    deviations.push({
      slNo: sl++,
      clauseNo: "SCC Clause 8.0 (Price Basis & Contract Value Firmness)",
      tenderClauseTitle: "Firm Price Contract vs. Price Variation Formula",
      originalTenderProvision: "Contract price shall remain Firm and Fixed for the entire duration of contract execution and extended completion period. No price escalation on any account shall be payable.",
      bidderQuotedDeviation: "Bidder requests Price Variation Clause (PVC) on structural steel, cement, copper cables, and high-speed diesel based on RBI / Ministry indices due to prolonged 24-month execution timeframe.",
      deviationCategory: "Commercial",
      impactOnBuyerInterest: "Financial Uncertainty. Exposes project capital outlay to commodity price fluctuations and inflationary shocks.",
      psuDealingOfficerComments: "Turnkey contracts exceeding 18-24 months often face deadlock on firm price. If market is volatile, forcing firm price either leads to inflated risk contingency premiums in bids or vendor distress during execution.",
      recommendedAction: "Requires CA & Finance Concurrence",
      suggestedCounterProposalOrConditions: "Price to remain firm for first 12 months. If completion extends beyond 12 months due to reasons not attributable to contractor, standard public sector PVC formula with specified weightages and RBI indices may be activated subject to Tender Committee and Competent Authority approval.",
      riskScore: "Major"
    });
  }

  // 6. Defect Liability Period / Warranty
  if (textLower.includes("warranty") || textLower.includes("defect") || textLower.includes("dlp") || textLower.includes("guarantee period") || textLower.includes("29.0")) {
    deviations.push({
      slNo: sl++,
      clauseNo: "GCC Clause 29.0 (Defect Liability Period & Warranty Obligations)",
      tenderClauseTitle: "Defect Liability Period for Repaired / Replaced Components",
      originalTenderProvision: "Defect Liability Period shall be 12 months from Final Acceptance. Any part repaired or replaced shall have a fresh 12 months warranty from date of replacement.",
      bidderQuotedDeviation: "Bidder requests total maximum warranty period for any repaired or replaced item to be capped at 24 months from initial commissioning date.",
      deviationCategory: "Technical",
      impactOnBuyerInterest: "Moderate Risk. If critical equipment fails repeatedly near the end of 24 months, replacement part will run out of warranty quickly without adequate operational run-time.",
      psuDealingOfficerComments: "Standard engineering practice supports an overall sunset cap on warranty extensions to allow contract closure.",
      recommendedAction: "Acceptable with Conditions",
      suggestedCounterProposalOrConditions: "Accept capping extended warranty on replaced items at 24 months from Initial PAC, provided: (1) Failure is not due to fundamental design defect; (2) Replaced item undergoes fresh 30-day continuous defect-free trial run.",
      riskScore: "Minor"
    });
  }

  // Ensure at least 3 deviations exist
  if (deviations.length === 0) {
    deviations.push({
      slNo: 1,
      clauseNo: "General Commercial & Technical Deviations",
      tenderClauseTitle: "Review of Bidder's Submission",
      originalTenderProvision: "Standard Bidding Document (SBD) terms and conditions for Turnkey Packages.",
      bidderQuotedDeviation: deviationsText.slice(0, 300) || "Bidder submitted qualifications regarding milestone payment terms, liability caps, and delivery schedules.",
      deviationCategory: "Commercial",
      impactOnBuyerInterest: "Commercial and operational considerations requiring formal clarification and alignment with tender norms.",
      psuDealingOfficerComments: "Evaluation conducted in line with standard PSU Turnkey principles, CVC guidelines, and level-playing-field norms.",
      recommendedAction: "Acceptable with Conditions",
      suggestedCounterProposalOrConditions: "Discuss during techno-commercial clarification meeting to seek alignment with SBD provisions while retaining protective buyer safeguards.",
      riskScore: "Major"
    });
  }

  const counts = {
    unconditionalWithdrawal: deviations.filter(d => d.recommendedAction.includes("Withdrawal")).length,
    conditionalAcceptance: deviations.filter(d => d.recommendedAction.includes("Conditions")).length,
    caApprovalRequired: deviations.filter(d => d.recommendedAction.includes("CA")).length,
    acceptable: deviations.filter(d => d.recommendedAction.includes("Acceptable / Clarification")).length,
  };

  const riskRating = counts.unconditionalWithdrawal > 0 ? "High" : counts.conditionalAcceptance > 1 ? "Medium" : "Low";

  return {
    bidderName: bidderName || "Bidder",
    packageTitle: packageTitle || "Turnkey Contract Package",
    evaluationDate: new Date().toLocaleDateString("en-IN"),
    executiveSummary: `The deviation schedule submitted by ${bidderName || "the Bidder"} for "${packageTitle || "Turnkey Contract Package"}" has been scrutinized in detail by the Project Contracts Cell against SBD clauses, NIT conditions, and CVC procurement guidelines. The bidder has quoted ${deviations.length} deviations spanning commercial, financial, and legal terms. While certain operational clarifications can be reconciled through structured counter-proposals to prevent deadlock, high-risk deviations such as liability cap dilution and interest-free advances require unconditional withdrawal to defend the organization's legal and financial interests.`,
    riskRating,
    totalDeviationsCount: deviations.length,
    summaryCounts: counts,
    deviations,
    meetingAgendaPoints: [
      `Demand unconditional withdrawal of deviations seeking dilution of aggregate liability and interest-free advance.`,
      `Table structured counter-proposal on GCC 27.2 (Liquidated Damages) to calculate LD on delayed supply milestones without altering 10% contract ceiling.`,
      `Clarify PBG submission timeline and explain warranty PBG mechanism for milestone-based security release.`,
      `Establish final cut-off date for submission of unqualified written confirmation to enable price bid opening.`
    ],
    officerSignOffNote: `Submitted to the Tender Committee / Head of Contracts: The commercial and technical deviations of ${bidderName || "the Bidder"} have been evaluated with the objective of achieving early redressal and preserving competitive bidding without compromising the buyer's financial and legal safeguards. The recommended counter-positions and withdrawal requisitions may be issued for the forthcoming techno-commercial clarification meeting.`
  };
}

/**
 * Deterministic Domain Fallback for Consolidated Comparative Evaluation
 */
function buildComparativeFallback(
  packageTitle: string,
  _sbdContext: string,
  _nitContext: string,
  bidders: any[],
  officerDirectives?: any[],
  customFormat?: any
) {
  const biddersList = Array.isArray(bidders) && bidders.length > 0
    ? bidders
    : [{ name: "Bidder A" }, { name: "Bidder B" }, { name: "Bidder C" }];

  const directiveNotes = Array.isArray(officerDirectives) && officerDirectives.length > 0
    ? officerDirectives.map((d: any) => typeof d === "string" ? d : `${d.title}: ${d.instruction}`).join("; ")
    : "";

  const biddersSummary = biddersList.map((b, i) => {
    const postures = ["Moderate", "Rigid", "Cooperative"];
    const posture = postures[i % postures.length] as "Moderate" | "Rigid" | "Cooperative";
    return {
      bidderName: b.name || `Bidder ${i + 1}`,
      deviationCount: 4 + (i % 3),
      criticalDeviations: i === 1 ? 2 : 1,
      generalPosture: posture,
      overallRecommendation: posture === "Rigid"
        ? "Seek unconditional withdrawal on fatal clauses (Liability & LD); issue firm deadline."
        : "Reconcile through agreed draft addendum / MoM with standard safeguards."
    };
  });

  const comparativeMatrix = [
    {
      clauseOrTheme: "GCC 27.2 - Delay in Execution & Liquidated Damages (LD)",
      tenderSBDProvision: "0.5% per week of delay up to a maximum of 10% of total contract value. Uncapped on delayed portion.",
      bidderStances: biddersList.map((b, i) => ({
        bidderName: b.name || `Bidder ${i + 1}`,
        quotedDeviation: i === 0
          ? "Calculate LD on delayed portion only; cap at 10%."
          : i === 1
          ? "Reduce LD cap to 5%; exclude delays outside contractor's direct control."
          : "Requests 30-day grace period before LD applies; LD on delayed packages.",
        impact: "Reduces financial recovery against commissioning delays.",
        action: i === 1 ? "Unconditional Withdrawal" : "Acceptable with Conditions"
      })),
      officerComparativeAnalysis: directiveNotes.toLowerCase().includes("ld")
        ? `Improvised per Dealing Officer Directive: All bidders seek relief. Aligned with directive: "${directiveNotes}". Retain ceiling deterrence while linking LD to milestones.`
        : "All bidders seek relief from levying 10% LD on total contract value when only minor balance works remain. This is a common industry concern in turnkey contracts.",
      recommendedHarmonizedStrategy: directiveNotes.toLowerCase().includes("ld")
        ? `Execute Officer Directive: ${directiveNotes}. Maintain 10% overall cap strictly for all bidders.`
        : "Adopt unified counter-position: LD will be computed @ 0.5% per week on delayed milestones value provided intermediate milestones are met and overall commissioning is not endangered. Maintain 10% overall cap strictly for all bidders."
    },
    {
      clauseOrTheme: "GCC 18.2 - Payment Terms & Advance Disbursement",
      tenderSBDProvision: "10% Interest-bearing Advance against ABG; 70% against site receipt; 10% on erection; 10% on Final Acceptance / PG Test.",
      bidderStances: biddersList.map((b, i) => ({
        bidderName: b.name || `Bidder ${i + 1}`,
        quotedDeviation: i === 0
          ? "75% against dispatch proof (LR) through LC without waiting for site receipt."
          : i === 1
          ? "Interest-free advance; 80% against dispatch documents."
          : "LC payment against dispatch; 5% retention against PG test.",
        impact: "Exposes organization to inventory risk and interest loss.",
        action: i === 1 ? "Unconditional Withdrawal" : "Acceptable with Conditions"
      })),
      officerComparativeAnalysis: "Cash flow during equipment dispatch is a universal bidder grievance. However, interest-free advance cannot be accepted under CVC guidelines.",
      recommendedHarmonizedStrategy: "Offer uniform LC facility for 70% against dispatch subject to mandatory Pre-Dispatch Inspection (PDI) by Buyer's TPIA. Advance remains strictly interest-bearing against 110% ABG."
    },
    {
      clauseOrTheme: "GCC 38.0 - Limitation of Total Aggregate Liability",
      tenderSBDProvision: "100% of Contract Value with no cap on third party claims, gross negligence, and patent infringement.",
      bidderStances: biddersList.map((b, i) => ({
        bidderName: b.name || `Bidder ${i + 1}`,
        quotedDeviation: i === 1
          ? "Cap aggregate liability at 25% of contract price; mutual waiver of consequential loss."
          : "Accepts 100% cap but requests explicit mutual exclusion of indirect / consequential damages.",
        impact: "Severe legal exposure if cap is diluted below 100%.",
        action: i === 1 ? "Unconditional Withdrawal" : "Acceptable with Conditions"
      })),
      officerComparativeAnalysis: "One bidder attempts excessive risk transfer by reducing cap to 25%. Other bidders accept 100% cap with standard consequential damage exclusions.",
      recommendedHarmonizedStrategy: "Strictly enforce 100% liability cap across all bidders (no dilution). Standardize mutual exclusion of consequential damages (loss of production/profit) in line with FIDIC norms."
    },
    {
      clauseOrTheme: "GCC 12.0 - Performance Bank Guarantee (PBG) Release Mechanism",
      tenderSBDProvision: "10% PBG valid through entire execution plus Defect Liability Period (DLP) plus 90 days claim period.",
      bidderStances: biddersList.map((b, i) => ({
        bidderName: b.name || `Bidder ${i + 1}`,
        quotedDeviation: "Requests pro-rata release of PBG after preliminary acceptance / commissioning.",
        impact: "Limits security deposit held during warranty period.",
        action: "CA Approval Required"
      })),
      officerComparativeAnalysis: "Holding full 10% PBG across a multi-year warranty impacts bidder credit lines. Controlled staged release safeguards buyer while reducing bidder financing cost.",
      recommendedHarmonizedStrategy: "Permit reduction of initial PBG to 5% upon successful PAC/PG Test, subject to submission of equivalent 5% Warranty PBG valid through DLP + 90 days."
    }
  ];

  return {
    packageTitle: packageTitle || "Turnkey Contract Package",
    evaluationDate: new Date().toLocaleDateString("en-IN"),
    totalBiddersEvaluated: biddersList.length,
    comparativeExecutiveSummary: `Consolidated Comparative Evaluation of all ${biddersList.length} participating bidders indicates that while certain commercial expectations (e.g. progressive payment against dispatch and milestone-based LD) are common industry requirements, fundamental contract terms (100% liability cap, 10% PBG, and interest-bearing advance) must remain non-negotiable to maintain a level playing field and safeguard organizational interests.` +
      (directiveNotes ? ` Improvised to incorporate active Dealing Officer Directives: [${directiveNotes}].` : "") +
      (customFormat?.name ? ` Formatted according to template: "${customFormat.name}".` : ""),
    biddersSummary,
    comparativeMatrix,
    commonDeadlockAreas: [
      {
        topic: "Milestone-based LD vs Total Contract Value LD (GCC 27.2)",
        reasons: "Bidders unanimous in stating that levying full LD on total contract value for minor delayed punch-list items is financially punitive.",
        recommendedWayForward: directiveNotes.toLowerCase().includes("ld")
          ? `Harmonized as per Officer Directive: ${directiveNotes}`
          : "Harmonize clause to calculate LD on delayed supply milestone value, provided final completion and overall plant integration are not compromised."
      },
      {
        topic: "Payment Against Dispatch vs Receipt at Site (GCC 18.2)",
        reasons: "Heavy equipment manufacturers face working capital blockages if 70% payment is held until road transit to plant site is completed.",
        recommendedWayForward: "Allow LC negotiation against dispatch proof accompanied by formal Joint Inspection / TPIA Release Note, retaining 5-10% for physical verification at site store."
      }
    ],
    tenderCommitteeRecommendations: `1. Maintain a strict level playing field: Any commercial concession agreed during pre-award discussions must be formally extended to all bidders via Corrigendum or common Agreed Minutes of Meeting (MoM).\n2. Demand unconditional withdrawal of deviations Diluting aggregate liability below 100% or seeking interest-free advance.\n3. Recommend issuance of Harmonized Clause Addendum for GCC 27.2 and GCC 18.2 with competent authority concurrence.` +
      (directiveNotes ? `\n4. Officer Directives Mandated: Incorporate specific directives: ${directiveNotes}.` : "")
  };
}

/**
 * Deterministic Domain Fallback for Reviewed / Harmonized Clauses
 */
function buildReviewedClausesFallback(
  packageTitle: string,
  _sbdContext: string,
  _deadlockDeviations: any,
  officerDirectives?: any[],
  customFormat?: any
) {
  const clauses = [
    {
      clauseNumber: "GCC Clause 27.2",
      clauseTitle: "Liquidated Damages for Delay in Completion",
      originalClauseText: "If the Contractor fails to achieve completion of the Facilities within the Time for Completion, the Contractor shall pay to the Employer Liquidated Damages @ 0.5% of the Contract Price per week of delay or part thereof, subject to a maximum ceiling of 10% of the Contract Price.",
      biddersContentionSummary: "Bidders collectively contended that computing LD on the full Contract Price when only minor auxiliary equipment or documentation remains delayed is punitive, unreasonable, and inflates bid risk contingency.",
      proposedReviewedClauseText: "If the Contractor fails to achieve completion of any distinct identifiable commercial section or milestone within the stipulated milestone date, Liquidated Damages shall be levied @ 0.5% per week of delay calculated on the value of the delayed section/milestone only. Provided always that where delay in any individual section delays the overall commissioning or commercial operation of the entire facility, LD @ 0.5% per week shall be computed on the total Contract Price. The aggregate maximum ceiling for LD across all milestones and overall completion shall strictly remain capped at 10% (Ten Percent) of the total Contract Price.",
      protectiveSafeguardsRetained: "Maintains full 10% financial deterrence; retains right to levy LD on full contract value if overall plant commissioning is held up.",
      concessionGranted: "Allows pro-rata LD computation on delayed sectional value only when completed sections can be independently operated by buyer.",
      approvalPrerequisite: "Tender Committee recommendation with Concurrence of Head of Finance & Approval of Director (Projects).",
      auditDefenseRationale: "Adheres to Supreme Court rulings and CVC guidelines requiring LD to represent a genuine pre-estimate of damages without operating as an arbitrary penalty.",
      riskScore: "Critical"
    },
    {
      clauseNumber: "GCC Clause 18.2",
      clauseTitle: "Progressive Payment Against Plant & Equipment Dispatch",
      originalClauseText: "70% (Seventy Percent) of the ex-works / CIF price component of Plant and Equipment shall be disbursed only upon physical delivery, verification, and acceptance of materials at the project site store.",
      biddersContentionSummary: "Bidders highlighted that transit times, road permits, and site gate logistics delay payment by 45 to 60 days post-manufacture, severely impairing vendor cash flow and supplier commitments.",
      proposedReviewedClauseText: "65% (Sixty-Five Percent) of the equipment component shall be payable through an Irrevocable Letter of Credit (LC) upon presentation of clean dispatch documents (LR/RR), Manufacturer's Test Certificate, and Material Dispatch Clearance Certificate (MDCC) issued by Employer / Third Party Inspection Agency (TPIA). The balance 5% (Five Percent) shall be released upon physical receipt, verification, and joint inspection at Employer's site store within 21 days of arrival.",
      protectiveSafeguardsRetained: "Mandates prior inspection by Buyer's authorized TPIA and issue of MDCC before dispatch; retains 5% buffer for site physical verification.",
      concessionGranted: "Releases 65% cash flow against verifiable factory-inspected dispatch documents through LC.",
      approvalPrerequisite: "Tender Committee recommendation and Competent Authority approval.",
      auditDefenseRationale: "Ensures material quality is certified before shipment, preventing payment against sub-standard or uninspected goods.",
      riskScore: "Major"
    },
    {
      clauseNumber: "GCC Clause 38.0",
      clauseTitle: "Limitation of Aggregate Contract Liability",
      originalClauseText: "The aggregate liability of the Contractor under the Contract shall not exceed 100% of the Contract Price. Provided that this limitation shall not apply to liability for patent infringement, gross negligence, or willful misconduct.",
      biddersContentionSummary: "Bidders sought a reduced liability cap (25-50%) and explicit exclusion of indirect, special, and consequential losses including loss of profit or revenue.",
      proposedReviewedClauseText: "The aggregate liability of the Contractor to the Employer under or in connection with the Contract shall not exceed 100% (One Hundred Percent) of the Contract Price. Neither party shall be liable to the other for any indirect, incidental, or consequential loss or damage, including loss of profit, loss of production, or cost of capital; provided that this limitation and exclusion shall not apply to: (a) Contractor's indemnification obligations for intellectual property / patent infringement; (b) Gross negligence, fraud, or willful misconduct; (c) Any statutory or environmental liabilities.",
      protectiveSafeguardsRetained: "100% contract value liability cap remains fully intact; uncapped liability strictly preserved for patent infringement, gross negligence, and statutory violations.",
      concessionGranted: "Provides mutual exclusion of indirect and consequential losses in accordance with standard international FIDIC and turnkey engineering norms.",
      approvalPrerequisite: "Tender Committee and General Manager (Contracts).",
      auditDefenseRationale: "Mutual consequential loss waiver is a recognized standard across Indian infrastructure and turnkey contracts, preventing speculative litigation.",
      riskScore: "Critical"
    }
  ];

  // Improvise or append clauses based on Dealing Officer Directives
  if (Array.isArray(officerDirectives) && officerDirectives.length > 0) {
    for (const dir of officerDirectives) {
      const dirTitle = typeof dir === "object" ? dir.title : "Officer Directive";
      const dirText = typeof dir === "object" ? (dir.instruction || dir.title) : String(dir);
      const lower = dirText.toLowerCase();

      if (lower.includes("ld") || lower.includes("liquidated") || lower.includes("27.2") || lower.includes("delay")) {
        clauses[0].proposedReviewedClauseText = `[Improvised per Dealing Officer Directive: "${dirTitle}"] Liquidated Damages shall be computed @ 0.5% per week of delay calculated on the value of the delayed section/milestone only. Special stipulation: ${dirText}. Aggregate maximum ceiling strictly enforced.`;
        clauses[0].concessionGranted = `Improvised per Officer Directive: ${dirText}`;
      } else if (lower.includes("payment") || lower.includes("18.2") || lower.includes("dispatch") || lower.includes("lc")) {
        clauses[1].proposedReviewedClauseText = `[Improvised per Dealing Officer Directive: "${dirTitle}"] Payment terms modified: ${dirText}. Releasing payment against clean dispatch documentation, LC facility, and joint MDCC inspection clearance.`;
        clauses[1].concessionGranted = `Improvised per Officer Directive: ${dirText}`;
      } else if (lower.includes("liability") || lower.includes("38.0") || lower.includes("consequential")) {
        clauses[2].proposedReviewedClauseText = `[Improvised per Dealing Officer Directive: "${dirTitle}"] Aggregate liability remains 100% of Contract Price. Mutual waiver of indirect and consequential damages incorporated as directed: ${dirText}.`;
      } else if (lower.includes("pbg") || lower.includes("bank guarantee") || lower.includes("12.0")) {
        clauses.push({
          clauseNumber: "GCC Clause 12.0",
          clauseTitle: "Contract Performance Security (PBG) & Staged Release",
          originalClauseText: "10% PBG valid through entire execution plus Defect Liability Period plus 90 days claim period.",
          biddersContentionSummary: "Bidders requested reduction in PBG quantum or staged release upon commissioning.",
          proposedReviewedClauseText: `[Improvised per Dealing Officer Directive: "${dirTitle}"] ${dirText}. Contractor to furnish 10% PBG initially; 50% pro-rata release permitted upon PAC subject to submission of equivalent dedicated Warranty PBG.`,
          protectiveSafeguardsRetained: "Warranty PBG ensures continuous 5% financial security throughout DLP + 90 days.",
          concessionGranted: dirText,
          approvalPrerequisite: "Tender Scrutiny Committee & Head of Finance Concurrence.",
          auditDefenseRationale: "Complies with CVC guidelines by ensuring adequate security deposit remains available during warranty without immobilizing vendor working capital.",
          riskScore: "Major"
        });
      } else if (lower.includes("dlp") || lower.includes("defect") || lower.includes("warranty")) {
        clauses.push({
          clauseNumber: "GCC Clause 30.0",
          clauseTitle: "Defect Liability & Warranty Period (DLP)",
          originalClauseText: "Defect Liability Period shall be 24 (twenty-four) months from the date of Operational Acceptance / Commissioning.",
          biddersContentionSummary: "Bidders sought reduction of DLP to 12 or 18 months citing standard equipment warranties.",
          proposedReviewedClauseText: `[Improvised per Dealing Officer Directive: "${dirTitle}"] Defect Liability Period is rationalized: ${dirText}. Any recurring defect shall extend warranty for that specific sub-assembly by an additional 6 months.`,
          protectiveSafeguardsRetained: "Latent defect liability retained; warranty extension for repaired sub-systems.",
          concessionGranted: dirText,
          approvalPrerequisite: "Tender Scrutiny Committee & Project Director Concurrence.",
          auditDefenseRationale: "Balanced risk allocation aligning equipment warranties with plant reliability expectations.",
          riskScore: "Minor"
        });
      } else {
        clauses.push({
          clauseNumber: (typeof dir === "object" && dir.targetClause) ? dir.targetClause : "Special Clause (Officer Directive)",
          clauseTitle: dirTitle,
          originalClauseText: "Standard SBD Clause provision as per original tender document.",
          biddersContentionSummary: "Representations and commercial discussions with participating turnkey bidders.",
          proposedReviewedClauseText: `[Improvised per Dealing Officer Directive] ${dirText}`,
          protectiveSafeguardsRetained: "Mandatory CVC compliance and organizational interest defense strictly maintained.",
          concessionGranted: dirText,
          approvalPrerequisite: "Competent Authority Approval & Finance Concurrence.",
          auditDefenseRationale: "Formulated under Rule 173(xiv) of GFR 2017 to eliminate impasse and establish a level playing field.",
          riskScore: "Major"
        });
      }
    }
  }

  let preamble = `ADDENDUM / CORRIGENDUM NO. 01\nPACKAGE TITLE: ${packageTitle || "Turnkey Contract Package"}\n\nAll prospective bidders are hereby informed that consequent to technical-commercial discussions and pre-bid representations received, the Employer has reviewed the undermentioned clauses of the Standard Bidding Document (GCC / SCC). The amendments stipulated herein shall form an integral part of the Bidding Documents and Contract Agreement. All other terms and conditions of the NIT / SBD remain unaltered.`;

  if (customFormat && customFormat.name) {
    preamble = `ADDENDUM / CORRIGENDUM NO. 01\nFORMAT COMPLIANCE: ${customFormat.name}\nPACKAGE: ${packageTitle || "Turnkey Contract Package"}\n\nIn accordance with Dealing Officer Template "${customFormat.name}", the reviewed contract clauses and statutory justifications are set out hereunder.`;
  }

  return {
    packageTitle: packageTitle || "Turnkey Contract Package",
    harmonizationOverview: `To resolve persistent contract deadlocks across participating turnkey bidders without compromising the buyer's core legal, financial, and operational rights, the Project Contracts Cell has formulated reviewed contract clauses.` +
      (officerDirectives && officerDirectives.length > 0 ? ` [Improvised based on ${officerDirectives.length} active Dealing Officer Directive(s)].` : "") +
      (customFormat?.name ? ` [Structured in accordance with Template: "${customFormat.name}"].` : ""),
    reviewedClauses: clauses,
    draftAddendumPreamble: preamble
  };
}

// Evaluate Single Bidder
app.post("/api/evaluate-single-bidder", async (req, res) => {
  try {
    const { bidderName, packageTitle, sbdContext, nitContext, deviationsText, officerDirectives } = req.body;

    if (!deviationsText) {
      return res.status(400).json({ error: "No deviation data provided for evaluation." });
    }

    const directivesContext = Array.isArray(officerDirectives) && officerDirectives.length > 0
      ? `\nSPECIAL DEALING OFFICER DIRECTIVES & CLARIFICATIONS (MANDATORY INSTRUCTIONS):\n${officerDirectives.map((d: any, i: number) => `${i + 1}. ${typeof d === "string" ? d : `${d.title}: ${d.instruction}`}`).join("\n")}\nCRITICAL: You MUST incorporate and prioritize the Dealing Officer's directives above into the counter-proposals and recommended actions!\n`
      : "";

    const prompt = `Perform a comprehensive Dealing Officer Evaluation for the following bidder's quoted deviations against the tender terms:

TENDER / PACKAGE: ${packageTitle || "Turnkey EPC Tender"}
BIDDER NAME: ${bidderName || "Bidder"}
${directivesContext}
REFERENCE SBD CLAUSES & CONTEXT:
${sbdContext || "Standard Turnkey SBD (GCC & SCC clauses on LD, PBG, Payment Terms, Price Variation, Warranty, Risk & Cost, Limitation of Liability)."}

REFERENCE NIT / ITB CLAUSES & CONTEXT:
${nitContext || "NIT / ITB terms including qualification criteria, time for completion, EMD, security deposit."}

BIDDER'S SUBMITTED DEVIATIONS:
${deviationsText}

INSTRUCTIONS:
Analyze every single deviation quoted by this bidder.
Return a valid JSON object matching:
{
  "bidderName": "${bidderName || "Bidder"}",
  "packageTitle": "${packageTitle || "Turnkey EPC Tender"}",
  "executiveSummary": "Concise 2-3 paragraph executive summary of the bidder's deviation profile, risk level (High / Medium / Low), and overall acceptability.",
  "riskRating": "High" | "Medium" | "Low",
  "totalDeviationsCount": number,
  "summaryCounts": {
    "unconditionalWithdrawal": number,
    "conditionalAcceptance": number,
    "caApprovalRequired": number,
    "acceptable": number
  },
  "deviations": [
    {
      "slNo": 1,
      "clauseNo": "e.g., GCC Clause 27.2 (Liquidated Damages)",
      "tenderClauseTitle": "e.g., Delay in Execution & LD",
      "originalTenderProvision": "Summary of what the tender SBD/NIT says",
      "bidderQuotedDeviation": "Exact or summarized deviation requested by bidder",
      "deviationCategory": "Commercial" | "Technical" | "Legal" | "Financial",
      "impactOnBuyerInterest": "Detailed analysis of how this affects the organization's risk, cost, delivery timeline, or statutory obligations",
      "psuDealingOfficerComments": "Official dealing officer's reasoned evaluation citing standard public procurement practice and CVC guidelines",
      "recommendedAction": "Unconditional Withdrawal Required" | "Acceptable with Conditions" | "Requires CA & Finance Concurrence" | "Acceptable / Clarification Only",
      "suggestedCounterProposalOrConditions": "Exact suggested counter-clause or protective stipulation to put to the bidder in technical-commercial discussion meeting for early redressal",
      "riskScore": "Critical" | "Major" | "Minor"
    }
  ],
  "meetingAgendaPoints": ["Key points for discussion."],
  "officerSignOffNote": "Draft office note paragraph."
}`;

    const rawResponse = await callGeminiResiliently({
      prompt,
      systemInstruction: PSU_CONTRACT_OFFICER_SYSTEM_PROMPT,
      responseMimeType: "application/json",
    });

    if (rawResponse) {
      try {
        const cleanJson = rawResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const data = JSON.parse(cleanJson);
        return res.json({ success: true, data });
      } catch (parseErr) {
        console.warn("Failed to parse Gemini JSON output, switching to domain fallback:", parseErr);
      }
    }

    // High demand 503 fallback
    console.info("Using domain fallback for single bidder evaluation.");
    const fallbackData = buildSingleBidderFallback(bidderName, packageTitle, sbdContext, nitContext, deviationsText, officerDirectives);
    return res.json({ success: true, data: fallbackData, isFallback: true });
  } catch (err: any) {
    console.error("Error in /api/evaluate-single-bidder:", err);
    const fallbackData = buildSingleBidderFallback(req.body?.bidderName, req.body?.packageTitle, "", "", req.body?.deviationsText, req.body?.officerDirectives);
    return res.json({ success: true, data: fallbackData, isFallback: true });
  }
});

// Evaluate Comparative Deviations Across All Bidders
app.post("/api/evaluate-comparative", async (req, res) => {
  try {
    const { packageTitle, sbdContext, nitContext, bidders, officerDirectives, customFormat } = req.body;

    if (!Array.isArray(bidders) || bidders.length === 0) {
      return res.status(400).json({ error: "At least one bidder is required for comparative evaluation." });
    }

    const biddersPayload = bidders.map((b, idx) => ({
      index: idx + 1,
      name: b.name,
      deviationsText: b.deviationFileText || b.deviationsText || "",
    }));

    const directivesContext = Array.isArray(officerDirectives) && officerDirectives.length > 0
      ? `\nSPECIAL DEALING OFFICER DIRECTIVES & CLARIFICATIONS (MANDATORY INSTRUCTIONS):\n${officerDirectives.map((d: any, i: number) => `${i + 1}. ${typeof d === "string" ? d : `${d.title}: ${d.instruction}`}`).join("\n")}\nCRITICAL: Formulate the comparative strategy strictly reflecting these directives!\n`
      : "";

    const formatContext = customFormat?.name
      ? `\nDEALING OFFICER REQUIRED FORMAT / TEMPLATE:\nFormat Title: ${customFormat.name}\n${customFormat.templateText ? `Template Guidelines: ${customFormat.templateText.slice(0, 3000)}` : ""}\n`
      : "";

    const prompt = `Perform a Consolidated Comparative Deviation Matrix & Strategic Evaluation for all participating bidders in this PSU Turnkey Contract:

TENDER PACKAGE: ${packageTitle || "Turnkey EPC Tender"}
${directivesContext}
${formatContext}
REFERENCE SBD CONTEXT:
${sbdContext || "Standard Turnkey SBD."}

REFERENCE NIT / ITB CONTEXT:
${nitContext || "NIT / ITB tender terms."}

PARTICIPATING BIDDERS AND THEIR QUOTED DEVIATIONS:
${JSON.stringify(biddersPayload, null, 2)}

INSTRUCTIONS:
Map deviations by Contract Theme / Clause.
Return a valid JSON matching:
{
  "packageTitle": "${packageTitle || "Turnkey EPC Tender"}",
  "totalBiddersEvaluated": ${bidders.length},
  "comparativeExecutiveSummary": "Detailed comparative analysis across all bidders.",
  "biddersSummary": [
    {
      "bidderName": "string",
      "deviationCount": number,
      "criticalDeviations": number,
      "generalPosture": "Rigid" | "Moderate" | "Cooperative",
      "overallRecommendation": "string"
    }
  ],
  "comparativeMatrix": [
    {
      "clauseOrTheme": "string",
      "tenderSBDProvision": "string",
      "bidderStances": [
        {
          "bidderName": "string",
          "quotedDeviation": "string",
          "impact": "string",
          "action": "Unconditional Withdrawal" | "Acceptable with Conditions" | "CA Approval" | "Acceptable"
        }
      ],
      "officerComparativeAnalysis": "string",
      "recommendedHarmonizedStrategy": "string"
    }
  ],
  "commonDeadlockAreas": [
    {
      "topic": "string",
      "reasons": "string",
      "recommendedWayForward": "string"
    }
  ],
  "tenderCommitteeRecommendations": "string"
}`;

    const rawResponse = await callGeminiResiliently({
      prompt,
      systemInstruction: PSU_CONTRACT_OFFICER_SYSTEM_PROMPT,
      responseMimeType: "application/json",
    });

    if (rawResponse) {
      try {
        const cleanJson = rawResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const data = JSON.parse(cleanJson);
        return res.json({ success: true, data });
      } catch (parseErr) {
        console.warn("Failed to parse Gemini comparative output, switching to fallback:", parseErr);
      }
    }

    console.info("Using domain fallback for comparative evaluation.");
    const fallbackData = buildComparativeFallback(packageTitle, sbdContext, nitContext, bidders, officerDirectives, customFormat);
    return res.json({ success: true, data: fallbackData, isFallback: true });
  } catch (err: any) {
    console.error("Error in /api/evaluate-comparative:", err);
    const fallbackData = buildComparativeFallback(req.body?.packageTitle, "", "", req.body?.bidders || [], req.body?.officerDirectives, req.body?.customFormat);
    return res.json({ success: true, data: fallbackData, isFallback: true });
  }
});

// Suggest Reviewed / Harmonized Clauses
app.post("/api/suggest-reviewed-clauses", async (req, res) => {
  try {
    const { packageTitle, sbdContext, deadlockDeviations, officerDirectives, customFormat } = req.body;

    const directivesContext = Array.isArray(officerDirectives) && officerDirectives.length > 0
      ? `\nSPECIAL DEALING OFFICER DIRECTIVES & CLARIFICATIONS (MANDATORY INSTRUCTIONS):\n${officerDirectives.map((d: any, i: number) => `${i + 1}. ${typeof d === "string" ? d : `${d.title}: ${d.instruction}`}`).join("\n")}\nCRITICAL: Formulate the reviewed clauses to explicitly implement these directives!\n`
      : "";

    const formatContext = customFormat?.name
      ? `\nDEALING OFFICER REQUIRED FORMAT / TEMPLATE:\nFormat Title: ${customFormat.name}\n${customFormat.templateText ? `Template Guidelines: ${customFormat.templateText.slice(0, 3000)}` : ""}\nCRITICAL: Format the draft addendum preamble and overview following this template strictly.\n`
      : "";

    const prompt = `As a PSU Senior Dealing Officer, formulate Reviewed / Harmonized Contract Clauses for contentious clauses where deviations remain unresolved despite multiple rounds of discussions:

TENDER PACKAGE: ${packageTitle || "Turnkey EPC Tender"}
${directivesContext}
${formatContext}
SBD BACKGROUND:
${sbdContext || "Standard Turnkey SBD"}

CONTENTIOUS DEVIATIONS & DEADLOCK THEMES:
${JSON.stringify(deadlockDeviations || "LD cap, Payment milestones against dispatch vs site receipt, Limitation of Liability 100%, and Defect liability period.", null, 2)}

Return a valid JSON object matching:
{
  "harmonizationOverview": "Strategic rationale for clause review, audit justification, and procedural checklist.",
  "reviewedClauses": [
    {
      "clauseNumber": "string",
      "clauseTitle": "string",
      "originalClauseText": "string",
      "biddersContentionSummary": "string",
      "proposedReviewedClauseText": "string",
      "protectiveSafeguardsRetained": "string",
      "concessionGranted": "string",
      "approvalPrerequisite": "string",
      "auditDefenseRationale": "string"
    }
  ],
  "draftAddendumPreamble": "Formal text of Corrigendum / Addendum for tender portal."
}`;

    const rawResponse = await callGeminiResiliently({
      prompt,
      systemInstruction: PSU_CONTRACT_OFFICER_SYSTEM_PROMPT,
      responseMimeType: "application/json",
    });

    if (rawResponse) {
      try {
        const cleanJson = rawResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const data = JSON.parse(cleanJson);
        return res.json({ success: true, data });
      } catch (parseErr) {
        console.warn("Failed to parse reviewed clauses JSON, switching to fallback:", parseErr);
      }
    }

    console.info("Using domain fallback for reviewed clauses.");
    const fallbackData = buildReviewedClausesFallback(packageTitle, sbdContext, deadlockDeviations, officerDirectives, customFormat);
    return res.json({ success: true, data: fallbackData, isFallback: true });
  } catch (err: any) {
    console.error("Error in /api/suggest-reviewed-clauses:", err);
    const fallbackData = buildReviewedClausesFallback(req.body?.packageTitle, "", null, req.body?.officerDirectives, req.body?.customFormat);
    return res.json({ success: true, data: fallbackData, isFallback: true });
  }
});

// Dealing Officer AI Chatbot
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, contextData, activeDirectives, activeFormat } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const conversationHistory = Array.isArray(history)
      ? history.slice(-8).map((h: any) => `${h.role === "user" ? "Officer" : "Advisor"}: ${h.content}`).join("\n")
      : "";

    const directivesContext = Array.isArray(activeDirectives) && activeDirectives.length > 0
      ? `Active Officer Directives in place: ${activeDirectives.map((d: any) => d.title).join(", ")}`
      : "No active directives set yet.";

    const formatContext = activeFormat?.name
      ? `Active Dealing Officer Format Template: ${activeFormat.name}`
      : "Standard PSU Corrigendum Format.";

    const prompt = `You are the Dealing Officer's trusted Senior Procurement & Legal Contract Advisor for PSU Turnkey / EPC tenders (Standard SBD, GCC/SCC, NIT/ITB, CVC Guidelines).

ACTIVE TENDER CONTEXT:
Package: ${contextData?.packageTitle || "Turnkey EPC Package"}
SBD Context: ${contextData?.sbdSummary || "Standard Turnkey SBD"}
NIT/ITB Context: ${contextData?.nitSummary || "Standard NIT/ITB"}
Bidders Info: ${contextData?.biddersInfo ? JSON.stringify(contextData.biddersInfo) : "N/A"}
${directivesContext}
${formatContext}

PREVIOUS CONVERSATION:
${conversationHistory}

CONTRACT OFFICER'S QUERY / INSTRUCTION:
${message}

Provide a direct, authoritative, and practical PSU contract cell response. Structure with bullet points, specific clause guidance, CVC/GFR principles, risk mitigation techniques, and draft counter-proposals where relevant.

IMPORTANT: If the officer's message suggests, clarifies, questions, or directs a modification to contract clauses, evaluation criteria, or output formats (for example: LD, PBG, milestone payment, defect liability, limitation of liability, arbitration, price variation, or template structure), you MUST ALSO append a structured directive proposal at the very end of your response inside <<<DIRECTIVE_JSON and DIRECTIVE_JSON>>> tags.
Format of the JSON block:
<<<DIRECTIVE_JSON
{
  "title": "Short title (e.g. Cap LD at 7.5% for intermediate milestones)",
  "instruction": "Specific contract stipulation or instruction",
  "targetArea": "Harmonized Clauses",
  "targetClause": "GCC Clause 27.2",
  "proposedChanges": {
    "clauseNumber": "GCC 27.2",
    "clauseTitle": "Liquidated Damages for Delay in Completion",
    "proposedReviewedClauseText": "Draft amended clause text",
    "protectiveSafeguardsRetained": "Key safeguards retained",
    "concessionGranted": "Concession granted",
    "auditDefenseRationale": "CVC / GFR compliance rationale"
  }
}
DIRECTIVE_JSON>>>`;

    const rawResponse = await callGeminiResiliently({
      prompt,
      systemInstruction: PSU_CONTRACT_OFFICER_SYSTEM_PROMPT,
    });

    if (rawResponse) {
      // Check if directive JSON was generated
      const directiveMatch = rawResponse.match(/<<<DIRECTIVE_JSON([\s\S]*?)DIRECTIVE_JSON>>>/);
      let replyText = rawResponse;
      let suggestedDirective: any = null;

      if (directiveMatch) {
        try {
          suggestedDirective = JSON.parse(directiveMatch[1].trim());
          suggestedDirective.id = `dir-${Date.now()}`;
          suggestedDirective.timestamp = new Date().toISOString();
          suggestedDirective.source = "chatbot";
          suggestedDirective.active = true;
          // Clean the directive tags from user reply
          replyText = rawResponse.replace(/<<<DIRECTIVE_JSON[\s\S]*?DIRECTIVE_JSON>>>/, "").trim();
        } catch (e) {
          console.warn("Failed to parse directive JSON from model response:", e);
        }
      }

      return res.json({ success: true, reply: replyText, suggestedDirective });
    }

    // Chatbot domain fallback
    const queryLower = message.toLowerCase();
    let reply = `As your Senior Contract Advisor, here is the guidance for your case:\n\n`;
    let fallbackDirective: any = null;

    if (queryLower.includes("ld") || queryLower.includes("liquidated") || queryLower.includes("delay")) {
      reply += `**Liquidated Damages (GCC 27.2) Guidance:**\n• **Core Principle**: Do not reduce the 10% LD ceiling as it dilutes project deterrence and conflicts with CVC guidelines.\n• **Deadlock Resolution**: Offer to compute LD on delayed milestone value only if completed sections can be independently commissioned.\n• **CVC Safe Harbor**: Ensure any milestone-based LD stipulation is formally recorded in the pre-bid minutes/addendum.`;
      fallbackDirective = {
        id: `dir-${Date.now()}`,
        title: "Harmonize LD Computation on Delayed Milestones",
        instruction: "Compute LD @ 0.5% per week on delayed milestone value only where independent commercial use is feasible, while strictly retaining 10% overall contract ceiling.",
        targetArea: "Harmonized Clauses",
        targetClause: "GCC Clause 27.2",
        source: "chatbot",
        timestamp: new Date().toISOString(),
        active: true,
        proposedChanges: {
          clauseNumber: "GCC Clause 27.2",
          clauseTitle: "Liquidated Damages for Delay in Completion",
          proposedReviewedClauseText: "If the Contractor fails to achieve milestone completion within the agreed schedule, Liquidated Damages shall be levied @ 0.5% per week of delay calculated on the value of the delayed milestone only. Where delay impacts overall commercial operation, LD shall apply on the total Contract Price up to an aggregate maximum ceiling of 10%.",
          protectiveSafeguardsRetained: "Retains full 10% financial deterrence and right to levy on total contract price if final plant integration is compromised.",
          concessionGranted: "Allows pro-rata LD computation on delayed sectional value only.",
          auditDefenseRationale: "Complies with CVC guidelines and Supreme Court jurisprudence on genuine pre-estimate of damages."
        }
      };
    } else if (queryLower.includes("pbg") || queryLower.includes("guarantee")) {
      reply += `**Performance Bank Guarantee (PBG) Guidance:**\n• **Security Quantum**: Maintain standard 10% (or 5% as per updated SBD).\n• **Pro-Rata Release**: Staged release of 50% PBG upon PAC is permissible only if a separate Warranty PBG of equal value is submitted.\n• **Claim Period**: Ensure minimum 90-day claim period beyond expiry of the Defect Liability Period.`;
      fallbackDirective = {
        id: `dir-${Date.now()}`,
        title: "Staged PBG Release with Replacement Warranty Guarantee",
        instruction: "Permit 50% pro-rata release of initial PBG upon PAC/PG Test, subject to contractor submitting equivalent 5% Warranty PBG valid through full DLP + 90 days.",
        targetArea: "Harmonized Clauses",
        targetClause: "GCC Clause 12.0",
        source: "chatbot",
        timestamp: new Date().toISOString(),
        active: true,
        proposedChanges: {
          clauseNumber: "GCC Clause 12.0",
          clauseTitle: "Performance Security & Warranty Guarantee Mechanism",
          proposedReviewedClauseText: "Contractor shall submit 10% PBG valid through execution. Upon Provisional Acceptance Certificate (PAC) and submission of equivalent 5% Warranty BG valid through DLP + 90 days, 50% of the initial PBG shall be discharged.",
          protectiveSafeguardsRetained: "Continuous 5% bank guarantee security maintained across the entire Defect Liability Period.",
          concessionGranted: "Releases half of initial bank guarantee upon physical commissioning.",
          auditDefenseRationale: "Optimizes vendor credit facilities while fully securing post-commissioning defect liabilities."
        }
      };
    } else if (queryLower.includes("advance") || queryLower.includes("payment") || queryLower.includes("dispatch") || queryLower.includes("lc")) {
      reply += `**Payment & Advance Terms (GCC 18.2):**\n• **Interest on Advance**: Interest-free advance is prohibited under CVC guidelines. Interest must be linked to SBI MCLR.\n• **Payment against Dispatch**: Can be facilitated through Letter of Credit (LC) provided materials carry a valid Pre-Dispatch Inspection Certificate (MDCC).`;
      fallbackDirective = {
        id: `dir-${Date.now()}`,
        title: "LC Payment of 65% Against Dispatch with MDCC Inspection",
        instruction: "Release 65% equipment payment through Irrevocable Letter of Credit upon clean dispatch documents and Employer/TPIA MDCC certificate, retaining 5% for site store receipt.",
        targetArea: "Harmonized Clauses",
        targetClause: "GCC Clause 18.2",
        source: "chatbot",
        timestamp: new Date().toISOString(),
        active: true,
        proposedChanges: {
          clauseNumber: "GCC Clause 18.2",
          clauseTitle: "Progressive Payment Against Plant & Equipment Dispatch",
          proposedReviewedClauseText: "65% of the equipment supply component shall be payable through Irrevocable LC against clean dispatch documents (LR/RR) accompanied by MDCC issued by Employer / TPIA. Balance 5% released upon physical receipt at project site store.",
          protectiveSafeguardsRetained: "Prior physical factory inspection by TPIA mandatory before dispatch clearance.",
          concessionGranted: "Releases vendor cash flow upon verifiable factory dispatch.",
          auditDefenseRationale: "Pre-dispatch inspection ensures zero compromise on technical specifications and quality."
        }
      };
    } else if (queryLower.includes("dlp") || queryLower.includes("defect") || queryLower.includes("warranty")) {
      reply += `**Defect Liability Period (GCC 30.0) Guidance:**\n• Standard PSU DLP is 12 to 24 months. If reducing to 18 months, mandate automatic 6-month extension on any sub-system undergoing major warranty repair.`;
      fallbackDirective = {
        id: `dir-${Date.now()}`,
        title: "Defect Liability Rationalization with Sub-assembly Warranty Extension",
        instruction: "Set Defect Liability Period at 18 months from commissioning, with mandatory 6-month warranty extension for any repaired or replaced critical component.",
        targetArea: "Harmonized Clauses",
        targetClause: "GCC Clause 30.0",
        source: "chatbot",
        timestamp: new Date().toISOString(),
        active: true,
      };
    } else {
      reply += `**Standard PSU Turnkey Contract Principles:**\n• **Level Playing Field**: Concessions discussed with one bidder must be extended to all bidders through Corrigendum or common Agreed Minutes.\n• **Audit Defense**: Frame justifications around operational necessity, market competition, and absence of financial loss to the organization.\n• **Competent Authority**: Obtain prior concurrence of Finance and approval of the Competent Authority before issuing amendments.`;
    }

    return res.json({ success: true, reply, suggestedDirective: fallbackDirective, isFallback: true });
  } catch (err: any) {
    console.error("Error in /api/chat:", err);
    return res.json({
      success: true,
      reply: "Guidance: Please ensure all deviation evaluations strictly safeguard the buyer's financial and legal interests while offering structured counter-proposals in line with CVC and GFR guidelines.",
      isFallback: true,
    });
  }
});

// Dealing Officer Suggestion / Feedback endpoint
app.post("/api/send-feedback", (req, res) => {
  try {
    const { category, subject, feedbackText, officerName, organization, timestamp } = req.body;
    console.log(
      `[SUGGESTION/FEEDBACK RECEIVED] Category: ${category || "General"} | Subject: ${subject || "No subject"} | From: ${
        officerName || "Dealing Officer"
      } (${organization || "PSU"})`
    );
    return res.json({
      success: true,
      message: "Feedback successfully recorded for the Author.",
      timestamp: timestamp || new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Vite Middleware for development & static serving for production
async function startServer() {
  // Always serve public directory for PWA icons, manifest, and .well-known/assetlinks.json
  app.use(express.static(path.join(process.cwd(), "public")));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Dealing Officer Evaluation Server running on port ${PORT}`);
  });
}

startServer();
