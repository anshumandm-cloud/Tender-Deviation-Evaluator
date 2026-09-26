import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Users,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Play,
  ArrowRight,
  HardDrive,
  FileCheck2,
  Info,
  ChevronDown,
  ChevronUp,
  Layers,
  HelpCircle,
  Package,
  Wrench,
  AlertCircle,
  X,
} from "lucide-react";
import { BidderInput, TenderDocuments, TenderMetadata, AuditCategory, TenderProcurementType } from "../types";
import { parseUploadedFile } from "../utils/fileParser";

interface TenderSetupTabProps {
  metadata: TenderMetadata;
  setMetadata: React.Dispatch<React.SetStateAction<TenderMetadata>>;
  documents: TenderDocuments;
  setDocuments: React.Dispatch<React.SetStateAction<TenderDocuments>>;
  bidders: BidderInput[];
  setBidders: React.Dispatch<React.SetStateAction<BidderInput[]>>;
  onRunEvaluation: () => void;
  isEvaluating: boolean;
  evaluationStep: string;
  onLoadGenericCase?: () => void;
  onLoadServicesCase?: () => void;
  onNewBlankCase?: () => void;
  onLoadSample?: () => void;
  onLogAudit?: (
    action: string,
    category: AuditCategory,
    summary: string,
    details?: string,
    entityAffected?: string,
    complianceTag?: string
  ) => void;
}

