import React, { useState, useEffect } from "react";
import { ArrowRight, Sparkles, X, Globe, ExternalLink } from "lucide-react";

export const MigrationNoticeBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState<boolean>(true);
  const [isOldPath, setIsOldPath] = useState<boolean>(false);

  useEffect(() => {
    // Check if the current URL contains 'tender-deviation-evaluator' or old hash/query
    const currentUrl = window.location.href.toLowerCase();
    if (
      currentUrl.includes("tender-deviation-evaluator") ||
      currentUrl.includes("deviation") ||
      localStorage.getItem("tender_seen_migration_prompt") !== "true"
    ) {
      setIsOldPath(true);
    }
  }, []);

  if (!showBanner) return null;

  return (
    <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white border-b border-indigo-500/40 px-4 py-2 text-xs shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-blue-500/30 text-blue-300 flex items-center justify-center shrink-0 border border-blue-400/40">
            <Sparkles className="w-3.5 h-3.5 text-blue-300 animate-pulse" />
          </span>
          <div className="space-y-0.5">
            <span className="font-bold text-blue-200">
              System Upgrade &amp; Migration Notice:
            </span>{" "}
            <span className="text-slate-200">
              Upgraded from <em>"Tender Deviation Evaluator"</em> to <strong>"Tender Evaluation Tool"</strong> with full EPC-Works &amp; Service/O&amp;M Eligibility evaluation (Turnover/Experience criteria, Shortfall letters &amp; OCR).
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono bg-blue-950/80 px-2 py-0.5 rounded border border-blue-400/40 text-cyan-300 flex items-center gap-1">
            <Globe className="w-3 h-3" />
            <span>tender-evaluation-tool</span>
          </span>
          <button
            onClick={() => {
              localStorage.setItem("tender_seen_migration_prompt", "true");
              setShowBanner(false);
            }}
            className="p-1 text-slate-400 hover:text-white rounded cursor-pointer transition-colors"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
