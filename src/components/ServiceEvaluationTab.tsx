import React, { useState } from "react";
import {
  FileText,
  Upload,
  Layers,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Search,
  BookOpen,
  ArrowRight,
  Eye,
  FileCheck2,
  Download,
  AlertOctagon,
  HelpCircle,
  RefreshCw,
  Clock,
  Sparkles,
  Lock,
  Globe,
  ExternalLink,
  Plus,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import {
  ServiceCriteriaRequirement,
  BidderServiceSubmission,
  InternalGuidelines,
  BidderSubmittedDocument,
  DocumentTamperingAlert,
  BlacklistedEntity,
} from "../types/serviceEvaluation";
import { TenderMetadata } from "../types";
import { parseUploadedFile } from "../utils/fileParser";
import { evaluateBidderEligibility } from "../utils/serviceEvaluationEngine";
import { triggerFileDownload } from "../utils/exportUtils";
import { DEFAULT_BLACKLISTED_ENTITIES, checkBidderBanningStatus } from "../utils/banningDatabase";

interface ServiceEvaluationTabProps {
  metadata: TenderMetadata;
  criteria: ServiceCriteriaRequirement;
  setCriteria: React.Dispatch<React.SetStateAction<ServiceCriteriaRequirement>>;
  guidelines: InternalGuidelines;
  setGuidelines: React.Dispatch<React.SetStateAction<InternalGuidelines>>;
  bidders: BidderServiceSubmission[];
  setBidders: React.Dispatch<React.SetStateAction<BidderServiceSubmission[]>>;
  evaluationStage: "ROUND_1_INITIAL" | "SHORTFALL_ISSUED" | "ROUND_2_SHORTFALL_EVAL" | "FINAL_ACCEPTED";
  setEvaluationStage: React.Dispatch<React.SetStateAction<"ROUND_1_INITIAL" | "SHORTFALL_ISSUED" | "ROUND_2_SHORTFALL_EVAL" | "FINAL_ACCEPTED">>;
  onLogAudit?: (
    action: string,
    category: any,
    summary: string,
    details?: string,
    entityAffected?: string,
    complianceTag?: string
  ) => void;
}

export const ServiceEvaluationTab: React.FC<ServiceEvaluationTabProps> = ({
  metadata,
  criteria,
  setCriteria,
  guidelines,
  setGuidelines,
  bidders,
  setBidders,
  evaluationStage,
  setEvaluationStage,
  onLogAudit,
}) => {
  const [selectedBidderId, setSelectedBidderId] = useState<string>(bidders[0]?.bidderId || "");
  const [viewMode, setViewMode] = useState<"consolidated" | "individual" | "letters" | "tampering" | "banning">("consolidated");
  const [letterTypeToView, setLetterTypeToView] = useState<"shortfall" | "rejection">("shortfall");
  const [isProcessingOcr, setIsProcessingOcr] = useState<boolean>(false);
  const [guidelinesModalOpen, setGuidelinesModalOpen] = useState<boolean>(false);
  const [showFinalPrompt, setShowFinalPrompt] = useState<boolean>(false);

  // Hypothetical internal & external banning database
  const [blacklistDatabase, setBlacklistDatabase] = useState<BlacklistedEntity[]>(DEFAULT_BLACKLISTED_ENTITIES);
  const [isScanningBanning, setIsScanningBanning] = useState<boolean>(false);
  const [lastBanningScanTime, setLastBanningScanTime] = useState<string>("26-Sep-2026 10:00 AM");
  
  // Custom blacklist entry form state
  const [newEntityName, setNewEntityName] = useState<string>("");
  const [newSourcePortal, setNewSourcePortal] = useState<"Internal Blacklist" | "GeM Incident Management" | "CPPP Central Debarment" | "CVC Banned Register" | "Custom URL / Portal">("Internal Blacklist");
  const [newRefOrder, setNewRefOrder] = useState<string>("");
  const [newReason, setNewReason] = useState<string>("");
  const [newPortalUrl, setNewPortalUrl] = useState<string>("https://");

  const activeBidder = bidders.find((b) => b.bidderId === selectedBidderId) || bidders[0];

  // Perform Mock Banning Status Check across internal & custom portals
  const executeBanningCheck = () => {
    setIsScanningBanning(true);
    setTimeout(() => {
      const updated = bidders.map((b) =>
        evaluateBidderEligibility(b, criteria, metadata.packageTitle, metadata.tenderRefNo, evaluationStage === "ROUND_2_SHORTFALL_EVAL", blacklistDatabase)
      );
      setBidders(updated);
      setIsScanningBanning(false);
      const nowStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + ", " + new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      setLastBanningScanTime(nowStr);

      const flaggedCount = updated.filter((b) => b.banningStatusAlert.isAlertTriggered).length;
      onLogAudit?.(
        "Banning & Blacklist Verification Executed",
        "Evaluation",
        `Dealing officer ran mock Banning check across CPPP, GeM Incident Management, CVC, and Internal database. Flagged: ${flaggedCount} bidder(s).`,
        `Checked against ${blacklistDatabase.length} debarred entities and configured portal endpoints.`,
        "All Bidders",
        "GFR 2017 Rule 151"
      );
    }, 400);
  };

  // Add custom entity to blacklist database
  const handleAddBlacklistEntity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntityName.trim()) return;

    const newEntity: BlacklistedEntity = {
      id: `ban-${Date.now()}`,
      entityName: newEntityName.trim(),
      sourcePortal: newSourcePortal,
      referenceOrderNo: newRefOrder.trim() || `ORDER-${Date.now().toString().slice(-4)}`,
      orderDate: new Date().toLocaleDateString("en-IN"),
      banPeriodYears: 3,
      reasonForBanning: newReason.trim() || "Debarred for non-compliance with tender conditions.",
      portalUrl: newPortalUrl.trim() || "https://gem.gov.in",
    };

    const updatedList = [newEntity, ...blacklistDatabase];
    setBlacklistDatabase(updatedList);
    setNewEntityName("");
    setNewRefOrder("");
    setNewReason("");
    setNewPortalUrl("https://");

    // Automatically re-evaluate bidders against updated database
    const updatedBidders = bidders.map((b) =>
      evaluateBidderEligibility(b, criteria, metadata.packageTitle, metadata.tenderRefNo, evaluationStage === "ROUND_2_SHORTFALL_EVAL", updatedList)
    );
    setBidders(updatedBidders);

    onLogAudit?.(
      "Added Entity to Debarred Database",
      "Evaluation",
      `Dealing officer added '${newEntity.entityName}' (${newEntity.sourcePortal}) to internal debarment blacklist.`,
      `Ref: ${newEntity.referenceOrderNo}, Reason: ${newEntity.reasonForBanning}`,
      newEntity.entityName,
      "Blacklist Management"
    );
  };

  const handleRemoveBlacklistEntity = (id: string, name: string) => {
    const updatedList = blacklistDatabase.filter((e) => e.id !== id);
    setBlacklistDatabase(updatedList);
    const updatedBidders = bidders.map((b) =>
      evaluateBidderEligibility(b, criteria, metadata.packageTitle, metadata.tenderRefNo, evaluationStage === "ROUND_2_SHORTFALL_EVAL", updatedList)
    );
    setBidders(updatedBidders);
    onLogAudit?.(
      "Removed Entity from Debarred Database",
      "Evaluation",
      `Dealing officer removed '${name}' from debarred screening list.`,
      undefined,
      name,
      "Blacklist Management"
    );
  };

  // Recalculate evaluation for all bidders
  const runReEvaluation = (isRound2: boolean = evaluationStage === "ROUND_2_SHORTFALL_EVAL") => {
    const updated = bidders.map((b) =>
      evaluateBidderEligibility(b, criteria, metadata.packageTitle, metadata.tenderRefNo, isRound2, blacklistDatabase)
    );
    setBidders(updated);
    onLogAudit?.(
      "Re-evaluated Service Bidders",
      "Evaluation",
      `Evaluated ${updated.length} service bidders against criteria (Round: ${isRound2 ? "2 - Shortfall" : "1 - Initial"})`,
      undefined,
      "Service Eligibility Scrutiny",
      "GFR 2017 Rule 173"
    );
  };

  // Upload new document for a bidder
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    bidderId: string,
    category: "turnover" | "experience" | "shortfall_reply"
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingOcr(true);
    const newDocs: BidderSubmittedDocument[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const parsed = await parseUploadedFile(file);
        newDocs.push({
          id: `doc-${Date.now()}-${i}`,
          name: file.name,
          category,
          fileType: parsed.fileType,
          extractedText: parsed.text,
          charCount: parsed.charCount,
          uploadedAt: new Date().toISOString().split("T")[0],
          isOcrScanned: parsed.isOcrScanned,
          ocrConfidence: parsed.isOcrScanned ? 90 : undefined,
        });
      } catch (err) {
        console.error("File upload error:", err);
      }
    }

    setBidders((prev) =>
      prev.map((b) => {
        if (b.bidderId !== bidderId) return b;
        const updated = { ...b };
        if (category === "turnover") {
          updated.turnoverDocuments = [...updated.turnoverDocuments, ...newDocs];
        } else if (category === "experience") {
          updated.experienceDocuments = [...updated.experienceDocuments, ...newDocs];
        } else {
          updated.shortfallReplyDocuments = [...(updated.shortfallReplyDocuments || []), ...newDocs];
        }
        return evaluateBidderEligibility(
          updated,
          criteria,
          metadata.packageTitle,
          metadata.tenderRefNo,
          evaluationStage === "ROUND_2_SHORTFALL_EVAL",
          blacklistDatabase
        );
      })
    );

    setIsProcessingOcr(false);
    onLogAudit?.(
      "Uploaded Eligibility Document",
      "Bidders & Deviations",
      `Uploaded ${newDocs.length} ${category} document(s) for bidder: ${activeBidder.bidderName}`,
      undefined,
      `Bidder: ${activeBidder.bidderName}`,
      "Document Scrutiny"
    );
  };

  // Export Consolidated Comparative Statement
  const exportConsolidatedReport = () => {
    let reportContent = `CONSOLIDATED INTERIM EVALUATION REPORT - SERVICE & O&M TENDER
Package: ${metadata.packageTitle || "Tender Package"}
Tender Ref No: ${metadata.tenderRefNo || "Ref No"}
Organization: ${metadata.organization || "PSU / Government Dept"}
Evaluation Stage: ${evaluationStage === "ROUND_2_SHORTFALL_EVAL" || evaluationStage === "FINAL_ACCEPTED" ? "Final Technical Evaluation" : "Interim Technical Evaluation (Round 1)"}
Date: ${new Date().toLocaleDateString("en-IN")}
--------------------------------------------------------------------------------

A. QUALIFYING CRITERIA SPECIFIED IN NIT:
1. Financial Turnover: Minimum Average Annual Turnover of Rs. ${criteria.minAverageAnnualTurnoverCr.toFixed(2)} Cr in last 3 financial years with valid CA UDIN.
2. Experience Criteria: Completed Similar Work (Threshold: Single work >= Rs. ${(criteria.singleWorkOrderValueCr || criteria.minAverageAnnualTurnoverCr * 0.8).toFixed(2)} Cr).
3. Similar Work Scope: ${criteria.similarWorkDefinition}

B. SUMMARY OF BIDDER SCRUTINY:
`;

    bidders.forEach((b, idx) => {
      reportContent += `
[${idx + 1}] BIDDER: ${b.bidderName}
    • Overall Status: ${b.overallStatus}
    • Banning & Debarment Status: ${b.banningStatusAlert.isAlertTriggered ? `FLAGGED / UNDER SCRUTINY (${b.banningStatusAlert.reason})` : "CLEAN (Verified against CPPP/GeM/CVC/Internal registers)"}
    • Financial Turnover Status: ${b.financialEvaluation.status} (Average: Rs. ${b.financialEvaluation.averageTurnoverCr} Cr)
      - Grounds: ${b.financialEvaluation.reasons.join(" | ")}
    • Experience Criteria Status: ${b.experienceEvaluation.status}
      - Grounds: ${b.experienceEvaluation.reasons.join(" | ")}
    • Recommendation: ${b.summaryReason}
    • Action Taken: ${b.shortfallLetter ? "Shortfall / Clarification Letter Generated" : b.rejectionLetter ? "Rejection Intimation Letter Generated" : "Qualified for Price Bid Opening"}
--------------------------------------------------------------------------------`;
    });

    const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" });
    triggerFileDownload(blob, `Tender_Service_Evaluation_Report_${Date.now()}.txt`);
  };

  // Check for any tampering across all bidders
  const totalTamperingAlerts = bidders.reduce((acc, b) => {
    const docs = [...b.turnoverDocuments, ...b.experienceDocuments, ...(b.shortfallReplyDocuments || [])];
    return acc + docs.reduce((dAcc, d) => dAcc + (d.tamperingAlerts?.length || 0), 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner: Service Eligibility Evaluation Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Service &amp; O&amp;M Eligibility Engine
              </span>
              <span className="text-xs text-slate-400">
                {evaluationStage === "ROUND_2_SHORTFALL_EVAL"
                  ? "Round 2: Shortfall & Clarification Scrutiny"
                  : evaluationStage === "FINAL_ACCEPTED"
                  ? "Final Evaluation Completed (Locked)"
                  : "Round 1: Initial Techno-Commercial Scrutiny"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {metadata.packageTitle || "Service Contract Evaluation"}
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl">
              Automated evaluation of <strong>Financial/Turnover Criteria</strong> and <strong>Experience/Technical Criteria</strong> as per NIT. Generates formal <strong>Shortfall/Clarification Letters</strong> or <strong>Rejection Intimations</strong> under Open Tender (OT) &amp; GFR 2017 guidelines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setGuidelinesModalOpen(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-600 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>Internal Guidelines</span>
            </button>

            <button
              onClick={exportConsolidatedReport}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {evaluationStage === "FINAL_ACCEPTED" ? "Export Final Report" : "Interim Evaluation Report"}
              </span>
            </button>

            {evaluationStage !== "FINAL_ACCEPTED" && (
              <button
                onClick={() => setShowFinalPrompt(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Submit Final Evaluation</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Alerts: Banning & Tampering summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setViewMode("banning")}
            className="flex items-center gap-2.5 bg-slate-950/60 hover:bg-slate-900/90 px-3.5 py-2 rounded-xl border border-slate-800 text-left transition-colors cursor-pointer"
            title="Click to open Banning & Debarment Verification Console"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="text-slate-400 block text-[10px]">Banning Status Checks (Click to inspect)</span>
              <span className="font-semibold text-amber-300">
                {bidders.filter((b) => b.banningStatusAlert.isAlertTriggered).length > 0
                  ? `${bidders.filter((b) => b.banningStatusAlert.isAlertTriggered).length} Bidder(s) Under Scrutiny`
                  : "All Bidders Verified Clean"}
              </span>
            </div>
          </button>

          <div className="flex items-center gap-2.5 bg-slate-950/60 px-3.5 py-2 rounded-xl border border-slate-800">
            <Search className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="text-xs">
              <span className="text-slate-400 block text-[10px]">Document Authenticity Check</span>
              <span className="font-semibold text-cyan-300">
                {totalTamperingAlerts > 0 ? `${totalTamperingAlerts} Internal Alert(s) Noted` : "No Font/Artifact Anomalies"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-slate-950/60 px-3.5 py-2 rounded-xl border border-slate-800">
            <Clock className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="text-xs">
              <span className="text-slate-400 block text-[10px]">Shortfall / Rejection Notices</span>
              <span className="font-semibold text-purple-300">
                {bidders.filter((b) => b.overallStatus === "SHORTFALL_REQUIRED").length} Shortfall |{" "}
                {bidders.filter((b) => b.overallStatus === "REJECTED_DISQUALIFIED").length} Rejected
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setViewMode("consolidated")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === "consolidated"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Consolidated Comparative Statement</span>
          </button>

          <button
            onClick={() => setViewMode("individual")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === "individual"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Individual Bidder Dossier</span>
          </button>

          <button
            onClick={() => setViewMode("letters")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === "letters"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Formal Letters (Shortfall / Rejection)</span>
          </button>

          <button
            onClick={() => setViewMode("tampering")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === "tampering"
                ? "bg-white text-rose-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
            <span>Forgery Alerts ({totalTamperingAlerts})</span>
          </button>

          <button
            onClick={() => setViewMode("banning")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === "banning"
                ? "bg-white text-amber-800 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>
              Banning &amp; Debarment Check (
              {bidders.filter((b) => b.banningStatusAlert.isAlertTriggered).length > 0 ? (
                <span className="text-rose-600 font-bold">
                  {bidders.filter((b) => b.banningStatusAlert.isAlertTriggered).length} Alert
                </span>
              ) : (
                <span className="text-emerald-600 font-medium">Clean</span>
              )}
              )
            </span>
          </button>
        </div>

        {/* Evaluation Stage Badge */}
        <div className="flex items-center gap-2">
          {evaluationStage === "ROUND_1_INITIAL" && (
            <button
              onClick={() => {
                setEvaluationStage("SHORTFALL_ISSUED");
                onLogAudit?.(
                  "Advanced Stage to Shortfall Issued",
                  "Evaluation",
                  "Dealing officer issued shortfall/clarification letters to deficient bidders.",
                  undefined,
                  "Tender Stage",
                  "OT Workflow"
                );
              }}
              className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-xs font-medium hover:bg-purple-100 transition-colors cursor-pointer"
            >
              Mark Shortfall Letters Issued &rarr;
            </button>
          )}

          {evaluationStage === "SHORTFALL_ISSUED" && (
            <button
              onClick={() => {
                setEvaluationStage("ROUND_2_SHORTFALL_EVAL");
                runReEvaluation(true);
              }}
              className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-xs font-semibold hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              Start Round 2 (Shortfall Replies Scrutiny) &rarr;
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: CONSOLIDATED COMPARATIVE STATEMENT */}
      {viewMode === "consolidated" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>Comparative Statement of Eligibility Criteria</span>
                <span className="text-xs font-normal text-slate-500">
                  (Financial Turnover &amp; Technical Experience)
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluation conducted as per Qualifying Requirements in NIT and Open Tender Shortfall Circulars.
              </p>
            </div>
            <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">
              Total Bidders: {bidders.length}
            </span>
          </div>

          {/* Comparative Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border border-slate-200 rounded-lg">
              <thead className="bg-slate-100 text-slate-700 uppercase font-semibold">
                <tr>
                  <th className="p-3 border-b border-slate-200">Sl</th>
                  <th className="p-3 border-b border-slate-200">Bidder Name</th>
                  <th className="p-3 border-b border-slate-200">Financial Turnover (Min Rs. {criteria.minAverageAnnualTurnoverCr} Cr)</th>
                  <th className="p-3 border-b border-slate-200">Experience Criteria (Min Rs. {(criteria.singleWorkOrderValueCr || criteria.minAverageAnnualTurnoverCr * 0.8).toFixed(2)} Cr)</th>
                  <th className="p-3 border-b border-slate-200">Banning Status</th>
                  <th className="p-3 border-b border-slate-200">Overall Recommendation</th>
                  <th className="p-3 border-b border-slate-200">Action Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {bidders.map((b, idx) => (
                  <tr key={b.bidderId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900">
                      <div>{b.bidderName}</div>
                      <span className="text-[10px] font-normal text-slate-400">
                        {b.turnoverDocuments.length} Turnover Docs • {b.experienceDocuments.length} Exp Docs
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        {b.financialEvaluation.status === "QUALIFIED" ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            QUALIFIED (Rs. {b.financialEvaluation.averageTurnoverCr} Cr)
                          </span>
                        ) : b.financialEvaluation.status === "SHORTFALL" ? (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[11px]">
                            SHORTFALL (Rs. {b.financialEvaluation.averageTurnoverCr} Cr)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[11px]">
                            DISQUALIFIED (Rs. {b.financialEvaluation.averageTurnoverCr} Cr)
                          </span>
                        )}
                      </div>
                      <ul className="text-[11px] text-slate-600 list-disc pl-3 space-y-0.5">
                        {b.financialEvaluation.reasons.map((r, rIdx) => (
                          <li key={rIdx}>{r}</li>
                        ))}
                      </ul>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        {b.experienceEvaluation.status === "QUALIFIED" ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            QUALIFIED
                          </span>
                        ) : b.experienceEvaluation.status === "SHORTFALL" ? (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[11px]">
                            SHORTFALL
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[11px]">
                            REJECTED
                          </span>
                        )}
                      </div>
                      <ul className="text-[11px] text-slate-600 list-disc pl-3 space-y-0.5">
                        {b.experienceEvaluation.reasons.map((r, rIdx) => (
                          <li key={rIdx}>{r}</li>
                        ))}
                      </ul>
                    </td>

                    <td className="p-3">
                      {b.banningStatusAlert.isAlertTriggered ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBidderId(b.bidderId);
                            setViewMode("banning");
                          }}
                          className="px-2 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold flex items-center gap-1 text-[11px] cursor-pointer transition-colors text-left"
                          title="Click to inspect banning match in Debarment Console"
                        >
                          <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>SCRUTINY REQUIRED &rarr;</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBidderId(b.bidderId);
                            setViewMode("banning");
                          }}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium flex items-center gap-1 text-[11px] cursor-pointer transition-colors"
                          title="Click to view database verification details"
                        >
                          <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>CLEAN</span>
                        </button>
                      )}
                    </td>

                    <td className="p-3">
                      {b.overallStatus === "RESPONSIVE_QUALIFIED" ? (
                        <span className="font-bold text-emerald-700">Responsive / Qualified</span>
                      ) : b.overallStatus === "SHORTFALL_REQUIRED" ? (
                        <span className="font-bold text-amber-700">Issue Shortfall Letter</span>
                      ) : (
                        <span className="font-bold text-rose-700">Reject Offer</span>
                      )}
                      <p className="text-[11px] text-slate-500 mt-1">{b.summaryReason}</p>
                    </td>

                    <td className="p-3">
                      {b.shortfallLetter && (
                        <button
                          onClick={() => {
                            setSelectedBidderId(b.bidderId);
                            setLetterTypeToView("shortfall");
                            setViewMode("letters");
                          }}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-xs font-semibold cursor-pointer block text-center"
                        >
                          View Shortfall Notice &rarr;
                        </button>
                      )}
                      {b.rejectionLetter && (
                        <button
                          onClick={() => {
                            setSelectedBidderId(b.bidderId);
                            setLetterTypeToView("rejection");
                            setViewMode("letters");
                          }}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded text-xs font-semibold cursor-pointer block text-center"
                        >
                          View Rejection Notice &rarr;
                        </button>
                      )}
                      {b.overallStatus === "RESPONSIVE_QUALIFIED" && (
                        <span className="text-emerald-600 text-xs font-medium">Ready for Price Bid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: INDIVIDUAL BIDDER DOSSIER */}
      {viewMode === "individual" && (
        <div className="space-y-4">
          {/* Bidder Selector Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {bidders.map((b) => (
              <button
                key={b.bidderId}
                onClick={() => setSelectedBidderId(b.bidderId)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  b.bidderId === selectedBidderId
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>{b.bidderName}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    b.overallStatus === "RESPONSIVE_QUALIFIED"
                      ? "bg-emerald-400"
                      : b.overallStatus === "SHORTFALL_REQUIRED"
                      ? "bg-amber-400"
                      : "bg-rose-400"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Active Bidder Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Turnover Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>(i) Financial / Turnover Eligibility</span>
                </h4>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold ${
                    activeBidder.financialEvaluation.status === "QUALIFIED"
                      ? "bg-emerald-100 text-emerald-800"
                      : activeBidder.financialEvaluation.status === "SHORTFALL"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {activeBidder.financialEvaluation.status}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tendered Required Average Turnover:</span>
                  <span className="font-bold text-slate-800">Rs. {criteria.minAverageAnnualTurnoverCr.toFixed(2)} Cr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bidder Evaluated Average Turnover:</span>
                  <span className="font-bold text-blue-700">Rs. {activeBidder.financialEvaluation.averageTurnoverCr.toFixed(2)} Cr</span>
                </div>
              </div>

              {/* Year-by-year table */}
              <table className="w-full text-xs text-left border border-slate-200 rounded">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-2 border-b border-slate-200">Financial Year</th>
                    <th className="p-2 border-b border-slate-200">Turnover (Rs. Cr)</th>
                    <th className="p-2 border-b border-slate-200">CA Audited</th>
                    <th className="p-2 border-b border-slate-200">UDIN Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBidder.financialEvaluation.claimedTurnoverByYear.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-slate-100">
                      <td className="p-2 font-medium">{row.year}</td>
                      <td className="p-2 font-mono font-bold text-slate-800">{row.turnoverCr.toFixed(2)}</td>
                      <td className="p-2 text-emerald-600">Yes (Audited)</td>
                      <td className="p-2">
                        {row.caUdinPresent ? (
                          <span className="text-emerald-700 font-semibold">Valid UDIN</span>
                        ) : (
                          <span className="text-amber-700 font-bold">UDIN Missing</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Upload Turnover Document */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload Additional Turnover Doc (PDF / Image OCR / Balance Sheet):
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e, activeBidder.bidderId, "turnover")}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>

            {/* Experience Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>(ii) Technical &amp; Experience Eligibility</span>
                </h4>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold ${
                    activeBidder.experienceEvaluation.status === "QUALIFIED"
                      ? "bg-emerald-100 text-emerald-800"
                      : activeBidder.experienceEvaluation.status === "SHORTFALL"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {activeBidder.experienceEvaluation.status}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Single Work Order Value Threshold (80%):</span>
                  <span className="font-bold text-slate-800">
                    Rs. {(criteria.singleWorkOrderValueCr || criteria.minAverageAnnualTurnoverCr * 0.8).toFixed(2)} Cr
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  <strong>Similar Work Definition:</strong> {criteria.similarWorkDefinition}
                </p>
              </div>

              {/* Submitted Works List */}
              <div className="space-y-2">
                {activeBidder.experienceEvaluation.submittedWorks.map((work, wIdx) => (
                  <div key={wIdx} className="p-3 border border-slate-200 rounded-lg text-xs space-y-1 bg-white">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{work.workTitle}</span>
                      <span className="font-mono text-blue-700">Rs. {work.contractValueCr.toFixed(2)} Cr</span>
                    </div>
                    <div className="text-slate-600 flex justify-between text-[11px]">
                      <span>Client: {work.clientName}</span>
                      <span>Completion: {work.completionDate}</span>
                    </div>
                    <div className="flex items-center gap-3 pt-1 text-[11px]">
                      <span className={work.matchesSimilarWorkScope ? "text-emerald-700 font-semibold" : "text-rose-700 font-bold"}>
                        {work.matchesSimilarWorkScope ? "✓ Similar Scope" : "✗ Scope Mismatch"}
                      </span>
                      <span className={work.completionCertificateAttached ? "text-emerald-700 font-semibold" : "text-amber-700 font-bold"}>
                        {work.completionCertificateAttached ? "✓ Client Cert Attached" : "✗ Client Cert Missing"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Upload Experience Document */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload Additional Work Order / Completion Cert (PDF / Image OCR):
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e, activeBidder.bidderId, "experience")}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>
          </div>

          {/* Banning Status Alert Notification for active bidder */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              activeBidder.banningStatusAlert.isAlertTriggered
                ? "bg-rose-50 border-rose-300 text-rose-900"
                : "bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <ShieldAlert className={`w-5 h-5 mt-0.5 shrink-0 ${activeBidder.banningStatusAlert.isAlertTriggered ? "text-rose-600" : "text-slate-400"}`} />
            <div className="text-xs space-y-1">
              <div className="font-bold flex items-center gap-2">
                <span>Banning Status Alert Checklist</span>
                <span className="text-[11px] font-mono font-normal">
                  ({activeBidder.banningStatusAlert.banningCheckListClauseRef})
                </span>
              </div>
              <p>
                {activeBidder.banningStatusAlert.isAlertTriggered
                  ? activeBidder.banningStatusAlert.reason
                  : "Bidder entity is verified clean. No active banning, blacklisting, or debarment orders on record across CVC, GeM Incident management, or CPPP Central Debarment registers."}
              </p>
              {activeBidder.banningStatusAlert.sourceDatabase && (
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 pt-1">
                  <span>Source: <strong>{activeBidder.banningStatusAlert.sourceDatabase}</strong></span>
                  {activeBidder.banningStatusAlert.referenceOrderNo && (
                    <span>Ref Order: <strong className="font-mono">{activeBidder.banningStatusAlert.referenceOrderNo}</strong></span>
                  )}
                  {activeBidder.banningStatusAlert.portalUrl && (
                    <a
                      href={activeBidder.banningStatusAlert.portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <Globe className="w-3 h-3" />
                      <span>{activeBidder.banningStatusAlert.portalUrl}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              )}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                {activeBidder.banningStatusAlert.isAlertTriggered && (
                  <button
                    onClick={() => {
                      setBidders((prev) =>
                        prev.map((b) =>
                          b.bidderId === activeBidder.bidderId
                            ? {
                                ...b,
                                banningStatusAlert: {
                                  ...b.banningStatusAlert,
                                  isAlertTriggered: false,
                                  verifiedStatus: "OFFICER_CONFIRMED_CLEAN",
                                  verificationNotes: "Dealing Officer cross-checked CPPP Central Debarment portal on date; confirmed distinct entity.",
                                },
                              }
                            : b
                        )
                      );
                      onLogAudit?.(
                        "Cleared Banning Alert",
                        "Evaluation",
                        `Dealing officer cross-verified and confirmed clean status for ${activeBidder.bidderName}`,
                        undefined,
                        activeBidder.bidderName,
                        "CVC Non-Banning"
                      );
                    }}
                    className="px-2.5 py-1 bg-white border border-rose-300 rounded text-rose-800 font-semibold hover:bg-rose-100 cursor-pointer text-[11px]"
                  >
                    Confirm Officer Cross-Verification Clean
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewMode("banning")}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-800 font-medium text-[11px] cursor-pointer flex items-center gap-1"
                >
                  <Search className="w-3 h-3 text-slate-600" />
                  <span>Open Full Banning Console &rarr;</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: FORMAL LETTERS (SHORTFALL / REJECTION) */}
      {viewMode === "letters" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>Formal Administrative Communication Letters</span>
                <span className="text-xs font-normal text-slate-500">
                  (GFR 2017 &amp; Open Tender Guidelines)
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Letters are automatically formulated based on specific document deficiencies. No shortfall is generated if submitted documents fail the threshold completely.
              </p>
            </div>

            {/* Letter Selector */}
            <div className="flex items-center gap-2">
              <select
                value={selectedBidderId}
                onChange={(e) => setSelectedBidderId(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
              >
                {bidders.map((b) => (
                  <option key={b.bidderId} value={b.bidderId}>
                    {b.bidderName} ({b.overallStatus})
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  const letterContent =
                    activeBidder.shortfallLetter
                      ? `${activeBidder.shortfallLetter.letterRefNo}\nDate: ${activeBidder.shortfallLetter.letterDate}\nTo: ${activeBidder.shortfallLetter.targetBidderName}\n\nSubject: ${activeBidder.shortfallLetter.subject}\n\n${activeBidder.shortfallLetter.content}\n\nDEFICIENCIES:\n${activeBidder.shortfallLetter.specificDeficiencies.map((d, i) => `${i + 1}. [${d.head}] Referred Doc: ${d.referredDocument}\nObservation: ${d.observation}\nRequirement: ${d.shortfallRequirement}\n`).join("\n")}\nSubmission Deadline: ${activeBidder.shortfallLetter.submissionDeadlineDays} days\n\nDesignated Tender Dealing Officer`
                      : activeBidder.rejectionLetter
                      ? `${activeBidder.rejectionLetter.letterRefNo}\nDate: ${activeBidder.rejectionLetter.letterDate}\nTo: ${activeBidder.rejectionLetter.targetBidderName}\n\nSubject: ${activeBidder.rejectionLetter.subject}\n\n${activeBidder.rejectionLetter.content}\n\nGROUNDS FOR REJECTION:\n${activeBidder.rejectionLetter.formalGrounds.map((g, i) => `${i + 1}. ${g}`).join("\n")}\n\nReferred Documents: ${activeBidder.rejectionLetter.referredDocuments.join(", ")}\nAppellate Authority: ${activeBidder.rejectionLetter.appellateAuthorityMention}\n\nDesignated Tender Dealing Officer`
                      : "Bidder is fully qualified. No formal shortfall or rejection letter required.";

                  const blob = new Blob([letterContent], { type: "text/plain;charset=utf-8" });
                  triggerFileDownload(blob, `Tender_Letter_${activeBidder.bidderName.replace(/\s+/g, "_")}.txt`);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Letter (.txt)</span>
              </button>
            </div>
          </div>

          {/* Letter Preview Display */}
          {activeBidder.shortfallLetter ? (
            <div className="bg-slate-50 border border-amber-200 rounded-xl p-6 font-mono text-xs text-slate-800 space-y-4">
              <div className="border-b border-amber-200 pb-3 flex justify-between text-slate-600 font-sans text-xs">
                <div>
                  <strong>Ref:</strong> {activeBidder.shortfallLetter.letterRefNo}
                </div>
                <div>
                  <strong>Date:</strong> {activeBidder.shortfallLetter.letterDate}
                </div>
              </div>

              <div>
                <strong>TO:</strong>
                <div>M/s {activeBidder.shortfallLetter.targetBidderName}</div>
                <div className="text-slate-500 text-[11px]">(Participating Bidder in Tender: {metadata.tenderRefNo || "Ref No"})</div>
              </div>

              <div className="font-bold text-amber-900 font-sans text-sm">
                SUBJECT: {activeBidder.shortfallLetter.subject}
              </div>

              <p className="whitespace-pre-line leading-relaxed font-sans text-slate-700">
                {activeBidder.shortfallLetter.content}
              </p>

              {/* Deficiencies Table */}
              <div className="border border-amber-300 rounded-lg overflow-hidden font-sans">
                <table className="w-full text-xs text-left">
                  <thead className="bg-amber-100/70 text-amber-900 font-semibold">
                    <tr>
                      <th className="p-2.5">Sl</th>
                      <th className="p-2.5">Eligibility Head</th>
                      <th className="p-2.5">Referred Document</th>
                      <th className="p-2.5">Observation / Discrepancy</th>
                      <th className="p-2.5">Shortfall Requirement Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-200 bg-white">
                    {activeBidder.shortfallLetter.specificDeficiencies.map((d, dIdx) => (
                      <tr key={dIdx}>
                        <td className="p-2.5 font-mono text-slate-500">{dIdx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-800">{d.head}</td>
                        <td className="p-2.5 font-mono text-blue-700">{d.referredDocument}</td>
                        <td className="p-2.5 text-slate-700">{d.observation}</td>
                        <td className="p-2.5 font-medium text-amber-900">{d.shortfallRequirement}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="font-sans text-xs text-slate-600">
                You are requested to submit the above specific shortfall/clarification documents within{" "}
                <strong>{activeBidder.shortfallLetter.submissionDeadlineDays} days</strong> of receipt of this notice.
                Please note that in terms of Open Tender guidelines, no new work order or replacement document shall be entertained.
              </p>

              <div className="pt-4 border-t border-amber-200 flex justify-between items-end font-sans">
                <div className="text-[11px] text-slate-500">
                  Compliance Tag: {activeBidder.shortfallLetter.noticeClauseReference}
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-800">Dealing Officer / Contract Cell</div>
                  <div className="text-xs text-slate-500">{metadata.organization || "Public Sector Undertaking"}</div>
                </div>
              </div>
            </div>
          ) : activeBidder.rejectionLetter ? (
            <div className="bg-slate-50 border border-rose-200 rounded-xl p-6 font-mono text-xs text-slate-800 space-y-4">
              <div className="border-b border-rose-200 pb-3 flex justify-between text-slate-600 font-sans text-xs">
                <div>
                  <strong>Ref:</strong> {activeBidder.rejectionLetter.letterRefNo}
                </div>
                <div>
                  <strong>Date:</strong> {activeBidder.rejectionLetter.letterDate}
                </div>
              </div>

              <div>
                <strong>TO:</strong>
                <div>M/s {activeBidder.rejectionLetter.targetBidderName}</div>
                <div className="text-slate-500 text-[11px]">(Participating Bidder in Tender: {metadata.tenderRefNo || "Ref No"})</div>
              </div>

              <div className="font-bold text-rose-900 font-sans text-sm">
                SUBJECT: {activeBidder.rejectionLetter.subject}
              </div>

              <p className="whitespace-pre-line leading-relaxed font-sans text-slate-700">
                {activeBidder.rejectionLetter.content}
              </p>

              {/* Formal Grounds for Rejection */}
              <div className="p-3 bg-rose-100/60 border border-rose-300 rounded-lg space-y-2 font-sans">
                <h5 className="font-bold text-rose-900 text-xs">Formal Grounds for Rejection:</h5>
                <ul className="list-disc pl-5 space-y-1 text-xs text-rose-950">
                  {activeBidder.rejectionLetter.formalGrounds.map((g, gIdx) => (
                    <li key={gIdx}>{g}</li>
                  ))}
                </ul>
              </div>

              <div className="font-sans text-xs text-slate-600 space-y-1">
                <p>
                  <strong>Documents Examined:</strong> {activeBidder.rejectionLetter.referredDocuments.join(", ")}
                </p>
                <p>
                  <strong>Appellate Remedy:</strong> {activeBidder.rejectionLetter.appellateAuthorityMention}
                </p>
              </div>

              <div className="pt-4 border-t border-rose-200 flex justify-between items-end font-sans">
                <div className="text-[11px] text-slate-500">
                  Statutory Tag: GFR 2017 Rule 173(xvi) Non-Responsive Determination
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-800">Dealing Officer / Tender Committee</div>
                  <div className="text-xs text-slate-500">{metadata.organization || "Public Sector Undertaking"}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-emerald-900 text-sm">Bidder is Techno-Commercially Qualified</h4>
              <p className="text-xs text-emerald-800 max-w-md mx-auto">
                M/s {activeBidder.bidderName} satisfies both Financial Turnover and Technical Experience criteria. No shortfall notice or rejection intimation is required.
              </p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: TAMPERING & FORGERY ALERTS (Internal to Dealing Officer) */}
      {viewMode === "tampering" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                <span>Document Tampering &amp; Forgery Detection Console</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                  Strictly Confidential • Dealing Officer Internal Use
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                In-browser pixel &amp; pattern analyzer alerts Dealing Officers to suspicious font discrepancies, resolution compression artifacts, and missing ICAI UDINs.
                <strong> Note:</strong> These alerts do NOT form part of comparative statements, shortfall letters, or rejection intimations. Decision to drop or pursue remains with the user.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {bidders.map((b) => {
              const docs = [...b.turnoverDocuments, ...b.experienceDocuments, ...(b.shortfallReplyDocuments || [])];
              const bAlerts: { docName: string; alert: DocumentTamperingAlert }[] = [];
              docs.forEach((d) => {
                (d.tamperingAlerts || []).forEach((a) => bAlerts.push({ docName: d.name, alert: a }));
              });

              return (
                <div key={b.bidderId} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{b.bidderName}</span>
                    <span className="text-xs font-semibold text-slate-500">
                      {bAlerts.length} Document Alert(s)
                    </span>
                  </div>

                  {bAlerts.length === 0 ? (
                    <div className="text-xs text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>No pixel tampering or metadata anomalies identified in uploaded documents.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {bAlerts.map((item, aIdx) => (
                        <div
                          key={aIdx}
                          className="bg-white p-3 rounded-lg border border-rose-200 text-xs space-y-1 shadow-2xs"
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-rose-900 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              <span>{item.alert.description}</span>
                            </span>
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                              {item.alert.severity}
                            </span>
                          </div>
                          <div className="text-slate-600 text-[11px] flex gap-4">
                            <span>Document: <strong>{item.docName}</strong></span>
                            {item.alert.affectedSnippet && (
                              <span>Area: <strong>{item.alert.affectedSnippet}</strong></span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 5: BANNING & DEBARMENT VERIFICATION CONSOLE */}
      {viewMode === "banning" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          {/* Header & Scan Execution */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Banning &amp; Debarment Verification Console
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                  GFR Rule 151 &amp; CVC Compliance
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Simulated screening engine cross-checks participating bidders against an internal repository of debarred firms, CPPP Central Debarment Portal, GeM Incident Management, and custom blacklisted URLs/registers provided by the user.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Last checked: <strong>{lastBanningScanTime}</strong>
              </span>
              <button
                type="button"
                onClick={executeBanningCheck}
                disabled={isScanningBanning}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanningBanning ? "animate-spin" : ""}`} />
                <span>{isScanningBanning ? "Checking Portals..." : "Run Banning Status Check"}</span>
              </button>
            </div>
          </div>

          {/* Bidder Screening Summary Grid */}
          <div>
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">
              Screening Results for Participating Bidders ({bidders.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bidders.map((b) => {
                const isFlagged = b.banningStatusAlert.isAlertTriggered;
                return (
                  <div
                    key={b.bidderId}
                    className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${
                      isFlagged
                        ? "bg-rose-50/80 border-rose-300 text-rose-950 shadow-xs"
                        : "bg-emerald-50/40 border-emerald-200 text-slate-800"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                        <span className="font-bold text-sm text-slate-900">{b.bidderName}</span>
                        {isFlagged ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-200 text-rose-900 border border-rose-300 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-rose-700" />
                            <span>DEBARMENT ALERT</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>CLEAN</span>
                          </span>
                        )}
                      </div>

                      <div className="text-xs space-y-1">
                        <p className="leading-relaxed">
                          {isFlagged
                            ? b.banningStatusAlert.reason
                            : "No adverse debarment, suspension, or blacklisting orders recorded across CPPP, GeM Incident Log, or internal registers."}
                        </p>

                        {b.banningStatusAlert.sourceDatabase && (
                          <div className="pt-1 text-[11px] text-slate-600 space-y-0.5">
                            <div>
                              Database: <strong className="text-slate-800">{b.banningStatusAlert.sourceDatabase}</strong>
                            </div>
                            {b.banningStatusAlert.referenceOrderNo && (
                              <div>
                                Order Ref: <strong className="font-mono text-slate-800">{b.banningStatusAlert.referenceOrderNo}</strong>
                              </div>
                            )}
                            {b.banningStatusAlert.portalUrl && (
                              <div className="truncate">
                                Portal URL:{" "}
                                <a
                                  href={b.banningStatusAlert.portalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                                >
                                  <span>{b.banningStatusAlert.portalUrl}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {b.banningStatusAlert.banningCheckListClauseRef}
                      </span>
                      {isFlagged ? (
                        <button
                          type="button"
                          onClick={() => {
                            setBidders((prev) =>
                              prev.map((item) =>
                                item.bidderId === b.bidderId
                                  ? {
                                      ...item,
                                      banningStatusAlert: {
                                        ...item.banningStatusAlert,
                                        isAlertTriggered: false,
                                        verifiedStatus: "OFFICER_CONFIRMED_CLEAN",
                                        verificationNotes: `Dealing officer manually verified with CPPP/GeM on ${new Date().toLocaleDateString("en-IN")}; confirmed distinct non-debarred firm.`,
                                      },
                                    }
                                  : item
                              )
                            );
                            onLogAudit?.(
                              "Officer Cleared Debarment Alert",
                              "Evaluation",
                              `Dealing officer cross-verified and marked '${b.bidderName}' as confirmed clean.`,
                              undefined,
                              b.bidderName,
                              "Vigilance Non-Banning"
                            );
                          }}
                          className="px-2 py-1 bg-white hover:bg-rose-100 border border-rose-300 rounded text-rose-800 text-[11px] font-semibold cursor-pointer"
                        >
                          Mark Verified Clean
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBidderId(b.bidderId);
                            setViewMode("individual");
                          }}
                          className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
                        >
                          View Dossier &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Database of Debarred Entities & Add Custom Portal / URL Form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-200">
            {/* Left: Table of Blacklisted Database */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>Hypothetical Blacklist &amp; Debarment Database ({blacklistDatabase.length} records)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Entities monitored across CPPP, GeM Incident Management, CVC, and user-provided websites.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBlacklistDatabase(DEFAULT_BLACKLISTED_ENTITIES);
                    executeBanningCheck();
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Reset Default List
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 font-semibold">Debarred Entity</th>
                      <th className="p-2.5 font-semibold">Source Portal / Register</th>
                      <th className="p-2.5 font-semibold">Order Ref &amp; Date</th>
                      <th className="p-2.5 font-semibold">Reason</th>
                      <th className="p-2.5 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {blacklistDatabase.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">
                          {item.entityName}
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-800">
                            {item.sourcePortal}
                          </span>
                          {item.portalUrl && (
                            <a
                              href={item.portalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-blue-600 block mt-0.5 hover:underline truncate max-w-[140px]"
                            >
                              {item.portalUrl}
                            </a>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-[11px]">
                          <div>{item.referenceOrderNo}</div>
                          <div className="text-[10px] text-slate-400">{item.orderDate}</div>
                        </td>
                        <td className="p-2.5 text-slate-600 max-w-xs text-[11px]">
                          {item.reasonForBanning}
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveBlacklistEntity(item.id, item.entityName)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Remove from screening list"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Add Custom Blacklisted Firm or URL */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Add Blacklisted Firm or Portal URL</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Enter an internal blacklisted company name or paste an external URL (GeM/CPP/Ministry website) to flag matching bidders.
                </p>
              </div>

              <form onSubmit={handleAddBlacklistEntity} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Company / Firm Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newEntityName}
                    onChange={(e) => setNewEntityName(e.target.value)}
                    placeholder="e.g. Bidder 3 or M/s Global Corp"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Source Portal / Authority
                  </label>
                  <select
                    value={newSourcePortal}
                    onChange={(e) => setNewSourcePortal(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Internal Blacklist">Internal Blacklist (PSU/Dept)</option>
                    <option value="GeM Incident Management">GeM Incident Management</option>
                    <option value="CPPP Central Debarment">CPPP Central Debarment</option>
                    <option value="CVC Banned Register">CVC Banned Register</option>
                    <option value="Custom URL / Portal">Custom Website / Ministry Portal</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Website / Portal URL (GeM / CPP / Any Other)
                  </label>
                  <input
                    type="url"
                    value={newPortalUrl}
                    onChange={(e) => setNewPortalUrl(e.target.value)}
                    placeholder="https://gem.gov.in/... or https://eprocure.gov.in/..."
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-blue-500 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Banning Order Ref / Case No.
                  </label>
                  <input
                    type="text"
                    value={newRefOrder}
                    onChange={(e) => setNewRefOrder(e.target.value)}
                    placeholder="e.g. VIG/BAN/2026/042"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Reason for Banning / Breach
                  </label>
                  <textarea
                    rows={2}
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    placeholder="e.g. Abandonment of previous service contract, forged certificates, or failure to deploy workforce."
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Debarred Database &amp; Re-screen</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Internal Guidelines Modal */}
      {guidelinesModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Internal Guidelines &amp; Circulars Reference</span>
              </h4>
              <button
                onClick={() => setGuidelinesModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700 max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <div className="font-bold text-slate-900">
                  1. Policy Circular on Shortfall / Clarification in Open Tender (OT) Cases
                </div>
                <p className="whitespace-pre-line text-slate-600 leading-relaxed">
                  {guidelines.shortfallInOTCasesText}
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <div className="font-bold text-slate-900">
                  2. CVC &amp; GFR 2017 Guidelines on Evaluation of Eligibility Criteria
                </div>
                <p className="whitespace-pre-line text-slate-600 leading-relaxed">
                  {guidelines.evaluationOfEligibilityText}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setGuidelinesModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close Reference
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Evaluation Lock Prompt */}
      {showFinalPrompt && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Lock className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-bold text-slate-900 text-base">Submit Final Evaluation Report?</h4>
              <p className="text-xs text-slate-600">
                On confirmation, the system will record that <strong>no further change or document upload</strong> is permissible in this case. The final evaluation statement will be locked for Tender Committee sign-off.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowFinalPrompt(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setEvaluationStage("FINAL_ACCEPTED");
                  setShowFinalPrompt(false);
                  exportConsolidatedReport();
                  onLogAudit?.(
                    "Submitted Final Evaluation",
                    "Evaluation",
                    "Dealing officer submitted final evaluation report. Case locked from further modifications.",
                    undefined,
                    "Final Scrutiny",
                    "Tender Committee Submission"
                  );
                }}
                className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer"
              >
                Confirm &amp; Lock Case
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
