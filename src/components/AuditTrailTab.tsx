import React, { useState, useMemo } from "react";
import {
  History,
  ShieldCheck,
  UserCheck,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Layers,
  Sparkles,
  Building2,
  Edit3,
  Calendar,
  ArrowUpDown,
  Download,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AuditLogEntry, AuditCategory, TenderMetadata } from "../types";
import { exportAuditTrailToCSV, exportAuditTrailToPDF } from "../utils/exportUtils";

interface AuditTrailTabProps {
  auditLogs: AuditLogEntry[];
  metadata: TenderMetadata;
  officerProfile: string;
  onUpdateOfficerProfile: (newProfile: string) => void;
  onAddManualLog: (entry: Omit<AuditLogEntry, "id" | "timestamp" | "formattedTime">) => void;
  onClearLogs?: () => void;
}

export const AuditTrailTab: React.FC<AuditTrailTabProps> = ({
  auditLogs,
  metadata,
  officerProfile,
  onUpdateOfficerProfile,
  onAddManualLog,
  onClearLogs,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline");
  const [isEditingOfficer, setIsEditingOfficer] = useState(false);
  const [officerInput, setOfficerInput] = useState(officerProfile);

  // Manual note modal
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteCategory, setNoteCategory] = useState<AuditCategory>("Officer Note");
  const [noteAction, setNoteAction] = useState("Pre-Bid Directive / Record Note");
  const [noteSummary, setNoteSummary] = useState("");
  const [noteDetails, setNoteDetails] = useState("");
  const [noteEntity, setNoteEntity] = useState("General Tender Compliance");
  const [noteComplianceTag, setNoteComplianceTag] = useState("GFR Rule 173 / CVC Scrutiny");

  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const handleSaveOfficer = () => {
    if (officerInput.trim()) {
      onUpdateOfficerProfile(officerInput.trim());
    }
    setIsEditingOfficer(false);
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteSummary.trim()) return;

    onAddManualLog({
      officer: officerProfile,
      category: noteCategory,
      action: noteAction.trim() || "Dealing Officer Note",
      summary: noteSummary.trim(),
      details: noteDetails.trim() || undefined,
      entityAffected: noteEntity.trim() || undefined,
      complianceTag: noteComplianceTag.trim() || "CVC Audit Compliance",
    });

    setNoteSummary("");
    setNoteDetails("");
    setIsNoteModalOpen(false);
  };

  // Filtered and sorted logs
  const filteredLogs = useMemo(() => {
    return auditLogs
      .filter((log) => {
        if (selectedCategory !== "All" && log.category !== selectedCategory) {
          return false;
        }
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          log.summary.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.officer.toLowerCase().includes(q) ||
          (log.details && log.details.toLowerCase().includes(q)) ||
          (log.entityAffected && log.entityAffected.toLowerCase().includes(q)) ||
          (log.complianceTag && log.complianceTag.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
      });
  }, [auditLogs, selectedCategory, searchQuery, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    const total = auditLogs.length;
    const metadataCount = auditLogs.filter((l) => l.category === "Metadata").length;
    const docsCount = auditLogs.filter((l) => l.category === "Tender Documents").length;
    const biddersCount = auditLogs.filter((l) => l.category === "Bidders & Deviations").length;
    const evalCount = auditLogs.filter((l) => l.category === "Evaluation" || l.category === "Harmonization").length;
    const officerNotesCount = auditLogs.filter((l) => l.category === "Officer Note").length;

    return { total, metadataCount, docsCount, biddersCount, evalCount, officerNotesCount };
  }, [auditLogs]);

  const getCategoryBadgeClass = (category: AuditCategory) => {
    switch (category) {
      case "Metadata":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Tender Documents":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Bidders & Deviations":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Evaluation":
        return "bg-amber-100 text-amber-900 border-amber-200";
      case "Harmonization":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "Officer Note":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "System & Files":
        return "bg-slate-100 text-slate-800 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Officer Identity Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100 shadow-2xs">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Tender Audit Trail &amp; Statutory Compliance Log
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  CVC &amp; GFR Compliant
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Immutable chronological ledger logging all updates to tender specifications, SBD/NIT files, bidder deviation schedules, evaluation parameters, and harmonized clauses for complete transparency, vigilance scrutiny, and internal audit compliance.
              </p>
            </div>
          </div>

          {/* Active Dealing Officer Badge */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Logged In Dealing Officer:
                </span>
                {!isEditingOfficer && (
                  <button
                    onClick={() => {
                      setOfficerInput(officerProfile);
                      setIsEditingOfficer(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold flex items-center gap-0.5 cursor-pointer ml-1"
                    title="Change Officer Profile"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
              {isEditingOfficer ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={officerInput}
                    onChange={(e) => setOfficerInput(e.target.value)}
                    className="text-xs px-2 py-1 border border-slate-300 rounded bg-white font-medium text-slate-900 focus:outline-blue-500 w-56"
                    placeholder="Officer Name, Designation"
                  />
                  <button
                    onClick={handleSaveOfficer}
                    className="px-2 py-1 bg-blue-700 text-white text-[11px] font-bold rounded hover:bg-blue-600 cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingOfficer(false)}
                    className="px-2 py-1 bg-slate-200 text-slate-700 text-[11px] rounded hover:bg-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <p className="font-bold text-slate-900 mt-0.5">{officerProfile}</p>
              )}
              <p className="text-[10px] text-slate-500 mt-0.5">
                Authority: {metadata.organization || "Project Contracts Cell"}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-lg">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Logs</span>
            <span className="text-lg font-bold text-slate-900">{stats.total}</span>
          </div>
          <div className="p-3 bg-blue-50/50 border border-blue-200/60 rounded-lg">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Metadata Edits</span>
            <span className="text-lg font-bold text-blue-900">{stats.metadataCount}</span>
          </div>
          <div className="p-3 bg-emerald-50/50 border border-emerald-200/60 rounded-lg">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Documents</span>
            <span className="text-lg font-bold text-emerald-900">{stats.docsCount}</span>
          </div>
          <div className="p-3 bg-purple-50/50 border border-purple-200/60 rounded-lg">
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Bidders &amp; Devs</span>
            <span className="text-lg font-bold text-purple-900">{stats.biddersCount}</span>
          </div>
          <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-lg">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Evaluations</span>
            <span className="text-lg font-bold text-amber-900">{stats.evalCount}</span>
          </div>
          <div className="p-3 bg-rose-50/50 border border-rose-200/60 rounded-lg">
            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Officer Notes</span>
            <span className="text-lg font-bold text-rose-900">{stats.officerNotesCount}</span>
          </div>
        </div>
      </div>

      {/* Control Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search modification summary, officer, action..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-blue-500 focus:bg-white text-slate-800"
            />
          </div>

          {/* Filter Category */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-blue-500 text-slate-700 font-medium cursor-pointer"
            >
              <option value="All">All Categories ({auditLogs.length})</option>
              <option value="Metadata">Metadata</option>
              <option value="Tender Documents">Tender Documents</option>
              <option value="Bidders & Deviations">Bidders &amp; Deviations</option>
              <option value="Evaluation">Evaluation</option>
              <option value="Harmonization">Harmonization</option>
              <option value="Officer Note">Officer Note</option>
              <option value="System & Files">System &amp; Files</option>
            </select>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
            className="px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 flex items-center gap-1 cursor-pointer font-medium"
            title="Toggle sort order"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>{sortOrder === "newest" ? "Newest First" : "Oldest First"}</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-100">
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === "timeline" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === "table" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Table
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add Manual Note */}
          <button
            id="add-audit-note-btn"
            onClick={() => setIsNoteModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            title="Add a manual statutory note or pre-bid record into the audit trail"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Log Officer Note</span>
          </button>

          {/* Export to CSV */}
          <button
            id="export-audit-csv-btn"
            onClick={() => exportAuditTrailToCSV(filteredLogs, metadata)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            title="Export filtered audit logs as structured CSV for CAG / vigilance audit"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* Export to PDF */}
          <button
            id="export-audit-pdf-btn"
            onClick={() => exportAuditTrailToPDF(filteredLogs, metadata, officerProfile)}
            className="px-3.5 py-2 bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            title="Download statutory audit trail certificate as PDF with official signature block"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Timeline or Table */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <History className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 mb-1">No Audit Logs Match Your Filter</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            Try adjusting your search query or category filter to view logged tender modifications.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All");
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === "timeline" ? (
        /* Timeline View */
        <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div
                key={log.id}
                className="relative bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow"
              >
                {/* Timeline node circle */}
                <div className="absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white bg-blue-600 shadow-2xs" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCategoryBadgeClass(
                        log.category
                      )}`}
                    >
                      {log.category}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{log.action}</span>
                    {log.entityAffected && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                        Target: {log.entityAffected}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1 text-[11px] font-mono">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{log.formattedTime || log.timestamp}</span>
                    </div>
                  </div>
                </div>

                {/* Summary of Modification */}
                <p className="text-xs text-slate-900 font-medium leading-relaxed mb-2">
                  {log.summary}
                </p>

                {/* Details Section (if available) */}
                {log.details && (
                  <div className="mt-2">
                    {isExpanded ? (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 leading-relaxed whitespace-pre-line">
                        <div className="font-sans font-semibold text-[11px] text-slate-500 uppercase tracking-wider mb-1">
                          Audit Log Details &amp; Change Parameters:
                        </div>
                        {log.details}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {log.details}
                      </p>
                    )}
                    <button
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="mt-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3 h-3" />
                          <span>Show Less</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" />
                          <span>View Full Change Details</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Footer with Officer info & compliance tag */}
                <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Officer in Charge:</span>
                    <strong className="text-slate-800">{log.officer}</strong>
                  </div>

                  {log.complianceTag && (
                    <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px] font-semibold">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{log.complianceTag}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3 w-40">Timestamp</th>
                  <th className="py-3 px-3 w-44">Dealing Officer</th>
                  <th className="py-3 px-3 w-40">Category &amp; Action</th>
                  <th className="py-3 px-3">Summary of Modification &amp; Details</th>
                  <th className="py-3 px-3 w-36">Compliance Tag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLogs.map((log, index) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-center font-bold text-slate-500 font-mono text-[11px]">
                      {index + 1}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                      {log.formattedTime || log.timestamp}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-900 block">{log.officer}</span>
                      {log.entityAffected && (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Target: {log.entityAffected}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border inline-block mb-1 ${getCategoryBadgeClass(
                          log.category
                        )}`}
                      >
                        {log.category}
                      </span>
                      <span className="font-medium text-slate-800 block text-[11px]">{log.action}</span>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-medium text-slate-900 leading-snug">{log.summary}</p>
                      {log.details && (
                        <p className="text-[11px] text-slate-500 font-mono mt-1 bg-slate-50 p-1.5 rounded border border-slate-100">
                          {log.details}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {log.complianceTag ? (
                        <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          <span>{log.complianceTag}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">GFR 173 Verified</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Statutory Integrity Pact & Verification Block */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 text-xs text-slate-600 leading-relaxed">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Statutory Certification &amp; Vigilance Integrity Pact
            </h4>
            <p className="text-slate-600 text-xs">
              In accordance with Central Vigilance Commission (CVC) Circular No. 01/01/2021 and General Financial Rules (GFR) 2017 Rule 173, every modification, deviation concession, tender specification update, and dealing officer directive must be logged in this tamper-evident audit record. All entries are preserved across project export and import cycles.
            </p>
          </div>
        </div>
      </div>

      {/* Modal: Log Manual Officer Note */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Dealing Officer Compliance Note</h3>
                  <p className="text-[11px] text-slate-500">Record official meeting minutes, pre-bid directives, or legal concurrences</p>
                </div>
              </div>
              <button
                onClick={() => setIsNoteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Category:</label>
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value as AuditCategory)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800"
                >
                  <option value="Officer Note">Officer Note / Meeting Minutes</option>
                  <option value="Metadata">Metadata Amendment</option>
                  <option value="Tender Documents">Tender Documents / Corrigendum</option>
                  <option value="Bidders & Deviations">Bidders &amp; Deviations Ruling</option>
                  <option value="Evaluation">Evaluation Concurrence</option>
                  <option value="Harmonization">Harmonization Directive</option>
                  <option value="System & Files">System File / Archival Note</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Action / Heading:</label>
                <input
                  type="text"
                  value={noteAction}
                  onChange={(e) => setNoteAction(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-blue-500"
                  placeholder="e.g. Pre-Bid Clarification Meeting Concluded"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Summary of Modification / Directive: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={noteSummary}
                  onChange={(e) => setNoteSummary(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-blue-500"
                  placeholder="Describe the change, meeting decision, concession approved, or vigilance instruction..."
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Detailed Remarks / File Reference (Optional):</label>
                <textarea
                  rows={2}
                  value={noteDetails}
                  onChange={(e) => setNoteDetails(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-blue-500"
                  placeholder="Official File Note No., Committee members present, or specific clause references..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Entity / Clause:</label>
                  <input
                    type="text"
                    value={noteEntity}
                    onChange={(e) => setNoteEntity(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800"
                    placeholder="e.g. Clause 14.2 / LD Cap"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Compliance Standard:</label>
                  <input
                    type="text"
                    value={noteComplianceTag}
                    onChange={(e) => setNoteComplianceTag(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800"
                    placeholder="e.g. GFR 173 / CVC Guideline"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-sm cursor-pointer"
                >
                  Record into Audit Trail
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
