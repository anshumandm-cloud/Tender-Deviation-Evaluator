import React from "react";
import {
  X,
  Laptop,
  ShieldCheck,
  Download,
  Terminal,
  FileCode,
  HardDrive,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { triggerFileDownload } from "../utils/exportUtils";

interface OfflineDesktopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProject: () => void;
  onOpenProject: () => void;
}

export const OfflineDesktopModal: React.FC<OfflineDesktopModalProps> = ({
  isOpen,
  onClose,
  onSaveProject,
  onOpenProject,
}) => {
  if (!isOpen) return null;

  const downloadWindowsLauncherBat = () => {
    const batContent = `@echo off
title Tender Deviation Evaluator
color 1F
cls
echo ==============================================================================
echo                 TENDER DEVIATION EVALUATOR
echo              Administrative Decision-Support Tool
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

echo [2] Launching Local Tender Evaluation Server (Port 3000)...
start http://localhost:3000
npm start

pause
`;
    const blob = new Blob([batContent], { type: "application/x-bat" });
    triggerFileDownload(blob, "Start_Tender_Evaluator.bat");
  };

  const downloadExeBuildScript = () => {
    const instructions = `================================================================================
HOW TO BUILD A STANDALONE WINDOWS (.EXE) FILE FOR SHARING WITH DEALING OFFICERS
================================================================================

For deployment inside project offices or PSU enterprise workstations where internet access is restricted:

OPTION A: ONE-CLICK WINDOWS BATCH LAUNCHER (RECOMMENDED FOR LOCAL PC)
1. Download "Start_Tender_Evaluator.bat" using the button in the app.
2. Place it in your project folder and double-click to start immediately.
3. The evaluation application opens in your default browser at http://localhost:3000.

OPTION B: CREATE NATIVE STANDALONE .EXE FILE (PORTABLE DESKTOP APP)
Step 1: In the project root, install electron-packager or pkg:
   npm install --save-dev electron-builder electron
   or
   npm install -g pkg

Step 2: Run the automated build command:
   npm run build
   npx electron-builder --windows

Step 3: The standalone installer "TenderDeviationEvaluator-Setup.exe" will be 
generated inside the "dist" folder. You can copy this .exe to a USB drive 
or intranet shared folder to share with other dealing officers.

OPTION C: OFFLINE PRIVACY & DATA GUARANTEE
• All tender documents, SBDs, NITs, and bidder deviations remain strictly 
  within your local memory / PC session.
• You can export your full evaluation anytime as an ".sbd-eval" file to your 
  local C: drive or Google Drive without uploading to any public cloud.
================================================================================`;

    const blob = new Blob([instructions], { type: "text/plain" });
    triggerFileDownload(blob, "Standalone_EXE_Guide_Tender_Contracts.txt");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Local PC Deployment &amp; Standalone EXE Guide
              </h3>
              <p className="text-xs text-slate-300">
                Data Privacy &amp; Offline Intranet Execution for Public Sector Organizations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Privacy Guarantee Box */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Strict Confidentiality Guarantee (No Public Domain Exposure)</span>
            </div>
            <p className="text-slate-700 leading-relaxed">
              Tender documents (SBD, NIT, ITB) and sensitive bidder deviation schedules are processed strictly in your local container / browser session. No tender content is ever saved to public databases or shared outside your private session.
            </p>
          </div>

          {/* Local Project Backup */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <HardDrive className="w-4 h-4 text-blue-600" />
              <span>Save / Load Tender Assessment File (.sbd-eval)</span>
            </h4>
            <p className="text-slate-600 text-xs">
              Save your ongoing tender evaluation as an offline file directly to your PC hard drive or Google Drive, and restore it anytime with one click.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onSaveProject();
                  onClose();
                }}
                className="px-3.5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Tender Project (.sbd-eval)</span>
              </button>
              <button
                onClick={() => {
                  onOpenProject();
                  onClose();
                }}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Open Saved Project</span>
              </button>
            </div>
          </div>

          {/* Standalone Windows EXE & Batch Launcher */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <Terminal className="w-4 h-4 text-indigo-600" />
              <span>Standalone Executable (.exe) &amp; Windows Launcher</span>
            </h4>
            <p className="text-slate-600 text-xs">
              Download the Windows starter script to run the evaluator locally on your PC, or download the packaging instructions to generate a portable Windows <code>.exe</code> file for distribution to dealing officers.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={downloadWindowsLauncherBat}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Download Windows Launcher (.bat)</span>
              </button>

              <button
                onClick={downloadExeBuildScript}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <FileCode className="w-3.5 h-3.5 text-indigo-600" />
                <span>Download .EXE Packaging Guide</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
