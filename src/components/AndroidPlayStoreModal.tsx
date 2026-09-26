import React, { useState } from "react";
import {
  X,
  Smartphone,
  Download,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Terminal,
  FileCode,
  Package,
  Sparkles,
  ArrowRight,
  Layers,
  HelpCircle,
} from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";

interface AndroidPlayStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  appUrl?: string;
}

export const AndroidPlayStoreModal: React.FC<AndroidPlayStoreModalProps> = ({
  isOpen,
  onClose,
  appUrl = window.location.origin,
}) => {
  const [activeTab, setActiveTab] = useState<"instant" | "pwabuilder" | "bubblewrap" | "checklist">("instant");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { isInstallable, isInstalled, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const bubblewrapScript = `# 1. Install Google Bubblewrap CLI (Official Google Play TWA Tool)
npm install -g @bubblewrap/cli

# 2. Initialize Android Project from your deployed PWA Manifest
bubblewrap init --manifest="${appUrl}/manifest.webmanifest"

# 3. Build signed Android App Bundle (.aab) ready for Google Play Console
bubblewrap build

# Output: app-release-bundle.aab (Upload this directly to Google Play Console)`;

  const twaManifestJSON = `{
  "packageId": "com.adm.tenderevaluator",
  "host": "${new URL(appUrl).host}",
  "name": "Tender Deviation Evaluator",
  "launcherName": "TenderEval",
  "themeColor": "#0f172a",
  "navigationColor": "#0f172a",
  "backgroundColor": "#0f172a",
  "startUrl": "/",
  "iconUrl": "${appUrl}/pwa-512x512.png",
  "maskableIconUrl": "${appUrl}/pwa-maskable-512x512.png",
  "appVersionCode": 1,
  "appVersionName": "1.0.0",
  "display": "standalone",
  "orientation": "default"
}`;

  const downloadTwaConfig = () => {
    const blob = new Blob([twaManifestJSON], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "twa-manifest.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between gap-3 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0 shadow-inner">
              <Smartphone className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-wider font-mono font-bold text-emerald-300">
                  Android &amp; Google Play Store
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                  PWA / TWA Ready
                </span>
              </div>
              <h2 className="text-base font-bold text-white">
                Convert &amp; Publish as Android App for Google Play Store
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("instant")}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === "instant"
                ? "border-emerald-600 text-emerald-800 bg-white shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>1. Instant Android Install (Direct)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pwabuilder")}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === "pwabuilder"
                ? "border-emerald-600 text-emerald-800 bg-white shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Package className="w-4 h-4 text-purple-600" />
            <span>2. 1-Click Play Store (.AAB Package)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("bubblewrap")}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === "bubblewrap"
                ? "border-emerald-600 text-emerald-800 bg-white shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Terminal className="w-4 h-4 text-slate-700" />
            <span>3. Google CLI (Bubblewrap)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("checklist")}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === "checklist"
                ? "border-emerald-600 text-emerald-800 bg-white shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>4. Google Play Console Checklist</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-slate-50/50">
          {/* TAB 1: Instant Direct Android Install */}
          {activeTab === "instant" && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">
                    Your Web App is Already 100% Android PWA Installable!
                  </h3>
                  <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                    Android phones running Google Chrome, Samsung Internet, Edge, or Brave can install this app directly without waiting for Play Store verification. It installs with a native launcher icon, full-screen standalone display (no browser address bar), and offline support.
                  </p>
                </div>
              </div>

              {/* Install Trigger Action */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Direct Device Installation
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {isInstalled
                      ? "You are currently running the installed native standalone application."
                      : "Tap install to test the Android home screen shortcut and standalone UI."}
                  </p>
                </div>

                {isInstalled ? (
                  <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Already Installed</span>
                  </span>
                ) : isInstallable ? (
                  <button
                    type="button"
                    onClick={install}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition-all hover:scale-102"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install App on Device</span>
                  </button>
                ) : (
                  <div className="text-xs text-slate-500 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
                    Open on an Android device in Chrome &amp; tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>
                  </div>
                )}
              </div>

              {/* Step-by-Step Android Browser Guide */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-slate-700" />
                  <span>How to install on any Android phone (Chrome / Firefox / Edge)</span>
                </h4>
                <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-700 leading-relaxed">
                  <li>
                    Open this app URL on your Android mobile device: <br />
                    <code className="bg-slate-100 px-2 py-1 rounded text-purple-700 font-mono text-[11px] select-all inline-block mt-1">
                      {appUrl}
                    </code>
                  </li>
                  <li>Tap the <strong>three dots menu (⋮)</strong> in top-right of Google Chrome.</li>
                  <li>
                    Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                  </li>
                  <li>
                    Confirm <strong>"Install"</strong>. The app icon appears on your Android home screen alongside native apps!
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: PWABuilder (1-Click Google Play Store Package) */}
          {activeTab === "pwabuilder" && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-700 text-white flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-purple-950">
                    Generate Signed Android App Bundle (.aab) with PWABuilder
                  </h3>
                  <p className="text-xs text-purple-800 mt-1 leading-relaxed">
                    <strong>PWABuilder</strong> (backed by Microsoft &amp; Google) is the official no-code tool to package modern web applications into signed <strong>.AAB (Android App Bundle)</strong> files for the Google Play Store using Trusted Web Activity (TWA).
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  3-Step Play Store Packaging Process:
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                    <span className="font-bold text-purple-700 block">Step 1: Enter App URL</span>
                    <p className="text-slate-600 text-[11px]">
                      Visit <strong>PWABuilder.com</strong> and paste your deployed application URL.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                    <span className="font-bold text-purple-700 block">Step 2: Click 'Package for Stores'</span>
                    <p className="text-slate-600 text-[11px]">
                      Select <strong>Google Play</strong>. Enter package ID (e.g. <code>com.adm.tenderevaluator</code>).
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                    <span className="font-bold text-purple-700 block">Step 3: Download .AAB</span>
                    <p className="text-slate-600 text-[11px]">
                      Download your signed Android package and upload to Google Play Console!
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <a
                    href={`https://www.pwabuilder.com?url=${encodeURIComponent(appUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Launch PWABuilder with Your App URL</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={downloadTwaConfig}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download twa-manifest.json</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Google CLI (Bubblewrap) */}
          {activeTab === "bubblewrap" && (
            <div className="space-y-4">
              <div className="bg-slate-900 text-slate-100 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Google Bubblewrap CLI (Command Line Android Build)
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    <strong>Bubblewrap</strong> is the official Google Chrome team tool for creating, building, and signing Android Play Store projects directly from a terminal or CI/CD pipeline.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Terminal Commands to Generate Android Bundle (.aab):
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleCopy(bubblewrapScript, "bubblewrap")}
                    className="text-xs text-purple-700 hover:text-purple-900 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    {copiedCode === "bubblewrap" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode === "bubblewrap" ? "Copied Commands" : "Copy Commands"}</span>
                  </button>
                </div>

                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed">
                  {bubblewrapScript}
                </pre>
              </div>

              {/* Digital Asset Links */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Digital Asset Links Verification (Configured &amp; Active)</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Android requires verification via <code className="bg-slate-100 px-1.5 py-0.5 rounded text-purple-700 font-mono">/.well-known/assetlinks.json</code> to remove the browser address bar in the Play Store app. We have already generated and deployed this in your project root!
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: Google Play Console Submission Checklist */}
          {activeTab === "checklist" && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Google Play Console Submission Checklist:
                </h4>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div>
                      <strong className="block text-slate-900 font-bold">Google Play Developer Account</strong>
                      <span className="text-slate-600">
                        Create an account at <a href="https://play.google.com/console" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">play.google.com/console</a> (one-time $25 registration fee).
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div>
                      <strong className="block text-slate-900 font-bold">Create New App Listing</strong>
                      <span className="text-slate-600">
                        App Name: <strong>Tender Deviation Evaluator</strong> • Default language: English • Free app.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">
                      3
                    </div>
                    <div>
                      <strong className="block text-slate-900 font-bold">Upload Android App Bundle (.aab)</strong>
                      <span className="text-slate-600">
                        Upload the <code>.aab</code> package downloaded from PWABuilder or Bubblewrap in the Production or Internal Testing track.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">
                      4
                    </div>
                    <div>
                      <strong className="block text-slate-900 font-bold">Data Safety &amp; Privacy Compliance</strong>
                      <span className="text-slate-600">
                        In Data Safety, declare: <em>"No user data is collected or transmitted to external servers. All evaluation documents are processed in-browser on the local device."</em> (100% compliant with DPDP Act &amp; Google Play data privacy norms).
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>PWA Manifest, Service Worker &amp; AssetLinks are 100% configured</span>
          </div>

          <div className="flex items-center gap-2">
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
