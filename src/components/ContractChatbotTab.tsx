import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Trash2,
  Bot,
  User,
  Sparkles,
  HelpCircle,
  FileQuestion,
  RefreshCw,
  Scale,
  ShieldAlert,
  FileUp,
  FileText,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Plus,
  X,
  Eye,
  FileCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  ChatMessage,
  TenderMetadata,
  OfficerDirective,
  UploadedFormatTemplate,
} from "../types";
import { parseAnyFile } from "../utils/fileParser";
import {
  PRESET_FORMAT_TEMPLATES,
  detectFormatSections,
} from "../utils/formatTemplates";

interface ContractChatbotTabProps {
  metadata: TenderMetadata;
  sbdSummary: string;
  nitSummary: string;
  biddersInfo: any;
  officerDirectives: OfficerDirective[];
  onAddDirective: (directive: OfficerDirective) => void;
  onRemoveDirective: (id: string) => void;
  onToggleDirective: (id: string) => void;
  onApplyDirectiveToOutput: (directive: OfficerDirective) => void;
  activeFormatTemplate: UploadedFormatTemplate | null;
  onSelectFormatTemplate: (template: UploadedFormatTemplate) => void;
  onClearFormatTemplate: () => void;
  onReRunAnalysis: (
    directives?: OfficerDirective[],
    format?: UploadedFormatTemplate
  ) => Promise<void>;
  isReRunningAnalysis: boolean;
  onNavigateToTab: (
    tab: "setup" | "single" | "comparative" | "harmonized" | "audit" | "chat"
  ) => void;
}

const LOCAL_STORAGE_CHAT_KEY = "contract_officer_chat_history_v2";

