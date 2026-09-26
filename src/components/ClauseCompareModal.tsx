import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  GitCompare,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  Split,
  Maximize2,
  Minimize2,
  Sparkles,
  ArrowRight,
  Search,
  BookOpen,
  Scale,
} from "lucide-react";
import { ReviewedClause, TenderMetadata, UploadedFormatTemplate } from "../types";
import { computeWordDiff, DiffResult } from "../utils/diffUtils";
import { getClauseRiskScore } from "./HarmonizedClausesTab";

interface ClauseCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  clauses: ReviewedClause[];
  initialClauseIndex?: number;
  metadata?: TenderMetadata;
  activeFormatTemplate?: UploadedFormatTemplate | null;
}

export const ClauseCompareModal: React.FC<ClauseCompareModalProps> = ({
  isOpen,
  onClose,
  clauses,
  initialClauseIndex = 0,
  metadata,
  activeFormatTemplate,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(initialClauseIndex);
  const [viewMode, setViewMode] = useState<"side-by-side" | "diff-split" | "diff-unified">("side-by-side");
  const [copiedOriginal, setCopiedOriginal] = useState<boolean>(false);
  const [copiedHarmonized, setCopiedHarmonized] = useState<boolean>(false);
  const [copiedCombined, setCopiedCombined] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Sync selected index when modal opens or initialClauseIndex changes
  useEffect(() => {
    if (isOpen) {
      if (initialClauseIndex >= 0 && initialClauseIndex < clauses.length) {
        setSelectedIndex(initialClauseIndex);
      } else {
        setSelectedIndex(0);
      }
    }
  }, [isOpen, initialClauseIndex, clauses.length]);

  // Handle keyboard navigation (ArrowLeft, ArrowRight, Escape)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && (e.altKey || e.metaKey || !["input", "textarea"].includes((e.target as HTMLElement).tagName.toLowerCase()))) {
        handlePrev();
      } else if (e.key === "ArrowRight" && (e.altKey || e.metaKey || !["input", "textarea"].includes((e.target as HTMLElement).tagName.toLowerCase()))) {
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, clauses.length]);

  const currentClause = clauses[selectedIndex] || clauses[0];

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : clauses.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev < clauses.length - 1 ? prev + 1 : 0));
  };

  const handleCopyOriginal = () => {
    if (!currentClause) return;
    navigator.clipboard.writeText(currentClause.originalClauseText);
    setCopiedOriginal(true);
    setTimeout(() => setCopiedOriginal(false), 2000);
  };

  const handleCopyHarmonized = () => {
    if (!currentClause) return;
    navigator.clipboard.writeText(currentClause.proposedReviewedClauseText);
    setCopiedHarmonized(true);
    setTimeout(() => setCopiedHarmonized(false), 2000);
  };

  const handleCopyCombined = () => {
    if (!currentClause) return;
    const formatted = `### CLAUSE COMPARISON: ${currentClause.clauseNumber} - ${currentClause.clauseTitle}
Package: ${metadata?.packageTitle || "Tender Document"}
Risk Score: ${getClauseRiskScore(currentClause)}
Approving Authority: ${currentClause.approvalPrerequisite}

=== 1. ORIGINAL SBD / NIT TEXT ===
${currentClause.originalClauseText}

=== 2. PROPOSED HARMONIZED / REVIEWED CLAUSE TEXT ===
${currentClause.proposedReviewedClauseText}

=== 3. CONCESSION GRANTED ===
${currentClause.concessionGranted}

=== 4. EMPLOYER SAFEGUARDS RETAINED ===
${currentClause.protectiveSafeguardsRetained}

=== 5. AUDIT & VIGILANCE DEFENSE RATIONALE ===
${currentClause.auditDefenseRationale}
`;
    navigator.clipboard.writeText(formatted);
    setCopiedCombined(true);
    setTimeout(() => setCopiedCombined(false), 2000);
  };

  // Compute Word Diff
  const diffResult: DiffResult | null = useMemo(() => {
    if (!currentClause) return null;
    return computeWordDiff(currentClause.originalClauseText, currentClause.proposedReviewedClauseText);
  }, [currentClause]);

  if (!isOpen || !currentClause) return null;

  const riskScore = getClauseRiskScore(currentClause);

  // Filter clauses for the dropdown if search is provided
  const matchingClauses = clauses.filter((c) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      c.clauseNumber.toLowerCase().includes(q) ||
      c.clauseTitle.toLowerCase().includes(q) ||
      getClauseRiskScore(c).toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col transition-all overflow-hidden ${
          isFullScreen
            ? "w-full h-full max-w-none max-h-none rounded-none"
            : "w-full max-w-6xl max-h-[92vh] my-auto"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="clause-compare-title"
      >
        {/* Top Header Bar */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-300 flex items-center justify-center shrink-0 shadow-inner">
              <GitCompare className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-wider font-mono font-bold text-purple-300">
                  Clause Comparison Tool
                </span>
                <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                  Side-by-Side Review
                </span>
                {activeFormatTemplate && (
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                    {activeFormatTemplate.name}
                  </span>
                )}
              </div>
              <h2 id="clause-compare-title" className="text-base font-bold text-white leading-tight">
                Original SBD vs Harmonized Corrigendum Formulation
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-800/90 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("side-by-side")}
                className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                  viewMode === "side-by-side"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-300 hover:text-white"
                }`}
                title="Direct side-by-side text comparison"
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setViewMode("diff-split")}
                className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                  viewMode === "diff-split"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-300 hover:text-white"
                }`}
                title="Side-by-side word difference highlighting"
              >
                Diff Split
              </button>
              <button
                type="button"
                onClick={() => setViewMode("diff-unified")}
                className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                  viewMode === "diff-unified"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-300 hover:text-white"
                }`}
                title="Single unified in-line diff flow"
              >
                Unified Diff
              </button>
            </div>

            {/* Toggle Fullscreen */}
            <button
              type="button"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isFullScreen ? "Exit Fullscreen" : "Fullscreen View"}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Clause Selector & Navigation Strip */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            {/* Previous Clause Button */}
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-all cursor-pointer shadow-2xs shrink-0 flex items-center justify-center"
              title="Previous clause (Alt + Left Arrow)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Dropdown Selector for All Clauses */}
            <div className="relative flex-1 max-w-xl">
              <select
                id="clause-compare-select"
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(Number(e.target.value))}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer"
              >
                {clauses.map((clause, idx) => {
                  const score = getClauseRiskScore(clause);
                  return (
                    <option key={idx} value={idx}>
                      {idx + 1}. {clause.clauseNumber}: {clause.clauseTitle} [{score} Risk]
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Next Clause Button */}
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-all cursor-pointer shadow-2xs shrink-0 flex items-center justify-center"
              title="Next clause (Alt + Right Arrow)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Index Counter */}
            <span className="text-xs font-bold text-slate-500 font-mono shrink-0">
              {selectedIndex + 1} / {clauses.length}
            </span>
          </div>

          {/* Current Clause Metadata Pills & Copy Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Risk Badge */}
            {riskScore === "Critical" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Critical Risk
              </span>
            )}
            {riskScore === "Major" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Major Risk
              </span>
            )}
            {riskScore === "Minor" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                Minor Risk
              </span>
            )}

            {/* Authority Pill */}
            <span className="text-xs text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200 font-medium">
              Approving Authority: <strong className="text-purple-700">{currentClause.approvalPrerequisite}</strong>
            </span>

            {/* Copy Full Comparison Button */}
            <button
              type="button"
              onClick={handleCopyCombined}
              className="text-xs px-3 py-1 bg-white hover:bg-purple-50 text-purple-700 border border-purple-300 font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Copy formatted side-by-side comparison including rationale and safeguards"
            >
              {copiedCombined ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCombined ? "Copied All" : "Copy Comparison Note"}</span>
            </button>
          </div>
        </div>

        {/* Diff Stats Banner (when in diff mode) */}
        {viewMode !== "side-by-side" && diffResult && (
          <div className="px-5 py-2 bg-purple-50/80 border-b border-purple-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-purple-900 flex items-center gap-1.5">
                <GitCompare className="w-3.5 h-3.5 text-purple-700" />
                <span>Word Differential Analysis:</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
                +{diffResult.stats.addedCount} words added
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-900 border border-rose-300">
                -{diffResult.stats.removedCount} words removed
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-900 border border-blue-300">
                {diffResult.stats.percentRetained}% original retained
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 inline-block" />
                <span>Original Struck</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" />
                <span>Harmonized Addition</span>
              </span>
            </div>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-100/50">
          {/* Active Clause Title Header */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-bold bg-slate-900 text-white">
                  {currentClause.clauseNumber}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {currentClause.clauseTitle}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {metadata?.packageTitle ? `Package: ${metadata.packageTitle} • ` : ""}
                Evaluation baseline comparison for deadlocked commercial provision
              </p>
            </div>

            {/* Deadlock Summary Pill */}
            {currentClause.biddersContentionSummary && (
              <div className="text-xs max-w-md bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-2.5">
                <strong className="block font-bold mb-0.5 text-amber-950">
                  Bidders' Deadlock Contention:
                </strong>
                <span className="text-[11px] leading-relaxed line-clamp-2 hover:line-clamp-none transition-all">
                  {currentClause.biddersContentionSummary}
                </span>
              </div>
            )}
          </div>

          {/* MAIN COMPARISON VIEW AREA */}
          {viewMode === "diff-unified" && diffResult ? (
            /* Unified In-Line Diff Mode */
            <div className="bg-white rounded-xl border border-purple-200 shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-purple-50/70 border-b border-purple-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Split className="w-4 h-4 text-purple-700" />
                  <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wide">
                    Unified In-Line Differential Flow
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleCopyHarmonized}
                  className="text-xs text-purple-700 hover:text-purple-900 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  {copiedHarmonized ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedHarmonized ? "Copied" : "Copy Harmonized Text"}</span>
                </button>
              </div>
              <div className="p-5 font-mono text-xs leading-relaxed text-slate-800 whitespace-pre-wrap select-text">
                {diffResult.tokens.map((token, idx) => {
                  if (token.type === "added") {
                    return (
                      <span
                        key={idx}
                        className="bg-emerald-100 text-emerald-950 px-1 py-0.5 rounded font-bold border border-emerald-300"
                        title="Added in Harmonized formulation"
                      >
                        {token.value}
                      </span>
                    );
                  }
                  if (token.type === "removed") {
                    return (
                      <span
                        key={idx}
                        className="bg-rose-100 text-rose-800 line-through decoration-rose-500 px-1 py-0.5 rounded border border-rose-300 opacity-80"
                        title="Deleted from Original SBD"
                      >
                        {token.value}
                      </span>
                    );
                  }
                  return <span key={idx}>{token.value}</span>;
                })}
              </div>
            </div>
          ) : (
            /* SIDE-BY-SIDE PANELS (Standard or Diff-Split) */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column: Original SBD / NIT Provision */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
                {/* Column Header */}
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Original Tender Provision (SBD / NIT)
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {currentClause.originalClauseText.split(/\s+/).filter(Boolean).length} words
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyOriginal}
                      className="text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 px-2 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer shadow-2xs font-medium"
                      title="Copy original tender clause text"
                    >
                      {copiedOriginal ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedOriginal ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {/* Column Content */}
                <div className="p-4 flex-1 overflow-y-auto max-h-[380px] bg-white font-mono text-xs leading-relaxed text-slate-800 select-text">
                  {viewMode === "diff-split" && diffResult ? (
                    diffResult.originalTokens.map((token, idx) => {
                      if (token.type === "removed") {
                        return (
                          <span
                            key={idx}
                            className="bg-rose-100 text-rose-900 line-through decoration-rose-500 font-bold px-0.5 rounded border border-rose-200"
                            title="Modified / Deleted"
                          >
                            {token.value}
                          </span>
                        );
                      }
                      return <span key={idx}>{token.value}</span>;
                    })
                  ) : (
                    <div className="whitespace-pre-wrap">{currentClause.originalClauseText}</div>
                  )}
                </div>

                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Status: Standard Bidding Stipulation</span>
                  <span>Unamended Baseline</span>
                </div>
              </div>

              {/* Right Column: Harmonized / Reviewed Clause */}
              <div className="bg-white rounded-xl border border-emerald-300 shadow-xs flex flex-col overflow-hidden ring-1 ring-emerald-500/20">
                {/* Column Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-b border-emerald-200 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                      <span>Harmonized Corrigendum Formulation</span>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-emerald-700 font-mono font-semibold">
                      {currentClause.proposedReviewedClauseText.split(/\s+/).filter(Boolean).length} words
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyHarmonized}
                      className="text-xs text-white bg-emerald-700 hover:bg-emerald-600 px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer shadow-2xs font-semibold"
                      title="Copy proposed harmonized clause formulation"
                    >
                      {copiedHarmonized ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedHarmonized ? "Copied" : "Copy Revision"}</span>
                    </button>
                  </div>
                </div>

                {/* Column Content */}
                <div className="p-4 flex-1 overflow-y-auto max-h-[380px] bg-emerald-50/20 font-mono text-xs leading-relaxed text-slate-900 select-text">
                  {viewMode === "diff-split" && diffResult ? (
                    diffResult.amendedTokens.map((token, idx) => {
                      if (token.type === "added") {
                        return (
                          <span
                            key={idx}
                            className="bg-emerald-200 text-emerald-950 font-bold px-0.5 rounded border border-emerald-300"
                            title="Harmonized Insertion"
                          >
                            {token.value}
                          </span>
                        );
                      }
                      return <span key={idx}>{token.value}</span>;
                    })
                  ) : (
                    <div className="whitespace-pre-wrap">{currentClause.proposedReviewedClauseText}</div>
                  )}
                </div>

                <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-100 text-[11px] text-emerald-800 flex items-center justify-between font-medium">
                  <span>Balanced Addendum Wording</span>
                  <span className="font-semibold text-emerald-900">Recommended for Corrigendum</span>
                </div>
              </div>
            </div>
          )}

          {/* LOWER ANALYSIS & AUDIT DEFENSE GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Box 1: Concession Granted */}
            <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-2xs">
              <div className="flex items-center gap-2 mb-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
                <span className="p-1 rounded-md bg-blue-100 text-blue-700">🤝</span>
                <span>Commercial Concession Granted</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {currentClause.concessionGranted || "No unilateral concession; procedural clarification only."}
              </p>
            </div>

            {/* Box 2: Employer Safeguards Retained */}
            <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-2xs">
              <div className="flex items-center gap-2 mb-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Employer Safeguards Retained</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {currentClause.protectiveSafeguardsRetained || "Full statutory and contractual indemnities remain intact."}
              </p>
            </div>

            {/* Box 3: Audit & Vigilance Defense */}
            <div className="bg-white rounded-xl border border-purple-200 p-4 shadow-2xs">
              <div className="flex items-center gap-2 mb-2 text-purple-900 font-bold text-xs uppercase tracking-wider">
                <Scale className="w-4 h-4 text-purple-600" />
                <span>GFR 173 / CVC Audit Defense</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {currentClause.auditDefenseRationale || "Formulated to withstand vigilance scrutiny without creating post-tender favoritism."}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Clause</span>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <span>Next Clause</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-400 ml-2 hidden sm:inline">
              Tip: Use Left/Right arrow keys or dropdown above to switch clauses
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyHarmonized}
              className="text-xs px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              {copiedHarmonized ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedHarmonized ? "Harmonized Clause Copied" : "Copy Harmonized Clause"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-xs px-4 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold transition-all cursor-pointer shadow-2xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
