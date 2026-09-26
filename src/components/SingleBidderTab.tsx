import React, { useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  AlertOctagon,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  ShieldAlert,
  Copy,
  Check,
  Search,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";
import { SingleBidderEvaluation } from "../types";
import { exportSingleBidderToExcel, exportSingleBidderToWord } from "../utils/exportUtils";

interface SingleBidderTabProps {
  evaluations: SingleBidderEvaluation[];
  selectedBidderId: string;
  onSelectBidderId: (id: string) => void;
}

export const SingleBidderTab: React.FC<SingleBidderTabProps> = ({
  evaluations,
  selectedBidderId,
  onSelectBidderId,
}) => {
  const [filterAction, setFilterAction] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedNote, setCopiedNote] = useState<boolean>(false);

  if (!evaluations || evaluations.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">
          No Bidder Deviation Evaluation Generated Yet
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
          Please upload SBD, NIT, and participating bidders' deviation documents in the Tender Setup tab, then click "Run Evaluation".
        </p>
      </div>
    );
  }

  const currentEval =
    evaluations.find((e) => e.bidderId === selectedBidderId) || evaluations[0];

  const handleCopyOfficeNote = () => {
    navigator.clipboard.writeText(currentEval.officerSignOffNote);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
  };

  const filteredDeviations = (currentEval.deviations || []).filter((d) => {
    const matchesAction =
      filterAction === "all" ||
      d.recommendedAction.toLowerCase().includes(filterAction.toLowerCase());
    const matchesSearch =
      !searchQuery ||
      d.clauseNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.tenderClauseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.bidderQuotedDeviation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.psuDealingOfficerComments.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAction && matchesSearch;
  });

  const getActionBadge = (action: string) => {
    if (action.includes("Unconditional Withdrawal")) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full">
          <AlertOctagon className="w-3 h-3 text-rose-600" />
          Unconditional Withdrawal
        </span>
      );
    }
    if (action.includes("Conditions")) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          Acceptable with Conditions
        </span>
      );
    }
    if (action.includes("CA")) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full">
          <HelpCircle className="w-3 h-3 text-purple-600" />
          Requires CA &amp; Finance Approval
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
        <CheckCircle className="w-3 h-3 text-emerald-600" />
        Acceptable / Clarification
      </span>
    );
  };

  const getRiskColor = (rating: string) => {
    if (rating === "High") return "bg-rose-500 text-white";
    if (rating === "Medium") return "bg-amber-500 text-white";
    return "bg-emerald-500 text-white";
  };

  return (
    <div className="space-y-6">
      {/* Bidder Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
          Select Bidder:
        </span>
        {evaluations.map((ev) => {
          const isSelected = ev.bidderId === currentEval.bidderId;
          return (
            <button
              key={ev.bidderId}
              onClick={() => onSelectBidderId(ev.bidderId)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                isSelected
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>{ev.bidderName}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  isSelected ? "bg-slate-700 text-amber-300" : "bg-slate-100 text-slate-600"
                }`}
              >
                {ev.totalDeviationsCount} devs
              </span>
            </button>
          );
        })}
      </div>

      {/* Bidder Header & Download Controls */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-slate-900">{currentEval.bidderName}</h2>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getRiskColor(
                  currentEval.riskRating
                )}`}
              >
                {currentEval.riskRating} Risk Profile
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Evaluation Date: {currentEval.evaluationDate} | Package: {currentEval.packageTitle}
            </p>
          </div>

          {/* Download Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportSingleBidderToWord(currentEval)}
              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download official evaluation report in Word format"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Download Word (.docx)</span>
            </button>

            <button
              onClick={() => exportSingleBidderToExcel(currentEval)}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download structured evaluation sheet in Excel format"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Download Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Breakdown Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
            <div className="text-[11px] font-semibold text-rose-700 uppercase">
              Unconditional Withdrawal
            </div>
            <div className="text-xl font-bold text-rose-900 mt-1">
              {currentEval.summaryCounts.unconditionalWithdrawal}
            </div>
            <p className="text-[10px] text-rose-600 mt-0.5">Fatal / High-risk deviations</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="text-[11px] font-semibold text-amber-700 uppercase">
              Conditional Acceptance
            </div>
            <div className="text-xl font-bold text-amber-900 mt-1">
              {currentEval.summaryCounts.conditionalAcceptance}
            </div>
            <p className="text-[10px] text-amber-600 mt-0.5">Win-win counter-proposals</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="text-[11px] font-semibold text-purple-700 uppercase">
              CA &amp; Finance Approval
            </div>
            <div className="text-xl font-bold text-purple-900 mt-1">
              {currentEval.summaryCounts.caApprovalRequired}
            </div>
            <p className="text-[10px] text-purple-600 mt-0.5">Commercial/milestone approvals</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <div className="text-[11px] font-semibold text-emerald-700 uppercase">
              Acceptable / Minor
            </div>
            <div className="text-xl font-bold text-emerald-900 mt-1">
              {currentEval.summaryCounts.acceptable}
            </div>
            <p className="text-[10px] text-emerald-600 mt-0.5">No impact on buyer's interest</p>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
            <span>Executive Dealing Officer Assessment:</span>
          </h4>
          <p className="text-xs text-slate-700 leading-relaxed">{currentEval.executiveSummary}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clause (e.g. 27.2, LD, Payment, PBG)..."
            className="text-xs w-full focus:outline-none text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-600 font-medium">Filter Action:</span>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Recommendations</option>
            <option value="Withdrawal">Unconditional Withdrawal Only</option>
            <option value="Conditions">Conditional Acceptance</option>
            <option value="CA">Requires CA Approval</option>
            <option value="Acceptable">Acceptable / Clarification</option>
          </select>
        </div>
      </div>

      {/* Detailed Clause-by-Clause Evaluation Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900">
            Clause-by-Clause Deviation Evaluation Matrix ({filteredDeviations.length} items)
          </h3>
          <span className="text-xs text-slate-500">
            Evaluating against SBD GCC/SCC &amp; NIT stipulations
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3 w-12 text-center">#</th>
                <th className="py-2.5 px-3 w-40">Clause Ref &amp; Category</th>
                <th className="py-2.5 px-3 w-64">Bidder Quoted Deviation</th>
                <th className="py-2.5 px-3 w-64">Impact on Buyer's Interest</th>
                <th className="py-2.5 px-3 w-72">PSU Officer Comments &amp; Rationale</th>
                <th className="py-2.5 px-3 w-56">Action &amp; Counter-Proposal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredDeviations.map((item) => (
                <tr key={item.slNo} className="hover:bg-blue-50/30 transition-colors">
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-500 align-top">
                    {item.slNo}
                  </td>
                  <td className="py-3 px-3 align-top">
                    <div className="font-bold text-slate-900">{item.clauseNo}</div>
                    <div className="text-[11px] text-slate-600 mt-0.5">{item.tenderClauseTitle}</div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] font-medium px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded border border-slate-200">
                        {item.deviationCategory}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          item.riskScore === "Critical"
                            ? "bg-rose-100 text-rose-700"
                            : item.riskScore === "Major"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.riskScore}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 align-top">
                    <p className="text-slate-800 font-medium leading-relaxed">
                      {item.bidderQuotedDeviation}
                    </p>
                    {item.originalTenderProvision && (
                      <p className="text-[10px] text-slate-400 mt-1 italic">
                        Original: {item.originalTenderProvision}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-3 align-top">
                    <p className="text-slate-700 leading-relaxed">{item.impactOnBuyerInterest}</p>
                  </td>
                  <td className="py-3 px-3 align-top">
                    <p className="text-slate-700 leading-relaxed">
                      {item.psuDealingOfficerComments}
                    </p>
                  </td>
                  <td className="py-3 px-3 align-top space-y-1.5">
                    <div>{getActionBadge(item.recommendedAction)}</div>
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700">
                      <span className="font-semibold text-slate-900 block mb-0.5">
                        Counter-Proposal / Condition:
                      </span>
                      {item.suggestedCounterProposalOrConditions}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clarification Meeting Talking Points */}
      {currentEval.meetingAgendaPoints && currentEval.meetingAgendaPoints.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span>Points for Pre-Award Technical-Commercial Clarification Meeting with {currentEval.bidderName}</span>
          </h3>
          <div className="space-y-2">
            {currentEval.meetingAgendaPoints.map((point, index) => (
              <div
                key={index}
                className="flex items-start gap-2.5 p-2.5 bg-blue-50/40 border border-blue-100 rounded-lg text-xs text-slate-800"
              >
                <ChevronRight className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{point}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Office Note for Tender Committee */}
      {currentEval.officerSignOffNote && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900">
              Draft Office Note for Tender Committee / GM (Contracts)
            </h3>
            <button
              onClick={handleCopyOfficeNote}
              className="px-2.5 py-1 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copiedNote ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedNote ? "Copied" : "Copy Note"}</span>
            </button>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg font-serif text-xs text-slate-800 leading-relaxed whitespace-pre-line italic">
            {currentEval.officerSignOffNote}
          </div>
        </div>
      )}
    </div>
  );
};
