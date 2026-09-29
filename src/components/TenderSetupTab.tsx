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
  Sparkles,
  Check,
  Search,
  Eye,
  Filter,
  ShieldCheck,
  Award,
  Sliders,
  FolderArchive,
  RefreshCw,
} from "lucide-react";
import { BidderInput, TenderDocuments, TenderMetadata, AuditCategory, TenderProcurementType } from "../types";
import {
  parseUploadedFile,
  extractEligibilityCriteriaFromFile,
  extractEligibilityCriteriaFromText,
  EligibilityExtractionResult,
} from "../utils/fileParser";
import { ServiceCriteriaRequirement } from "../types/serviceEvaluation";

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
  onProcurementTypeChange?: (newType: TenderProcurementType) => void;
  onLogAudit?: (
    action: string,
    category: AuditCategory,
    summary: string,
    details?: string,
    entityAffected?: string,
    complianceTag?: string
  ) => void;
  serviceCriteria?: ServiceCriteriaRequirement;
  setServiceCriteria?: React.Dispatch<React.SetStateAction<ServiceCriteriaRequirement>>;
  onNavigateToServiceEval?: () => void;
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
  onProcurementTypeChange,
  onLogAudit,
  serviceCriteria,
  setServiceCriteria,
  onNavigateToServiceEval,
}) => {
  const [sbdParseError, setSbdParseError] = useState<string | null>(null);
  const [nitParseError, setNitParseError] = useState<string | null>(null);
  const [activeBidderTextPreview, setActiveBidderTextPreview] = useState<string | null>(null);
  const [showDriveInput, setShowDriveInput] = useState<"sbd" | "nit" | null>(null);
  const [driveUrl, setDriveUrl] = useState("");
  const [setupFeedback, setSetupFeedback] = useState<{ message: string; type: "error" | "info" } | null>(null);

  // Service Evaluation Criteria Auto-Population State
  const [isExtractingEligibility, setIsExtractingEligibility] = useState<boolean>(false);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityExtractionResult | null>(null);
  const [showKeywordSnippets, setShowKeywordSnippets] = useState<boolean>(false);
  const [activeKeywordFilter, setActiveKeywordFilter] = useState<"all" | "turnover" | "experience" | "financial" | "ISO">("all");
  const [newCertInput, setNewCertInput] = useState<string>("");
  const eligibilityFileInputRef = useRef<HTMLInputElement>(null);

  // Supplementary Reference Documents state
  const [isAddingSuppDoc, setIsAddingSuppDoc] = useState(false);
  const [suppCategory, setSuppCategory] = useState<
    "Corrigendum" | "Pre-Bid Minutes" | "Technical Scope" | "Special Conditions" | "General Reference"
  >("Corrigendum");
  const suppFileInputRef = useRef<HTMLInputElement>(null);

  const sbdFileInputRef = useRef<HTMLInputElement>(null);
  const nitFileInputRef = useRef<HTMLInputElement>(null);
  const bidderFileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const showFeedback = (message: string, type: "error" | "info" = "info") => {
    setSetupFeedback({ message, type });
    setTimeout(() => {
      setSetupFeedback((cur) => (cur?.message === message ? null : cur));
    }, 4500);
  };

  // Upload Supplementary Reference Document (Corrigendum, Pre-Bid Minutes, Scope)
  const handleSupplementaryDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseUploadedFile(file);
      const newDoc = {
        id: `supp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: parsed.fileName,
        fileType: parsed.fileType,
        charCount: parsed.charCount,
        uploadedAt: new Date().toISOString().split("T")[0],
        category: suppCategory,
        extractedText: parsed.text,
      };

      setDocuments((prev) => ({
        ...prev,
        supplementaryDocs: [...(prev.supplementaryDocs || []), newDoc],
      }));

      onLogAudit?.(
        "Uploaded Supplementary Reference Document",
        "Tender Documents",
        `Attached additional reference document [${suppCategory}]: "${parsed.fileName}" (${formatChars(parsed.charCount)})`,
        `Category: ${suppCategory} | Format: .${parsed.fileType} | Total size: ${parsed.charCount.toLocaleString()} chars`,
        "Supplementary Reference",
        "Record Completeness"
      );

      showFeedback(`Successfully attached "${parsed.fileName}" under ${suppCategory}.`, "info");
      setIsAddingSuppDoc(false);
    } catch (err: any) {
      showFeedback(`Failed to parse supplementary file: ${err.message}`, "error");
    } finally {
      e.target.value = "";
    }
  };

  const handleRemoveSupplementaryDoc = (docId: string, docName: string) => {
    setDocuments((prev) => ({
      ...prev,
      supplementaryDocs: (prev.supplementaryDocs || []).filter((d) => d.id !== docId),
    }));
    onLogAudit?.(
      "Removed Supplementary Reference Document",
      "Tender Documents",
      `Removed supplementary reference document: "${docName}"`,
      undefined,
      "Supplementary Reference",
      "Record Management"
    );
    showFeedback(`Removed supplementary reference document "${docName}".`, "info");
  };

  // Active Service Criteria fallback
  const activeServiceCriteria: ServiceCriteriaRequirement = serviceCriteria || {
    minAverageAnnualTurnoverCr: 15.0,
    turnoverYearsCount: 3,
    turnoverNotes: "Audited Balance Sheets & CA Certificate with UDIN for last 3 financial years",
    netWorthRequirement: "Positive Net Worth as on close of preceding financial year",
    workingCapitalRequirement: "Fund-based credit limit of minimum ₹ 2.0 Cr or equivalent solvency",
    similarWorkDefinition: "Operation & Maintenance (O&M), comprehensive facility management, or similar electrical/mechanical services in Govt/PSU",
    singleWorkOrderValueCr: 12.0,
    twoWorkOrdersValueCr: 7.5,
    threeWorkOrdersValueCr: 6.0,
    priorExperienceYears: 7,
    mandatoryCertifications: ["ISO 9001:2015"],
  };

  const handleUpdateServiceCriteriaField = (field: keyof ServiceCriteriaRequirement, value: any) => {
    if (setServiceCriteria) {
      setServiceCriteria((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleAddCertification = () => {
    if (!newCertInput.trim() || !setServiceCriteria) return;
    const cert = newCertInput.trim();
    if (activeServiceCriteria.mandatoryCertifications?.includes(cert)) {
      setNewCertInput("");
      return;
    }
    setServiceCriteria((prev) => ({
      ...prev,
      mandatoryCertifications: [...(prev.mandatoryCertifications || []), cert],
    }));
    setNewCertInput("");
    onLogAudit?.(
      "Added Mandatory Certification",
      "Evaluation",
      `Added requirement: "${cert}"`,
      undefined,
      "Service Evaluation Criteria",
      "Statutory Eligibility"
    );
  };

  const handleRemoveCertification = (index: number) => {
    if (!setServiceCriteria) return;
    setServiceCriteria((prev) => ({
      ...prev,
      mandatoryCertifications: (prev.mandatoryCertifications || []).filter((_, i) => i !== index),
    }));
  };

  // Upload and parse file (.pdf, .zip, etc.) using native File API to extract eligibility criteria targeting turnover, experience, financial, ISO
  const handleEligibilityFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtractingEligibility(true);
    try {
      // Uses the new helper function that uses the native File API to extract text content
      // from uploaded .pdf and .zip files, specifically targeting keywords related to eligibility criteria
      // like 'turnover', 'experience', 'financial', and 'ISO'.
      const result = await extractEligibilityCriteriaFromFile(file);
      setEligibilityResult(result);

      if (setServiceCriteria) {
        setServiceCriteria((prev) => ({
          ...prev,
          minAverageAnnualTurnoverCr: result.suggestedCriteria.minAverageAnnualTurnoverCr,
          turnoverYearsCount: result.suggestedCriteria.turnoverYearsCount,
          turnoverNotes: result.suggestedCriteria.turnoverNotes,
          netWorthRequirement: result.suggestedCriteria.netWorthRequirement,
          workingCapitalRequirement: result.suggestedCriteria.workingCapitalRequirement,
          similarWorkDefinition: result.suggestedCriteria.similarWorkDefinition,
          singleWorkOrderValueCr: result.suggestedCriteria.singleWorkOrderValueCr,
          twoWorkOrdersValueCr: result.suggestedCriteria.twoWorkOrdersValueCr,
          threeWorkOrdersValueCr: result.suggestedCriteria.threeWorkOrdersValueCr,
          priorExperienceYears: result.suggestedCriteria.priorExperienceYears,
          mandatoryCertifications: result.suggestedCriteria.mandatoryCertifications,
        }));
      }

      onLogAudit?.(
        "Auto-Extracted Service Evaluation Fields",
        "Tender Documents",
        `Parsed eligibility criteria from file: "${file.name}" targeting keywords: 'turnover', 'experience', 'financial', and 'ISO'`,
        `Extracted: Turnover ₹${result.suggestedCriteria.minAverageAnnualTurnoverCr} Cr (${result.suggestedCriteria.turnoverYearsCount} Yrs), Similar Work Scope, ISO Certifications: ${result.suggestedCriteria.mandatoryCertifications.join(", ")}`,
        "Service Evaluation Criteria",
        "GFR Rule 173 Eligibility Baseline"
      );

      showFeedback(
        `Successfully extracted eligibility criteria from "${file.name}" using native File API! Auto-populated turnover, experience, financial, and ISO fields.`,
        "info"
      );
    } catch (err: any) {
      showFeedback(`Failed to extract eligibility criteria from file: ${err.message}`, "error");
    } finally {
      setIsExtractingEligibility(false);
      e.target.value = "";
    }
  };

  // Extract from existing NIT or SBD document text
  const handleExtractFromNitOrSbd = (source: "nit" | "sbd") => {
    const text = source === "nit" ? documents.nitText : documents.sbdText;
    const name = source === "nit" ? documents.nitName : documents.sbdName;
    if (!text || text.trim().length === 0) {
      showFeedback(`No ${source.toUpperCase()} document content loaded yet. Please upload a file first.`, "error");
      return;
    }
    setIsExtractingEligibility(true);
    try {
      const result = extractEligibilityCriteriaFromText(text, name || `${source.toUpperCase()}_Document.txt`);
      setEligibilityResult(result);
      if (setServiceCriteria) {
        setServiceCriteria((prev) => ({
          ...prev,
          minAverageAnnualTurnoverCr: result.suggestedCriteria.minAverageAnnualTurnoverCr,
          turnoverYearsCount: result.suggestedCriteria.turnoverYearsCount,
          turnoverNotes: result.suggestedCriteria.turnoverNotes,
          netWorthRequirement: result.suggestedCriteria.netWorthRequirement,
          workingCapitalRequirement: result.suggestedCriteria.workingCapitalRequirement,
          similarWorkDefinition: result.suggestedCriteria.similarWorkDefinition,
          singleWorkOrderValueCr: result.suggestedCriteria.singleWorkOrderValueCr,
          twoWorkOrdersValueCr: result.suggestedCriteria.twoWorkOrdersValueCr,
          threeWorkOrdersValueCr: result.suggestedCriteria.threeWorkOrdersValueCr,
          priorExperienceYears: result.suggestedCriteria.priorExperienceYears,
          mandatoryCertifications: result.suggestedCriteria.mandatoryCertifications,
        }));
      }
      onLogAudit?.(
        "Auto-Extracted Service Evaluation Fields",
        "Tender Documents",
        `Parsed eligibility criteria from ${source.toUpperCase()} text targeting keywords: 'turnover', 'experience', 'financial', and 'ISO'`,
        `Extracted: Turnover ₹${result.suggestedCriteria.minAverageAnnualTurnoverCr} Cr, Experience scope, ISO standards: ${result.suggestedCriteria.mandatoryCertifications.join(", ")}`,
        "Service Evaluation Criteria",
        "GFR Rule 173 Eligibility Baseline"
      );
      showFeedback(`Successfully extracted eligibility criteria from ${source.toUpperCase()} and populated service evaluation fields!`, "info");
    } catch (err: any) {
      showFeedback(`Extraction error: ${err.message}`, "error");
    } finally {
      setIsExtractingEligibility(false);
    }
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

      // Auto-extract eligibility criteria if in Services mode and NIT contains turnover, experience, financial, or ISO keywords
      const lower = parsed.text.toLowerCase();
      if (
        metadata.tenderType === "SERVICES_O_AND_M" &&
        (lower.includes("turnover") ||
          lower.includes("experience") ||
          lower.includes("financial") ||
          lower.includes("iso"))
      ) {
        try {
          const autoExtracted = extractEligibilityCriteriaFromText(parsed.text, parsed.fileName, parsed.charCount);
          setEligibilityResult(autoExtracted);
          if (setServiceCriteria) {
            setServiceCriteria((prev) => ({
              ...prev,
              ...autoExtracted.suggestedCriteria,
            }));
          }
        } catch {}
      }
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
                {metadata.tenderType === "SERVICES_O_AND_M"
                  ? "Define the contract parameters for your Services / O&M tender case (SLA & Eligibility)"
                  : "Define the contract parameters for your EPC-Works / Turnkey package (GCC, SCC, and technical deviation baseline)"}
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-400">
            {metadata.tenderType === "SERVICES_O_AND_M" ? "Step 1 of 4" : "Step 1 of 3"}
          </span>
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
                if (onProcurementTypeChange) {
                  onProcurementTypeChange(newType);
                } else {
                  setMetadata({ ...metadata, tenderType: newType });
                  onLogAudit?.(
                    "Updated Procurement Type",
                    "Metadata",
                    `Changed Procurement Type to: "${newType}"`,
                    undefined,
                    "Tender Identification",
                    "Statutory Metadata"
                  );
                }
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white font-medium text-slate-800"
            >
              <option value="SERVICES_O_AND_M">Services (O&amp;M) / Non-Consulting Services (SLA &amp; Eligibility)</option>
              <option value="EPC_TURNKEY">EPC-Works / Turnkey Contracts (GCC &amp; SCC)</option>
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

      {/* Reference Documents Upload (SBD / GCC & NIT/ITB) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {metadata.tenderType === "SERVICES_O_AND_M"
                  ? "Upload Reference Documents (GCC & NIT / ITB)"
                  : "Upload Reference Documents (SBD & NIT / ITB)"}
              </h2>
              <p className="text-xs text-slate-500">
                {metadata.tenderType === "SERVICES_O_AND_M"
                  ? "General Conditions of Contract (GCC) is the primary baseline for Services (O&M), along with SLA, NIT, and any Corrigenda"
                  : "Standard Bidding Document (SBD) is the primary baseline for EPC-Works, along with NIT and technical schedules for deviations analysis"}
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-400">
            {metadata.tenderType === "SERVICES_O_AND_M" ? "Step 2 of 4" : "Step 2 of 3"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Primary Baseline Document Card: GCC (Services) vs SBD (EPC) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-slate-900">
                    {metadata.tenderType === "SERVICES_O_AND_M"
                      ? "General Conditions of Contract (GCC) & Service Agreement"
                      : "Standard Bidding Document (SBD)"}
                  </span>
                </div>
                {documents.sbdText ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    {metadata.tenderType === "SERVICES_O_AND_M" ? "GCC Loaded" : "SBD Loaded"} ({formatChars(documents.sbdCharCount)})
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Mandatory Baseline
                  </span>
                )}
              </div>

              {/* Prominence Badge */}
              <div className="mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  metadata.tenderType === "SERVICES_O_AND_M"
                    ? "bg-purple-100 text-purple-800 border-purple-300"
                    : "bg-blue-100 text-blue-800 border-blue-300"
                }`}>
                  {metadata.tenderType === "SERVICES_O_AND_M"
                    ? "Primary Contract Baseline: GCC & SLA"
                    : "Primary Contract Baseline: SBD (GCC & SCC)"}
                </span>
              </div>

              <p className="text-xs text-slate-500 mb-3">
                {metadata.tenderType === "SERVICES_O_AND_M"
                  ? "General Conditions of Contract (GCC), Service Level Agreement (SLA), Minimum Wage escalation, PBG, penalty clauses, and scope conditions."
                  : "Standard Bidding Document (SBD) with General & Special Conditions of Contract (GCC/SCC), clauses on LD, PBG, Payment Terms, Risk & Cost, Limitation of Liability."}
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
                  className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    {metadata.tenderType === "SERVICES_O_AND_M"
                      ? "Upload GCC Document (.docx, .pdf, .xlsx)"
                      : "Upload SBD from PC (.docx, .pdf, .xlsx)"}
                  </span>
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
                    {metadata.tenderType === "SERVICES_O_AND_M"
                      ? "Notice Inviting Tender (NIT) & Qualifying Criteria"
                      : "Notice Inviting Tender (NIT) & ITB"}
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
                {metadata.tenderType === "SERVICES_O_AND_M"
                  ? "NIT Scope, Qualifying Requirements (Turnover, Similar Work 80%/50%/40% thresholds), non-banning undertakings, and statutory registrations."
                  : "Instruction to Bidders, Qualifying Requirements (PQC), deviation submission guidelines (Annexure IV & V), timelines."}
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

        {/* Prompt to User for Additional Reference Documents */}
        <div className="mt-5 p-4 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-4 h-4 text-blue-700" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Reference Documents Verification &amp; Supplementary Upload Prompt</span>
                  {(documents.supplementaryDocs?.length || 0) > 0 && (
                    <span className="text-[10px] bg-blue-600 text-white px-2 py-0.2 rounded-full font-bold">
                      {documents.supplementaryDocs?.length} Supplementary Doc(s) Attached
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  💡 <strong>Prompt for Dealing Officer:</strong> Are there any additional reference documents to be uploaded for this case? Check if you need to attach Corrigendum / Addenda, Pre-Bid Clarification Minutes, Technical Scope &amp; Specifications, or Special {metadata.tenderType === "SERVICES_O_AND_M" ? "GCC / SLA" : "Conditions of Contract (SCC)"}.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAddingSuppDoc((prev) => !prev)}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingSuppDoc ? "Cancel Upload" : "+ Upload Additional Reference Document"}</span>
            </button>
          </div>

          {/* Interactive Supplementary Upload Box */}
          {isAddingSuppDoc && (
            <div className="p-3.5 bg-white border border-blue-200 rounded-xl space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Select Reference Document Category *
                  </label>
                  <select
                    value={suppCategory}
                    onChange={(e) => setSuppCategory(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-blue-500 font-medium"
                  >
                    <option value="Corrigendum">Corrigendum / Addendum to Tender</option>
                    <option value="Pre-Bid Minutes">Pre-Bid Clarification Meeting Minutes</option>
                    <option value="Technical Scope">Technical Scope &amp; Specifications / BOQ</option>
                    <option value="Special Conditions">
                      {metadata.tenderType === "SERVICES_O_AND_M" ? "Special GCC / SCC / SLA Conditions" : "Special Conditions of Contract (SCC)"}
                    </option>
                    <option value="General Reference">General Statutory / Legal Reference</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Choose File from Local PC (.docx, .pdf, .xlsx, .txt) *
                  </label>
                  <input
                    type="file"
                    ref={suppFileInputRef}
                    onChange={handleSupplementaryDocUpload}
                    accept=".docx,.pdf,.xlsx,.xls,.txt"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => suppFileInputRef.current?.click()}
                    className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg border border-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                    <span>Select File to Attach</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* List of Attached Supplementary Reference Documents */}
          {documents.supplementaryDocs && documents.supplementaryDocs.length > 0 && (
            <div className="pt-2 border-t border-blue-200/60 space-y-2">
              <span className="text-[11px] font-semibold text-slate-600 block">
                Attached Supplementary Reference Documents:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {documents.supplementaryDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-slate-800 truncate block" title={doc.name}>
                          {doc.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-medium">
                            {doc.category}
                          </span>
                          <span>•</span>
                          <span>{formatChars(doc.charCount)}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSupplementaryDoc(doc.id, doc.name)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer ml-2 shrink-0"
                      title="Remove supplementary document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step 3 (Services (O&M) Only): Service Evaluation & Eligibility Criteria Setup (Auto-Populated via Native File API) */}
      {metadata.tenderType === "SERVICES_O_AND_M" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-slate-900">
                    Service Evaluation &amp; Eligibility Criteria Setup
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wide flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    Auto-Populated via Native File API
                  </span>
                  {eligibilityResult && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      Keywords Extracted ({eligibilityResult.detailedMatches.length} hits)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Upload NIT, tender document, or eligibility package in <strong>.pdf</strong> or <strong>.zip</strong> format. The native File API parser scans for keywords <strong>'turnover'</strong>, <strong>'experience'</strong>, <strong>'financial'</strong>, and <strong>'ISO'</strong> to auto-populate service evaluation parameters.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-slate-400 mr-1">Step 3 of 4</span>

              <input
                type="file"
                ref={eligibilityFileInputRef}
                onChange={handleEligibilityFileUpload}
                accept=".pdf,.zip,.docx,.xlsx,.txt"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => eligibilityFileInputRef.current?.click()}
                disabled={isExtractingEligibility}
                className="px-3.5 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isExtractingEligibility ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Parsing File API...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload &amp; Extract (.pdf / .zip)</span>
                  </>
                )}
              </button>

              {documents.nitText && (
                <button
                  type="button"
                  onClick={() => handleExtractFromNitOrSbd("nit")}
                  disabled={isExtractingEligibility}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Extract criteria from loaded NIT document"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Auto-Extract from NIT</span>
                </button>
              )}

              {onNavigateToServiceEval && (
                <button
                  type="button"
                  onClick={onNavigateToServiceEval}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>View Evaluation Matrix</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* 4 Targeted Keywords Status Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Keyword 1: turnover */}
            <div className="p-3.5 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-amber-100/30 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-amber-950 mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    Keyword: 'turnover'
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/90 font-mono text-amber-900 font-bold">
                    {eligibilityResult ? `${eligibilityResult.matchedKeywords.turnover.length} hits` : "Active"}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800/90 leading-tight">
                  Minimum Annual Turnover &amp; CA UDIN Verification
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-amber-200/60">
                <div className="text-base font-extrabold text-amber-950 font-mono">
                  ₹ {activeServiceCriteria.minAverageAnnualTurnoverCr} Cr
                </div>
                <div className="text-[10px] text-amber-800 font-medium">
                  Last {activeServiceCriteria.turnoverYearsCount} Financial Years
                </div>
              </div>
            </div>

            {/* Keyword 2: experience */}
            <div className="p-3.5 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-blue-100/30 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-blue-950 mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    Keyword: 'experience'
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-200/90 font-mono text-blue-900 font-bold">
                    {eligibilityResult ? `${eligibilityResult.matchedKeywords.experience.length} hits` : "Active"}
                  </span>
                </div>
                <p className="text-[11px] text-blue-800/90 leading-tight">
                  Similar Works Definition &amp; Threshold Orders
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-blue-200/60">
                <div className="text-base font-extrabold text-blue-950 font-mono">
                  80% / 50% / 40%
                </div>
                <div className="text-[10px] text-blue-800 font-medium truncate" title={activeServiceCriteria.similarWorkDefinition}>
                  Prior {activeServiceCriteria.priorExperienceYears} Yrs • {activeServiceCriteria.similarWorkDefinition.slice(0, 26)}...
                </div>
              </div>
            </div>

            {/* Keyword 3: financial */}
            <div className="p-3.5 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50/80 to-purple-100/30 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-purple-950 mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                    Keyword: 'financial'
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-200/90 font-mono text-purple-900 font-bold">
                    {eligibilityResult ? `${eligibilityResult.matchedKeywords.financial.length} hits` : "Active"}
                  </span>
                </div>
                <p className="text-[11px] text-purple-800/90 leading-tight">
                  Net Worth &amp; Working Capital Solvency
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-purple-200/60">
                <div className="text-sm font-extrabold text-purple-950 truncate" title={activeServiceCriteria.netWorthRequirement}>
                  Positive Net Worth
                </div>
                <div className="text-[10px] text-purple-800 font-medium truncate" title={activeServiceCriteria.workingCapitalRequirement}>
                  {activeServiceCriteria.workingCapitalRequirement || "Fund-based credit limit required"}
                </div>
              </div>
            </div>

            {/* Keyword 4: ISO */}
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-emerald-100/30 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-emerald-950 mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Keyword: 'ISO'
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200/90 font-mono text-emerald-900 font-bold">
                    {eligibilityResult ? `${eligibilityResult.matchedKeywords.ISO.length} hits` : `${activeServiceCriteria.mandatoryCertifications?.length || 1} certs`}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/90 leading-tight">
                  Mandatory Quality &amp; Statutory Certifications
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-emerald-200/60">
                <div className="text-sm font-extrabold text-emerald-950 truncate">
                  {activeServiceCriteria.mandatoryCertifications?.[0] || "ISO 9001:2015"}
                </div>
                <div className="text-[10px] text-emerald-800 font-medium">
                  {activeServiceCriteria.mandatoryCertifications && activeServiceCriteria.mandatoryCertifications.length > 1
                    ? `+${activeServiceCriteria.mandatoryCertifications.length - 1} additional standard(s)`
                    : "ISO Quality Management Standard"}
                </div>
              </div>
            </div>
          </div>

          {/* Source File & Confidence Banner if extracted */}
          {eligibilityResult && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Source Document: <strong className="font-mono text-slate-800">{eligibilityResult.sourceFileName}</strong> ({formatChars(eligibilityResult.extractedCharCount)})
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                  Extraction Confidence: {eligibilityResult.confidenceScore}%
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowKeywordSnippets((prev) => !prev)}
                className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 text-xs cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{showKeywordSnippets ? "Hide Matches" : `View ${eligibilityResult.detailedMatches.length} Targeted Keyword Matches`}</span>
                {showKeywordSnippets ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* Collapsible Keyword Matches & Context Snippets */}
          {showKeywordSnippets && eligibilityResult && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-bold text-slate-700">Filter Matches by Keyword:</span>
                </div>
                <div className="flex gap-1">
                  {(["all", "turnover", "experience", "financial", "ISO"] as const).map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => setActiveKeywordFilter(kw)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                        activeKeywordFilter === kw
                          ? "bg-blue-600 text-white"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {kw === "all" ? "All Matches" : `'${kw}'`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {eligibilityResult.detailedMatches
                  .filter((m) => activeKeywordFilter === "all" || m.keyword === activeKeywordFilter)
                  .map((match, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          match.keyword === "turnover"
                            ? "bg-amber-100 text-amber-800"
                            : match.keyword === "experience"
                            ? "bg-blue-100 text-blue-800"
                            : match.keyword === "financial"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {match.keyword}
                        </span>
                        {match.lineNumber && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Line {match.lineNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 text-xs font-mono bg-slate-50 p-2 rounded border border-slate-100 leading-relaxed">
                        {match.snippet}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Editable Service Evaluation Fields Form Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pt-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>Configured Service Evaluation Criteria (Synchronized)</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Dealing Officer may edit values below or re-parse anytime
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Financial & Turnover Criteria (Keyword: 'turnover') */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <span>💰 Financial Turnover Criteria</span>
                  </span>
                  <span className="text-[10px] font-mono text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                    Keyword: 'turnover'
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Min Average Annual Turnover (₹ Cr) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={activeServiceCriteria.minAverageAnnualTurnoverCr}
                      onChange={(e) => handleUpdateServiceCriteriaField("minAverageAnnualTurnoverCr", parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Qualifying Period (Years) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={activeServiceCriteria.turnoverYearsCount}
                      onChange={(e) => handleUpdateServiceCriteriaField("turnoverYearsCount", parseInt(e.target.value, 10) || 3)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono text-slate-900 focus:outline-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Turnover Notes &amp; CA Verification Requirement
                  </label>
                  <input
                    type="text"
                    value={activeServiceCriteria.turnoverNotes}
                    onChange={(e) => handleUpdateServiceCriteriaField("turnoverNotes", e.target.value)}
                    placeholder="e.g. Audited Balance Sheets & CA Certificate with UDIN"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-blue-500"
                  />
                </div>
              </div>

              {/* Box 2: Experience & Similar Work Criteria (Keyword: 'experience') */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <span>🛠️ Technical Experience &amp; Similar Work</span>
                  </span>
                  <span className="text-[10px] font-mono text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                    Keyword: 'experience'
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Similar Work Definition (Scope) *
                  </label>
                  <textarea
                    rows={2}
                    value={activeServiceCriteria.similarWorkDefinition}
                    onChange={(e) => handleUpdateServiceCriteriaField("similarWorkDefinition", e.target.value)}
                    placeholder="e.g. Comprehensive facility maintenance, MEP, HVAC or electrical O&M"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-blue-500 leading-snug"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1" title="1 work order of 80%">
                      1 Order 80% (₹Cr)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={activeServiceCriteria.singleWorkOrderValueCr || 0}
                      onChange={(e) => handleUpdateServiceCriteriaField("singleWorkOrderValueCr", parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-mono text-slate-800 focus:outline-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1" title="2 work orders of 50% each">
                      2 Orders 50% (₹Cr)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={activeServiceCriteria.twoWorkOrdersValueCr || 0}
                      onChange={(e) => handleUpdateServiceCriteriaField("twoWorkOrdersValueCr", parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-mono text-slate-800 focus:outline-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1" title="3 work orders of 40% each">
                      3 Orders 40% (₹Cr)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={activeServiceCriteria.threeWorkOrdersValueCr || 0}
                      onChange={(e) => handleUpdateServiceCriteriaField("threeWorkOrdersValueCr", parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-mono text-slate-800 focus:outline-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Prior Yrs
                    </label>
                    <input
                      type="number"
                      value={activeServiceCriteria.priorExperienceYears || 7}
                      onChange={(e) => handleUpdateServiceCriteriaField("priorExperienceYears", parseInt(e.target.value, 10) || 7)}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-mono text-slate-800 focus:outline-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Box 3: Financial Net Worth & Solvency (Keyword: 'financial') */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <span>📊 Net Worth &amp; Solvency Criteria</span>
                  </span>
                  <span className="text-[10px] font-mono text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                    Keyword: 'financial'
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Net Worth Requirement
                  </label>
                  <input
                    type="text"
                    value={activeServiceCriteria.netWorthRequirement || ""}
                    onChange={(e) => handleUpdateServiceCriteriaField("netWorthRequirement", e.target.value)}
                    placeholder="e.g. Positive Net Worth as on last audited FY"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Working Capital / Solvency / Credit Limit Requirement
                  </label>
                  <input
                    type="text"
                    value={activeServiceCriteria.workingCapitalRequirement || ""}
                    onChange={(e) => handleUpdateServiceCriteriaField("workingCapitalRequirement", e.target.value)}
                    placeholder="e.g. Fund-based credit limit of minimum 2 Cr"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-blue-500"
                  />
                </div>
              </div>

              {/* Box 4: ISO & Mandatory Certifications (Keyword: 'ISO') */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <span>🎖️ ISO &amp; Statutory Certifications</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    Keyword: 'ISO'
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                    Active Mandatory Standards &amp; Licenses:
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(activeServiceCriteria.mandatoryCertifications || []).map((cert, cIdx) => (
                      <span
                        key={cIdx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-lg text-xs font-medium border border-emerald-300 shadow-2xs"
                      >
                        <Award className="w-3 h-3 text-emerald-700" />
                        <span>{cert}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCertification(cIdx)}
                          className="text-emerald-700 hover:text-rose-600 rounded-full p-0.5 hover:bg-emerald-200/60 cursor-pointer ml-1"
                          title="Remove certification"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {(!activeServiceCriteria.mandatoryCertifications || activeServiceCriteria.mandatoryCertifications.length === 0) && (
                      <span className="text-xs text-slate-400 italic">No certifications configured.</span>
                    )}
                  </div>

                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newCertInput}
                      onChange={(e) => setNewCertInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCertification();
                        }
                      }}
                      placeholder="Add standard e.g. ISO 9001:2015, Electrical License..."
                      className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCertification}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0"
                    >
                      + Add
                    </button>
                  </div>

                  {/* Quick Suggestion Chips */}
                  <div className="flex flex-wrap gap-1 pt-1.5">
                    <span className="text-[10px] text-slate-400 mr-1">Quick Add:</span>
                    {["ISO 9001:2015", "ISO 14001:2015", "ISO 45001:2018", "Electrical Contractor Class-A License"].map((sug) => {
                      if (activeServiceCriteria.mandatoryCertifications?.includes(sug)) return null;
                      return (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => {
                            if (setServiceCriteria) {
                              setServiceCriteria((prev) => ({
                                ...prev,
                                mandatoryCertifications: [...(prev.mandatoryCertifications || []), sug],
                              }));
                            }
                          }}
                          className="text-[10px] text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          + {sug}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Synchronized Status Notification */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-blue-900">
                <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  These criteria directly govern the <strong>Service &amp; O&amp;M Evaluation Engine</strong>. All bidder turnover and experience submissions are evaluated against these live parameters.
                </span>
              </div>

              {onNavigateToServiceEval && (
                <button
                  type="button"
                  onClick={onNavigateToServiceEval}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 underline shrink-0 cursor-pointer"
                >
                  Go to Comparative Statement →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Participating Bidders and Deviation Documents */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
              {metadata.tenderType === "SERVICES_O_AND_M" ? "4" : "3"}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Participating Bidders &amp; Quoted Deviations
              </h2>
              <p className="text-xs text-slate-500">
                {metadata.tenderType === "SERVICES_O_AND_M"
                  ? "Upload each bidder's eligibility dossier and deviation schedule in DOCX, Excel, PDF, or text"
                  : "Upload each bidder's technical & commercial deviation schedule in DOCX, Excel, PDF, or text for deviations analysis"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-400">
              {metadata.tenderType === "SERVICES_O_AND_M" ? "Step 4 of 4" : "Step 3 of 3"}
            </span>
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
                      accept=".docx,.pdf,.xlsx,.xls,.txt,.csv,.zip"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => bidderFileInputRefs.current[bidder.id]?.click()}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                      <span>Upload File (.docx / .pdf / .xlsx / .zip)</span>
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
            Initiate Dealing Officer Evaluation
          </h3>
          <p className="text-xs text-blue-100 max-w-2xl">
            {metadata.tenderType === "SERVICES_O_AND_M"
              ? "Processes all submitted eligibility dossiers & deviations against GCC & NIT criteria. Generates scrutiny matrices, shortfall notices, and comparative evaluations."
              : "Processes all submitted technical & commercial deviations against SBD & NIT clauses. Generates individual bidder evaluations, consolidated comparative deviation matrix, deadlock resolution recommendations, and Word/Excel outputs."}
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
              <span>Run Evaluation</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
