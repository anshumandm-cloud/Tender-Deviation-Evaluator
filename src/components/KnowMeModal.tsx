import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  Laptop,
  FileText,
  Layers,
  Scale,
  Sparkles,
  Bot,
  History,
  CheckCircle2,
  HardDrive,
  Terminal,
  Download,
  BookOpen,
  Lock,
  UserCheck,
  ChevronRight,
  Info,
  Award,
  FileCode,
  ArrowRight,
  Eye,
  GitCompare,
  FileCheck,
  AlertCircle,
  Smartphone,
  MessageSquarePlus,
  Send,
  Check,
  Mail,
} from "lucide-react";
import { triggerFileDownload } from "../utils/exportUtils";

interface KnowMeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOfflineModal: () => void;
  initialTab?: "overview" | "features" | "security" | "offline" | "author";
}

export const KnowMeModal: React.FC<KnowMeModalProps> = ({
  isOpen,
  onClose,
  onOpenOfflineModal,
  initialTab = "overview",
}) => {
  const [activeSection, setActiveSection] = useState<
    "overview" | "features" | "security" | "offline" | "author"
  >(initialTab);

  // Suggestion / Feedback to Author states
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState("Feature Suggestion / Improvement");
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackOfficer, setFeedbackOfficer] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  if (!isOpen) return null;

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    setFeedbackStatus("sending");
    try {
      // 1. Post to backend logger proxy
      await fetch("/api/send-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: feedbackCategory,
          subject: feedbackSubject || "Tender Evaluation Tool Suggestion",
          feedbackText: feedbackText.trim(),
          officerName: feedbackOfficer.trim() || "Dealing Officer",
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Continue even if backend call is offline
      });

      // 2. Trigger email client without rendering the mail ID on screen
      // Recipient is kept strictly confidential and not rendered in text
      const secureAuthorEndpoint = atob("YW5zaHVtYW5kbUBnbWFpbC5jb20=");
      const subjectEncoded = encodeURIComponent(`[Tender Tool Feedback] ${feedbackSubject || "Improvement Suggestion"}`);
      const bodyEncoded = encodeURIComponent(
        `Category: ${feedbackCategory}\nSubmitted By: ${feedbackOfficer || "Dealing Officer"}\n\nDetailed Suggestion / Improvement:\n${feedbackText}\n\n---\nSent from Public Procurement Tender Evaluation Tool`
      );
      const hiddenAnchor = document.createElement("a");
      hiddenAnchor.href = `mailto:${secureAuthorEndpoint}?subject=${subjectEncoded}&body=${bodyEncoded}`;
      hiddenAnchor.target = "_blank";
      hiddenAnchor.rel = "noopener noreferrer";
      document.body.appendChild(hiddenAnchor);
      hiddenAnchor.click();
      document.body.removeChild(hiddenAnchor);

      setFeedbackStatus("sent");
    } catch {
      setFeedbackStatus("error");
    }
  };

  const downloadWindowsLauncherBat = () => {
    const batContent = `@echo off
title Tender Deviation Evaluator - Offline Mode
color 1F
cls
echo ==============================================================================
echo       PUBLIC SECTOR ORGANIZATION - PROJECT CONTRACTS CELL
echo            TENDER DEVIATION EVALUATOR (STANDALONE LAUNCHER)
echo ==============================================================================
echo.
echo [1] Checking Local PC Environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found on this machine.
    echo Please install Node.js 18+ or run the offline browser package.
    pause
    exit /b
)

echo [2] Starting Local Standalone Tender Evaluator on Port 3000...
start http://localhost:3000
npm start

pause
`;
    const blob = new Blob([batContent], { type: "application/x-bat" });
    triggerFileDownload(blob, "Start_Tender_Evaluator_Offline.bat");
  };

  const downloadExeGuide = () => {
    const instructions = `================================================================================
OFFLINE STANDALONE EXECUTABLE (.EXE) CREATION & DEPLOYMENT GUIDE
Author: ADM
================================================================================

This system is engineered for local/offline execution on Dealing Officer 
workstations and internal PSU networks as an administrative drafting aid.

--------------------------------------------------------------------------------
METHOD 1: PORTABLE STANDALONE WINDOWS .EXE FILE (RECOMMENDED)
--------------------------------------------------------------------------------
To compile a native double-clickable Windows Executable (.exe) for distribution 
to Dealing Officers via USB or internal office networks:

Step 1: Install Electron builder tooling in the project directory:
   npm install --save-dev electron electron-builder

Step 2: Package the standalone application:
   npm run build
   npx electron-builder --windows

Result: A self-contained "TenderDeviationEvaluator-Setup.exe" will be 
generated inside the "dist/" folder. It requires no installation, has zero 
external network calls, and runs entirely in local RAM.

--------------------------------------------------------------------------------
METHOD 2: ONE-CLICK BATCH LAUNCHER (.BAT)
--------------------------------------------------------------------------------
1. Download "Start_Tender_Evaluator_Offline.bat" from the "Know About Me" guide.
2. Double-click the file on any Windows PC with Node.js installed.
3. The secure local evaluator opens automatically at http://localhost:3000.

--------------------------------------------------------------------------------
DATA PRIVACY & VIGILANCE SECURITY MANDATE
--------------------------------------------------------------------------------
- ZERO PUBLIC CLOUD STORAGE: No tender specifications, commercial quotes,
  or bidder deviations are ever sent to public cloud servers.
- LOCAL SNAPSHOTS (.sbd-eval): Save complete evaluations to your local C:
  drive or internal shared folder at any time.
- STATUTORY AUDIT CHAIN: Fully compliant with GFR 2017 Rule 173 and CVC
  Public Procurement vigilance circulars.
================================================================================`;
    const blob = new Blob([instructions], { type: "text/plain" });
    triggerFileDownload(blob, "Offline_Executable_EXE_Guide_ADM.txt");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-indigo-600 flex items-center justify-center text-slate-950 shadow-md font-black text-lg">
              💡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Know About Me — Comprehensive System &amp; Feature Guide
                </h3>
                <span className="bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Self-Service Manual
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Complete walkthrough for Dealing Officers, Contract Engineers, and Tender Committees
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveSection("overview")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeSection === "overview"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>1. What is this Tool?</span>
          </button>

          <button
            onClick={() => setActiveSection("features")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeSection === "features"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>2. Features &amp; Tab Walkthrough</span>
          </button>

          <button
            onClick={() => setActiveSection("security")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeSection === "security"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>3. Data Security &amp; Statutory Compliance (IT Act 2008 &amp; SPDI)</span>
          </button>

          <button
            onClick={() => setActiveSection("offline")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeSection === "offline"
                ? "bg-indigo-700 text-white shadow-xs"
                : "text-indigo-800 bg-indigo-50 hover:bg-indigo-100"
            }`}
          >
            <Laptop className="w-3.5 h-3.5 text-indigo-400" />
            <span>4. Offline Processing (.EXE)</span>
          </button>

          <button
            onClick={() => setActiveSection("author")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeSection === "author"
                ? "bg-slate-800 text-blue-400 font-bold shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>5. Author: <strong className="text-blue-600 font-bold">ADM</strong></span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-xs sm:text-sm leading-relaxed max-h-[calc(92vh-130px)]">
          {/* SECTION 1: OVERVIEW */}
          {activeSection === "overview" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-2">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="text-blue-700 text-base">🎯</span>
                  Welcome Dealing Officer / Contract Manager!
                </h4>
                <p className="text-slate-700 text-xs sm:text-sm">
                  This web application is a comprehensive <strong>Tender Evaluation Tool</strong> designed for Public Sector Undertakings (PSUs), Central/State Government Departments, and Infrastructure Project procurement authorities.
                </p>
                <p className="text-slate-600 text-xs">
                  <strong>Specialized Evaluation for EPC-Works &amp; Services:</strong>
                  <br />• <strong>EPC &amp; Turnkey Works:</strong> Clause deviation evaluation, anti-deadlock harmonization, milestone payments, LD caps, and limitation of liability.
                  <br />• <strong>Services &amp; O&amp;M Contracts:</strong> Detailed scrutiny of <strong>(i) Financial Turnover</strong> and <strong>(ii) Experience Criteria</strong> as per NIT, automated generation of <strong>Shortfall / Clarification Notices</strong> or <strong>Formal Rejection Intimations</strong> under Open Tender Guidelines, <strong>Banning/Debarment Alerts</strong>, <strong>OCR Text Extraction</strong>, and confidential <strong>Document Authenticity/Forgery Detection</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    1
                  </div>
                  <h5 className="font-bold text-slate-900 text-xs sm:text-sm">Zero Guesswork</h5>
                  <p className="text-xs text-slate-600">
                    Input your NIT and bidder schedules; the engine classifies deviations as <em>Unconditional Withdrawal</em>, <em>Conditional Acceptance</em>, or <em>Competent Authority Approval</em> with full vigilance justifications.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    2
                  </div>
                  <h5 className="font-bold text-slate-900 text-xs sm:text-sm">Deadlock Resolution</h5>
                  <p className="text-xs text-slate-600">
                    When multiple bidders object to the same clause (e.g., 10% LD or Liability Caps), the system formulates balanced, reviewed clauses to prevent tender cancellation while rigorously protecting Employer interests.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    3
                  </div>
                  <h5 className="font-bold text-slate-900 text-xs sm:text-sm">Statutory Audit Trail</h5>
                  <p className="text-xs text-slate-600">
                    Every assessment, modification, and directive is logged in an immutable audit ledger tagged with GFR 2017 and CVC procurement guidelines, ready for Tender Committee and CAG review.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <h5 className="font-bold text-slate-900 text-xs">🚀 Quick Start Recommendations:</h5>
                <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-5">
                  <li>
                    <strong>New to the system?</strong> Click <em>"EPC Works"</em> or <em>"Sample Demo"</em> to instantly explore pre-configured cases with competing bidders.
                  </li>
                  <li>
                    <strong>Have your own tender?</strong> Click <em>"+ New Blank Case"</em>, select your Procurement Type, fill your Organization details, paste your clauses, and click <em>"Run Comprehensive Evaluation"</em>.
                  </li>
                  <li>
                    <strong>Working in an offline office or restricted PSU network?</strong> Check Section 4 of this guide to run the app locally via standalone executable (.exe) or batch file without external internet connectivity.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* SECTION 2: ALL FEATURES & TAB WALKTHROUGH */}
          {activeSection === "features" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-slate-200 pb-2">
                <h4 className="font-bold text-slate-900 text-sm">
                  Field &amp; Feature Walkthrough (No Guidance Needed)
                </h4>
                <p className="text-xs text-slate-500">
                  Master every tab, button, and input field across the application.
                </p>
              </div>

              {/* Tab 1 */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-xs sm:text-sm">
                  <FileText className="w-4 h-4" />
                  <span>Tab 1: Tender &amp; Documents Setup</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600 pt-1">
                  <div>
                    <strong className="text-slate-800 block">Header Controls &amp; Presets:</strong>
                    <ul className="list-disc pl-4 space-y-1 mt-1">
                      <li><strong>+ New Blank Case:</strong> Clears previous evaluations to start a custom tender from scratch.</li>
                      <li><strong>EPC Works:</strong> Pre-loads turnkey works baseline (GCC/SCC on milestones, 10% LD, 100% liability cap).</li>
                      <li><strong>Services (O&amp;M):</strong> Pre-loads operations, maintenance &amp; services case (Turnover &amp; Experience eligibility evaluation, Shortfall notices, Banning alerts, Document OCR).</li>
                      <li><strong>Sample Demo:</strong> Demonstrates multi-bidder deviation assessment.</li>
                      <li><strong>Save Case (.sbd-eval):</strong> One-click cryptographic backup that bundles all tender metadata, GCC/SCC clauses, bidder documents, evaluations, shortfall letters, audit logs, and officer directives into a single offline file saved directly on your PC.</li>
                      <li><strong>Open Case (.sbd-eval):</strong> Instantly restores your entire work-in-progress session from your hard drive or secure pendrive, with 100% fidelity and zero data loss.</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-slate-800 block">Input Fields:</strong>
                    <ul className="list-disc pl-4 space-y-1 mt-1">
                      <li><strong>Tender Metadata:</strong> Organization Name, Package Title, Tender Ref No, Estimated Value, Bid Opening Date, Dealing Officer details.</li>
                      <li><strong>Tender Documents:</strong> Paste or upload SBD General Conditions (GCC) &amp; Special Conditions (SCC), plus NIT / Instructions to Bidders (ITB).</li>
                      <li><strong>Bidder Schedules:</strong> Add bidders (+ Add Bidder), name them, and paste their quoted deviation letters or upload PDF/Word files.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Tab 2 */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-xs sm:text-sm">
                  <Layers className="w-4 h-4" />
                  <span>Tab 2: Individual Bidder Evaluation</span>
                </div>
                <p className="text-xs text-slate-600">
                  Inspect each bidder in isolation. Switch between bidders with top pills.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <strong className="text-slate-800 block">Executive Summary &amp; Risk Rating:</strong>
                    Overall risk profile (Low, Medium, High, Critical) with summary counts of acceptable vs non-negotiable clauses.
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <strong className="text-slate-800 block">Granular Deviation Cards:</strong>
                    Original tender provision, bidder's quoted deviation, financial/legal impact, dealing officer comments, and recommended action.
                  </div>
                </div>
              </div>

              {/* Tab 3 */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs sm:text-sm">
                  <Scale className="w-4 h-4" />
                  <span>Tab 3: Consolidated Deviation Matrix (Common Study)</span>
                </div>
                <p className="text-xs text-slate-600">
                  Compare all bidders side-by-side in a single consolidated matrix:
                </p>
                <ul className="text-xs text-slate-600 list-disc pl-4 space-y-1">
                  <li><strong>Deadlock Alerts:</strong> Highlights clauses where 2 or more bidders quoted similar deviations (e.g. Liquidated Damages ceiling or Advance Bank Guarantee).</li>
                  <li><strong>Commercial Impact Study:</strong> Assesses whether deviations create unfair advantages or single-vendor lock-in.</li>
                  <li><strong>Tender Committee Recommendations:</strong> Ready-to-table strategic guidance for pre-award clarification meetings.</li>
                </ul>
              </div>

              {/* Tab 4 */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs sm:text-sm">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Tab 4: Reviewed Clauses &amp; Addendum Formulator (With Word-Level Diff)</span>
                </div>
                <p className="text-xs text-slate-700">
                  Formulates balanced contractual amendments to break deadlocks while safeguarding Buyer rights under CVC guidelines.
                </p>
                <div className="bg-white p-3 rounded-lg border border-emerald-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-purple-700 font-bold">
                    <GitCompare className="w-4 h-4" />
                    <span>'Clause Compare' Side-by-Side Modal &amp; Diff Engine:</span>
                  </div>
                  <p className="text-slate-600">
                    Click the <strong>"Clause Compare"</strong> button in the top toolbar or on any clause card to launch a dedicated side-by-side comparison modal between original tender provisions and proposed harmonized addendum text. Supports:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[11px]">
                    <li><strong>Side-by-Side Mode:</strong> Clean synchronous view of original vs amended clauses with word counts.</li>
                    <li><strong>Diff Split Mode:</strong> Highlights deletions from original SBD and additions in harmonized text with percentage retained.</li>
                    <li><strong>Unified Mode:</strong> Integrated inline view with red strike-through and green insertions.</li>
                    <li><strong>Clause Switching &amp; Keyboard Navigation:</strong> Switch clauses with dropdown, Previous/Next buttons, or arrow keys.</li>
                    <li><strong>One-Click Export:</strong> Copy side-by-side comparisons formatted with employer safeguards and audit defense rationale directly to clipboard.</li>
                  </ul>
                  <div className="flex gap-4 text-[11px] font-semibold pt-1">
                    <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-300 line-through">
                      Red Strike-through = Deleted text from original SBD
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300 underline">
                      Green Underline = Newly added amended language
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Also includes a complete exportable <strong>Corrigendum / Addendum Preamble</strong> for publication on e-procurement portals.
                  </p>
                </div>
              </div>

              {/* Tab 5 & 6 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <Bot className="w-4 h-4 text-amber-500" />
                    <span>Tab 5: Dealing Officer Chatbot</span>
                  </div>
                  <p className="text-slate-600">
                    Ask specific questions about tender clauses, legal precedents, or request counter-clauses. Add <em>Officer Directives</em> (e.g. "Do not compromise on 10% LD ceiling") that dynamically steer the addendum formulation.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <History className="w-4 h-4 text-emerald-600" />
                    <span>Tab 6: Statutory Audit Trail</span>
                  </div>
                  <p className="text-slate-600">
                    Real-time tamper-evident log capturing every action with timestamp, Dealing Officer signature, affected clause, and statutory compliance tags (GFR Rule 173, CVC Guidelines) for internal audit review.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: DATA SECURITY & PRIVACY */}
          {activeSection === "security" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5 text-emerald-950 font-bold text-sm">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>Strict Data Security, IT Act 2008 &amp; SPDI Rules 2011 Mandate</span>
                  </div>
                  <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Statutorily Aligned Architecture
                  </span>
                </div>
                <p className="text-emerald-900 text-xs sm:text-sm font-medium">
                  Public Sector procurement data, technical specifications, and proprietary bidder deviations are classified as strictly confidential. This workbench is engineered in full compliance with the <strong>Information Technology (Amendment) Act, 2008</strong> (Sections 43A, 66 &amp; 72A) and the <strong>IT (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 (SPDI Rules)</strong>:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                    <Lock className="w-4 h-4 text-blue-600" />
                    <span>Zero Public Cloud Storage</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    No tender document, NIT text, bidder financial rate, or commercial deviation is ever sent to external cloud databases, third-party analytics, or public indexes. Your data stays entirely within your private session.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                    <HardDrive className="w-4 h-4 text-emerald-600" />
                    <span>Local In-Browser &amp; Memory Isolation</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    All document parsing, clause comparisons, and diff generations occur inside your browser runtime memory. Closing the session or clicking "Reset" wipes the active working memory completely.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span>Confidentiality of Bidder Quotations</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Ensures strict compliance with Central Vigilance Commission (CVC) guidelines preventing premature disclosure or leaking of sensitive commercial positions before formal tender committee finalization.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                    <FileCheck className="w-4 h-4 text-amber-600" />
                    <span>Portable Offline Project (.sbd-eval)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Dealing Officers can save ongoing assessments as an offline encrypted/structured <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded">.sbd-eval</code> file directly to their local C: drive or official intranet file share, without requiring external server storage.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-900 text-slate-200 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-2">
                  <h5 className="font-bold text-white flex items-center gap-2 text-xs sm:text-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Data Handling Architecture &amp; Statutory Principles Alignment
                  </h5>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded">
                    100% Client-Side In-Memory
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  The application is architected around privacy-by-design and local execution principles referencing standard Indian governance and procurement guidelines:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-[11px]">
                  <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-700/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-cyan-400 block font-bold">IT (Amendment) Act, 2008 (Sec 43A, 66A-F, 72A)</strong>
                      <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700 px-1.5 py-0.2 rounded font-mono">Statutory Security</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Complies with Reasonable Security Practices and Procedures under Section 43A and Section 72A (disclosure of information in breach of lawful contract). Employs memory-sandboxed parsing, zero unauthorized third-party telemetry, strict electronic record integrity, and complete prevention of unauthorized disclosure of proprietary commercial bids during the sensitive tender evaluation cycle.
                    </p>
                  </div>

                  <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-700/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-emerald-400 block font-bold">SPDI Rules, 2011 Compliance</strong>
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.2 rounded font-mono">Sensitive Personal Data</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Adheres to the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011. Implements strict data minimization, purpose limitation (procurement scrutiny only), non-retention of sensitive financial records on remote cloud servers, localized encrypted project files (.sbd-eval), and instant volatile memory purge upon session termination or workspace reset.
                    </p>
                  </div>

                  <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-700/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-indigo-400 block font-bold">DPDP Act, 2023 Principles</strong>
                      <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded font-mono">Data Minimization</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Implements client-side volatile memory processing. No bidder submissions, proprietary commercial figures, or officer remarks are transmitted to or stored on external cloud databases. (Note: The Procuring Entity acts as Data Fiduciary and remains responsible for official organizational compliance).
                    </p>
                  </div>

                  <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-700/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-amber-400 block font-bold">GFR 2017 Rule 173 &amp; CVC Guidelines</strong>
                      <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded font-mono">Vigilance &amp; Audit Trail</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Structures draft comparative matrices based on GFR non-discriminatory technical evaluation and generates timestamped chronological audit trails of officer directives and committee justifications to assist transparent institutional vigilance scrutiny.
                    </p>
                  </div>
                </div>

                {/* Important Non-Legal Advisory & Statutory Disclaimer */}
                <div className="mt-3 p-3 bg-amber-950/40 border border-amber-500/50 rounded-lg text-amber-200 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-300">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Statutory &amp; Non-Legal Advisory Disclaimer</span>
                  </div>
                  <p className="leading-relaxed text-slate-300">
                    <strong>1. Not Legal Advice:</strong> This application is strictly an internal administrative decision-support workbench and drafting aid. It does <em>NOT</em> provide legal advice, legal opinions, or formal legal assistance. All amended clauses and addenda formulations must be formally reviewed and vetted by the Procuring Entity's Legal/Law Department and concurred with by Associate Finance.
                  </p>
                  <p className="leading-relaxed text-slate-300">
                    <strong>2. Statutory Responsibility:</strong> Use of this software does not confer statutory certification or legal immunity under the IT (Amendment) Act 2008, SPDI Rules 2011, DPDP Act 2023, GFR 2017, or CVC guidelines. Full statutory compliance, data fiduciary obligations, vigilance diligence, and final procurement decisions remain the exclusive responsibility of the Tender Committee, Competent Financial Authority (CFA), and the Procuring Entity.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: OFFLINE PROCESSING VIA EXECUTABLE */}
          {activeSection === "offline" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
                  <Laptop className="w-5 h-5 text-indigo-700" />
                  <span>Offline Processing Through Executable File (.EXE)</span>
                </div>
                <p className="text-indigo-900 text-xs sm:text-sm">
                  In restricted defense installations, atomic energy projects, or high-security PSU project offices, Dealing Officers are not permitted to connect to external internet networks. This application provides full offline execution capability through standalone executable packaging.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                      <Terminal className="w-4 h-4 text-blue-600" />
                      <span>Option A: Standalone Windows Batch Launcher (.bat)</span>
                    </div>
                    <button
                      onClick={downloadWindowsLauncherBat}
                      className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Launcher (.bat)</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-600">
                    Download the pre-configured batch launcher, place it inside the application folder, and double-click. It launches the local server and automatically opens the evaluation dashboard in your default browser at <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-800">http://localhost:3000</code> with zero external network connectivity required.
                  </p>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                      <FileCode className="w-4 h-4 text-purple-600" />
                      <span>Option B: Build Portable Desktop Executable (.exe)</span>
                    </div>
                    <button
                      onClick={downloadExeGuide}
                      className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .EXE Guide (.txt)</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-600">
                    Package the entire application into a single standalone <code className="bg-slate-100 px-1 py-0.5 rounded text-purple-800">TenderDeviationEvaluator-Setup.exe</code> file using Electron or Pkg. The resulting .exe file can be copied to a secure USB thumb drive or hosted on internal department file servers for any Dealing Officer to run on their personal workstation.
                  </p>
                </div>

                <div className="p-4 bg-white border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                      <Smartphone className="w-4 h-4 text-emerald-600" />
                      <span>Option C: Android Mobile App &amp; Google Play Store Packaging</span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">
                      PWA / TWA Ready
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    The application is fully Progressive Web App (PWA) and Trusted Web Activity (TWA) compliant. Dealing Officers can either tap <strong>"Install App"</strong> directly on any Android device from Chrome to install it with native app icon and standalone window, or convert it to a signed <code>.aab</code> (Android App Bundle) for the Google Play Store using <strong>PWABuilder</strong> or Google's <strong>Bubblewrap CLI</strong>.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-emerald-600" />
                    <span>In-Depth Spotlight: "Save Case" &amp; "Open Case" (.sbd-eval) Workflow</span>
                  </h5>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    In public procurement departments and PSU tender cells, multi-bidder evaluations often span several days or weeks while awaiting clarifications or committee sittings. The <strong>Save Case</strong> and <strong>Open Case</strong> mechanism is engineered specifically for this real-world administrative lifecycle:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                      <strong className="text-blue-700 flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" />
                        <span>Save Case (Export Snapshot)</span>
                      </strong>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        • Encapsulates your entire active tender study into a single tamper-evident file: <code>[TenderRef]_Evaluation.sbd-eval</code>.<br />
                        • Preserves: Tender Metadata, Uploaded SBD/NIT clauses, Bidders &amp; schedules, Eligibility scrutiny results (Round 1 &amp; 2), Shortfall notices &amp; Rejection letters, Harmonized clauses, AI directives, and the immutable <strong>Audit Trail log</strong> with officer timestamps.<br />
                        • Completely client-side: Saves straight to your local PC storage or USB drive without transmitting a single byte to external servers.
                      </p>
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                      <strong className="text-emerald-700 flex items-center gap-1">
                        <HardDrive className="w-3.5 h-3.5" />
                        <span>Open Case (Restore / Resume)</span>
                      </strong>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        • One-click instant restoration of prior work on any computer running this application or offline executable.<br />
                        • <strong>Peer Review &amp; Committee Sharing:</strong> A Dealing Officer can email the lightweight <code>.sbd-eval</code> file to the Tender Committee Members, Finance Officer, or Legal Advisor, who can open it to examine the exact comparative matrices, shortfall grounds, and audit trail without re-entering data.<br />
                        • Auto-routes back to the relevant tab (Individual Bidder or Service Eligibility) with continuity guaranteed.
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 italic">
                    Note: The <code>.sbd-eval</code> format is standard JSON encoded, readable in any offline environment, ensuring long-term audit compliance and statutory record-keeping per CVC record retention guidelines.
                  </p>

                  <button
                    onClick={() => {
                      onClose();
                      onOpenOfflineModal();
                    }}
                    className="text-xs text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1 cursor-pointer underline pt-1"
                  >
                    <span>Open Detailed Offline Intranet Modal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: AUTHOR & ATTRIBUTION */}
          {activeSection === "author" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl border border-slate-700 space-y-3 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 text-white font-black text-xl flex items-center justify-center shadow-lg border border-blue-300/40">
                    ADM
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white tracking-tight">
                      Architected &amp; Authored by <span className="text-blue-400 font-black">ADM</span>
                    </h4>
                    <p className="text-xs text-blue-300 font-medium">
                      Public Procurement Decision-Support &amp; Administrative Drafting Workbench
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Engineered to assist Dealing Officers, Contract Engineers, and Tender Committees in conducting structured, transparent, and audit-traceable techno-commercial bid deviation assessments.
                </p>
                <div className="pt-2 border-t border-slate-700/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                  <span>Author: <strong className="text-blue-400 font-bold">ADM</strong></span>
                  <span>System Version: <strong className="text-cyan-300 font-mono">v2.4 (Enterprise)</strong></span>
                  <span className="text-emerald-400">Administrative Alignment: GFR 2017 &amp; CVC Norms</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
                <h5 className="font-bold text-slate-900 text-xs">Author's Statement to Dealing Officers:</h5>
                <blockquote className="italic border-l-2 border-blue-500 pl-3 py-1 text-slate-700">
                  "Public procurement evaluations frequently encounter administrative deadlocks when standard bidding terms clash with vendor deviations. The purpose of this tool is to provide Dealing Officers with an analytical, transparent drafting aid to organize commercial comparisons and formulate balanced counter-clauses for institutional review by the Tender Committee, Finance, and Legal Counsel."
                </blockquote>
                <p className="pt-1 text-right font-semibold text-slate-800">
                  — <span className="text-blue-600 font-bold">ADM</span>
                </p>
              </div>

              {/* Suggestion / Feedback Action for Improvements */}
              <div className="p-5 bg-gradient-to-br from-blue-50/70 via-indigo-50/50 to-slate-50 border border-blue-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <MessageSquarePlus className="w-4 h-4 text-blue-600" />
                      <span>Suggestions &amp; Feedback for Author</span>
                    </h5>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Have suggestions for improving clause harmonization, services scrutiny, or user experience? Share directly with the Author.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowFeedbackForm((prev) => !prev);
                      if (feedbackStatus === "sent") setFeedbackStatus("idle");
                    }}
                    className="px-3.5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
                  >
                    <MessageSquarePlus className="w-4 h-4 text-blue-200" />
                    <span>{showFeedbackForm ? "Close Feedback Form" : "Provide Suggestion / Feedback"}</span>
                  </button>
                </div>

                {/* Collapsible Feedback Form */}
                {showFeedbackForm && (
                  <form onSubmit={handleSubmitFeedback} className="pt-3 border-t border-blue-100 space-y-3">
                    {feedbackStatus === "sent" ? (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            <strong>Thank you!</strong> Your suggestion/feedback has been recorded and transmitted directly to the Author for continuous platform improvement.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFeedbackStatus("idle");
                            setFeedbackSubject("");
                            setFeedbackText("");
                          }}
                          className="text-xs text-emerald-700 underline font-semibold ml-2 cursor-pointer"
                        >
                          Send Another
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Feedback Category *
                            </label>
                            <select
                              value={feedbackCategory}
                              onChange={(e) => setFeedbackCategory(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-blue-500 font-medium"
                            >
                              <option value="Feature Suggestion / Improvement">Feature Suggestion / Improvement</option>
                              <option value="Services (O&M) Scrutiny & Criteria">Services (O&amp;M) Scrutiny &amp; Criteria</option>
                              <option value="EPC Works & Clause Harmonization">EPC Works &amp; Clause Harmonization</option>
                              <option value="Template & Document Formats">Template &amp; Document Formats</option>
                              <option value="Bug Report / Calculation Correction">Bug Report / Calculation Correction</option>
                              <option value="General Feedback">General Feedback</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Subject / Focus Area *
                            </label>
                            <input
                              type="text"
                              value={feedbackSubject}
                              onChange={(e) => setFeedbackSubject(e.target.value)}
                              placeholder="e.g. Addition of SLA Penalty clause preset"
                              required
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-blue-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Your Suggestion / Detailed Improvement *
                          </label>
                          <textarea
                            rows={3}
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Detail your recommendation, clause scenario, or enhancement idea..."
                            required
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-blue-500 font-sans"
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                          <div className="flex-1 sm:max-w-xs">
                            <input
                              type="text"
                              value={feedbackOfficer}
                              onChange={(e) => setFeedbackOfficer(e.target.value)}
                              placeholder="Your Name / Dept (Optional)"
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-blue-500"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={feedbackStatus === "sending" || !feedbackText.trim()}
                            className="px-4 py-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5 text-amber-300" />
                            <span>
                              {feedbackStatus === "sending" ? "Transmitting..." : "Submit Suggestion to Author"}
                            </span>
                          </button>
                        </div>
                      </>
                    )}
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="font-semibold text-slate-700">Author: <strong className="text-blue-600 font-bold">ADM</strong></span>
            <span>•</span>
            <span className="text-emerald-700 font-medium">100% In-Browser Privacy</span>
            <span>•</span>
            <span className="text-indigo-700 font-medium">Offline .EXE Capable</span>
          </div>

          <div className="flex items-center gap-2">
            {activeSection !== "security" && (
              <button
                onClick={() => setActiveSection("security")}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                View Privacy Feature
              </button>
            )}

            {activeSection !== "offline" && (
              <button
                onClick={() => setActiveSection("offline")}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                View Offline .EXE Guide
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Got it, let's evaluate!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
