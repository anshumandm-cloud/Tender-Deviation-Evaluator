import React, { useState } from "react";
import { Download, Smartphone, Check } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";

interface PWAInstallButtonProps {
  onOpenAndroidGuide?: () => void;
  variant?: "header" | "banner";
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  onOpenAndroidGuide,
  variant = "header",
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running inside installed standalone PWA app, we can still show an Android / Play Store info badge if clicked
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow when beforeinstallprompt event is caught
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm animate-pulse hover:animate-none"
        title="Install Tender Deviation Evaluator directly on your Android / PC device"
      >
        <Smartphone className="w-3.5 h-3.5 text-emerald-200" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          title="Install on iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-slate-400" />
          <span>Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>Install on iPhone / iPad</span>
              </h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                1. Tap the <strong>Share</strong> icon in the Safari navigation bar.<br />
                2. Scroll down and tap <strong>"Add to Home Screen"</strong>.<br />
                3. The app will launch with full screen standalone experience.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-slate-100 hover:bg-slate-200 py-2 text-xs font-bold text-slate-800 transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Default button: Opens the Android & Google Play Store Packaging Guide Modal
  return (
    <button
      onClick={onOpenAndroidGuide}
      className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-950/60 to-slate-900 hover:from-emerald-900 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
      title="Install on Android or Package for Google Play Store"
    >
      <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
      <span>Android / Play Store</span>
    </button>
  );
};
