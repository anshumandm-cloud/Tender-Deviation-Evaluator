import React, { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  FileText,
  Users,
  AlertTriangle,
  Scale,
  CheckCircle2,
  HelpCircle,
  TrendingDown,
  Layers,
  FileCheck,
  Search,
  Filter,
  Columns,
  Grid,
  ShieldAlert,
  ArrowUpDown,
  Sparkles,
} from "lucide-react";
import { ComparativeEvaluation, OfficerDirective, UploadedFormatTemplate, ReviewedClausesData, TenderMetadata } from "../types";
import { exportComparativeToExcel, exportComparativeToWord, exportComparativeToPDF, exportComprehensiveEvaluationToPDF } from "../utils/exportUtils";

interface ComparativeTabProps {
  comparativeData: ComparativeEvaluation | null;
  reviewedData?: ReviewedClausesData | null;
  metadata?: TenderMetadata;
  officerDirectives?: OfficerDirective[];
  activeFormatTemplate?: UploadedFormatTemplate | null;
  onOpenChatbot?: () => void;
  onReRunAnalysis?: () => void;
}

export const ComparativeTab: React.FC<ComparativeTabProps> = ({
  comparativeData,
  reviewedData,
  metadata,
  officerDirectives = [],
  activeFormatTemplate,
  onOpenChatbot,
  onReRunAnalysis,
}) => {
  const [viewMode, setViewMode] = useState<"consolidated-grid" | "thematic" | "committee">("consolidated-grid");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>("ALL");
  const [selectedBidderFilter, setSelectedBidderFilter] = useState<string>("ALL");

  if (!comparativeData) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
          <Scale className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">
          No Consolidated Deviation Matrix Generated Yet
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
          Please run the evaluation from the Tender Setup tab with all participating bidders to compile the consolidated deviation matrix for common study.
        </p>
      </div>
    );
  }

  // Extract all unique bidder names
  const allBidderNames = useMemo(() => {
    const set = new Set<string>();
    comparativeData.comparativeMatrix.forEach((row) => {
      row.bidderStances.forEach((s) => set.add(s.bidderName));
    });
    return Array.from(set);
  }, [comparativeData]);

  // Filtered rows for common study
  const filteredMatrix = useMemo(() => {
    return comparativeData.comparativeMatrix.filter((row) => {
      // Search query filter
      const matchesSearch =
        searchQuery === "" ||
        row.clauseOrTheme.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.tenderSBDProvision.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.officerComparativeAnalysis.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.recommendedHarmonizedStrategy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.bidderStances.some(
          (s) =>
            s.quotedDeviation.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.bidderName.toLowerCase().includes(searchQuery.toLowerCase())
        );

      if (!matchesSearch) return false;

      // Action filter
      if (selectedActionFilter !== "ALL") {
        const matchesAction = row.bidderStances.some((s) => {
          if (selectedActionFilter === "WITHDRAWAL") return s.action.includes("Withdrawal");
          if (selectedActionFilter === "CONDITIONAL") return s.action.includes("Conditions");
          if (selectedActionFilter === "CA") return s.action.includes("CA");
          if (selectedActionFilter === "ACCEPTABLE") return s.action.includes("Acceptable") && !s.action.includes("Conditions");
          return true;
        });
        if (!matchesAction) return false;
      }

      // Bidder filter
      if (selectedBidderFilter !== "ALL") {
        const hasBidder = row.bidderStances.some((s) => s.bidderName === selectedBidderFilter);
        if (!hasBidder) return false;
      }

      return true;
    });
  }, [comparativeData, searchQuery, selectedActionFilter, selectedBidderFilter]);

  const getPostureColor = (posture: string) => {
    if (posture === "Rigid") return "bg-rose-100 text-rose-800 border-rose-200";
    if (posture === "Moderate") return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  };

  const getActionTagColor = (action: string) => {
    if (action.includes("Withdrawal")) return "bg-rose-50 text-rose-700 border-rose-200";
    if (action.includes("Conditions")) return "bg-amber-50 text-amber-700 border-amber-200";
    if (action.includes("CA")) return "bg-purple-50 text-purple-700 border-purple-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  // Metrics
  const totalDeviationsAcrossAll = comparativeData.biddersSummary.reduce((acc, b) => acc + b.deviationCount, 0);
  const totalCriticalDeviations = comparativeData.biddersSummary.reduce((acc, b) => acc + b.criticalDeviations, 0);

  return (
    <div className="space-y-6">
      {/* Dealing Officer Directives & Format Improvisation Notice */}
      {(activeFormatTemplate || (officerDirectives && officerDirectives.length > 0)) && (
        <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-amber-50 border border-indigo-200 rounded-xl p-4 shadow-xs flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-bold text-slate-900">
                  Consolidated Strategy Improvised via Officer Directives
                </h4>
                {activeFormatTemplate && (
                  <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded">
                    Format: {activeFormatTemplate.name}
                  </span>
                )}
                {officerDirectives && officerDirectives.filter((d) => d.active).length > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                    {officerDirectives.filter((d) => d.active).length} Active Directive(s)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                The comparative evaluation postures and recommended harmonized strategies reflect your active dealing officer instructions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenChatbot && (
              <button
                onClick={onOpenChatbot}
                className="text-xs bg-white hover:bg-slate-50 text-indigo-700 font-semibold px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                Chatbot Advisor
              </button>
            )}
            {onReRunAnalysis && (
              <button
                onClick={onReRunAnalysis}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Re-run Comparative Matrix</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header & Export Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-slate-900">
                Consolidated Deviation Matrix (Common Study)
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                {comparativeData.totalBiddersEvaluated} Participating Bidders
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Common Scrutiny Format
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Master Cross-Bidder Comparative Statement for Joint Review by Project Contracts Cell, Finance, &amp; Tender Committee | {comparativeData.packageTitle}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() =>
                exportComprehensiveEvaluationToPDF(
                  comparativeData,
                  reviewedData || null,
                  metadata,
                  undefined,
                  activeFormatTemplate
                )
              }
              className="px-3.5 py-2 bg-gradient-to-r from-rose-700 to-red-800 hover:from-rose-600 hover:to-red-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer ring-1 ring-rose-400/50"
              title="Download complete evaluation PDF including Comparative Matrix, Harmonized Clauses & Committee Sign-Off"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export Full Evaluation PDF</span>
              <span className="text-[10px] bg-rose-950/60 text-rose-200 px-1.5 py-0.5 rounded font-mono font-medium">Matrix + Clauses</span>
            </button>

            <button
              onClick={() => exportComparativeToPDF(comparativeData, metadata)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
              title="Download standalone Comparative Matrix as PDF document"
            >
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              <span>Matrix PDF</span>
            </button>

            <button
              onClick={() => exportComparativeToWord(comparativeData)}
              className="px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download consolidated comparative report in Word"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Word (.docx)</span>
            </button>

            <button
              onClick={() => exportComparativeToExcel(comparativeData)}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download full comparative matrix in Excel with dedicated bidder columns"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Quick Common Study Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Deviations Quoted</span>
            <span className="text-xl font-bold text-slate-900">{totalDeviationsAcrossAll}</span>
            <span className="text-[10px] text-slate-500 block">Across all bidder schedules</span>
          </div>

          <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-lg">
            <span className="text-[11px] font-semibold text-rose-700 uppercase block">Fatal / High Risk Clauses</span>
            <span className="text-xl font-bold text-rose-700">{totalCriticalDeviations}</span>
            <span className="text-[10px] text-rose-600 block">Unconditional withdrawal required</span>
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
            <span className="text-[11px] font-semibold text-amber-800 uppercase block">Common Deadlocks</span>
            <span className="text-xl font-bold text-amber-800">{comparativeData.commonDeadlockAreas?.length || 0}</span>
            <span className="text-[10px] text-amber-700 block">Requiring harmonized addendum</span>
          </div>

          <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-lg">
            <span className="text-[11px] font-semibold text-indigo-700 uppercase block">Themes Analyzed</span>
            <span className="text-xl font-bold text-indigo-900">{comparativeData.comparativeMatrix.length}</span>
            <span className="text-[10px] text-indigo-600 block">Commercial, Legal &amp; Technical</span>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-100 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode("consolidated-grid")}
              className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "consolidated-grid"
                  ? "bg-white text-blue-900 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Columns className="w-3.5 h-3.5 text-blue-600" />
              <span>Consolidated Matrix (Side-by-Side Bidders)</span>
            </button>

            <button
              onClick={() => setViewMode("thematic")}
              className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "thematic"
                  ? "bg-white text-blue-900 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Thematic Breakdown &amp; Deadlocks</span>
            </button>

            <button
              onClick={() => setViewMode("committee")}
              className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "committee"
                  ? "bg-white text-blue-900 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tender Committee Note</span>
            </button>
          </div>

          {/* Search & Action Filters */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clause, text, or bidder..."
                className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-56"
              />
            </div>

            <select
              value={selectedActionFilter}
              onChange={(e) => setSelectedActionFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            >
              <option value="ALL">All Recommended Actions</option>
              <option value="WITHDRAWAL">Unconditional Withdrawal Only</option>
              <option value="CONDITIONAL">Acceptable with Conditions</option>
              <option value="CA">Requires CA Approval</option>
              <option value="ACCEPTABLE">Acceptable / Clarification</option>
            </select>

            {allBidderNames.length > 1 && (
              <select
                value={selectedBidderFilter}
                onChange={(e) => setSelectedBidderFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
              >
                <option value="ALL">All Bidders</option>
                {allBidderNames.map((name, i) => (
                  <option key={i} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Executive Comparative Synthesis */}
        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-indigo-600" />
            <span>Executive Cross-Bidder Competitive Analysis (Common Study Perspective):</span>
          </h4>
          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
            {comparativeData.comparativeExecutiveSummary}
          </p>
        </div>

        {/* Bidders Comparative Profile Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          {comparativeData.biddersSummary.map((b, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-slate-900 truncate" title={b.bidderName}>
                    {b.bidderName}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPostureColor(
                      b.generalPosture
                    )}`}
                  >
                    {b.generalPosture} Posture
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 mb-2">
                  <span>
                    Total: <strong className="text-slate-900">{b.deviationCount}</strong>
                  </span>
                  <span>|</span>
                  <span>
                    Critical: <strong className="text-rose-600">{b.criticalDeviations}</strong>
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-100 mt-2">
                {b.overallRecommendation}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* VIEW MODE 1: Consolidated Multi-Bidder Matrix (Side-by-Side Bidders) */}
      {viewMode === "consolidated-grid" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Columns className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Consolidated Comparative Deviation Matrix (Side-by-Side Study)
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredMatrix.length} of {comparativeData.comparativeMatrix.length} Clauses
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3 w-44">Clause Ref &amp; Subject</th>
                  <th className="py-2.5 px-3 w-56">Tender (SBD/NIT) Requirement</th>
                  {/* Dynamic Bidder Columns */}
                  {allBidderNames.map((name, i) => (
                    <th key={i} className="py-2.5 px-3 w-64 border-l border-slate-200 bg-slate-100/90">
                      <div className="flex items-center justify-between">
                        <span className="truncate font-bold text-slate-900" title={name}>
                          {name}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded">
                          Bidder {i + 1}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="py-2.5 px-3 w-64 border-l border-slate-200">
                    Common Study &amp; Conflict Assessment
                  </th>
                  <th className="py-2.5 px-3 w-64 border-l border-slate-200 bg-blue-50/30">
                    Recommended Harmonized Course of Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredMatrix.length === 0 ? (
                  <tr>
                    <td colSpan={5 + allBidderNames.length} className="py-8 text-center text-slate-500 text-xs">
                      No matching clauses found. Try adjusting your search query or filters.
                    </td>
                  </tr>
                ) : (
                  filteredMatrix.map((row, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="py-3 px-3 align-top text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 align-top font-bold text-slate-900">
                        {row.clauseOrTheme}
                      </td>
                      <td className="py-3 px-3 align-top text-slate-700 leading-relaxed">
                        {row.tenderSBDProvision}
                      </td>
                      {/* Bidder Stances Columns */}
                      {allBidderNames.map((name, bIdx) => {
                        const stance = row.bidderStances.find((s) => s.bidderName === name);
                        return (
                          <td key={bIdx} className="py-3 px-3 align-top border-l border-slate-200 bg-slate-50/30">
                            {stance ? (
                              <div className="space-y-1.5 text-[11px]">
                                <div className="flex items-center justify-between">
                                  <span
                                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${getActionTagColor(
                                      stance.action
                                    )}`}
                                  >
                                    {stance.action}
                                  </span>
                                </div>
                                <p className="text-slate-800 leading-normal font-medium">
                                  {stance.quotedDeviation}
                                </p>
                                {stance.impact && (
                                  <p className="text-slate-500 text-[10px] italic">
                                    Impact: {stance.impact}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No deviation quoted</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3 px-3 align-top border-l border-slate-200 text-slate-700 leading-relaxed">
                        {row.officerComparativeAnalysis}
                      </td>
                      <td className="py-3 px-3 align-top border-l border-slate-200 bg-blue-50/30">
                        <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded text-slate-800 leading-relaxed font-medium">
                          {row.recommendedHarmonizedStrategy}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: Thematic Breakdown & Deadlocks */}
      {viewMode === "thematic" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Consolidated Clause-by-Clause &amp; Thematic Comparative Matrix
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {comparativeData.comparativeMatrix.length} Contract Themes Analyzed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-3 w-48">Contract Clause / Theme</th>
                    <th className="py-2.5 px-3 w-56">Tender SBD/NIT Stipulation</th>
                    <th className="py-2.5 px-3 w-80">Bidder-by-Bidder Quoted Stances</th>
                    <th className="py-2.5 px-3 w-72">Dealing Officer's Comparative Risk Assessment</th>
                    <th className="py-2.5 px-3 w-72">Recommended Harmonized Strategy (Level Playing Field)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {comparativeData.comparativeMatrix.map((row, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="py-3 px-3 align-top font-bold text-slate-900">
                        {row.clauseOrTheme}
                      </td>
                      <td className="py-3 px-3 align-top text-slate-700 leading-relaxed">
                        {row.tenderSBDProvision}
                      </td>
                      <td className="py-3 px-3 align-top space-y-2">
                        {row.bidderStances.map((stance, sIdx) => (
                          <div
                            key={sIdx}
                            className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px]"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-slate-800">{stance.bidderName}</span>
                              <span
                                className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${getActionTagColor(
                                  stance.action
                                )}`}
                              >
                                {stance.action}
                              </span>
                            </div>
                            <p className="text-slate-700 leading-normal">{stance.quotedDeviation}</p>
                          </div>
                        ))}
                      </td>
                      <td className="py-3 px-3 align-top text-slate-700 leading-relaxed">
                        {row.officerComparativeAnalysis}
                      </td>
                      <td className="py-3 px-3 align-top">
                        <div className="p-2.5 bg-blue-50/50 border border-blue-200 rounded text-slate-800 leading-relaxed font-medium">
                          {row.recommendedHarmonizedStrategy}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Common Deadlock Areas */}
          {comparativeData.commonDeadlockAreas && comparativeData.commonDeadlockAreas.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  Common Deadlock Areas Across Bidders &amp; Recommended Compromise Formulations
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {comparativeData.commonDeadlockAreas.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-amber-50/40 border border-amber-200 rounded-lg space-y-1.5 text-xs"
                  >
                    <div className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span>{item.topic}</span>
                    </div>
                    <p className="text-slate-700">
                      <strong className="text-slate-900">Market Contention:</strong> {item.reasons}
                    </p>
                    <p className="text-blue-900 bg-white/80 p-2 rounded border border-amber-100">
                      <strong className="text-slate-900">Recommended Way Forward:</strong>{" "}
                      {item.recommendedWayForward}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 3: Tender Committee Note */}
      {viewMode === "committee" && comparativeData.tenderCommitteeRecommendations && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <FileCheck className="w-5 h-5 text-blue-700" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Official Draft Note for Tender Committee / GM (Contracts)
              </h3>
              <p className="text-xs text-slate-500">
                Structured for placement before Competent Authority with Finance Concurrence
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 leading-relaxed whitespace-pre-line font-serif">
            {comparativeData.tenderCommitteeRecommendations}
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-2">
            <h4 className="font-bold text-blue-900">Procedural Checklist for Price Bid Opening:</h4>
            <ul className="list-disc list-inside text-blue-800 space-y-1">
              <li>Issue formal Techno-Commercial Clarification letters to bidders demanding unconditional withdrawal of fatal deviations.</li>
              <li>Circulate Harmonized Addendum / Agreed Minutes of Meeting (MoM) to all participating bidders to preserve level playing field.</li>
              <li>Obtain unqualified confirmation of withdrawal and signed acceptance of Addendum prior to opening price bids.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
