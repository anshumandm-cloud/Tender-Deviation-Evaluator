import React, { useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  FileDown,
  FileCheck2,
  ShieldCheck,
  Award,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Search,
  X,
  UserCheck,
  PenTool,
  ChevronDown,
  ChevronUp,
  Filter,
  ArrowUpDown,
  GitCompare,
  Split,
} from "lucide-react";
import {
  ReviewedClausesData,
  TenderMetadata,
  OfficerDirective,
  UploadedFormatTemplate,
  ReviewedClause,
  ComparativeEvaluation,
} from "../types";
import {
  exportReviewedClausesToWord,
  exportReviewedClausesToExcel,
  exportReviewedClausesToCSV,
  exportReviewedClausesToPDF,
  exportComprehensiveEvaluationToPDF,
} from "../utils/exportUtils";
import { computeWordDiff } from "../utils/diffUtils";
import { ClauseCompareModal } from "./ClauseCompareModal";

export type ClauseSortOption = "risk-desc" | "clause-asc" | "clause-desc" | "risk-asc";

/**
 * Returns the risk score for a reviewed clause, falling back to heuristic evaluation
 * based on clause title, number, concessions, and approving authority.
 */
export function getClauseRiskScore(clause: ReviewedClause): "Critical" | "Major" | "Minor" {
  if (clause.riskScore) return clause.riskScore;
  const combined = `${clause.clauseNumber} ${clause.clauseTitle} ${clause.concessionGranted} ${clause.approvalPrerequisite}`.toLowerCase();
  if (
    combined.includes("liquidated") ||
    combined.includes("ld") ||
    combined.includes("liability") ||
    combined.includes("indemnity") ||
    combined.includes("termination") ||
    combined.includes("27.2") ||
    combined.includes("38.0") ||
    combined.includes("director")
  ) {
    return "Critical";
  }
  if (
    combined.includes("payment") ||
    combined.includes("18.2") ||
    combined.includes("dispatch") ||
    combined.includes("advance") ||
    combined.includes("bank guarantee") ||
    combined.includes("pbg") ||
    combined.includes("general manager") ||
    combined.includes("gm")
  ) {
    return "Major";
  }
  return "Minor";
}

/**
 * Performs natural numerical comparison between clause numbers (e.g. GCC 18.2 before GCC 27.2 before GCC 38.0).
 */