export const TenderSetupTab: React.FC<TenderSetupTabProps> = ({
  metadata,
  setMetadata,
  documents,
  setDocuments,
  bidders,
  setBidders,
  onRunEvaluation,
  isEvaluating,
  evaluationStep,
  onLoadGenericCase,
  onLoadServicesCase,
  onNewBlankCase,
  onLoadSample,
  onLogAudit,
}) => {
  const [sbdParseError, setSbdParseError] = useState<string | null>(null);
  const [nitParseError, setNitParseError] = useState<string | null>(null);
  const [activeBidderTextPreview, setActiveBidderTextPreview] = useState<string | null>(null);
  const [showDriveInput, setShowDriveInput] = useState<"sbd" | "nit" | null>(null);
  const [driveUrl, setDriveUrl] = useState("");
  const [setupFeedback, setSetupFeedback] = useState<{ message: string; type: "error" | "info" } | null>(null);

  const sbdFileInputRef = useRef<HTMLInputElement>(null);
  const nitFileInputRef = useRef<HTMLInputElement>(null);
  const bidderFileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const showFeedback = (message: string, type: "error" | "info" = "info") => {
    setSetupFeedback({ message, type });
    setTimeout(() => {
      setSetupFeedback((cur) => (cur?.message === message ? null : cur));
    }, 4500);
  };

  // Format character count to Indian Lakhs/thousands for clarity
  const formatChars = (count: number) => {
    if (count >= 100000) {
      return `${(count / 100000).toFixed(2)} Lakh chars`;
    }
    return `${count.toLocaleString()} chars`;
  };

  // Handle SBD file upload
  const handleSbdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSbdParseError(null);
    try {
      const parsed = await parseUploadedFile(file);
      setDocuments((prev) => ({
        ...prev,
        sbdName: parsed.fileName,
        sbdText: parsed.text,
        sbdCharCount: parsed.charCount,
        sbdSource: "pc",
      }));
      onLogAudit?.(
        "Uploaded SBD Document",
        "Tender Documents",
        `Loaded Standard Bidding Document: "${parsed.fileName}" (${formatChars(parsed.charCount)})`,
        `Source: Local PC. File Size: ${parsed.charCount.toLocaleString()} characters. General & Special Conditions of Contract updated.`,
        "SBD Contract Document",
        "Base Contractual Baseline"
      );
    } catch (err: any) {
      setSbdParseError(err.message || "Failed to parse SBD file.");
    }
  };

  // Handle NIT/ITB file upload
  const handleNitUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNitParseError(null);
    try {
      const parsed = await parseUploadedFile(file);
      setDocuments((prev) => ({
        ...prev,
        nitName: parsed.fileName,
        nitText: parsed.text,
        nitCharCount: parsed.charCount,
        nitSource: "pc",
      }));
      onLogAudit?.(
        "Uploaded NIT Document",
        "Tender Documents",
        `Loaded Notice Inviting Tender: "${parsed.fileName}" (${formatChars(parsed.charCount)})`,
        `Source: Local PC. Total Characters: ${parsed.charCount.toLocaleString()}. Instructions to Bidders & PQ Criteria refreshed.`,
        "NIT Document",
        "Tender Notice Audit"
      );
    } catch (err: any) {
      setNitParseError(err.message || "Failed to parse NIT/ITB file.");
    }
  };

  // Handle Bidder Deviation File Upload
  const handleBidderFileUpload = async (bidderId: string, file: File) => {
    try {
      const parsed = await parseUploadedFile(file);
      const ext = (parsed.fileType as any) || "docx";
      const targetBidder = bidders.find((b) => b.id === bidderId);
      const bidderName = targetBidder?.name || "Bidder";

      setBidders((prev) =>
        prev.map((b) =>
          b.id === bidderId
            ? {
                ...b,
                deviationFileName: parsed.fileName,
                deviationFileText: parsed.text,
                deviationFileFormat: ext,
                uploadDate: new Date().toISOString().split("T")[0],
              }
            : b
        )
      );

      onLogAudit?.(
        "Uploaded Bidder Deviation File",
        "Bidders & Deviations",
        `Uploaded deviation file for ${bidderName}: "${parsed.fileName}" (${formatChars(parsed.charCount)})`,
        `Format: .${ext} | Characters: ${parsed.charCount.toLocaleString()} | Uploaded on: ${new Date().toLocaleDateString("en-IN")}`,
        `Bidder: ${bidderName}`,
        "Bidder Deviation Schedule"
      );
    } catch (err: any) {
      showFeedback(`Error reading deviation file for bidder: ${err.message}`, "error");
    }
  };

  // Change number of bidders
  const handleBiddersCountChange = (count: number) => {
    const clamped = Math.max(1, Math.min(10, count));
    if (clamped > bidders.length) {
      const added: BidderInput[] = [];
      for (let i = bidders.length + 1; i <= clamped; i++) {
        added.push({
          id: `bidder-${Date.now()}-${i}`,
          name: `M/s Participating Bidder ${i}`,
          deviationFileText: "",
        });
      }
      setBidders([...bidders, ...added]);
    } else if (clamped < bidders.length) {
      setBidders(bidders.slice(0, clamped));
    }
  };

  // Add individual bidder
  const addBidder = () => {
    const newId = `bidder-${Date.now()}-${bidders.length + 1}`;
    const newName = `M/s Bidder ${bidders.length + 1}`;
    setBidders((prev) => [
      ...prev,
      {
        id: newId,
        name: newName,
        deviationFileText: "",
      },
    ]);
    onLogAudit?.(
      "Registered New Bidder",
      "Bidders & Deviations",
      `Added new participating bidder: "${newName}"`,
      `Total registered bidders in pool: ${bidders.length + 1}`,
      `Bidder: ${newName}`,
      "Pre-Qualification Register"
    );
  };

  // Remove individual bidder
  const removeBidder = (id: string) => {
    if (bidders.length <= 1) {
      showFeedback("At least one bidder must remain in the evaluation roster.", "error");
      return;
    }
    const target = bidders.find((b) => b.id === id);
    const bidderName = target?.name || "Bidder";
    setBidders((prev) => prev.filter((b) => b.id !== id));
    onLogAudit?.(
      "Removed Bidder",
      "Bidders & Deviations",
      `Removed bidder: "${bidderName}" from evaluation roster`,
      `Remaining registered bidders: ${bidders.length - 1}`,
      `Bidder: ${bidderName}`,
      "Bidder Roster Management"
    );
  };

  // Update bidder name
  const updateBidderName = (id: string, name: string) => {
    setBidders((prev) => prev.map((b) => (b.id === id ? { ...b, name } : b)));
  };

  // Update bidder text directly
  const updateBidderText = (id: string, text: string) => {
    setBidders((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              deviationFileText: text,
              deviationFileName: b.deviationFileName || "Manual_Entry.txt",
            }
          : b
      )
    );
  };

  // Simulate or accept Google Drive import
  const handleDriveImport = (target: "sbd" | "nit") => {
    if (!driveUrl) return;
    const docName = `Drive_Ref_${target.toUpperCase()}_Doc.docx`;
    const defaultText = `[Imported from Officer's Private Google Drive: ${driveUrl}]\n\nSTANDARD BIDDING DOCUMENT & CONDITIONS OF CONTRACT\nGCC Clause 27.2: Liquidated Damages 0.5% per week max 10%.\nGCC Clause 18: Terms of Payment (10% Advance against ABG, 70% supply against MRC, 10% on erection, 10% on FAC).\nGCC Clause 13: PBG 10% of contract value.\nGCC Clause 32: Risk and Cost Purchase.\nGCC Clause 38: Limitation of Liability 100%.`;
    if (target === "sbd") {
      setDocuments((prev) => ({
        ...prev,
        sbdName: docName,
        sbdText: defaultText,
        sbdCharCount: defaultText.length,
        sbdSource: "drive",
      }));
    } else {
      setDocuments((prev) => ({
        ...prev,
        nitName: docName,
        nitText: defaultText,
        nitCharCount: defaultText.length,
        nitSource: "drive",
      }));
    }
    setShowDriveInput(null);
    setDriveUrl("");
  };

  const isReadyToEvaluate =
    bidders.length > 0 &&
    bidders.some((b) => b.deviationFileText.trim().length > 0);

  return (
    <div className="space-y-6">
      {/* Inline Feedback Notification */}
      {setupFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-xs transition-all ${
            setupFeedback.type === "error"
              ? "bg-rose-50 border-rose-300 text-rose-800"
              : "bg-blue-50 border-blue-300 text-blue-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{setupFeedback.message}</span>
          </div>
          <button
            onClick={() => setSetupFeedback(null)}
            className="p-1 hover:bg-black/5 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Universal Case Mode Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl border border-slate-800 p-4 text-white shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-cyan-900/80 text-cyan-200 border border-cyan-500/40">
              Universal Case Mode
            </span>
            <h2 className="text-sm font-bold text-white">
              Adaptable Tender Deviation Evaluator (Works for Any Case)
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            This system evaluates deviations quoted by bidders against contract clauses for Turnkey, EPC, and Works packages across any Public Sector Organization or Department. Simply configure the parameters and documents below.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onNewBlankCase && (
            <button
              type="button"
              onClick={onNewBlankCase}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Blank Case</span>
            </button>
          )}
          {onLoadGenericCase && (
            <button
              type="button"
              onClick={onLoadGenericCase}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-200 text-xs font-medium rounded-lg border border-slate-700 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              title="Standard Turnkey EPC & Project Construction Case"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>EPC / Turnkey Works</span>
            </button>
          )}
          {onLoadServicesCase && (
            <button
              type="button"
              onClick={onLoadServicesCase}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-200 text-xs font-medium rounded-lg border border-slate-700 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              title="Operations & Maintenance (O&M) / Services Case"
            >
              <Wrench className="w-3.5 h-3.5 text-purple-400" />
              <span>Services / O&amp;M Case</span>
            </button>
          )}
          {onLoadSample && (
            <button
              type="button"
              onClick={onLoadSample}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-200 text-xs font-medium rounded-lg border border-slate-700 shadow-sm transition-all cursor-pointer"
            >
              Load Sample Demo
            </button>
          )}
        </div>
      </div>

      {/* Tender Details Banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Tender Identification &amp; Package Scope
              </h2>
              <p className="text-xs text-slate-500">
                Define the contract parameters for your specific tender case (EPC Works, Goods Supply, or Services)
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-400">Step 1 of 3</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Procurement / Contract Type *
            </label>
            <select
              value={metadata.tenderType || "EPC_TURNKEY"}
              onChange={(e) => {
                const newType = e.target.value as TenderProcurementType;
                setMetadata({ ...metadata, tenderType: newType });
                onLogAudit?.(
                  "Updated Procurement Type",
                  "Metadata",
                  `Changed Procurement Type to: "${newType}"`,
                  undefined,
                  "Tender Identification",
                  "Statutory Metadata"
                );
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white font-medium text-slate-800"
            >
              <option value="EPC_TURNKEY">EPC / Turnkey Contracts (GCC &amp; SCC)</option>
              <option value="SERVICES_O_AND_M">O&amp;M / Facility / Non-Consulting Services (SLA &amp; Eligibility)</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Package Title / Case Name *
            </label>
            <input
              type="text"
              value={metadata.packageTitle}
              onChange={(e) => setMetadata({ ...metadata, packageTitle: e.target.value })}
              onBlur={() =>
                onLogAudit?.(
                  "Updated Package Title",
                  "Metadata",
                  `Modified Package Title: "${metadata.packageTitle}"`,
                  undefined,
                  "Tender Identification",
                  "Statutory Metadata"
                )
              }
              placeholder="Enter Package Title / Case Name"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tender Ref No / Case No *
            </label>
            <input
              type="text"
              value={metadata.tenderRefNo}
              onChange={(e) => setMetadata({ ...metadata, tenderRefNo: e.target.value })}
              onBlur={() =>
                onLogAudit?.(
                  "Updated Tender Reference No",
                  "Metadata",
                  `Modified Tender Ref No: "${metadata.tenderRefNo}"`,
                  undefined,
                  "Tender Identification",
                  "Statutory Metadata"
                )
              }
              placeholder="Enter Case No"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Public Sector Organization / Employer Name
            </label>
            <input
              type="text"
              value={metadata.organization}
              onChange={(e) => setMetadata({ ...metadata, organization: e.target.value })}
              onBlur={() =>
                onLogAudit?.(
                  "Updated Organization Name",
                  "Metadata",
                  `Modified Organization: "${metadata.organization}"`,
                  undefined,
                  "Tender Employer",
                  "Statutory Metadata"
                )
              }
              placeholder="Enter Organization Name"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Estimated Tender Value (₹ Crores)
            </label>
            <input
              type="text"
              value={metadata.estimateValueCr}
              onChange={(e) => setMetadata({ ...metadata, estimateValueCr: e.target.value })}
              onBlur={() =>
                onLogAudit?.(
                  "Updated Estimated Value",
                  "Metadata",
                  `Modified Estimated Tender Value: Rs. ${metadata.estimateValueCr} Cr`,
                  undefined,
                  "Financial Scope",
                  "Statutory Metadata"
                )
              }
              placeholder="Enter Estimated Value"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Scheduled Completion Period
            </label>
            <input
              type="text"
              value={metadata.completionPeriodMonths}
              onChange={(e) => setMetadata({ ...metadata, completionPeriodMonths: e.target.value })}
              onBlur={() =>
                onLogAudit?.(
                  "Updated Completion Period",
                  "Metadata",
                  `Modified Scheduled Completion Period: ${metadata.completionPeriodMonths} Months`,
                  undefined,
                  "Project Schedule",
                  "Statutory Metadata"
                )
              }
              placeholder="Enter Completion Period"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Reference Documents Upload (SBD & NIT/ITB) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Upload Reference Documents (SBD &amp; NIT / ITB)
              </h2>
              <p className="text-xs text-slate-500">
                Supports DOCX, PDF, XLSX, TXT from your Local PC or Google Drive (Full-length documents supported without character limitations)
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-400">Step 2 of 3</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SBD Upload Card */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-800">
                    Standard Bidding Document (SBD)
                  </span>
                </div>
                {documents.sbdText ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    Loaded ({formatChars(documents.sbdCharCount)})
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">Mandatory Reference</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-3">
                General &amp; Special Conditions of Contract (GCC/SCC), clauses on LD, PBG, Payment Terms, Risk &amp; Cost, Limitation of Liability.
              </p>

              {documents.sbdName && (
                <div className="bg-white border border-slate-200 rounded-lg p-2.5 mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <FileCheck2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-xs font-medium text-slate-700 truncate" title={documents.sbdName}>
                      {documents.sbdName}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                    {formatChars(documents.sbdCharCount)}
                  </span>
                </div>
              )}

              {sbdParseError && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-lg mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{sbdParseError}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 mt-2">
              <input
                type="file"
                ref={sbdFileInputRef}
                onChange={handleSbdUpload}
                accept=".docx,.pdf,.xlsx,.xls,.txt"
                className="hidden"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => sbdFileInputRef.current?.click()}
                  className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                  <span>Upload from PC (.docx, .pdf, .xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDriveInput(showDriveInput === "sbd" ? null : "sbd")}
                  className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                  title="Link from Google Drive"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-amber-600" />
                  <span>Drive</span>
                </button>
              </div>

              {showDriveInput === "sbd" && (
                <div className="p-2.5 bg-white border border-amber-200 rounded-lg space-y-2">
                  <label className="text-[11px] font-medium text-slate-700 block">
                    Google Drive Share Link / Path:
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={driveUrl}
                      onChange={(e) => setDriveUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleDriveImport("sbd")}
                      className="px-2.5 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-500 font-medium cursor-pointer"
                    >
                      Attach
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* NIT / ITB Upload Card */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-semibold text-slate-800">
                    Notice Inviting Tender (NIT) &amp; ITB
                  </span>
                </div>
                {documents.nitText ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    Loaded ({formatChars(documents.nitCharCount)})
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">Recommended</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Instruction to Bidders, Qualifying Requirements (PQC), deviation submission guidelines (Annexure IV &amp; V), timelines.
              </p>

              {documents.nitName && (
                <div className="bg-white border border-slate-200 rounded-lg p-2.5 mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <FileCheck2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-xs font-medium text-slate-700 truncate" title={documents.nitName}>
                      {documents.nitName}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                    {formatChars(documents.nitCharCount)}
                  </span>
                </div>
              )}

              {nitParseError && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-lg mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{nitParseError}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 mt-2">
              <input
                type="file"
                ref={nitFileInputRef}
                onChange={handleNitUpload}
                accept=".docx,.pdf,.xlsx,.xls,.txt"
                className="hidden"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => nitFileInputRef.current?.click()}
                  className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Upload from PC (.docx, .pdf, .xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDriveInput(showDriveInput === "nit" ? null : "nit")}
                  className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                  title="Link from Google Drive"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-amber-600" />
                  <span>Drive</span>
                </button>
              </div>

              {showDriveInput === "nit" && (
                <div className="p-2.5 bg-white border border-amber-200 rounded-lg space-y-2">
                  <label className="text-[11px] font-medium text-slate-700 block">
                    Google Drive Share Link / Path:
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={driveUrl}
                      onChange={(e) => setDriveUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleDriveImport("nit")}
                      className="px-2.5 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-500 font-medium cursor-pointer"
                    >
                      Attach
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Participating Bidders and Deviation Documents */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Participating Bidders &amp; Quoted Deviations
              </h2>
              <p className="text-xs text-slate-500">
                Upload each bidder's deviation schedule in DOCX, Excel, PDF, or text
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <Users className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-medium text-slate-700">Total Bidders:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleBiddersCountChange(bidders.length - 1)}
                  disabled={bidders.length <= 1}
                  className="w-5 h-5 flex items-center justify-center bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-40 text-xs font-bold"
                >
                  -
                </button>
                <span className="w-6 text-center text-xs font-bold text-blue-700">
                  {bidders.length}
                </span>
                <button
                  type="button"
                  onClick={() => handleBiddersCountChange(bidders.length + 1)}
                  disabled={bidders.length >= 10}
                  className="w-5 h-5 flex items-center justify-center bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-40 text-xs font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={addBidder}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 flex items-center gap-1 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Bidder</span>
            </button>
          </div>
        </div>

        {/* Bidder Cards Grid */}
        <div className="space-y-4">
          {bidders.map((bidder, index) => {
            const hasData = bidder.deviationFileText.trim().length > 0;
            const isPreviewOpen = activeBidderTextPreview === bidder.id;

            return (
              <div
                key={bidder.id}
                className={`border rounded-xl p-4 transition-all ${
                  hasData
                    ? "border-slate-200 bg-white hover:border-blue-300"
                    : "border-dashed border-amber-300 bg-amber-50/20"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      B{index + 1}
                    </span>
                    <input
                      type="text"
                      value={bidder.name}
                      onChange={(e) => updateBidderName(bidder.id, e.target.value)}
                      placeholder="Enter Bidder Name"
                      className="font-semibold text-slate-800 text-sm border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 w-full transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {hasData ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span>Deviations Loaded ({formatChars(bidder.deviationFileText.length)})</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        <span>Awaiting File</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => removeBidder(bidder.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove this bidder"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-8 flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      ref={(el) => {
                        bidderFileInputRefs.current[bidder.id] = el;
                      }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleBidderFileUpload(bidder.id, file);
                      }}
                      accept=".docx,.pdf,.xlsx,.xls,.txt,.csv"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => bidderFileInputRefs.current[bidder.id]?.click()}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                      <span>Upload File (.docx / .pdf / .xlsx)</span>
                    </button>

                    {bidder.deviationFileName && (
                      <span className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded truncate max-w-xs" title={bidder.deviationFileName}>
                        📄 {bidder.deviationFileName}
                      </span>
                    )}
                  </div>

                  <div className="md:col-span-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveBidderTextPreview(isPreviewOpen ? null : bidder.id)
                      }
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isPreviewOpen ? "Collapse Content" : "View / Edit Deviation Text"}</span>
                      {isPreviewOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Text Editor / Viewer */}
                {isPreviewOpen && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-slate-600">
                        Extracted Raw Text / Form of Deviation (Editable):
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {bidder.deviationFileText.length} characters
                      </span>
                    </div>
                    <textarea
                      rows={5}
                      value={bidder.deviationFileText}
                      onChange={(e) => updateBidderText(bidder.id, e.target.value)}
                      placeholder="Paste bidder's Schedule of Technical & Commercial Deviations here if not uploading file..."
                      className="w-full text-xs font-mono p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Execution Control Action */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-6 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-bold text-[10px] uppercase rounded">
              Ready for Evaluation
            </span>
            <span className="text-xs text-blue-200">
              {bidders.length} Bidder{bidders.length > 1 ? "s" : ""} Loaded
            </span>
          </div>
          <h3 className="text-lg font-bold">
            Initiate Contract Dealing Officer Evaluation
          </h3>
          <p className="text-xs text-blue-100 max-w-2xl">
            Processes all submitted deviations against SBD &amp; NIT clauses. Generates individual bidder evaluations, consolidated comparative matrix, deadlock resolution recommendations, and Word/Excel outputs.
          </p>
        </div>

        <button
          type="button"
          onClick={onRunEvaluation}
          disabled={!isReadyToEvaluate || isEvaluating}
          id="run-evaluation-btn"
          className="px-6 py-3 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:pointer-events-none text-slate-950 font-bold text-sm rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer shrink-0"
        >
          {isEvaluating ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <span>{evaluationStep || "Evaluating Deviations..."}</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Run Deviation Analysis</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
