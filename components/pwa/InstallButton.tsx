"use client";

import { Download, Share } from "lucide-react";
import { useEffect, useState } from "react";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

export function InstallButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (standalone) setInstalled(true);
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const click = async () => {
    if (deferred) {
      await deferred.prompt();
      setDeferred(null);
    } else if (isIOS) {
      setShowIOS((v) => !v);
    } else {
      setShowIOS((v) => !v);
    }
  };

  return (
    <div>
      <button
        onClick={click}
        className="glass flex w-full items-center gap-3 rounded-2xl p-4 text-left text-sm transition hover:bg-white/[0.08]"
      >
        <Download className="h-5 w-5 text-accent-glow" />
        <span>
          <span className="block font-semibold">Install app</span>
          <span className="text-xs text-white/45">Add Amore Movies to your home screen</span>
        </span>
      </button>

      {showIOS && !deferred && (
        <p className="mt-2 flex items-center gap-1.5 px-1 text-[11px] leading-relaxed text-white/55">
          {isIOS ? (
            <>
              Tap <Share className="inline h-3.5 w-3.5" /> Share in Safari, then{" "}
              <span className="font-semibold text-white/75">“Add to Home Screen.”</span>
            </>
          ) : (
            <>Open your browser menu and choose <span className="font-semibold text-white/75">“Install app” / “Add to Home screen.”</span></>
          )}
        </p>
      )}
    </div>
  );
}