export function compareClauseNumbers(a: string, b: string): number {
  const numsA = a.match(/\d+(\.\d+)?/g)?.map(Number) || [];
  const numsB = b.match(/\d+(\.\d+)?/g)?.map(Number) || [];
  for (let i = 0; i < Math.max(numsA.length, numsB.length); i++) {
    const valA = numsA[i] ?? -1;
    const valB = numsB[i] ?? -1;
    if (valA !== valB) return valA - valB;
  }
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

interface HarmonizedClausesTabProps {
  reviewedData: ReviewedClausesData | null;
  comparativeData?: ComparativeEvaluation | null;
  metadata?: TenderMetadata;
  onGenerateReviewedClauses: () => void;
  isGenerating: boolean;
  officerDirectives?: OfficerDirective[];
  activeFormatTemplate?: UploadedFormatTemplate | null;
  onOpenChatbot?: () => void;
  onReRunAnalysis?: () => void;
}

export const HarmonizedClausesTab: React.FC<HarmonizedClausesTabProps> = ({
  reviewedData,
  comparativeData,
  metadata,
  onGenerateReviewedClauses,
  isGenerating,
  officerDirectives = [],
  activeFormatTemplate,
  onOpenChatbot,
  onReRunAnalysis,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedPreamble, setCopiedPreamble] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchScope, setSearchScope] = useState<"all" | "title" | "content">("all");
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<"all" | "Critical" | "Major" | "Minor">("all");
  const [showOverview, setShowOverview] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<ClauseSortOption>("risk-desc");
  const [diffActiveClauses, setDiffActiveClauses] = useState<Record<string, boolean>>({});
  const [diffViewMode, setDiffViewMode] = useState<"split" | "inline">("split");
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);
  const [compareModalInitialIndex, setCompareModalInitialIndex] = useState<number>(0);

  const handleOpenCompareModal = (index: number = 0) => {
    setCompareModalInitialIndex(index);
    setIsCompareModalOpen(true);
  };

  const handleCopyClause = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyPreamble = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPreamble(true);
    setTimeout(() => setCopiedPreamble(false), 2000);
  };

  const highlightMatch = (text: string, q: string) => {
    const trimmed = q.trim();
    if (!trimmed || !text) return text;
    try {
      const regex = new RegExp(`(${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      const parts = text.split(regex);
      if (parts.length === 1) return text;
      return parts.map((part, i) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark key={i} className="bg-amber-200 text-amber-950 font-semibold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch {
      return text;
    }
  };

  if (!reviewedData) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">
          Reviewed &amp; Harmonized Clauses (Deadlock Resolution)
        </h3>
        <p className="text-xs text-slate-500 max-w-lg mx-auto mb-5 leading-relaxed">
          Where deviations remain unresolved across multiple rounds of discussions, formulate legally sound reviewed clauses for issuance as an official Addendum / Corrigendum without compromising buyer's interests.
        </p>
        <button
          onClick={onGenerateReviewedClauses}
          disabled={isGenerating}
          className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow flex items-center gap-2 mx-auto cursor-pointer transition-all"
        >
          {isGenerating ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Synthesizing Harmonized Clauses...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Formulate Reviewed Clauses</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    );
  }

  const allClauses = reviewedData.reviewedClauses || [];
  const criticalCount = allClauses.filter((c) => getClauseRiskScore(c) === "Critical").length;
  const majorCount = allClauses.filter((c) => getClauseRiskScore(c) === "Major").length;
  const minorCount = allClauses.filter((c) => getClauseRiskScore(c) === "Minor").length;

  const query = searchQuery.trim().toLowerCase();
  const isFiltered = Boolean(query || selectedRiskFilter !== "all");

  const resetAllFilters = () => {
    setSearchQuery("");
    setSelectedRiskFilter("all");
    setSearchScope("all");
  };

  const filteredClauses = allClauses.filter((clause) => {
    const clauseRisk = getClauseRiskScore(clause);

    // 1. Explicit risk score filter button/pill
    if (selectedRiskFilter !== "all" && clauseRisk !== selectedRiskFilter) {
      return false;
    }

    // 2. Query filter: handles keyword, clause number, or risk score search
    if (!query) return true;

    // Check if query matches risk score (e.g. "critical", "major", "minor", "critical risk", "high risk")
    const matchesRiskScore =
      clauseRisk.toLowerCase().includes(query) ||
      `${clauseRisk.toLowerCase()} risk`.includes(query) ||
      (query === "high" && clauseRisk === "Critical") ||
      (query === "medium" && clauseRisk === "Major") ||
      (query === "low" && clauseRisk === "Minor");

    // Check clause number and title
    const matchesClauseNumber = clause.clauseNumber.toLowerCase().includes(query);
    const matchesClauseTitle = clause.clauseTitle.toLowerCase().includes(query);
    const matchesTitle = matchesClauseNumber || matchesClauseTitle;

    // Check clause content, concessions, safeguards, prerequisite, audit defense
    const matchesContent =
      clause.proposedReviewedClauseText.toLowerCase().includes(query) ||
      clause.originalClauseText.toLowerCase().includes(query) ||
      clause.biddersContentionSummary.toLowerCase().includes(query) ||
      clause.concessionGranted.toLowerCase().includes(query) ||
      clause.protectiveSafeguardsRetained.toLowerCase().includes(query) ||
      clause.approvalPrerequisite.toLowerCase().includes(query) ||
      clause.auditDefenseRationale.toLowerCase().includes(query);

    if (searchScope === "title") return matchesTitle || matchesRiskScore;
    if (searchScope === "content") return matchesContent || matchesRiskScore;
    return matchesTitle || matchesContent || matchesRiskScore;
  });

  const riskWeight: Record<"Critical" | "Major" | "Minor", number> = {
    Critical: 3,
    Major: 2,
    Minor: 1,
  };

  const sortedClauses = [...filteredClauses].sort((a, b) => {
    if (sortBy === "risk-desc") {
      const diff = riskWeight[getClauseRiskScore(b)] - riskWeight[getClauseRiskScore(a)];
      if (diff !== 0) return diff;
      return compareClauseNumbers(a.clauseNumber, b.clauseNumber);
    }
    if (sortBy === "risk-asc") {
      const diff = riskWeight[getClauseRiskScore(a)] - riskWeight[getClauseRiskScore(b)];
      if (diff !== 0) return diff;
      return compareClauseNumbers(a.clauseNumber, b.clauseNumber);
    }
    if (sortBy === "clause-asc") {
      return compareClauseNumbers(a.clauseNumber, b.clauseNumber);
    }
    if (sortBy === "clause-desc") {
      return compareClauseNumbers(b.clauseNumber, a.clauseNumber);
    }
    return 0;
  });

  const dataToExport: ReviewedClausesData = {
    ...reviewedData,
    reviewedClauses: sortedClauses,
  };

  const toggleClauseDiff = (clauseKey: string) => {
    setDiffActiveClauses((prev) => ({
      ...prev,
      [clauseKey]: !prev[clauseKey],
    }));
  };

  const areAllDiffsActive =
    sortedClauses.length > 0 &&
    sortedClauses.every((c, i) => diffActiveClauses[c.clauseNumber ? `${c.clauseNumber}-${i}` : `clause-${i}`]);

  const toggleAllDiffs = () => {
    const keys = sortedClauses.map((c, i) => (c.clauseNumber ? `${c.clauseNumber}-${i}` : `clause-${i}`));
    const anyActive = keys.some((k) => diffActiveClauses[k]);
    const newMap: Record<string, boolean> = {};
    if (!anyActive) {
      keys.forEach((k) => {
        newMap[k] = true;
      });
    }
    setDiffActiveClauses(newMap);
  };

  return (
    <div className="space-y-6">
      {/* Dealing Officer Improvisation & Format Banner */}
      {(activeFormatTemplate || (officerDirectives && officerDirectives.length > 0)) && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-blue-50 border border-amber-300 rounded-xl p-4 shadow-xs flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-bold text-slate-900">
                  Output Improvised via Dealing Officer Directives &amp; Template
                </h4>
                {activeFormatTemplate && (
                  <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded">
                    Template: {activeFormatTemplate.name}
                  </span>
                )}
                {officerDirectives && officerDirectives.filter((d) => d.active).length > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                    {officerDirectives.filter((d) => d.active).length} Active Directive(s)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {activeFormatTemplate
                  ? `Corrigendum structure and preamble formatted in accordance with "${activeFormatTemplate.name}". `
                  : ""}
                {officerDirectives && officerDirectives.length > 0
                  ? `Specific counter-clauses and audit defenses reflect your Dealing Officer instructions.`
                  : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenChatbot && (
              <button
                onClick={onOpenChatbot}
                className="text-xs bg-white hover:bg-slate-50 text-blue-700 font-semibold px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                Chatbot Advisor
              </button>
            )}
            {onReRunAnalysis && (
              <button
                onClick={onReRunAnalysis}
                disabled={isGenerating}
                className="text-xs bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Re-run evaluation pipeline incorporating all active directives and format template"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                <span>Re-run Analysis</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header & Word Export */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-slate-900">
                Reviewed Contract Clauses &amp; Corrigendum Formulations
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {reviewedData.reviewedClauses.length} Harmonized Clauses
              </span>
              {isFiltered && (
                <span
                  id="header-matched-count-pill"
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                    filteredClauses.length > 0
                      ? "bg-blue-100 text-blue-800 border-blue-200"
                      : "bg-rose-100 text-rose-800 border-rose-200"
                  }`}
                >
                  {filteredClauses.length} Matched
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Formulated for Deadlock Resolution while safeguarding Employer / Buyer's Financial and Legal Rights
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Clause Compare Button (Triggers Side-by-Side Modal) */}
            <button
              id="clause-compare-btn"
              onClick={() => handleOpenCompareModal(0)}
              className="px-4 py-2 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-600 hover:to-indigo-600 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer hover:shadow ring-1 ring-purple-400/50"
              title="Open Side-by-Side Clause Comparison Modal between original SBD/NIT and harmonized clause texts"
            >
              <GitCompare className="w-4 h-4 text-purple-200" />
              <span>Clause Compare</span>
              <span className="text-[10px] bg-purple-950/60 text-purple-200 px-1.5 py-0.5 rounded font-mono font-medium">Side-by-Side</span>
            </button>

            <button
              id="download-full-evaluation-pdf-btn"
              onClick={() =>
                exportComprehensiveEvaluationToPDF(
                  comparativeData || null,
                  dataToExport,
                  metadata,
                  undefined,
                  activeFormatTemplate
                )
              }
              className="px-4 py-2 bg-gradient-to-r from-rose-700 to-red-800 hover:from-rose-600 hover:to-red-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer hover:shadow ring-1 ring-rose-400/50"
              title="Download complete evaluation report (Comparative Deviation Matrix + Harmonized Addendum Clauses + Committee Sign-Off) in a professionally formatted PDF"
            >
              <FileText className="w-4 h-4 text-rose-200" />
              <span>Export Full Evaluation PDF</span>
              <span className="text-[10px] bg-rose-950/60 text-rose-200 px-1.5 py-0.5 rounded font-mono font-medium">Matrix + Clauses</span>
            </button>

            <button
              id="download-reviewed-clauses-pdf-btn"
              onClick={() => exportReviewedClausesToPDF(dataToExport, metadata, activeFormatTemplate)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer hover:shadow border border-slate-700"
              title={`Download draft Addendum & Harmonized Clauses as a formatted PDF document using currently applied template (${activeFormatTemplate ? activeFormatTemplate.name : "CVC / GFR 173 Standard"}), including organization header and statutory disclaimer`}
            >
              <FileText className="w-4 h-4 text-rose-400" />
              <span>Addendum PDF</span>
              <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded font-mono font-normal">.pdf</span>
            </button>

            <button
              id="download-reviewed-clauses-word-btn"
              onClick={() => exportReviewedClausesToWord(dataToExport, metadata)}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer hover:shadow"
              title="Download draft Addendum & Harmonized Clauses as Word document (.docx) with formatted preamble and original/amended clause formulations"
            >
              <FileText className="w-4 h-4" />
              <span>Download as Word</span>
              <span className="text-[10px] bg-blue-800/80 px-1.5 py-0.5 rounded font-mono font-normal">.docx</span>
            </button>

            <button
              id="download-reviewed-clauses-excel-btn"
              onClick={() => exportReviewedClausesToExcel(dataToExport)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer hover:shadow"
              title="Download draft Addendum & Harmonized Clauses matrix as Excel workbook (.xlsx) with preamble and side-by-side comparative sheet"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download as Excel</span>
              <span className="text-[10px] bg-emerald-800/80 px-1.5 py-0.5 rounded font-mono font-normal">.xlsx</span>
            </button>

            <button
              id="download-reviewed-clauses-csv-btn"
              onClick={() => exportReviewedClausesToCSV(dataToExport)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer hover:shadow"
              title="Download structured CSV file for auditing with columns: Original Text, Amended Text, Rationale, Safeguards, and Prerequisite"
            >
              <FileDown className="w-4 h-4" />
              <span>Download as CSV</span>
              <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded font-mono font-normal">.csv</span>
            </button>

            <button
              id="regenerate-reviewed-clauses-btn"
              onClick={onGenerateReviewedClauses}
              disabled={isGenerating}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Regenerate harmonized clauses"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
              <span>Regenerate</span>
            </button>
          </div>
        </div>

        {/* Top Search Input Field, Risk Score Filter, Scope Selector, and Sorting Dropdown */}
        <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-4 space-y-3.5">
          {/* Main Search Row */}
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
            {/* Search Input Box */}
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                id="search-harmonized-clauses"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setSearchQuery("");
                }}
                placeholder="Search by keyword (e.g. liquidated damages), clause number (e.g. 27.2), or risk score (e.g. Critical, Major)..."
                className="text-xs w-full pl-9.5 pr-8 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs font-medium"
              />
              {searchQuery && (
                <button
                  id="clear-harmonized-search-btn"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Clear search filter (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Scope Filter Controls: All Fields | Title / Clause # | Content */}
            <div className="flex items-center gap-1 shrink-0 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 px-1.5 flex items-center gap-1">
                <Filter className="w-3 h-3 text-slate-400" />
                <span>Search in:</span>
              </span>
              <button
                type="button"
                id="search-scope-all-btn"
                onClick={() => setSearchScope("all")}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  searchScope === "all"
                    ? "bg-emerald-700 text-white font-semibold shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                All Fields
              </button>
              <button
                type="button"
                id="search-scope-title-btn"
                onClick={() => setSearchScope("title")}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  searchScope === "title"
                    ? "bg-emerald-700 text-white font-semibold shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Clause # / Title
              </button>
              <button
                type="button"
                id="search-scope-content-btn"
                onClick={() => setSearchScope("content")}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  searchScope === "content"
                    ? "bg-emerald-700 text-white font-semibold shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Content
              </button>
            </div>

            {/* Sorting Dropdown: Risk Score (Critical to Minor) or Clause Number */}
            <div className="flex items-center gap-1.5 shrink-0 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <label htmlFor="sort-reviewed-clauses" className="text-[11px] font-semibold text-slate-500 shrink-0">
                Sort:
              </label>
              <select
                id="sort-reviewed-clauses"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ClauseSortOption)}
                className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer pr-1"
                title="Sort reviewed clauses by Risk Score or Clause Number"
              >
                <option value="risk-desc">Risk Score (Critical to Minor)</option>
                <option value="clause-asc">Clause Number (Ascending)</option>
                <option value="clause-desc">Clause Number (Descending)</option>
                <option value="risk-asc">Risk Score (Minor to Critical)</option>
              </select>
            </div>

            {/* Global Compare All with Original (Diff View) Toggle */}
            <button
              type="button"
              id="toggle-all-diffs-btn"
              onClick={toggleAllDiffs}
              className={`flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
                areAllDiffsActive
                  ? "bg-purple-700 hover:bg-purple-800 text-white border-purple-800 shadow-sm"
                  : sortedClauses.some((c, i) => diffActiveClauses[c.clauseNumber ? `${c.clauseNumber}-${i}` : `clause-${i}`])
                  ? "bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-300"
                  : "bg-white hover:bg-purple-50 text-purple-700 border-purple-200"
              }`}
              title="Toggle word-by-word diff comparison for all reviewed clauses"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>
                {areAllDiffsActive
                  ? "Hide All Diffs"
                  : "Compare All with Original"}
              </span>
            </button>
          </div>

          {/* Risk Score Filter Bar & Match Counters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-200/80">
            {/* Filter by Risk Score Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mr-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Filter by Risk Score:</span>
              </span>
              <button
                type="button"
                id="filter-risk-all-btn"
                onClick={() => setSelectedRiskFilter("all")}
                className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedRiskFilter === "all"
                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
                title="Show clauses of all risk scores"
              >
                <span>All Levels</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    selectedRiskFilter === "all" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {allClauses.length}
                </span>
              </button>

              <button
                type="button"
                id="filter-risk-critical-btn"
                onClick={() => setSelectedRiskFilter(selectedRiskFilter === "Critical" ? "all" : "Critical")}
                className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedRiskFilter === "Critical"
                    ? "bg-rose-700 text-white border-rose-800 shadow-xs ring-2 ring-rose-400/30"
                    : "bg-white text-rose-800 border-rose-200 hover:bg-rose-50"
                }`}
                title="Filter for Critical Risk clauses (High liability, LD, termination, etc.)"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>Critical Risk</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    selectedRiskFilter === "Critical" ? "bg-rose-800 text-white" : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {criticalCount}
                </span>
              </button>

              <button
                type="button"
                id="filter-risk-major-btn"
                onClick={() => setSelectedRiskFilter(selectedRiskFilter === "Major" ? "all" : "Major")}
                className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedRiskFilter === "Major"
                    ? "bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-400/30"
                    : "bg-white text-amber-800 border-amber-200 hover:bg-amber-50"
                }`}
                title="Filter for Major Risk clauses (Payment milestones, BG, warranty, etc.)"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Major Risk</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    selectedRiskFilter === "Major" ? "bg-amber-700 text-white" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {majorCount}
                </span>
              </button>

              <button
                type="button"
                id="filter-risk-minor-btn"
                onClick={() => setSelectedRiskFilter(selectedRiskFilter === "Minor" ? "all" : "Minor")}
                className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedRiskFilter === "Minor"
                    ? "bg-sky-700 text-white border-sky-800 shadow-xs ring-2 ring-sky-400/30"
                    : "bg-white text-sky-800 border-sky-200 hover:bg-sky-50"
                }`}
                title="Filter for Minor Risk clauses (Clarifications, low-risk procedural alignment)"
              >
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span>Minor Risk</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    selectedRiskFilter === "Minor" ? "bg-sky-800 text-white" : "bg-sky-100 text-sky-800"
                  }`}
                >
                  {minorCount}
                </span>
              </button>
            </div>

            {/* Results Count & Reset Controls */}
            <div className="flex items-center gap-2">
              {isFiltered ? (
                <div
                  id="search-results-count-badge"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs border ${
                    filteredClauses.length > 0
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-rose-50 text-rose-700 border-rose-300"
                  }`}
                >
                  {filteredClauses.length > 0 ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>
                        {filteredClauses.length} of {allClauses.length} clauses matched
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>0 of {allClauses.length} clauses matched</span>
                    </>
                  )}
                </div>
              ) : (
                <div
                  id="search-results-count-badge"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-medium"
                >
                  <span className="font-semibold text-slate-900">{allClauses.length}</span> total clauses
                </div>
              )}

              {isFiltered && (
                <button
                  id="reset-harmonized-search-btn"
                  onClick={resetAllFilters}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline px-2 py-1 rounded transition-colors cursor-pointer"
                >
                  Reset All
                </button>
              )}
            </div>
          </div>

          {/* Quick Filter Tag Chips */}
          <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto text-xs">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0">Quick filters:</span>
            {[
              {
                label: "All Clauses",
                active: !query && selectedRiskFilter === "all",
                action: resetAllFilters,
              },
              {
                label: `🔴 Critical (${criticalCount})`,
                active: selectedRiskFilter === "Critical",
                action: () => setSelectedRiskFilter(selectedRiskFilter === "Critical" ? "all" : "Critical"),
              },
              {
                label: `🟠 Major (${majorCount})`,
                active: selectedRiskFilter === "Major",
                action: () => setSelectedRiskFilter(selectedRiskFilter === "Major" ? "all" : "Major"),
              },
              {
                label: `🔵 Minor (${minorCount})`,
                active: selectedRiskFilter === "Minor",
                action: () => setSelectedRiskFilter(selectedRiskFilter === "Minor" ? "all" : "Minor"),
              },
              {
                label: "GCC 27.2 (LD)",
                active: query === "27.2",
                action: () => {
                  setSearchQuery("27.2");
                  setSearchScope("title");
                },
              },
              {
                label: "GCC 18.2 (Payment)",
                active: query === "18.2",
                action: () => {
                  setSearchQuery("18.2");
                  setSearchScope("title");
                },
              },
              {
                label: "GCC 30.0 (DLP)",
                active: query === "30.0",
                action: () => {
                  setSearchQuery("30.0");
                  setSearchScope("title");
                },
              },
              {
                label: "GCC 38.0 (Liability)",
                active: query === "38.0",
                action: () => {
                  setSearchQuery("38.0");
                  setSearchScope("title");
                },
              },
              {
                label: "Safeguards",
                active: query === "safeguard",
                action: () => {
                  setSearchQuery("safeguard");
                  setSearchScope("content");
                },
              },
              {
                label: "Concessions",
                active: query === "concession",
                action: () => {
                  setSearchQuery("concession");
                  setSearchScope("content");
                },
              },
              {
                label: "Audit Defense",
                active: query === "audit",
                action: () => {
                  setSearchQuery("audit");
                  setSearchScope("content");
                },
              },
            ].map((tag) => (
              <button
                key={tag.label}
                type="button"
                onClick={tag.action}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-all cursor-pointer shrink-0 font-medium ${
                  tag.active
                    ? "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>

          {/* Active Filter Badges */}
          {isFiltered && (
            <div className="flex items-center gap-2 pt-1.5 border-t border-slate-200/60 flex-wrap text-xs">
              <span className="text-[11px] font-medium text-slate-500">Active Filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                  <span>Query: "{searchQuery}"</span>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="hover:text-emerald-950 cursor-pointer ml-0.5"
                    title="Remove query filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedRiskFilter !== "all" && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                    selectedRiskFilter === "Critical"
                      ? "bg-rose-100 text-rose-800 border-rose-200"
                      : selectedRiskFilter === "Major"
                      ? "bg-amber-100 text-amber-800 border-amber-200"
                      : "bg-sky-100 text-sky-800 border-sky-200"
                  }`}
                >
                  <span>Risk Score: {selectedRiskFilter}</span>
                  <button
                    onClick={() => setSelectedRiskFilter("all")}
                    className="hover:opacity-80 cursor-pointer ml-0.5"
                    title="Remove risk filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={resetAllFilters}
                className="text-[11px] text-slate-500 hover:text-rose-600 underline cursor-pointer ml-auto"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Harmonization Overview (Collapsible) */}
        <div className="p-3.5 bg-emerald-50/40 border border-emerald-200 rounded-lg">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowOverview(!showOverview)}
          >
            <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Harmonization Strategy &amp; CVC Audit Defense Framework</span>
            </h4>
            <button
              type="button"
              className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
            >
              {showOverview ? "Collapse" : "Expand"}
              {showOverview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
          {showOverview && (
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line mt-2 pt-2 border-t border-emerald-100">
              {reviewedData.harmonizationOverview}
            </p>
          )}
        </div>
      </div>

      {/* Clause Harmonization Cards */}
      <div className="space-y-5">
        {filteredClauses.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
              <Search className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1">
              No harmonized clauses matched the filter criteria
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-3">
              {searchQuery && selectedRiskFilter !== "all"
                ? `No clauses found matching query "${searchQuery}" with ${selectedRiskFilter} Risk score in ${searchScope === "all" ? "All Fields" : searchScope}.`
                : searchQuery
                ? `No clauses found matching query "${searchQuery}". Try searching by keyword (e.g. damages), clause number (e.g. 27.2), or risk score (e.g. Critical, Major).`
                : `No clauses found with ${selectedRiskFilter} Risk score.`}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                id="clear-harmonized-filter-empty-btn"
                onClick={resetAllFilters}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
              {searchScope !== "all" && (
                <button
                  onClick={() => setSearchScope("all")}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Search in All Fields
                </button>
              )}
            </div>
          </div>
        ) : (
          sortedClauses.map((clause, idx) => {
            const riskScore = getClauseRiskScore(clause);
            const clauseKey = clause.clauseNumber ? `${clause.clauseNumber}-${idx}` : `clause-${idx}`;
            const isDiffActive = Boolean(diffActiveClauses[clauseKey]);
            const diffResult = isDiffActive
              ? computeWordDiff(clause.originalClauseText, clause.proposedReviewedClauseText)
              : null;

            return (
              <div
                key={idx}
                className={`bg-white rounded-xl border transition-all shadow-sm overflow-hidden ${
                  isDiffActive ? "border-purple-300 ring-2 ring-purple-500/10" : "border-slate-200"
                }`}
              >
                {/* Card Header */}
                <div className={`px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 ${
                  isDiffActive ? "bg-purple-50/50 border-purple-200" : "bg-slate-50 border-slate-200"
                }`}>
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900">
                          {highlightMatch(clause.clauseNumber, searchQuery)}: {highlightMatch(clause.clauseTitle, searchQuery)}
                        </h3>
                        {riskScore === "Critical" && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all ${
                              query.includes("critical") || selectedRiskFilter === "Critical"
                                ? "bg-rose-200 text-rose-950 border-rose-400 ring-2 ring-rose-400/40"
                                : "bg-rose-100 text-rose-800 border-rose-200"
                            }`}
                            title="Critical Risk Clause - Highest financial, liability, or contractual risk"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                            Critical Risk
                          </span>
                        )}
                        {riskScore === "Major" && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all ${
                              query.includes("major") || selectedRiskFilter === "Major"
                                ? "bg-amber-200 text-amber-950 border-amber-400 ring-2 ring-amber-400/40"
                                : "bg-amber-100 text-amber-800 border-amber-200"
                            }`}
                            title="Major Risk Clause - Significant commercial, payment, or delivery milestone risk"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Major Risk
                          </span>
                        )}
                        {riskScore === "Minor" && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all ${
                              query.includes("minor") || selectedRiskFilter === "Minor"
                                ? "bg-sky-200 text-sky-950 border-sky-400 ring-2 ring-sky-400/40"
                                : "bg-sky-100 text-sky-800 border-sky-200"
                            }`}
                            title="Minor Risk Clause - Clarification or low-risk procedural alignment"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            Minor Risk
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Approval Authority: <strong className="text-purple-700">{highlightMatch(clause.approvalPrerequisite, searchQuery)}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Clause Compare Modal Trigger for this clause */}
                    <button
                      id={`clause-compare-card-btn-${idx}`}
                      type="button"
                      onClick={() => handleOpenCompareModal(idx)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-purple-300 hover:border-purple-400 bg-purple-50 hover:bg-purple-100 text-purple-900 font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      title="Open Side-by-Side Clause Comparison Modal for this clause"
                    >
                      <Split className="w-3.5 h-3.5 text-purple-700" />
                      <span>Clause Compare</span>
                    </button>

                    {/* Compare with Original Toggle Button */}
                    <button
                      id={`compare-clause-diff-btn-${idx}`}
                      type="button"
                      onClick={() => toggleClauseDiff(clauseKey)}
                      className={`px-3 py-1.5 text-xs rounded-lg border font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                        isDiffActive
                          ? "bg-purple-700 hover:bg-purple-800 text-white border-purple-800 shadow-sm ring-2 ring-purple-400/30"
                          : "bg-white hover:bg-purple-50 text-purple-700 border-purple-300 hover:border-purple-400"
                      }`}
                      title={
                        isDiffActive
                          ? "Hide diff view and return to standard side-by-side view"
                          : "Compare original SBD/NIT text with proposed amended clause (Diff View)"
                      }
                    >
                      <GitCompare className="w-3.5 h-3.5" />
                      <span>{isDiffActive ? "Hide Diff" : "Compare with Original"}</span>
                      {isDiffActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </button>

                    <button
                      onClick={() => handleCopyClause(clause.proposedReviewedClauseText, idx)}
                      className="px-2.5 py-1.5 text-xs text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>{copiedIndex === idx ? "Copied" : "Copy Revised Clause"}</span>
                    </button>
                  </div>
                </div>

                {/* Comparison Grid */}
                <div className="p-5 space-y-4">
                  {/* Contention Summary */}
                  <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg text-xs">
                    <span className="font-bold text-amber-900 block mb-0.5">
                      Bidders' Joint Deadlock Grounds:
                    </span>
                    <p className="text-slate-700">{highlightMatch(clause.biddersContentionSummary, searchQuery)}</p>
                  </div>

                  {/* Diff View or Side-by-Side: Original vs Proposed */}
                  {isDiffActive && diffResult ? (
                    <div className="rounded-xl border border-purple-300 bg-purple-50/20 overflow-hidden shadow-2xs">
                      {/* Diff Bar / Toolbar */}
                      <div className="px-4 py-2.5 bg-gradient-to-r from-purple-100 via-indigo-50 to-purple-50 border-b border-purple-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-purple-900 flex items-center gap-1.5">
                            <GitCompare className="w-4 h-4 text-purple-700" />
                            <span>Word-Level Comparison Diff:</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            +{diffResult.stats.addedCount} added
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-900 border border-rose-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            -{diffResult.stats.removedCount} removed
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-900 border border-blue-300">
                            {diffResult.stats.percentRetained}% original retained
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Switcher between Side-by-Side and Unified Diff */}
                          <div className="flex items-center bg-white p-0.5 rounded-lg border border-purple-200 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => setDiffViewMode("split")}
                              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                                diffViewMode === "split"
                                  ? "bg-purple-700 text-white shadow-2xs"
                                  : "text-slate-600 hover:text-purple-700"
                              }`}
                              title="Side-by-side comparative diff with synchronized markers"
                            >
                              Side-by-Side Diff
                            </button>
                            <button
                              type="button"
                              onClick={() => setDiffViewMode("inline")}
                              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                                diffViewMode === "inline"
                                  ? "bg-purple-700 text-white shadow-2xs"
                                  : "text-slate-600 hover:text-purple-700"
                              }`}
                              title="Unified in-place diff with deletions struck through and additions highlighted"
                            >
                              Unified Diff
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleClauseDiff(clauseKey)}
                            className="text-purple-700 hover:text-purple-900 bg-white hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 text-[11px] font-semibold transition-colors cursor-pointer"
                            title="Exit diff mode and return to standard clause preview"
                          >
                            Close Diff
                          </button>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="px-4 py-1.5 bg-white border-b border-purple-100 flex items-center gap-4 text-[11px] text-slate-600 flex-wrap">
                        <span className="font-semibold text-slate-500">Legend:</span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 line-through decoration-rose-500 text-[10px] font-mono font-bold">
                            - Struck Text
                          </span>
                          <span className="text-slate-500">Deleted from Original SBD/NIT</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 underline decoration-emerald-500 text-[10px] font-mono font-bold">
                            + Highlighted Text
                          </span>
                          <span className="text-slate-500">Introduced in Proposed Addendum</span>
                        </span>
                      </div>

                      {/* Diff Panels */}
                      <div className="p-4 bg-white/70">
                        {diffViewMode === "split" ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Left: Original with Deletions */}
                            <div className="p-3.5 bg-rose-50/40 border border-rose-200 rounded-lg flex flex-col justify-between">
                              <div>
                                <span className="text-xs font-bold text-rose-950 block mb-2 uppercase tracking-wider flex items-center justify-between">
                                  <span>Original SBD / NIT Clause</span>
                                  <span className="text-[10px] bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded font-mono font-semibold">
                                    Removals Highlighted
                                  </span>
                                </span>
                                <div className="text-xs font-serif leading-relaxed text-slate-800 p-3 bg-white rounded border border-rose-100 min-h-[110px] whitespace-pre-line">
                                  {diffResult.originalTokens.map((tok, tIdx) => {
                                    if (tok.type === "removed") {
                                      return (
                                        <mark
                                          key={tIdx}
                                          className="bg-rose-100 text-rose-900 line-through decoration-rose-500 font-semibold px-0.5 rounded mx-0.5"
                                        >
                                          {tok.value}
                                        </mark>
                                      );
                                    }
                                    return <span key={tIdx}>{tok.value}</span>;
                                  })}
                                </div>
                              </div>
                              <div className="mt-3 pt-2 border-t border-rose-200 text-[11px] text-rose-700 flex items-center justify-between">
                                <span>Status: <strong className="font-semibold">Rejected by Multiple Bidders</strong></span>
                                <span className="font-mono text-[10px] text-rose-600">-{diffResult.stats.removedCount} words</span>
                              </div>
                            </div>

                            {/* Right: Proposed with Additions */}
                            <div className="p-3.5 bg-emerald-50/40 border border-emerald-300 rounded-lg flex flex-col justify-between">
                              <div>
                                <span className="text-xs font-bold text-emerald-950 block mb-2 uppercase tracking-wider flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Proposed Harmonized Addendum Clause</span>
                                  </span>
                                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-mono font-semibold">
                                    Additions Highlighted
                                  </span>
                                </span>
                                <div className="text-xs font-serif leading-relaxed text-slate-900 p-3 bg-white rounded border border-emerald-200 min-h-[110px] whitespace-pre-line">
                                  {diffResult.amendedTokens.map((tok, tIdx) => {
                                    if (tok.type === "added") {
                                      return (
                                        <mark
                                          key={tIdx}
                                          className="bg-emerald-100 text-emerald-900 underline decoration-emerald-500 font-semibold px-0.5 rounded mx-0.5 border border-emerald-300"
                                        >
                                          {tok.value}
                                        </mark>
                                      );
                                    }
                                    return <span key={tIdx}>{tok.value}</span>;
                                  })}
                                </div>
                              </div>
                              <div className="mt-3 pt-2 border-t border-emerald-200 text-[11px] text-emerald-800 flex items-center justify-between">
                                <span>Status: <strong className="font-bold">Recommended for Corrigendum Issuance</strong></span>
                                <span className="font-mono text-[10px] text-emerald-700">+{diffResult.stats.addedCount} words</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Unified In-Place Diff */
                          <div className="p-3.5 bg-slate-50 border border-slate-300 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                Unified Inline Diff (Original vs Proposed Addendum)
                              </span>
                              <span className="text-[10px] font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded font-semibold">
                                Live Inline Revisions
                              </span>
                            </div>
                            <div className="text-xs font-serif leading-relaxed text-slate-900 p-3.5 bg-white rounded border border-slate-200 min-h-[110px] whitespace-pre-line">
                              {diffResult.tokens.map((tok, tIdx) => {
                                if (tok.type === "removed") {
                                  return (
                                    <mark
                                      key={tIdx}
                                      className="bg-rose-100 text-rose-900 line-through decoration-rose-500 font-semibold px-0.5 rounded mx-0.5"
                                    >
                                      {tok.value}
                                    </mark>
                                  );
                                }
                                if (tok.type === "added") {
                                  return (
                                    <mark
                                      key={tIdx}
                                      className="bg-emerald-100 text-emerald-900 underline decoration-emerald-500 font-semibold px-0.5 rounded mx-0.5 border border-emerald-300"
                                    >
                                      {tok.value}
                                    </mark>
                                  );
                                }
                                return <span key={tIdx}>{tok.value}</span>;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Side-by-Side: Original vs Proposed */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Original SBD */}
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                            Original SBD / NIT Clause:
                          </span>
                          <p className="text-xs text-slate-600 font-serif leading-relaxed italic whitespace-pre-line">
                            "{highlightMatch(clause.originalClauseText, searchQuery)}"
                          </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                          Status: <span className="text-rose-600 font-semibold">Rejected by Multiple Bidders</span>
                        </div>
                      </div>

                      {/* Proposed Reviewed Clause */}
                      <div className="p-3.5 bg-emerald-50/50 border border-emerald-300 rounded-lg flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-bold text-emerald-900 block mb-1 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            Proposed Reviewed Clause (Addendum Wording):
                          </span>
                          <p className="text-xs text-slate-900 font-serif leading-relaxed font-medium whitespace-pre-line bg-white/80 p-2.5 rounded border border-emerald-100">
                            "{highlightMatch(clause.proposedReviewedClauseText, searchQuery)}"
                          </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-emerald-200 text-[11px] text-emerald-800">
                          Status: <span className="font-bold">Recommended for Corrigendum Issuance</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Concession vs Safeguards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg">
                      <span className="font-bold text-blue-900 block mb-1">
                        Concession Granted to Bidders:
                      </span>
                      <p className="text-slate-700">{highlightMatch(clause.concessionGranted, searchQuery)}</p>
                    </div>

                    <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg">
                      <span className="font-bold text-emerald-900 block mb-1">
                        Protective Safeguards Retained for Buyer:
                      </span>
                      <p className="text-slate-700">{highlightMatch(clause.protectiveSafeguardsRetained, searchQuery)}</p>
                    </div>
                  </div>

                  {/* Audit Justification */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <span className="font-bold text-slate-900 block mb-1">
                      Justification for Internal Audit / CVC Scrutiny:
                    </span>
                    <p className="text-slate-700 italic">{highlightMatch(clause.auditDefenseRationale, searchQuery)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Draft Corrigendum Preamble */}
      {reviewedData.draftAddendumPreamble && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-blue-600" />
              <span>Draft Corrigendum / Addendum Preamble for Tender Portal Upload</span>
            </h3>
            <button
              onClick={() => handleCopyPreamble(reviewedData.draftAddendumPreamble)}
              className="px-2.5 py-1 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copiedPreamble ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{copiedPreamble ? "Copied" : "Copy Preamble"}</span>
            </button>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-line">
            {reviewedData.draftAddendumPreamble}
          </div>
        </div>
      )}

      {/* Formal Signature & Approvals Block for Dealing Officer and Committee */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PenTool className="w-4 h-4 text-slate-700" />
              <span>Formal Sign-Off &amp; Approvals (Dealing Officer &amp; Tender Committee)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Statutory verification under GFR and CVC Public Procurement Guidelines for official Addendum issuance
            </p>
          </div>
          <button
            id="download-reviewed-clauses-pdf-footer-btn"
            onClick={() => exportReviewedClausesToPDF(dataToExport, metadata, activeFormatTemplate)}
            className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
            title={`Export official PDF formatted per applied template (${activeFormatTemplate ? activeFormatTemplate.name : "CVC / GFR 173 Standard"}), with organization header, statutory disclaimer, and committee sign-off block`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export Official PDF (Template Aligned)</span>
          </button>
        </div>

        <p className="text-xs text-slate-600 italic bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 leading-relaxed">
          "The above harmonized clause formulations and draft corrigendum text have been formulated in accordance with General Financial Rules (GFR), CVC Procurement Guidelines, and established Public Procurement Manual principles. Submitted for consideration and formal approval of the Competent Authority / Tender Committee."
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Col 1: Dealing Officer */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-lg flex flex-col justify-between">
            <div>
              <span className="font-bold text-slate-900 block uppercase tracking-wider text-[11px] mb-2 pb-1 border-b border-slate-200 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Prepared &amp; Verified By</span>
              </span>
              <p className="font-semibold text-slate-800">Dealing Officer / Manager (Contracts)</p>
              <p className="text-slate-500 text-[11px]">Designation: Manager / DGM (Contracts &amp; Procurement)</p>
              <p className="text-slate-500 text-[11px]">Dept: Project Contracts &amp; Materials Cell</p>
              <p className="text-slate-500 text-[11px] mt-1">Station: Project Site / Corporate HQ</p>
            </div>
            <div className="mt-6 pt-3 border-t border-dashed border-slate-300">
              <div className="h-9 border border-dashed border-slate-300 rounded bg-white/60 flex items-center justify-center text-[10px] text-slate-400 mb-1.5">
                [ Signature &amp; Official Seal Stamp ]
              </div>
              <p className="text-[11px] text-slate-600 font-mono">Date: ____ / ____ / 2026</p>
            </div>
          </div>

          {/* Col 2: Tender Committee Members */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-lg flex flex-col justify-between">
            <div>
              <span className="font-bold text-slate-900 block uppercase tracking-wider text-[11px] mb-2 pb-1 border-b border-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Reviewed &amp; Recommended By</span>
              </span>
              <div className="space-y-2 mb-2">
                <div>
                  <p className="font-medium text-slate-800">1. Finance &amp; Accounts Member</p>
                  <p className="text-slate-500 text-[10px]">DGM / GM (Finance)</p>
                </div>
                <div>
                  <p className="font-medium text-slate-800">2. Technical &amp; Engineering Member</p>
                  <p className="text-slate-500 text-[10px]">DGM / GM (Projects / Engineering)</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-dashed border-slate-300">
              <div className="h-9 border border-dashed border-slate-300 rounded bg-white/60 flex items-center justify-center text-[10px] text-slate-400 mb-1.5">
                [ Signatures of Tender Committee ]
              </div>
              <p className="text-[11px] text-slate-600 font-mono">Date: ____ / ____ / 2026</p>
            </div>
          </div>

          {/* Col 3: Competent Approving Authority */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-lg flex flex-col justify-between">
            <div>
              <span className="font-bold text-slate-900 block uppercase tracking-wider text-[11px] mb-2 pb-1 border-b border-slate-200 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-purple-600" />
                <span>Approved By (Authority)</span>
              </span>
              <p className="font-semibold text-slate-800">Executive Director / Director (Projects)</p>
              <p className="text-slate-500 text-[11px]">Tender Approving Authority (TAA)</p>
              <div className="mt-2 text-[11px] text-slate-700 bg-white p-2 rounded border border-slate-200">
                <span className="font-semibold block mb-0.5">Approval Status:</span>
                <span className="text-emerald-700 font-medium">✓ Recommended for Addendum Portal Upload</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-dashed border-slate-300">
              <div className="h-9 border border-dashed border-slate-300 rounded bg-white/60 flex items-center justify-center text-[10px] text-slate-400 mb-1.5">
                [ Competent Authority Signature &amp; Seal ]
              </div>
              <p className="text-[11px] text-slate-600 font-mono">Date: ____ / ____ / 2026</p>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Clause Compare Modal */}
      <ClauseCompareModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        clauses={sortedClauses.length > 0 ? sortedClauses : reviewedData.reviewedClauses}
        initialClauseIndex={compareModalInitialIndex}
        metadata={metadata}
        activeFormatTemplate={activeFormatTemplate}
      />
    </div>
  );
};
