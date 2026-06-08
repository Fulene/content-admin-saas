"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export type ToastMessageState = {
  status: "success" | "error";
  text: string;
};

const TOAST_DISPLAY_DURATION_IN_MS = 5000;
const TOAST_EXIT_DURATION_IN_MS = 220;

export function ToastMessage({
  message,
  onClose,
}: {
  message: ToastMessageState | null;
  onClose?: () => void;
}) {
  const [visibleMessage, setVisibleMessage] =
    useState<ToastMessageState | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (!message) {
      return;
    }

    setVisibleMessage(message);
    setIsLeaving(false);

    const exitTimer = window.setTimeout(() => {
      setIsLeaving(true);
    }, TOAST_DISPLAY_DURATION_IN_MS);
    const clearTimer = window.setTimeout(() => {
      setVisibleMessage(null);
      setIsLeaving(false);
      onClose?.();
    }, TOAST_DISPLAY_DURATION_IN_MS + TOAST_EXIT_DURATION_IN_MS);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(clearTimer);
    };
  }, [message?.status, message?.text]);

  if (!visibleMessage) {
    return null;
  }

  const isSuccess = visibleMessage.status === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={[
        "fixed bottom-5 left-1/2 z-[10000] w-[calc(100dvw-2rem)] max-w-sm md:left-auto md:right-5 md:w-auto",
        isLeaving ? "profile-toast-out" : "profile-toast-in",
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium shadow-xl shadow-black/10 backdrop-blur dark:shadow-black/35",
          isLeaving ? "" : "profile-toast-float",
          isSuccess
            ? "border-emerald-300 bg-emerald-100 text-emerald-900 shadow-emerald-950/10 dark:border-emerald-400/35 dark:bg-[#10251d] dark:text-emerald-100"
            : "border-[#f44336]/35 bg-[#ffe7e2] text-[#7f1d16] shadow-[#f44336]/15 dark:border-[#ff8a3d]/35 dark:bg-[#2a1815] dark:text-[#ffe7e2]",
        ].join(" ")}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{visibleMessage.text}</span>
      </div>
    </div>
  );
}
