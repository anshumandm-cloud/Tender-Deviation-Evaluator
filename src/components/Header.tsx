import React from "react";
import {
  FileText,
  ShieldCheck,
  Download,
  Upload,
  RefreshCw,
  Laptop,
  CheckCircle2,
  Building2,
  PlusCircle,
  Briefcase,
  Smartphone,
  HelpCircle,
  Package,
  Wrench,
} from "lucide-react";
import { TenderMetadata } from "../types";
import { PWAInstallButton } from "./PWAInstallButton";

interface HeaderProps {
  metadata: TenderMetadata;
  onLoadSample: () => void;
  onLoadGenericCase: () => void;
  onLoadGoodsCase?: () => void;
  onLoadServicesCase?: () => void;
  onNewBlankCase: () => void;
  onSaveProject: () => void;
  onOpenProject: () => void;
  onOpenDesktopModal: () => void;
  onOpenKnowMeModal: (tab?: "overview" | "features" | "security" | "offline" | "author") => void;
  onOpenAndroidModal?: () => void;
  onReset: () => void;
  hasActiveData: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  metadata,
  onLoadSample,
  onLoadGenericCase,
  onLoadGoodsCase,
  onLoadServicesCase,
  onNewBlankCase,
  onSaveProject,
  onOpenProject,
  onOpenDesktopModal,
  onOpenKnowMeModal,
  onOpenAndroidModal,
  onReset,
  hasActiveData,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-0 z-30">
      {/* Top Security & PSU Bar */}
      <div className="bg-slate-950 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between border-b border-slate-800/80 text-slate-300">
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-slate-200">
            {metadata.organization || "Enter Organization Name"}
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-cyan-300 font-mono">TURNKEY / EPC CASE EVALUATOR</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 text-[11px]">Author: <strong className="text-blue-400 font-bold">ADM</strong></span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenKnowMeModal("security")}
            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium transition-colors cursor-pointer"
            title="Click to view strict Data Security & In-Browser Privacy guarantees"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="underline decoration-dotted">Confidential Data • Local Processing</span>
          </button>
          <span className="text-slate-600">|</span>
          <button
            onClick={() => onOpenKnowMeModal("offline")}
            className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1 transition-colors underline cursor-pointer"
            title="Standalone Windows Executable (.exe) & Offline Guide"
          >
            <Laptop className="w-3 h-3" />
            <span>Offline PC (.EXE)</span>
          </button>
          <span className="text-slate-600">|</span>
          <button
            onClick={onOpenAndroidModal}
            className="text-emerald-300 hover:text-emerald-200 flex items-center gap-1 font-semibold transition-colors cursor-pointer bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/40"
            title="Convert to Android App or Publish to Google Play Store"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Android / Play Store</span>
          </button>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-700 to-indigo-800 flex items-center justify-center shadow-inner border border-blue-400/30 text-white">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Tender Deviation Evaluator
              </h1>
              <span className="bg-blue-900/70 border border-blue-400/30 text-blue-200 text-[11px] px-2 py-0.5 rounded-full font-medium">
                Universal Case Evaluator
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-xl">
              {metadata.packageTitle || "Enter Case Name"}
            </p>
          </div>
        </div>

        {/* Quick Actions & Case Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* PWA Install / Android Play Store Action */}
          <PWAInstallButton onOpenAndroidGuide={onOpenAndroidModal} />

          {/* Single "Know About Me" Button - Styled in sync with page theme */}
          <button
            onClick={() => onOpenKnowMeModal("overview")}
            id="know-me-btn"
            className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs rounded-md border border-slate-700 hover:border-slate-600 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Know About Me: Comprehensive System & Feature Walkthrough, Data Privacy Guarantee & Offline .EXE Execution"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>Know About Me</span>
          </button>
          <button
            onClick={onNewBlankCase}
            id="new-case-btn"
            className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold rounded-md border border-blue-500/40 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Start a fresh empty case with blank fields for any tender"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ New Blank Case</span>
          </button>

          <button
            onClick={onLoadGenericCase}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Load standard generic EPC Works template"
          >
            <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
            <span>EPC Works</span>
          </button>

          {onLoadGoodsCase && (
            <button
              onClick={onLoadGoodsCase}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Load Goods / Capital Equipment Supply case evaluation"
            >
              <Package className="w-3.5 h-3.5 text-emerald-400" />
              <span>Goods Supply</span>
            </button>
          )}

          {onLoadServicesCase && (
            <button
              onClick={onLoadServicesCase}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Load Operations & Maintenance / Services case evaluation"
            >
              <Wrench className="w-3.5 h-3.5 text-purple-400" />
              <span>Services (O&amp;M)</span>
            </button>
          )}

          <button
            onClick={onLoadSample}
            id="load-sample-btn"
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Load sample tender package demonstration"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Sample Demo</span>
          </button>

          <button
            onClick={onOpenProject}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Load saved .sbd-eval file from your PC"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Open Case</span>
          </button>

          <button
            onClick={onSaveProject}
            disabled={!hasActiveData}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:pointer-events-none text-slate-200 text-xs font-medium rounded-md border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Save entire tender evaluation file to local PC"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Save Case</span>
          </button>

          {hasActiveData && (
            <button
              onClick={onReset}
              className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-200 text-slate-400 text-xs font-medium rounded-md border border-slate-700/80 transition-all cursor-pointer"
              title="Clear all tender data and reset form"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
