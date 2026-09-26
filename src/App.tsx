import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  FileText,
  Layers,
  Scale,
  Sparkles,
  Bot,
  CheckCircle,
  AlertCircle,
  Download,
  Upload,
  ArrowRight,
  History,
  ShieldCheck,
  Laptop,
  Smartphone,
  X,
} from "lucide-react";
import { Header } from "./components/Header";
import { TenderSetupTab } from "./components/TenderSetupTab";
import { SingleBidderTab } from "./components/SingleBidderTab";
import { ComparativeTab } from "./components/ComparativeTab";
import { HarmonizedClausesTab } from "./components/HarmonizedClausesTab";
import { ContractChatbotTab } from "./components/ContractChatbotTab";
import { AuditTrailTab } from "./components/AuditTrailTab";
import { OfflineDesktopModal } from "./components/OfflineDesktopModal";
import { KnowMeModal } from "./components/KnowMeModal";
import { AndroidPlayStoreModal } from "./components/AndroidPlayStoreModal";
import { MigrationNoticeBanner } from "./components/MigrationNoticeBanner";
import {
  BidderInput,
  ComparativeEvaluation,
  ReviewedClausesData,
  SingleBidderEvaluation,
  TenderDocuments,
  TenderMetadata,
  AuditLogEntry,
  AuditCategory,
  OfficerDirective,
  UploadedFormatTemplate,
} from "./types";
import {
  applyDirectiveToReviewedClauses,
  applyFormatToHarmonizedData,
} from "./utils/formatTemplates";
import {
  DEFAULT_SAMPLE_BIDDERS,
  DEFAULT_SAMPLE_DOCUMENTS,
  SAMPLE_TENDER_METADATA,
  GENERIC_TENDER_METADATA,
  GENERIC_BIDDERS,
  SERVICES_TENDER_METADATA,
  SERVICES_SAMPLE_DOCUMENTS,
  SERVICES_SAMPLE_BIDDERS,
  BLANK_TENDER_METADATA,
  BLANK_DOCUMENTS,
  BLANK_BIDDERS,
} from "./utils/sampleData";
import { ServiceEvaluationTab } from "./components/ServiceEvaluationTab";
import {
  ServiceCriteriaRequirement,
  BidderServiceSubmission,
  InternalGuidelines,
} from "./types/serviceEvaluation";
import {
  SAMPLE_SERVICES_CRITERIA,
  SAMPLE_SERVICE_BIDDERS,
  BLANK_SERVICES_CRITERIA,
  BLANK_SERVICE_BIDDERS,
} from "./utils/serviceSampleData";
import { DEFAULT_SHORTFALL_OT_GUIDELINES } from "./utils/serviceEvaluationEngine";
import {
  DEFAULT_DEALING_OFFICER,
  generateInitialAuditLogs,
  createAuditEntry,
} from "./utils/auditUtils";
import { triggerFileDownload } from "./utils/exportUtils";

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<
    "setup" | "single" | "comparative" | "harmonized" | "service_eval" | "chat" | "audit"
  >("setup");

  // Tender Setup States
  const [metadata, setMetadata] = useState<TenderMetadata>(SAMPLE_TENDER_METADATA);
  const [documents, setDocuments] = useState<TenderDocuments>(DEFAULT_SAMPLE_DOCUMENTS);
  const [bidders, setBidders] = useState<BidderInput[]>(DEFAULT_SAMPLE_BIDDERS);

  // Dealing Officer Profile & Audit Logs States
  const [officerProfile, setOfficerProfile] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("tender_dealing_officer");
      return saved && saved.trim() ? saved : DEFAULT_DEALING_OFFICER;
    } catch {
      return DEFAULT_DEALING_OFFICER;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem("tender_audit_logs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return generateInitialAuditLogs(SAMPLE_TENDER_METADATA, DEFAULT_SAMPLE_BIDDERS, DEFAULT_DEALING_OFFICER);
  });

  // Persist Dealing Officer and Audit Logs in localStorage
  useEffect(() => {
    try {
      localStorage.setItem("tender_dealing_officer", officerProfile);
    } catch {}
  }, [officerProfile]);

  useEffect(() => {
    try {
      localStorage.setItem("tender_audit_logs", JSON.stringify(auditLogs));
    } catch {}
  }, [auditLogs]);

  // Central audit logging action helper
  const logAuditAction = useCallback(
    (
      action: string,
      category: AuditCategory,
      summary: string,
      details?: string,
      entityAffected?: string,
      complianceTag?: string
    ) => {
      const entry = createAuditEntry(
        officerProfile,
        category,
        action,
        summary,
        details,
        entityAffected,
        complianceTag
      );
      setAuditLogs((prev) => [entry, ...prev]);
    },
    [officerProfile]
  );

  // Evaluation Output States
  const [singleEvaluations, setSingleEvaluations] = useState<SingleBidderEvaluation[]>(() => [
    generateFallbackSingleEvaluation(DEFAULT_SAMPLE_BIDDERS[0], SAMPLE_TENDER_METADATA),
  ]);
  const [comparativeEvaluation, setComparativeEvaluation] = useState<ComparativeEvaluation | null>(() =>
    generateFallbackComparativeEvaluation(DEFAULT_SAMPLE_BIDDERS, SAMPLE_TENDER_METADATA)
  );
  const [reviewedClausesData, setReviewedClausesData] = useState<ReviewedClausesData | null>(() =>
    generateFallbackReviewedClauses(SAMPLE_TENDER_METADATA)
  );

  // Service & O&M Eligibility Evaluation States
  const [serviceCriteria, setServiceCriteria] = useState<ServiceCriteriaRequirement>(SAMPLE_SERVICES_CRITERIA);
  const [serviceGuidelines, setServiceGuidelines] = useState<InternalGuidelines>(DEFAULT_SHORTFALL_OT_GUIDELINES);
  const [serviceBidders, setServiceBidders] = useState<BidderServiceSubmission[]>(SAMPLE_SERVICE_BIDDERS);
  const [serviceEvaluationStage, setServiceEvaluationStage] = useState<
    "ROUND_1_INITIAL" | "SHORTFALL_ISSUED" | "ROUND_2_SHORTFALL_EVAL" | "FINAL_ACCEPTED"
  >("ROUND_1_INITIAL");

  // UI States
  const [selectedBidderId, setSelectedBidderId] = useState<string>(DEFAULT_SAMPLE_BIDDERS[0].id);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationStep, setEvaluationStep] = useState<string>("");
  const [isGeneratingHarmonized, setIsGeneratingHarmonized] = useState<boolean>(false);
  const [isDesktopModalOpen, setIsDesktopModalOpen] = useState<boolean>(false);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState<boolean>(false);
  const [isKnowMeModalOpen, setIsKnowMeModalOpen] = useState<boolean>(false);
  const [knowMeInitialTab, setKnowMeInitialTab] = useState<
    "overview" | "features" | "security" | "offline" | "author"
  >("overview");
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((cur) => (cur?.text === text ? null : cur));
    }, 4500);
  };

  // Dealing Officer Directives & Format Template States
  const [officerDirectives, setOfficerDirectives] = useState<OfficerDirective[]>(() => {
    try {
      const saved = localStorage.getItem("contract_officer_directives");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [activeFormatTemplate, setActiveFormatTemplate] = useState<UploadedFormatTemplate | null>(() => {
    try {
      const saved = localStorage.getItem("contract_officer_format");
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  useEffect(() => {
    try {
      localStorage.setItem("contract_officer_directives", JSON.stringify(officerDirectives));
    } catch {}
  }, [officerDirectives]);

  useEffect(() => {
    try {
      if (activeFormatTemplate) {
        localStorage.setItem("contract_officer_format", JSON.stringify(activeFormatTemplate));
      } else {
        localStorage.removeItem("contract_officer_format");
      }
    } catch {}
  }, [activeFormatTemplate]);

  const handleAddDirective = (directive: OfficerDirective) => {
    setOfficerDirectives((prev) => {
      const idx = prev.findIndex((d) => d.id === directive.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = directive;
        return next;
      }
      return [directive, ...prev];
    });

    logAuditAction(
      "Added Officer Directive",
      "Advisory & Directive",
      `Recorded Dealing Officer directive: "${directive.title}" for ${directive.targetClause || "General"}`,
      directive.instruction,
      "Officer Directives",
      "GFR 173 Compliance"
    );
  };

  const handleRemoveDirective = (id: string) => {
    setOfficerDirectives((prev) => prev.filter((d) => d.id !== id));
    logAuditAction(
      "Removed Officer Directive",
      "Advisory & Directive",
      `Removed directive ID: ${id}`,
      undefined,
      "Officer Directives",
      "Directive Revocation"
    );
  };

  const handleToggleDirective = (id: string) => {
    setOfficerDirectives((prev) =>
      prev.map((d) => (d.id === id ? { ...d, active: !d.active } : d))
    );
  };

  const handleApplyDirectiveToOutput = (directive: OfficerDirective) => {
    if (reviewedClausesData) {
      const updated = applyDirectiveToReviewedClauses(reviewedClausesData, directive, metadata);
      setReviewedClausesData(updated);
    }
    logAuditAction(
      "Applied Directive to Output",
      "Advisory & Directive",
      `Improvised Harmonized Clauses based on directive: "${directive.title}"`,
      `Target: ${directive.targetClause || "Harmonized Clauses"} | Details: ${directive.instruction}`,
      "Harmonized Addendum Clauses",
      "GFR Rule 173(xiv)"
    );
  };

  const handleSelectFormatTemplate = (template: UploadedFormatTemplate) => {
    setActiveFormatTemplate(template);
    if (reviewedClausesData) {
      const formatted = applyFormatToHarmonizedData(reviewedClausesData, template, metadata);
      setReviewedClausesData(formatted);
    }
    logAuditAction(
      "Applied Format Template",
      "Template & Format",
      `Aligned output structure with Dealing Officer template: "${template.name}"`,
      `Format Type: ${template.fileType} | Sections Detected: ${template.parsedSections.join(", ")}`,
      "Addendum Document Format",
      "Statutory Template Adherence"
    );
  };

  const handleClearFormatTemplate = () => {
    setActiveFormatTemplate(null);
    logAuditAction(
      "Cleared Format Template",
      "Template & Format",
      "Restored default CVC/GFR Corrigendum format",
      undefined,
      "Addendum Document Format",
      "Default Standard Baseline"
    );
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load realistic turnkey sample data
  const handleLoadSample = () => {
    setMetadata(SAMPLE_TENDER_METADATA);
    setDocuments(DEFAULT_SAMPLE_DOCUMENTS);
    setBidders(DEFAULT_SAMPLE_BIDDERS);
    setSelectedBidderId(DEFAULT_SAMPLE_BIDDERS[0].id);
    setSingleEvaluations([
      generateFallbackSingleEvaluation(DEFAULT_SAMPLE_BIDDERS[0], SAMPLE_TENDER_METADATA),
    ]);
    setComparativeEvaluation(
      generateFallbackComparativeEvaluation(DEFAULT_SAMPLE_BIDDERS, SAMPLE_TENDER_METADATA)
    );
    setReviewedClausesData(generateFallbackReviewedClauses(SAMPLE_TENDER_METADATA));
    setEvaluationError(null);
    logAuditAction(
      "Sample Case Loaded",
      "System & Files",
      "Loaded turnkey FGD EPC sample tender package with 3 participating bidders",
      "Package: Flue Gas Desulphurisation System Package | Ref: NTPC/CC/CS-0042/2026",
      "Tender Case",
      "Sample Case Setup"
    );
    setActiveTab("setup");
  };

  // Load generic turnkey EPC template (applicable for any case)
  const handleLoadGenericCase = () => {
    setMetadata(GENERIC_TENDER_METADATA);
    setDocuments(DEFAULT_SAMPLE_DOCUMENTS);
    setBidders(GENERIC_BIDDERS);
    setSelectedBidderId(GENERIC_BIDDERS[0].id);
    setSingleEvaluations([
      generateFallbackSingleEvaluation(GENERIC_BIDDERS[0], GENERIC_TENDER_METADATA),
    ]);
    setComparativeEvaluation(
      generateFallbackComparativeEvaluation(GENERIC_BIDDERS, GENERIC_TENDER_METADATA)
    );
    setReviewedClausesData(generateFallbackReviewedClauses(GENERIC_TENDER_METADATA));
    setEvaluationError(null);
    logAuditAction(
      "Generic EPC Case Template Loaded",
      "System & Files",
      "Loaded generic turnkey EPC contract template applicable to public procurement packages",
      undefined,
      "Tender Case",
      "Template Initialization"
    );
    setActiveTab("setup");
  };

  // Load Operations & Maintenance (O&M) / Services Case with Eligibility Criteria & Document Scrutiny
  const handleLoadServicesCase = () => {
    setMetadata(SERVICES_TENDER_METADATA);
    setDocuments(SERVICES_SAMPLE_DOCUMENTS);
    setBidders(SERVICES_SAMPLE_BIDDERS);
    setServiceCriteria(SAMPLE_SERVICES_CRITERIA);
    setServiceBidders(SAMPLE_SERVICE_BIDDERS);
    setServiceEvaluationStage("ROUND_1_INITIAL");
    setSelectedBidderId(SAMPLE_SERVICE_BIDDERS[0].bidderId);
    setEvaluationError(null);
    logAuditAction(
      "Services (O&M) Eligibility Case Loaded",
      "System & Files",
      "Loaded Comprehensive O&M / Services case with Financial Turnover and Technical Experience criteria scrutiny",
      `Package: ${SERVICES_TENDER_METADATA.packageTitle}`,
      "Tender Case",
      "Services Template Initialization"
    );
    setActiveTab("service_eval");
  };

  // Start fresh blank case for any live or draft tender
  const handleNewBlankCase = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Start New Blank Case?",
      message: "All current tender metadata, uploaded clauses, bidder deviations, and service eligibility records will be cleared to initialize a completely clean workspace.",
      confirmLabel: "Initialize Blank Case",
      onConfirm: () => {
        setMetadata(BLANK_TENDER_METADATA);
        setDocuments(BLANK_DOCUMENTS);
        setBidders(BLANK_BIDDERS);
        setSelectedBidderId(BLANK_BIDDERS[0].id);
        setSingleEvaluations([]);
        setComparativeEvaluation(null);
        setReviewedClausesData(null);
        setServiceCriteria(BLANK_SERVICES_CRITERIA);
        setServiceBidders(BLANK_SERVICE_BIDDERS);
        setServiceEvaluationStage("ROUND_1_INITIAL");
        setEvaluationError(null);
        logAuditAction(
          "New Blank Case Created",
          "System & Files",
          "Dealing Officer initialized a fresh blank case for custom document upload and evaluation (EPC and Services data cleared)",
          undefined,
          "System State",
          "Case Reset"
        );
        setActiveTab("setup");
        setConfirmDialog(null);
        showToast("Fresh blank case initialized successfully.", "info");
      },
    });
  };

  // Reset all data
  const handleReset = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Reset Tender Workspace?",
      message: "Are you sure you want to reset all active documents, deviation matrix, harmonized clauses, and Services (O&M) eligibility records?",
      confirmLabel: "Reset Workspace",
      onConfirm: () => {
        setMetadata(BLANK_TENDER_METADATA);
        setDocuments(BLANK_DOCUMENTS);
        setBidders(BLANK_BIDDERS);
        setSelectedBidderId(BLANK_BIDDERS[0].id);
        setSingleEvaluations([]);
        setComparativeEvaluation(null);
        setReviewedClausesData(null);
        setServiceCriteria(BLANK_SERVICES_CRITERIA);
        setServiceBidders(BLANK_SERVICE_BIDDERS);
        setServiceEvaluationStage("ROUND_1_INITIAL");
        setEvaluationError(null);
        logAuditAction(
          "Workspace Reset Executed",
          "System & Files",
          "Dealing Officer cleared all active documents, deviation matrix, harmonized clauses, and Services (O&M) data",
          undefined,
          "System State",
          "Re-initialization"
        );
        setActiveTab("setup");
        setConfirmDialog(null);
        showToast("Tender workspace reset completed.", "info");
      },
    });
  };

  // Save entire project to local PC (.sbd-eval file)
  const handleSaveProject = () => {
    const filename = `${(metadata.tenderRefNo || "Tender").replace(/[^a-zA-Z0-9_-]/g, "_")}_Evaluation.sbd-eval`;
    const exportLog = createAuditEntry(
      officerProfile,
      "System & Files",
      "Exported Project Archive (.sbd-eval)",
      `Saved complete project snapshot to local disk`,
      `File: ${filename} | Total Bidders: ${bidders.length} | Audit Logs: ${auditLogs.length + 1} | Directives: ${officerDirectives.length}`,
      "Project Archive",
      "Statutory Archival"
    );
    const updatedAuditLogs = [exportLog, ...auditLogs];
    setAuditLogs(updatedAuditLogs);

    const projectData = {
      version: "2.0",
      savedAt: new Date().toISOString(),
      officerProfile,
      metadata,
      documents,
      bidders,
      singleEvaluations,
      comparativeEvaluation,
      reviewedClausesData,
      officerDirectives,
      activeFormatTemplate,
      serviceCriteria,
      serviceGuidelines,
      serviceBidders,
      serviceEvaluationStage,
      auditLogs: updatedAuditLogs,
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: "application/json",
    });
    triggerFileDownload(blob, filename);
  };

  // Open / Restore project from PC (.sbd-eval or JSON)
  const handleOpenProjectClick = () => {
    fileInputRef.current?.click();
  };

  const handleProjectFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.metadata) setMetadata(data.metadata);
      if (data.documents) setDocuments(data.documents);
      if (data.bidders) {
        setBidders(data.bidders);
        if (data.bidders.length > 0) setSelectedBidderId(data.bidders[0].id);
      }
      if (data.singleEvaluations) setSingleEvaluations(data.singleEvaluations);
      if (data.comparativeEvaluation) setComparativeEvaluation(data.comparativeEvaluation);
      if (data.reviewedClausesData) setReviewedClausesData(data.reviewedClausesData);
      if (data.officerDirectives && Array.isArray(data.officerDirectives)) {
        setOfficerDirectives(data.officerDirectives);
      }
      if (data.activeFormatTemplate !== undefined) {
        setActiveFormatTemplate(data.activeFormatTemplate);
      }
      if (data.serviceCriteria) setServiceCriteria(data.serviceCriteria);
      if (data.serviceGuidelines) setServiceGuidelines(data.serviceGuidelines);
      if (data.serviceBidders && Array.isArray(data.serviceBidders)) setServiceBidders(data.serviceBidders);
      if (data.serviceEvaluationStage) setServiceEvaluationStage(data.serviceEvaluationStage);
      if (data.auditLogs && Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);
      if (data.officerProfile) setOfficerProfile(data.officerProfile);

      logAuditAction(
        "Project Restored from File",
        "System & Files",
        `Restored tender evaluation project from local file: "${file.name}"`,
        `Loaded case: "${data.metadata?.packageTitle || "Tender"}" [Ref: ${data.metadata?.tenderRefNo || "—"}]`,
        "Project Archive",
        "Audit Chain Continuity"
      );

      const targetTab = data.metadata?.tenderType === "SERVICES_O_AND_M"
        ? "service_eval"
        : data.singleEvaluations?.length
        ? "single"
        : "setup";
      setActiveTab(targetTab);
      showToast("Tender evaluation project restored successfully from local file!", "success");
    } catch (err: any) {
      showToast(`Invalid project file: ${err.message}`, "error");
    }
    e.target.value = "";
  };

  // Execute full evaluation pipeline
  const handleRunEvaluation = async (
    directivesOverride?: OfficerDirective[],
    formatOverride?: UploadedFormatTemplate
  ) => {
    const currentDirectives = directivesOverride !== undefined ? directivesOverride : officerDirectives;
    const currentFormat = formatOverride !== undefined ? formatOverride : activeFormatTemplate;
    const activeDirectivesList = currentDirectives.filter((d) => d.active);

    setIsEvaluating(true);
    setEvaluationError(null);
    setEvaluationStep("Initializing Contract Cell Evaluation...");

    try {
      const newSingleEvals: SingleBidderEvaluation[] = [];

      // Step 1: Evaluate each bidder individually
      for (let i = 0; i < bidders.length; i++) {
        const bidder = bidders[i];
        if (!bidder.deviationFileText.trim()) continue;

        setEvaluationStep(`Evaluating Bidder ${i + 1} of ${bidders.length} (${bidder.name})...`);

        try {
          const res = await fetch("/api/evaluate-single-bidder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bidderName: bidder.name,
              packageTitle: metadata.packageTitle,
              sbdContext: documents.sbdText,
              nitContext: documents.nitText,
              deviationsText: bidder.deviationFileText,
              officerDirectives: activeDirectivesList,
            }),
          });

          const data = await res.json();
          if (res.ok && data.success && data.data) {
            newSingleEvals.push({
              ...data.data,
              bidderId: bidder.id,
              bidderName: bidder.name,
              evaluationDate: new Date().toISOString().split("T")[0],
            });
          } else {
            console.warn(`Server evaluation warning for ${bidder.name}:`, data.error);
            newSingleEvals.push(generateFallbackSingleEvaluation(bidder, metadata));
          }
        } catch (callErr) {
          console.warn("Falling back to local evaluation synthesis:", callErr);
          newSingleEvals.push(generateFallbackSingleEvaluation(bidder, metadata));
        }
      }

      setSingleEvaluations(newSingleEvals);
      if (newSingleEvals.length > 0) {
        setSelectedBidderId(newSingleEvals[0].bidderId);
      }

      // Step 2: Consolidated Comparative Evaluation across all bidders
      setEvaluationStep("Generating Consolidated Comparative Matrix...");
      try {
        const compRes = await fetch("/api/evaluate-comparative", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packageTitle: metadata.packageTitle,
            sbdContext: documents.sbdText,
            nitContext: documents.nitText,
            bidders: bidders.map((b) => ({
              name: b.name,
              deviationsText: b.deviationFileText,
            })),
            officerDirectives: activeDirectivesList,
            customFormat: currentFormat,
          }),
        });

        const compData = await compRes.json();
        if (compRes.ok && compData.success && compData.data) {
          setComparativeEvaluation({
            ...compData.data,
            evaluationDate: new Date().toISOString().split("T")[0],
          });
        } else {
          setComparativeEvaluation(generateFallbackComparativeEvaluation(bidders, metadata));
        }
      } catch {
        setComparativeEvaluation(generateFallbackComparativeEvaluation(bidders, metadata));
      }

      // Step 3: Formulate Reviewed Clauses for deadlocked areas
      setEvaluationStep("Formulating Harmonized & Reviewed Clauses...");
      try {
        const revRes = await fetch("/api/suggest-reviewed-clauses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packageTitle: metadata.packageTitle,
            sbdContext: documents.sbdText,
            deadlockDeviations: bidders.map((b) => ({
              bidder: b.name,
              deviations: b.deviationFileText,
            })),
            officerDirectives: activeDirectivesList,
            customFormat: currentFormat,
          }),
        });

        const revData = await revRes.json();
        if (revRes.ok && revData.success && revData.data) {
          let clausesResult = revData.data;
          // Apply client-side template alignment if template is active
          if (currentFormat) {
            clausesResult = applyFormatToHarmonizedData(clausesResult, currentFormat, metadata);
          }
          setReviewedClausesData(clausesResult);
        } else {
          let fallbackClauses = generateFallbackReviewedClauses(metadata);
          if (activeDirectivesList.length > 0) {
            activeDirectivesList.forEach((dir) => {
              fallbackClauses = applyDirectiveToReviewedClauses(fallbackClauses, dir, metadata);
            });
          }
          if (currentFormat) {
            fallbackClauses = applyFormatToHarmonizedData(fallbackClauses, currentFormat, metadata);
          }
          setReviewedClausesData(fallbackClauses);
        }
      } catch {
        let fallbackClauses = generateFallbackReviewedClauses(metadata);
        if (activeDirectivesList.length > 0) {
          activeDirectivesList.forEach((dir) => {
            fallbackClauses = applyDirectiveToReviewedClauses(fallbackClauses, dir, metadata);
          });
        }
        if (currentFormat) {
          fallbackClauses = applyFormatToHarmonizedData(fallbackClauses, currentFormat, metadata);
        }
        setReviewedClausesData(fallbackClauses);
      }

      const hasDirectivesOrFormat = activeDirectivesList.length > 0 || Boolean(currentFormat);
      logAuditAction(
        hasDirectivesOrFormat
          ? "Re-ran Evaluation (Directives & Format Applied)"
          : "Executed Deviation Evaluation Pipeline",
        "Evaluation",
        hasDirectivesOrFormat
          ? `Improvised evaluation for ${bidders.length} bidders adhering to ${activeDirectivesList.length} directive(s) & template: "${currentFormat?.name || "Standard"}"`
          : `Completed full evaluation for ${bidders.length} participating bidders`,
        `Evaluated: ${bidders.map((b) => b.name).join(", ")}. Generated single bidder matrices, comparative analysis, and reviewed clauses.`,
        "Evaluation Engine",
        "GFR 173 Evaluation Compliance"
      );

      setActiveTab("harmonized");
    } catch (err: any) {
      console.error("Evaluation failure:", err);
      setEvaluationError(err.message || "An error occurred during evaluation.");
    } finally {
      setIsEvaluating(false);
      setEvaluationStep("");
    }
  };

  // Regenerate reviewed clauses specifically
  const handleGenerateReviewedClauses = async (
    directivesOverride?: OfficerDirective[],
    formatOverride?: UploadedFormatTemplate
  ) => {
    const currentDirectives = directivesOverride !== undefined ? directivesOverride : officerDirectives;
    const currentFormat = formatOverride !== undefined ? formatOverride : activeFormatTemplate;
    const activeDirectivesList = currentDirectives.filter((d) => d.active);

    setIsGeneratingHarmonized(true);
    try {
      const res = await fetch("/api/suggest-reviewed-clauses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageTitle: metadata.packageTitle,
          sbdContext: documents.sbdText,
          deadlockDeviations: bidders.map((b) => ({
            bidder: b.name,
            deviations: b.deviationFileText,
          })),
          officerDirectives: activeDirectivesList,
          customFormat: currentFormat,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.data) {
        let finalClauses = data.data;
        if (currentFormat) {
          finalClauses = applyFormatToHarmonizedData(finalClauses, currentFormat, metadata);
        }
        setReviewedClausesData(finalClauses);
      } else {
        let fallbackClauses = generateFallbackReviewedClauses(metadata);
        if (activeDirectivesList.length > 0) {
          activeDirectivesList.forEach((dir) => {
            fallbackClauses = applyDirectiveToReviewedClauses(fallbackClauses, dir, metadata);
          });
        }
        if (currentFormat) {
          fallbackClauses = applyFormatToHarmonizedData(fallbackClauses, currentFormat, metadata);
        }
        setReviewedClausesData(fallbackClauses);
      }

      logAuditAction(
        "Formulated Harmonized Clauses",
        "Harmonization",
        "Synthesized revised clauses and draft Addendum Preamble for deadlock resolution",
        `Side-by-side comparative table, CVC audit defense. Directives active: ${activeDirectivesList.length}. Format: ${currentFormat?.name || "Standard"}.`,
        "Harmonized Addendum Clauses",
        "GFR 2017 Rule 173(xiv)"
      );
    } catch {
      let fallbackClauses = generateFallbackReviewedClauses(metadata);
      if (activeDirectivesList.length > 0) {
        activeDirectivesList.forEach((dir) => {
          fallbackClauses = applyDirectiveToReviewedClauses(fallbackClauses, dir, metadata);
        });
      }
      if (currentFormat) {
        fallbackClauses = applyFormatToHarmonizedData(fallbackClauses, currentFormat, metadata);
      }
      setReviewedClausesData(fallbackClauses);
    } finally {
      setIsGeneratingHarmonized(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* System Migration / New URL Notice */}
      <MigrationNoticeBanner />

      {/* Hidden File Input for Restoring .sbd-eval Projects */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleProjectFileChange}
        accept=".sbd-eval,.json"
        className="hidden"
      />

      {/* Main Header */}
      <Header
        metadata={metadata}
        onLoadSample={handleLoadSample}
        onLoadGenericCase={handleLoadGenericCase}
        onLoadServicesCase={handleLoadServicesCase}
        onNewBlankCase={handleNewBlankCase}
        onSaveProject={handleSaveProject}
        onOpenProject={handleOpenProjectClick}
        onOpenDesktopModal={() => setIsDesktopModalOpen(true)}
        onOpenAndroidModal={() => setIsAndroidModalOpen(true)}
        onOpenKnowMeModal={(tab) => {
          setKnowMeInitialTab(tab || "overview");
          setIsKnowMeModalOpen(true);
        }}
        onReset={handleReset}
        hasActiveData={Boolean(
          documents.sbdText ||
          singleEvaluations.length ||
          comparativeEvaluation ||
          serviceBidders.some(
            (b) =>
              b.turnoverDocuments.length > 0 ||
              b.experienceDocuments.length > 0 ||
              (b.financialEvaluation && b.financialEvaluation.averageTurnoverCr > 0)
          )
        )}
      />

      {/* Navigation Sub-Header Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-[73px] z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between overflow-x-auto">
          <nav className="flex space-x-1 sm:space-x-2 py-2">
            {/* Tab 1: Setup */}
            <button
              onClick={() => setActiveTab("setup")}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                activeTab === "setup"
                  ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>1. Tender &amp; Documents Setup</span>
              {documents.sbdText && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>

            {/* If Service tender: Show Service Eligibility & Shortfall Evaluation Tab */}
            {metadata.tenderType === "SERVICES_O_AND_M" ? (
              <button
                onClick={() => setActiveTab("service_eval")}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "service_eval"
                    ? "bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs font-bold"
                    : "text-purple-700 hover:text-purple-900 hover:bg-purple-50/60"
                }`}
              >
                <Layers className="w-4 h-4 text-purple-600" />
                <span>2. Service Eligibility &amp; Shortfall Evaluation</span>
                <span className="text-[10px] bg-purple-200 text-purple-900 px-1.5 py-0.2 rounded-full font-bold">
                  {serviceBidders.length} Bidders
                </span>
              </button>
            ) : (
              <>
                {/* Tab 2: Single Bidder Evaluation for EPC */}
                <button
                  onClick={() => setActiveTab("single")}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                    activeTab === "single"
                      ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>2. Individual Bidder Evaluation</span>
                  {singleEvaluations.length > 0 && (
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-bold">
                      {singleEvaluations.length}
                    </span>
                  )}
                </button>

                {/* Tab 3: Consolidated Deviation Matrix for EPC */}
                <button
                  onClick={() => setActiveTab("comparative")}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                    activeTab === "comparative"
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Scale className="w-4 h-4 text-indigo-600" />
                  <span>3. Consolidated Deviation Matrix</span>
                  {comparativeEvaluation && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  )}
                </button>

                {/* Tab 4: Reviewed / Harmonized Clauses for EPC */}
                <button
                  onClick={() => setActiveTab("harmonized")}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                    activeTab === "harmonized"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>4. Reviewed Clauses &amp; Addendum</span>
                  {reviewedClausesData && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </button>
              </>
            )}

            {/* Tab: Dealing Officer AI Chatbot */}
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                activeTab === "chat"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Bot className="w-4 h-4 text-amber-400" />
              <span>Dealing Officer Chatbot</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full">
                Persistent
              </span>
            </button>

            {/* Tab: Audit Trail & Statutory Log */}
            <button
              id="nav-tab-audit"
              onClick={() => setActiveTab("audit")}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                activeTab === "audit"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <History className="w-4 h-4 text-emerald-400" />
              <span>Audit Trail</span>
              {auditLogs.length > 0 && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-full font-bold">
                  {auditLogs.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Error Notification Banner if any */}
        {evaluationError && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-bold">Evaluation Notice:</strong>
              <span>{evaluationError}</span>
            </div>
            <button
              onClick={() => setEvaluationError(null)}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab 1: Tender Setup */}
        {activeTab === "setup" && (
          <TenderSetupTab
            metadata={metadata}
            setMetadata={setMetadata}
            documents={documents}
            setDocuments={setDocuments}
            bidders={bidders}
            setBidders={setBidders}
            onRunEvaluation={handleRunEvaluation}
            isEvaluating={isEvaluating}
            evaluationStep={evaluationStep}
            onLogAudit={logAuditAction}
          />
        )}

        {/* Tab: Service & O&M Eligibility & Shortfall Evaluation */}
        {activeTab === "service_eval" && (
          <ServiceEvaluationTab
            metadata={metadata}
            criteria={serviceCriteria}
            setCriteria={setServiceCriteria}
            guidelines={serviceGuidelines}
            setGuidelines={setServiceGuidelines}
            bidders={serviceBidders}
            setBidders={setServiceBidders}
            evaluationStage={serviceEvaluationStage}
            setEvaluationStage={setServiceEvaluationStage}
            onLogAudit={logAuditAction}
          />
        )}

        {/* Tab 2: Single Bidder Evaluation (EPC) */}
        {activeTab === "single" && (
          <SingleBidderTab
            evaluations={singleEvaluations}
            selectedBidderId={selectedBidderId}
            onSelectBidderId={setSelectedBidderId}
          />
        )}

        {/* Tab 3: Comparative Matrix */}
        {activeTab === "comparative" && (
          <ComparativeTab
            comparativeData={comparativeEvaluation}
            officerDirectives={officerDirectives}
            activeFormatTemplate={activeFormatTemplate}
            onOpenChatbot={() => setActiveTab("chat")}
            onReRunAnalysis={() => handleRunEvaluation()}
          />
        )}

        {/* Tab 4: Reviewed / Harmonized Clauses */}
        {activeTab === "harmonized" && (
          <HarmonizedClausesTab
            reviewedData={reviewedClausesData}
            metadata={metadata}
            onGenerateReviewedClauses={handleGenerateReviewedClauses}
            isGenerating={isGeneratingHarmonized}
            officerDirectives={officerDirectives}
            activeFormatTemplate={activeFormatTemplate}
            onOpenChatbot={() => setActiveTab("chat")}
            onReRunAnalysis={() => handleRunEvaluation()}
          />
        )}

        {/* Tab 5: Dealing Officer AI Chatbot */}
        {activeTab === "chat" && (
          <ContractChatbotTab
            metadata={metadata}
            sbdSummary={documents.sbdText}
            nitSummary={documents.nitText}
            biddersInfo={bidders.map((b) => ({
              name: b.name,
              deviationPreview: b.deviationFileText,
            }))}
            officerDirectives={officerDirectives}
            onAddDirective={handleAddDirective}
            onRemoveDirective={handleRemoveDirective}
            onToggleDirective={handleToggleDirective}
            onApplyDirectiveToOutput={handleApplyDirectiveToOutput}
            activeFormatTemplate={activeFormatTemplate}
            onSelectFormatTemplate={handleSelectFormatTemplate}
            onClearFormatTemplate={handleClearFormatTemplate}
            onReRunAnalysis={() => handleRunEvaluation()}
            isReRunningAnalysis={isEvaluating}
            onNavigateToTab={(tab) => {
              if (
                tab === "setup" ||
                tab === "single" ||
                tab === "comparative" ||
                tab === "harmonized" ||
                tab === "chat" ||
                tab === "audit"
              ) {
                setActiveTab(tab);
              }
            }}
          />
        )}

        {/* Tab 6: Audit Trail & Compliance Log */}
        {activeTab === "audit" && (
          <AuditTrailTab
            auditLogs={auditLogs}
            metadata={metadata}
            officerProfile={officerProfile}
            onUpdateOfficerProfile={(newProf) => {
              setOfficerProfile(newProf);
              logAuditAction(
                "Updated Officer Profile",
                "Officer Note",
                `Dealing Officer identity updated to: "${newProf}"`,
                undefined,
                "Officer Authority",
                "Statutory Officer Record"
              );
            }}
            onAddManualLog={(entry) => {
              const newEntry = createAuditEntry(
                entry.officer || officerProfile,
                entry.category,
                entry.action,
                entry.summary,
                entry.details,
                entry.entityAffected,
                entry.complianceTag
              );
              setAuditLogs((prev) => [newEntry, ...prev]);
            }}
            onClearLogs={() => {
              setConfirmDialog({
                isOpen: true,
                title: "Reset Audit Trail Logs?",
                message: "Reset all audit trail logs back to initial tender baseline? Historical log entries will be refreshed.",
                confirmLabel: "Reset Audit Trail",
                onConfirm: () => {
                  const initLogs = generateInitialAuditLogs(metadata, bidders, officerProfile);
                  setAuditLogs(initLogs);
                  setConfirmDialog(null);
                  showToast("Audit trail restored to tender baseline.", "info");
                },
              });
            }}
          />
        )}
      </main>

      {/* Page Footer with Author ADM Attribution & Security Notices */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs mt-auto py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left Column: Organization & Project Cell */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 text-center sm:text-left">
            <div className="w-9 h-9 rounded-lg bg-blue-900/60 border border-blue-400/30 flex items-center justify-center text-blue-300 font-black text-sm">
              ADM
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="font-bold text-slate-200 text-sm">
                  Tender Evaluation Tool
                </span>
                <span className="bg-slate-800 text-cyan-300 text-[10px] px-2 py-0.5 rounded font-mono border border-slate-700">
                  EPC &amp; SERVICES
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Comprehensive Public Sector Tender Evaluation &amp; Contract Compliance System
              </p>
            </div>
          </div>

          {/* Middle Column: Author Mention */}
          <div className="text-center bg-slate-950/70 border border-slate-800 px-5 py-2.5 rounded-xl shadow-inner">
            <div className="text-xs text-slate-300">
              Designed, Architected &amp; Authored by{" "}
              <strong className="text-blue-400 font-black tracking-wide text-sm">
                ADM
              </strong>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Standard Bidding Document Administrative Decision-Support
            </p>
          </div>

          {/* Right Column: Quick Action Links */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <button
              onClick={() => {
                setKnowMeInitialTab("security");
                setIsKnowMeModalOpen(true);
              }}
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="underline">Data Privacy</span>
            </button>
            <span className="text-slate-700">|</span>
            <button
              onClick={() => {
                setKnowMeInitialTab("offline");
                setIsKnowMeModalOpen(true);
              }}
              className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
            >
              <Laptop className="w-3.5 h-3.5 text-cyan-400" />
              <span className="underline">Offline .EXE</span>
            </button>
            <span className="text-slate-700">|</span>
            <button
              onClick={() => setIsAndroidModalOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="underline">Android / Play Store</span>
            </button>
          </div>
        </div>

        {/* Legal & Compliance sub-line */}
        <div className="max-w-7xl mx-auto mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <div>
            Statutory Alignment: GFR 2017 Rule 173(xiv) &amp; CVC Norms • Local In-Browser RAM Execution (Privacy-by-Design) • Non-Legal Advisory Tool
          </div>
          <div>
            Confidential PSU &amp; Government Works Evaluation • Author: <strong className="text-blue-400 font-bold">ADM</strong>
          </div>
        </div>
      </footer>

      {/* Desktop / Offline Modal */}
      <OfflineDesktopModal
        isOpen={isDesktopModalOpen}
        onClose={() => setIsDesktopModalOpen(false)}
        onSaveProject={handleSaveProject}
        onOpenProject={handleOpenProjectClick}
      />

      {/* Know About Me Modal */}
      <KnowMeModal
        isOpen={isKnowMeModalOpen}
        onClose={() => setIsKnowMeModalOpen(false)}
        onOpenOfflineModal={() => setIsDesktopModalOpen(true)}
        initialTab={knowMeInitialTab}
      />

      {/* Android & Google Play Store Modal */}
      <AndroidPlayStoreModal
        isOpen={isAndroidModalOpen}
        onClose={() => setIsAndroidModalOpen(false)}
      />

      {/* In-App Confirmation Modal */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{confirmDialog.title}</h3>
                <p className="text-xs text-slate-500">Tender Administration Confirmation</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
              >
                {confirmDialog.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global In-App Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200 border transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-950 text-emerald-100 border-emerald-600"
              : toastMessage.type === "error"
              ? "bg-rose-950 text-rose-100 border-rose-600"
              : "bg-slate-900 text-slate-100 border-slate-700"
          }`}
        >
          <CheckCircle className={`w-4 h-4 shrink-0 ${toastMessage.type === "success" ? "text-emerald-400" : toastMessage.type === "error" ? "text-rose-400" : "text-cyan-400"}`} />
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 p-0.5 text-slate-400 hover:text-white rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// Fallback Synthesis Helpers if Gemini API is in transit or offline
function generateFallbackSingleEvaluation(
  bidder: BidderInput,
  metadata: TenderMetadata
): SingleBidderEvaluation {
  return {
    bidderId: bidder.id,
    bidderName: bidder.name,
    packageTitle: metadata.packageTitle || "Enter Case Name",
    evaluationDate: new Date().toISOString().split("T")[0],
    executiveSummary: `The technical and commercial deviation schedule submitted by ${bidder.name} has been evaluated by the Project Contracts Cell against SBD GCC & SCC stipulations. The bidder has quoted deviations touching upon Liquidated Damages (LD) ceiling, payment milestones, Performance Bank Guarantee validity, and Limitation of Liability. While deviations on LD ceiling and Risk & Cost purchase are unacceptable under CVC guidelines, certain procedural adjustments regarding dispatch documentation and extended warranty caps can be reconciled through structured pre-award discussions.`,
    riskRating: "Medium",
    totalDeviationsCount: 5,
    summaryCounts: {
      unconditionalWithdrawal: 2,
      conditionalAcceptance: 2,
      caApprovalRequired: 1,
      acceptable: 0,
    },
    deviations: [
      {
        slNo: 1,
        clauseNo: "SBD GCC Clause 27.2",
        tenderClauseTitle: "Liquidated Damages for Delay (10% Cap)",
        originalTenderProvision: "LD @ 0.5% per week subject to maximum ceiling of 10% of total contract price.",
        bidderQuotedDeviation: "Requests LD to be capped at 5% of uncompleted portion of work only.",
        deviationCategory: "Commercial",
        impactOnBuyerInterest: "Dramatically weakens contractual deterrence against schedule slippage; exposing the Employer to commissioning delays and loss of production without financial compensation.",
        psuDealingOfficerComments: "Unacceptable. SBD and CVC circulars mandate 10% LD ceiling on total contract price for turnkey packages to ensure milestone integrity.",
        recommendedAction: "Unconditional Withdrawal Required",
        suggestedCounterProposalOrConditions: "Insist on 10% overall LD cap. As a win-win compromise, offer to levy LD on milestone delay with full refund upon timely integrated commercial commissioning.",
        riskScore: "Critical",
      },
      {
        slNo: 2,
        clauseNo: "SBD GCC Clause 18.2",
        tenderClauseTitle: "Supply Payment Milestones (Dispatch vs Site MRC)",
        originalTenderProvision: "70% supply payment upon physical receipt of equipment at plant site in good condition and issuance of MRC.",
        bidderQuotedDeviation: "Requests 70% supply payment against dispatch documents (LR/RR, Inspection Certificate, Dispatch Clearance).",
        deviationCategory: "Financial",
        impactOnBuyerInterest: "Shifts transit loss risk and storage verification burden to buyer; potential dispute if equipment arrives damaged or incomplete.",
        psuDealingOfficerComments: "Partial acceptance possible with protective financial instrument. Releasing full 70% without site receipt is not compliant with internal finance rules.",
        recommendedAction: "Acceptable with Conditions",
        suggestedCounterProposalOrConditions: "Release 60% against dispatch documents + 10% upon Material Receipt Certificate (MRC) within 30 days of arrival at site.",
        riskScore: "Major",
      },
      {
        slNo: 3,
        clauseNo: "SBD GCC Clause 13.1",
        tenderClauseTitle: "Contract Performance Bank Guarantee (10% PBG)",
        originalTenderProvision: "10% PBG valid through Defect Liability Period + 90 days claim period.",
        bidderQuotedDeviation: "Proposes 5% PBG initially, increased to 10% only after civil works; claim period 30 days.",
        deviationCategory: "Commercial",
        impactOnBuyerInterest: "Leaves buyer under-secured during the high-risk early phase of detailed engineering and foundational casting.",
        psuDealingOfficerComments: "Phased PBG is contrary to SBD. However, reduction of claim period to 30 days beyond validity is acceptable in line with IBA/RBI guidelines.",
        recommendedAction: "Unconditional Withdrawal Required",
        suggestedCounterProposalOrConditions: "Bidder must furnish 10% PBG upfront within 30 days of LOA as per SBD. Claim period of 60 days can be agreed.",
        riskScore: "Critical",
      },
      {
        slNo: 4,
        clauseNo: "SBD GCC Clause 38.0",
        tenderClauseTitle: "Limitation of Liability & Indirect Losses",
        originalTenderProvision: "Aggregate liability capped at 100% of contract value; gross negligence and statutory indemnities excluded.",
        bidderQuotedDeviation: "Requests aggregate liability cap of 50%, with mutual exclusion of indirect/consequential damages.",
        deviationCategory: "Legal",
        impactOnBuyerInterest: "A 50% cap does not cover catastrophic plant failure; however, mutual exclusion of indirect/loss of production damages is standard EPC international practice.",
        psuDealingOfficerComments: "Acceptable in part with CA approval. Retain 100% aggregate liability cap while agreeing to mutual exclusion of consequential damages (loss of production, profit).",
        recommendedAction: "Requires CA & Finance Concurrence",
        suggestedCounterProposalOrConditions: "Draft standard mutual waiver of consequential damages, retaining 100% overall contract price liability for direct damages.",
        riskScore: "Major",
      },
      {
        slNo: 5,
        clauseNo: "SBD GCC Clause 29.3",
        tenderClauseTitle: "Defect Liability Extension on Replaced Parts",
        originalTenderProvision: "Extended warranty of 12 months for any part replaced during DLP without cumulative cap.",
        bidderQuotedDeviation: "Requests cumulative warranty on replaced parts to be capped at 24 months from initial commissioning date.",
        deviationCategory: "Commercial",
        impactOnBuyerInterest: "Negligible risk; standard industry norm to avoid open-ended perpetual warranty liabilities on OEM contractors.",
        psuDealingOfficerComments: "Reasonable commercial request. Capping extended DLP at 24 months protects supplier from indefinite exposure while providing 2 full years of operational coverage.",
        recommendedAction: "Acceptable with Conditions",
        suggestedCounterProposalOrConditions: "Accept 24 months cumulative cap provided critical proprietary items (e.g. PLC, main ID fan rotors) are guaranteed for 12 months from their specific replacement.",
        riskScore: "Minor",
      },
    ],
    meetingAgendaPoints: [
      "Demand unconditional withdrawal of 5% LD ceiling request and reaffirm 10% maximum penalty as per CVC norms.",
      "Negotiate payment milestone split: 60% on dispatch documentation + 10% on physical site delivery (MRC).",
      "Reject phased PBG proposal; confirm submission of 10% PBG upfront within 30 days of LOA.",
      "Finalize limitation of liability wording with mutual exclusion of indirect loss of production.",
      "Agree on 24-month cumulative ceiling for replaced component warranty.",
    ],
    officerSignOffNote: `NOTE TO TENDER COMMITTEE / GENERAL MANAGER (PROJECT CONTRACTS)
Subject: Pre-Award Technical & Commercial Evaluation of Deviations quoted by ${bidder.name} against Tender No. ${metadata.tenderRefNo || "Enter Case No"}.

1. The commercial and technical deviations submitted by ${bidder.name} have been scrutinized in detail. The bidder has quoted deviations on key clauses including LD (27.2), Payment Terms (18.2), and PBG (13.1).
2. It is submitted that the deviation regarding dilution of LD to 5% is contrary to CVC guidelines and cannot be accepted. The bidder shall be called for pre-award discussions and directed to unconditionally withdraw this deviation.
3. However, with regard to payment terms and limitation of liability, the counter-proposals outlined in the evaluation matrix ensure a win-win resolution without compromising the financial or legal interests of the Employer.
4. Placed before the Tender Committee for consideration and approval to issue discussion letter to ${bidder.name}.`,
  };
}

function generateFallbackComparativeEvaluation(
  bidders: BidderInput[],
  metadata: TenderMetadata
): ComparativeEvaluation {
  return {
    packageTitle: metadata.packageTitle || "Enter Case Name",
    evaluationDate: new Date().toISOString().split("T")[0],
    totalBiddersEvaluated: bidders.length,
    comparativeExecutiveSummary: `All participating bidders (${bidders.map((b) => b.name).join(", ")}) have submitted deviation schedules under Annexure IV & V. A comparative analysis reveals that industry-wide pushback is concentrated on three primary contract stipulations: (1) Liquidated Damages ceiling and applicability on intermediate milestones, (2) Progressive supply payment release against dispatch vs site MRC, and (3) Fixed-price basis versus Price Variation Clause (PVC) on steel and cement. To preserve competition and avoid a single-tender impasse while maintaining strict vigilance compliance, a unified counter-position must be adopted across all bidders.`,
    biddersSummary: bidders.map((b, i) => ({
      bidderName: b.name,
      deviationCount: 5,
      criticalDeviations: i === 0 ? 2 : 1,
      generalPosture: i === 0 ? "Moderate" : i === 1 ? "Rigid" : "Cooperative",
      overallRecommendation:
        "Call for negotiation meeting; insist on unconditional withdrawal of fatal deviations while offering standardized counter-proposals on payment milestones.",
    })),
    comparativeMatrix: [
      {
        clauseOrTheme: "Liquidated Damages (GCC 27.2)",
        tenderSBDProvision: "0.5% per week delay up to 10% maximum ceiling on total contract price.",
        bidderStances: bidders.map((b) => ({
          bidderName: b.name,
          quotedDeviation: "Seeking reduction of LD cap from 10% to 5% - 7.5% and applicability to delayed portion only.",
          impact: "Dramatically reduces deterrent against project delays.",
          action: "Unconditional Withdrawal Required",
        })),
        officerComparativeAnalysis: "All bidders seek dilution of LD. CVC guidelines strictly prohibit post-tender relaxation of LD ceiling. Concession here would vitiate tender sanctity.",
        recommendedHarmonizedStrategy: "Adopt a firm and non-negotiable stance on 10% overall LD ceiling for all bidders. However, agree to levy LD on milestone delays conditionally with full reimbursement upon timely commercial commissioning.",
      },
      {
        clauseOrTheme: "Supply Payment Terms (GCC 18.2)",
        tenderSBDProvision: "70% supply payment on physical receipt at site and MRC issuance.",
        bidderStances: bidders.map((b) => ({
          bidderName: b.name,
          quotedDeviation: "Seeking 70% - 80% payment upon dispatch documents (LR/RR, Inspection Certificate).",
          impact: "Increases transit and handling risk before plant receipt.",
          action: "Acceptable with Conditions",
        })),
        officerComparativeAnalysis: "Genuine industry cash flow constraint due to rail/road logistics and gate entry turnaround times at plant site.",
        recommendedHarmonizedStrategy: "Uniformly offer 60% payment against dispatch documents (LR/RR + Employer's Inspection Note) and 10% upon Material Receipt Certificate (MRC) within 30 days of arrival.",
      },
      {
        clauseOrTheme: "Price Variation vs Firm Price (GCC 23.1)",
        tenderSBDProvision: "Firm and fixed price for 20-month duration; no escalation payable.",
        bidderStances: bidders.map((b) => ({
          bidderName: b.name,
          quotedDeviation: "Requesting RBI Price Variation Clause (PVC) for structural steel, cement, and copper.",
          impact: "Introduces budgetary uncertainty into turnkey capex.",
          action: "Requires CA & Finance Concurrence",
        })),
        officerComparativeAnalysis: "For turnkey EPC packages exceeding 18 months, GFR and Ministry guidelines allow PVC for major raw materials to prevent excessive contingency buffers in price bids.",
        recommendedHarmonizedStrategy: "Evaluate whether to issue Corrigendum introducing standard public sector / CPWD formula for steel and cement with a neutral band of +/- 5% to preserve budget certainty.",
      },
      {
        clauseOrTheme: "Limitation of Liability (GCC 38.0)",
        tenderSBDProvision: "Aggregate liability 100% of contract price; indemnities excluded.",
        bidderStances: bidders.map((b) => ({
          bidderName: b.name,
          quotedDeviation: "Seeking 50% cap and express mutual waiver of indirect / loss of production damages.",
          impact: "Loss of production waiver is standard; 50% overall cap is risky.",
          action: "Acceptable with Conditions",
        })),
        officerComparativeAnalysis: "International and Indian turnkey practice universally excludes consequential loss/loss of profit. Retaining 100% direct liability gives adequate protection.",
        recommendedHarmonizedStrategy: "Accept mutual exclusion of indirect and consequential damages across all bidders while keeping direct aggregate liability strictly capped at 100% of contract price.",
      },
    ],
    commonDeadlockAreas: [
      {
        topic: "Liquidated Damages (LD) Ceiling",
        reasons: "Bidders are reluctant to accept 10% overall LD risk on EPC packages where third-party interface delays (e.g. site readiness, power supply) may occur.",
        recommendedWayForward: "Maintain 10% cap but include clear contract mechanisms for timely extension of time (EOT) without LD for employer-attributable delays.",
      },
      {
        topic: "Progressive Supply Payment Release",
        reasons: "Unloading and site storage delays at project site block contractor liquidity for up to 60-90 days.",
        recommendedWayForward: "Incorporate a 60% dispatch + 10% site delivery milestone structure with deemed MRC clause if inspection takes over 30 days.",
      },
    ],
    tenderCommitteeRecommendations: `RECOMMENDATIONS TO TENDER COMMITTEE:
1. Conduct pre-award clarification meetings with all qualified bidders in parallel to ensure complete transparency and a level playing field.
2. Direct all bidders to unconditionally withdraw commercial deviations on LD ceiling (10%) and Risk & Cost purchase (GCC 32.0).
3. Authorize the dealing officer to offer the harmonized compromise on payment milestones (60% dispatch + 10% MRC) and mutual exclusion of consequential damages under GCC 38.0.
4. Prepare draft Corrigendum / Addendum incorporating the reviewed clauses for Competent Authority approval.`,
  };
}

function generateFallbackReviewedClauses(metadata: TenderMetadata): ReviewedClausesData {
  return {
    packageTitle: metadata.packageTitle || "Enter Case Name",
    harmonizationOverview: `Where bidders have quoted common deviations that threaten to cause a procurement deadlock or single-tender situation, the Dealing Officer has formulated reviewed and harmonized clauses. These revised clauses grant procedural flexibility in cash flow and liability risk while rigorously safeguarding Employer's legal rights, financial recovery mechanisms, and public procurement vigilance standards.`,
    reviewedClauses: [
      {
        clauseNumber: "GCC Clause 27.2",
        clauseTitle: "Liquidated Damages for Delay in Execution",
        originalClauseText: "If the Contractor fails to achieve milestone completion or commercial commissioning within the stipulated schedule, the Contractor shall pay to the Employer, not as a penalty but as agreed Liquidated Damages, an amount equal to 0.5% of the total Contract Value for each week of delay or part thereof, subject to a maximum ceiling of 10% of the total Contract Price.",
        biddersContentionSummary: "Multiple bidders requested reduction of LD ceiling to 5% and computation based strictly on delayed portion of works.",
        proposedReviewedClauseText: `AMENDED CLAUSE 27.2:
Liquidated Damages (LD) for Delay:
(a) If the Contractor fails to achieve the Final Commercial Commissioning Date within the stipulated Time for Completion, the Contractor shall pay to the Employer agreed Liquidated Damages at the rate of 0.5% (half percent) of the total Contract Price for each week of delay or part thereof, subject to an aggregate cumulative ceiling of 10% (ten percent) of the total Contract Price.
(b) Intermediate Milestone Delays: In the event of delay in achieving designated intermediate milestones, the Employer may provisionally withhold LD @ 0.5% per week of delay of the value of such milestone from running bills. However, if the Contractor subsequently achieves the overall Final Commercial Commissioning on or before the scheduled completion date, all provisionally withheld LD amounts shall be refunded to the Contractor in full without interest in the next progressive bill.
(c) Employer Delays & EOT: No LD shall be leviable for any period of delay conclusively demonstrated to be attributable to Employer's defaults in site clearance, foundational interface handover, or statutory clearances.`,
        concessionGranted: "Allows provisional withholding on intermediate milestones with full refund upon on-time final commissioning; confirms EOT protections.",
        protectiveSafeguardsRetained: "Retains full 10% maximum ceiling and applicability on total contract price for final schedule slippage.",
        approvalPrerequisite: "Tender Committee with Associate Finance Concurrence",
        auditDefenseRationale: "Complies with CVC circulars by preserving 10% contract value deterrence while aligning cash flow with equitable milestone recovery principles.",
        riskScore: "Critical",
      },
      {
        clauseNumber: "GCC Clause 18.2",
        clauseTitle: "Terms of Payment - Supply Milestones",
        originalClauseText: "70% of the supply value pro-rata upon receipt of equipment and materials at Employer's plant site in good condition, accompanied by Material Receipt Certificate (MRC) signed by the Project Engineer, inspection release note, and original invoice.",
        biddersContentionSummary: "Bidders requested release of 70% against dispatch documents (LR/RR) citing working capital blockage during site gate-entry and physical inspection.",
        proposedReviewedClauseText: `AMENDED CLAUSE 18.2:
Progressive Supply Payment:
(a) 60% (sixty percent) of the contracted supply value pro-rata shall be released against submission of original Clean Lorry Receipt (LR) / Railway Receipt (RR), original Tax Invoice, Manufacturer's Test Certificate, and Material Dispatch Clearance Certificate (MDCC) issued by the Employer / Third Party Inspection Agency (TPIA).
(b) 10% (ten percent) of the contracted supply value shall be released upon physical receipt of materials at Employer's designated site stores in good condition and issuance of Material Receipt Certificate (MRC).
(c) Deemed MRC: If the Employer fails to issue the MRC or notify defects within thirty (30) days of physical arrival of materials at site, the MRC shall be deemed to have been issued for the sole purpose of progressive payment release, without prejudice to Contractor's warranty obligations.`,
        concessionGranted: "Splits 70% payment into 60% against dispatch + 10% against site receipt; introduces 30-day deemed MRC clause.",
        protectiveSafeguardsRetained: "Material Dispatch Clearance Certificate (MDCC) required before any payment; 10% retained until physical site receipt; 10% advance and 10% PBG remain fully intact.",
        approvalPrerequisite: "General Manager (Contracts) with Finance Concurrence",
        auditDefenseRationale: "Ensures material quality is certified by TPIA before dispatch while giving reasonable relief against site gate bottlenecks.",
        riskScore: "Major",
      },
      {
        clauseNumber: "GCC Clause 38.0",
        clauseTitle: "Limitation of Liability & Exclusion of Consequential Damages",
        originalClauseText: "The aggregate maximum cumulative liability of the Contractor to the Employer for all claims under the Contract, whether in contract, tort, or indemnity, shall not exceed 100% of the total Contract Price. However, this limitation shall not apply in cases of gross negligence, willful misconduct, patent infringement indemnities, and statutory breach.",
        biddersContentionSummary: "Bidders requested reduction of liability cap to 50% and express mutual exclusion of indirect and consequential damages.",
        proposedReviewedClauseText: `AMENDED CLAUSE 38.0:
Limitation of Liability & Mutual Exclusion of Consequential Loss:
(a) Neither party shall be liable to the other party, whether in contract, tort, warranty, or indemnity, for any indirect, special, incidental, or consequential losses or damages, including but not limited to loss of production, loss of profit, loss of use, loss of revenue, or cost of capital.
(b) The aggregate cumulative liability of the Contractor to the Employer under or in connection with the Contract shall not exceed 100% (one hundred percent) of the total Contract Price.
(c) The limitations specified in sub-clauses (a) and (b) above shall not apply to:
    (i) Contractor's indemnity obligations in respect of third-party patent, trademark, or copyright infringement;
    (ii) Statutory penalties, gross negligence, willful misconduct, or fraud;
    (iii) Liquidated Damages levied under Clause 27.2.`,
        concessionGranted: "Explicit mutual exclusion of indirect damages, loss of production, and loss of profit.",
        protectiveSafeguardsRetained: "Direct aggregate liability remains firmly protected at 100% of contract price; third-party patent indemnities and gross negligence remain uncapped.",
        approvalPrerequisite: "Director (Projects) / Tender Committee with Legal Concurrence",
        auditDefenseRationale: "Conforms to Indian Contract Act Section 73 (limiting recovery to direct damages naturally arising) and standard international FIDIC/EPC contract norms.",
        riskScore: "Critical",
      },
    ],
    draftAddendumPreamble: `${metadata.organization || "Enter Organization Name"}
PROJECT CONTRACTS CELL
CORRIGENDUM / ADDENDUM NO. 01 TO TENDER NO: ${metadata.tenderRefNo || "Enter Case No"}

PACKAGE: ${metadata.packageTitle || "Enter Case Name"}

Notice is hereby given to all prospective bidders that following pre-bid representations and technical-commercial evaluation, the following clauses of the Standard Bidding Document (SBD GCC & SCC) stand amended as detailed herein.
All other terms and conditions of the NIT and SBD shall remain unchanged.
Bidders are requested to submit their technical and price proposals strictly taking into account these amended clauses. No deviations on these amended clauses shall be entertained.

Date: ${new Date().toISOString().split("T")[0]}
Issued by: General Manager (Project Contracts)`,
  };
}