export const ContractChatbotTab: React.FC<ContractChatbotTabProps> = ({
  metadata,
  sbdSummary,
  nitSummary,
  biddersInfo,
  officerDirectives,
  onAddDirective,
  onRemoveDirective,
  onToggleDirective,
  onApplyDirectiveToOutput,
  activeFormatTemplate,
  onSelectFormatTemplate,
  onClearFormatTemplate,
  onReRunAnalysis,
  isReRunningAnalysis,
  onNavigateToTab,
}) => {
  const getDefaultWelcomeMessage = (): ChatMessage => ({
    id: "msg-welcome",
    role: "assistant",
    content: `Greetings, Officer. I am your Public Procurement & Contracts Advisor.

I am loaded with your active package context ("${metadata.packageTitle || "Tender Package"}" — ${metadata.tenderType === "SERVICES_O_AND_M" ? "Services & Facility O&M" : "EPC / Turnkey Works"}) and trained in Standard Bidding Documents (GCC/SCC/SLA), CVC procurement circulars, and GFR 2017 rules.

⚡ **Interactive Improvisation & Analysis**:
• Discuss any clarification or concession across **EPC Works** or **Services (O&M)**; I will propose concrete clause counter-proposals that you can **apply directly to your output** with 1 click.
• Upload your organization's **standard corrigendum format or template** below; the system will improvise the evaluation and re-run the analysis according to your exact structure.
• Directives agreed here directly update the Harmonized Addendum Clauses and Comparative Matrix.`,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      // Check v2 key first, then fall back to old key if needed
      const saved = localStorage.getItem(LOCAL_STORAGE_CHAT_KEY) || localStorage.getItem("contract_officer_chat_history");
      if (saved) {
        const parsed: ChatMessage[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If the first message is the old greeting, replace it with the updated greeting
          const updated = parsed.map((m) => {
            if (m.id === "msg-welcome" || m.content.includes("Senior Public Procurement")) {
              return {
                ...m,
                content: m.content.replace(
                  "Greetings, Dealing Officer. I am your Senior Public Procurement, Legal & Contracts Advisor.",
                  "Greetings, Officer. I am your Public Procurement & Contracts Advisor."
                ),
              };
            }
            return m;
          });
          return updated;
        }
      }
    } catch (e) {
      console.warn("Failed to load chat history:", e);
    }
    return [getDefaultWelcomeMessage()];
  });

  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isFormatDrawerOpen, setIsFormatDrawerOpen] = useState(false);
  const [isDirectivesDrawerOpen, setIsDirectivesDrawerOpen] = useState(false);
  const [isUploadingFormat, setIsUploadingFormat] = useState(false);
  const [formatUploadError, setFormatUploadError] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<UploadedFormatTemplate | null>(null);

  // New manual directive form state
  const [manualTitle, setManualTitle] = useState("");
  const [manualInstruction, setManualInstruction] = useState("");
  const [manualClause, setManualClause] = useState("GCC Clause 27.2");
  const [showAddManualModal, setShowAddManualModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formatFileInputRef = useRef<HTMLInputElement>(null);

  // Persist messages to local storage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_CHAT_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn("Failed to persist chat history:", e);
    }
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isSending) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputMessage("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend.trim(),
          history: messages,
          contextData: {
            packageTitle: metadata.packageTitle,
            sbdSummary,
            nitSummary,
            biddersInfo,
          },
          activeDirectives: officerDirectives.filter((d) => d.active),
          activeFormat: activeFormatTemplate,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to reach AI Contract Assistant.");
      }

      const botMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: data.reply || "No response received.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        suggestedDirective: data.suggestedDirective || undefined,
        isDirectiveApplied: false,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: `Advisory note: ${err.message}. The system remains fully functional with built-in domain logic.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleApplySuggestionFromMessage = (msgId: string, directive: OfficerDirective) => {
    onApplyDirectiveToOutput(directive);
    onAddDirective(directive);

    // Mark as applied in local message state
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isDirectiveApplied: true } : m))
    );
  };

  const handleReRunWithDirective = async (directive: OfficerDirective) => {
    onAddDirective(directive);
    await onReRunAnalysis([directive, ...officerDirectives], activeFormatTemplate || undefined);
  };

  const handleFormatFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFormat(true);
    setFormatUploadError(null);

    try {
      const parsedResult = await parseAnyFile(file);
      const parsedText = parsedResult.text;
      if (!parsedText || parsedText.trim().length < 50) {
        throw new Error("Uploaded format file appears empty or could not be parsed.");
      }

      const sections = detectFormatSections(parsedText);
      const newTemplate: UploadedFormatTemplate = {
        id: `fmt-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ""),
        fileType: file.name.split(".").pop()?.toUpperCase() || "DOC",
        charCount: parsedText.length,
        uploadedAt: new Date().toLocaleDateString("en-IN"),
        templateText: parsedText,
        parsedSections: sections,
        isActive: true,
        description: `Custom format template uploaded by Dealing Officer (${file.name}).`,
      };

      onSelectFormatTemplate(newTemplate);
      setIsFormatDrawerOpen(true);
    } catch (err: any) {
      console.error("Format upload failed:", err);
      setFormatUploadError(err.message || "Failed to parse format file.");
    } finally {
      setIsUploadingFormat(false);
      if (formatFileInputRef.current) {
        formatFileInputRef.current.value = "";
      }
    }
  };

  const handleAddManualDirective = () => {
    if (!manualTitle.trim() || !manualInstruction.trim()) return;

    const newDirective: OfficerDirective = {
      id: `dir-manual-${Date.now()}`,
      title: manualTitle.trim(),
      instruction: manualInstruction.trim(),
      targetArea: "Harmonized Clauses",
      targetClause: manualClause,
      source: "manual",
      timestamp: new Date().toISOString(),
      active: true,
      proposedChanges: {
        clauseNumber: manualClause,
        clauseTitle: manualTitle.trim(),
        proposedReviewedClauseText: manualInstruction.trim(),
        protectiveSafeguardsRetained: "Retained per Dealing Officer manual instruction.",
        concessionGranted: manualInstruction.trim(),
        auditDefenseRationale: "Direct Dealing Officer stipulation under GFR Rule 173.",
      },
    };

    onAddDirective(newDirective);
    onApplyDirectiveToOutput(newDirective);
    setManualTitle("");
    setManualInstruction("");
    setShowAddManualModal(false);
  };

  const handleClearHistory = () => {
    setShowClearConfirm(true);
  };

  const executeClearHistory = () => {
    localStorage.removeItem(LOCAL_STORAGE_CHAT_KEY);
    localStorage.removeItem("contract_officer_chat_history");
    setMessages([getDefaultWelcomeMessage()]);
    setShowClearConfirm(false);
  };

  const suggestedQuestions = [
    "What are CVC guidelines on post-tender negotiations with L1 bidder regarding commercial deviations?",
    "Can we accept 70% payment against dispatch documents instead of physical receipt at site (MRC)?",
    "How to draft a legally binding counter-clause for LD cap reduction from 10% to 7.5%?",
    "Explain audit implications of accepting Price Variation in a fixed-price turnkey tender.",
    "Draft a counter-stipulation for excluding indirect/consequential damages in clause 38.0.",
  ];

  const activeDirectivesCount = officerDirectives.filter((d) => d.active).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[820px] relative">
      {/* Top Header */}
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-900 text-white rounded-t-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Dealing Officer AI Advisor</h3>
              <span className="text-[10px] bg-emerald-400 text-slate-950 font-bold px-1.5 py-0.5 rounded-full">
                Interactive &amp; Actionable
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Clarifications &amp; suggestions from here can instantly improvise outputs or re-run the evaluation
            </p>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-2">
          {/* Format / Template Button */}
          <button
            onClick={() => setIsFormatDrawerOpen((prev) => !prev)}
            className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeFormatTemplate
                ? "bg-amber-500/20 text-amber-200 border-amber-500/40 hover:bg-amber-500/30"
                : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
            }`}
            title="Upload or select standard format template"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Format: {activeFormatTemplate ? activeFormatTemplate.name.slice(0, 18) + "..." : "Standard"}
            </span>
            {isFormatDrawerOpen ? (
              <ChevronUp className="w-3 h-3 ml-0.5" />
            ) : (
              <ChevronDown className="w-3 h-3 ml-0.5" />
            )}
          </button>

          {/* Active Directives Button */}
          <button
            onClick={() => setIsDirectivesDrawerOpen((prev) => !prev)}
            className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeDirectivesCount > 0
                ? "bg-blue-600/30 text-blue-200 border-blue-500/50 hover:bg-blue-600/40"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span>Directives ({activeDirectivesCount})</span>
            {isDirectivesDrawerOpen ? (
              <ChevronUp className="w-3 h-3 ml-0.5" />
            ) : (
              <ChevronDown className="w-3 h-3 ml-0.5" />
            )}
          </button>

          {/* Re-Run Analysis Button */}
          <button
            onClick={() => onReRunAnalysis(officerDirectives, activeFormatTemplate || undefined)}
            disabled={isReRunningAnalysis}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Re-run analysis across all bidders applying active directives and format"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isReRunningAnalysis ? "animate-spin" : ""}`}
            />
            <span>{isReRunningAnalysis ? "Re-running..." : "Re-run Analysis"}</span>
          </button>

          {/* Clear History */}
          <button
            onClick={handleClearHistory}
            className="text-xs text-rose-300 hover:text-rose-100 hover:bg-rose-950/50 p-1.5 rounded-lg border border-rose-800/60 transition-colors cursor-pointer"
            title="Delete all chat history"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hidden File Input for Format Template Upload */}
      <input
        type="file"
        ref={formatFileInputRef}
        onChange={handleFormatFileUpload}
        accept=".docx,.xlsx,.xls,.pdf,.csv,.txt"
        className="hidden"
      />

      {/* Collapsible Format & Template Drawer */}
      {isFormatDrawerOpen && (
        <div className="bg-amber-50/90 border-b border-amber-200 p-4 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-amber-700" />
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Dealing Officer Format / Template Provision
                </h4>
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Upload your PSU's official corrigendum format, board note, or agreed minutes template.
                The app will improvise outputs to match your mandatory structure.
              </p>
            </div>
            <button
              onClick={() => setIsFormatDrawerOpen(false)}
              className="text-amber-800 hover:text-amber-950 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            {/* Presets Column */}
            <div className="md:col-span-2 space-y-2">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Select Standard PSU Presets:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PRESET_FORMAT_TEMPLATES.map((tmpl) => {
                  const isSelected = activeFormatTemplate?.id === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => onSelectFormatTemplate(tmpl)}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? "bg-amber-100 border-amber-400 ring-2 ring-amber-500/20 shadow-xs"
                          : "bg-white hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-800 line-clamp-1">
                          {tmpl.name}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-1">
                        {tmpl.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Upload Column */}
            <div className="bg-white p-3 rounded-lg border border-amber-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  Upload Custom Format:
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Supports DOCX, XLSX, PDF, CSV, TXT
                </p>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => formatFileInputRef.current?.click()}
                  disabled={isUploadingFormat}
                  className="flex-1 py-1.5 px-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>{isUploadingFormat ? "Parsing..." : "Upload Format File"}</span>
                </button>

                {activeFormatTemplate && (
                  <button
                    onClick={() => setPreviewTemplate(activeFormatTemplate)}
                    className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                    title="Preview active template structure"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {formatUploadError && (
                <p className="text-[10px] text-rose-600 mt-1 font-medium">
                  {formatUploadError}
                </p>
              )}
            </div>
          </div>

          {/* Active Format Actions Bar */}
          {activeFormatTemplate && (
            <div className="mt-3 pt-2.5 border-t border-amber-200/80 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs text-amber-950 font-medium">
                <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded">
                  Active Format
                </span>
                <span>{activeFormatTemplate.name}</span>
                <span className="text-[10px] text-slate-500">
                  ({activeFormatTemplate.charCount} chars, {activeFormatTemplate.parsedSections.length} sections detected)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onReRunAnalysis(officerDirectives, activeFormatTemplate)}
                  disabled={isReRunningAnalysis}
                  className="text-xs bg-amber-700 hover:bg-amber-800 text-white font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${isReRunningAnalysis ? "animate-spin" : ""}`}
                  />
                  <span>Re-run Analysis with this Format</span>
                </button>
                <button
                  onClick={onClearFormatTemplate}
                  className="text-xs text-slate-500 hover:text-rose-600 px-2 py-1 cursor-pointer"
                >
                  Clear Format
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsible Active Directives Drawer */}
      {isDirectivesDrawerOpen && (
        <div className="bg-blue-50/90 border-b border-blue-200 p-4 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-700" />
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  Active Dealing Officer Directives ({activeDirectivesCount})
                </h4>
              </div>
              <p className="text-[11px] text-blue-800 mt-0.5">
                These directives actively influence the single bidder counter-proposals, comparative matrix, and harmonized addendum clauses.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddManualModal(true)}
                className="text-xs bg-blue-700 hover:bg-blue-800 text-white font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Directive</span>
              </button>
              <button
                onClick={() => setIsDirectivesDrawerOpen(false)}
                className="text-blue-800 hover:text-blue-950 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {officerDirectives.length === 0 ? (
            <div className="mt-3 bg-white p-3 rounded-lg border border-blue-200 text-center text-xs text-slate-500">
              No directives added yet. Ask the chatbot to formulate a counter-clause (e.g., "Cap LD at 7.5%"), or click "Add Directive" above.
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {officerDirectives.map((d) => (
                <div
                  key={d.id}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    d.active
                      ? "bg-white border-blue-300 shadow-2xs"
                      : "bg-slate-100 border-slate-200 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-[11px] font-bold text-slate-900 line-clamp-1">
                      {d.title}
                    </span>
                    <button
                      onClick={() => onRemoveDirective(d.id)}
                      className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                      title="Remove directive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-600 line-clamp-2 mt-1">
                    {d.instruction}
                  </p>
                  <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium">
                      {d.targetClause || "General"}
                    </span>
                    <button
                      onClick={() => onToggleDirective(d.id)}
                      className={`font-semibold cursor-pointer ${
                        d.active ? "text-emerald-700 hover:underline" : "text-slate-500"
                      }`}
                    >
                      {d.active ? "Active" : "Disabled"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {officerDirectives.length > 0 && (
            <div className="mt-3 pt-2 border-t border-blue-200/80 flex items-center justify-between">
              <span className="text-[11px] text-blue-900 font-medium">
                Outputs automatically reflect applied directives. You can also trigger a full re-evaluation:
              </span>
              <button
                onClick={() => onReRunAnalysis(officerDirectives, activeFormatTemplate || undefined)}
                disabled={isReRunningAnalysis}
                className="text-xs bg-blue-700 hover:bg-blue-800 text-white font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isReRunningAnalysis ? "animate-spin" : ""}`}
                />
                <span>Re-run Full Analysis with Directives</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Suggested Quick Prompt Chips */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 overflow-x-auto flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-bold text-slate-500 shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          Quick Queries:
        </span>
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            disabled={isSending}
            className="text-[11px] text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 rounded-full px-3 py-1 shrink-0 transition-colors shadow-2xs cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/30">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const hasDirective = Boolean(msg.suggestedDirective);

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? "bg-slate-800 text-white"
                    : "bg-blue-700 text-white shadow-xs"
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className="max-w-2xl space-y-2">
                <div
                  className={`rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-2xs ${
                    isUser
                      ? "bg-slate-900 text-white rounded-tr-xs"
                      : "bg-white text-slate-800 border border-slate-200 rounded-tl-xs whitespace-pre-line"
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.content}</div>
                  <div
                    className={`text-[9px] mt-1.5 ${
                      isUser ? "text-slate-400 text-right" : "text-slate-400"
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {/* Actionable Directive Improvisation Card */}
                {!isUser && hasDirective && msg.suggestedDirective && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-3 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-xs font-bold text-amber-950">
                          Improvisation Suggestion: {msg.suggestedDirective.title}
                        </span>
                      </div>
                      <span className="text-[10px] bg-amber-200 text-amber-900 font-mono font-bold px-1.5 py-0.5 rounded">
                        {msg.suggestedDirective.targetClause || "Clause Formulation"}
                      </span>
                    </div>

                    <p className="text-[11px] text-amber-900 mt-1.5 bg-white/70 p-2 rounded border border-amber-200/60">
                      <strong>Directive Stipulation:</strong> {msg.suggestedDirective.instruction}
                    </p>

                    {msg.suggestedDirective.proposedChanges?.proposedReviewedClauseText && (
                      <div className="mt-1.5 text-[10px] text-slate-700 bg-white/90 p-2 rounded border border-amber-200 font-mono">
                        <span className="font-bold text-slate-900">Proposed Clause Text: </span>
                        {msg.suggestedDirective.proposedChanges.proposedReviewedClauseText}
                      </div>
                    )}

                    <div className="mt-2.5 flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-amber-200/80">
                      <div className="flex items-center gap-1.5">
                        {msg.isDirectiveApplied ? (
                          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Applied to Output
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              handleApplySuggestionFromMessage(msg.id, msg.suggestedDirective!)
                            }
                            className="text-xs bg-amber-700 hover:bg-amber-800 text-white font-bold px-3 py-1.5 rounded-lg shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>⚡ Apply Suggestion to Output</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleReRunWithDirective(msg.suggestedDirective!)}
                          disabled={isReRunningAnalysis}
                          className="text-xs bg-white hover:bg-amber-100 text-amber-900 font-semibold border border-amber-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <RefreshCw
                            className={`w-3 h-3 ${isReRunningAnalysis ? "animate-spin" : ""}`}
                          />
                          <span>Re-run Analysis with this</span>
                        </button>
                      </div>

                      <button
                        onClick={() => onNavigateToTab("harmonized")}
                        className="text-[11px] text-blue-700 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <span>View in Harmonized Clauses</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center shrink-0 text-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 text-xs text-slate-500 shadow-2xs flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Analyzing contract clauses and CVC procurement norms...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-slate-200 bg-white rounded-b-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask advisor or provide instruction (e.g., 'Cap LD at 7.5% for milestones', 'Add Delhi arbitration seat')..."
            disabled={isSending}
            className="flex-1 px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isSending}
            className="px-4 py-2.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 px-1">
          <span>
            💡 Tips: Suggestions create actionable cards with one-click output improvisation
          </span>
          <span>Press Enter to send</span>
        </div>
      </div>

      {/* Modal: Preview Template */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Template Preview: {previewTemplate.name}
                </h3>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3 text-xs text-slate-700">
              <div>
                <span className="font-bold text-slate-900">Detected Structural Sections:</span>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600">
                  {previewTemplate.parsedSections.map((sec, i) => (
                    <li key={i}>{sec}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="font-bold text-slate-900">Format Template Text:</span>
                <pre className="mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-800 max-h-96 overflow-y-auto">
                  {previewTemplate.templateText}
                </pre>
              </div>
            </div>
            <div className="p-3 border-t border-slate-200 flex justify-end gap-2 bg-slate-50 rounded-b-xl">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onSelectFormatTemplate(previewTemplate);
                  setPreviewTemplate(null);
                  setIsFormatDrawerOpen(true);
                }}
                className="px-4 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg cursor-pointer shadow-xs"
              >
                Use this Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Manual Directive */}
      {showAddManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Add Dealing Officer Directive
                </h3>
              </div>
              <button
                onClick={() => setShowAddManualModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Target Clause:
                </label>
                <input
                  type="text"
                  value={manualClause}
                  onChange={(e) => setManualClause(e.target.value)}
                  placeholder="e.g. GCC Clause 27.2 or GCC 18.2"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Directive Title:
                </label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. Cap LD at 7.5% with milestone adherence"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Operational Instruction / Stipulation:
                </label>
                <textarea
                  rows={3}
                  value={manualInstruction}
                  onChange={(e) => setManualInstruction(e.target.value)}
                  placeholder="Specify exact condition, percentage, or safeguard requirement..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowAddManualModal(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddManualDirective}
                disabled={!manualTitle.trim() || !manualInstruction.trim()}
                className="px-4 py-1.5 text-xs bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-lg cursor-pointer shadow-xs"
              >
                Apply &amp; Save Directive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Chat Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-3.5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Clear Chat History?</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will remove all current messages from this discussion and reset the advisor to the initial greeting.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeClearHistory}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg cursor-pointer transition-colors shadow-xs"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
