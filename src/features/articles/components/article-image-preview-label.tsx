"use client";

import { type RefObject, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImageOff, Loader2 } from "lucide-react";
import { createArticleImageDisplayUrl } from "@/features/articles/services/articles.service";

type TooltipPosition = {
  left: number;
  placement: "top" | "bottom";
  top: number;
};

export function ArticleImagePreviewLabel({
  alt,
  className = "",
  imagePath,
  onClick,
}: {
  alt: string | null;
  className?: string;
  imagePath: string;
  onClick?: () => void;
}) {
  const triggerRef = useRef<HTMLButtonElement | HTMLSpanElement | null>(null);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [imageState, setImageState] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const [tooltipPosition, setTooltipPosition] =
    useState<TooltipPosition | null>(null);
  const imageName = getArticleImageName(imagePath, alt);

  async function showPreview() {
    const triggerElement = triggerRef.current;

    if (!triggerElement) {
      return;
    }

    const triggerRect = triggerElement.getBoundingClientRect();
    const tooltipWidth = 192;
    const viewportPadding = 12;
    const left = Math.min(
      Math.max(
        triggerRect.left + triggerRect.width / 2,
        viewportPadding + tooltipWidth / 2,
      ),
      window.innerWidth - viewportPadding - tooltipWidth / 2,
    );
    const hasEnoughSpaceAbove = triggerRect.top > 150;

    setTooltipPosition({
      left,
      placement: hasEnoughSpaceAbove ? "top" : "bottom",
      top: hasEnoughSpaceAbove ? triggerRect.top - 10 : triggerRect.bottom + 10,
    });

    if (displayUrl || imageState === "loading") {
      return;
    }

    setImageState("loading");

    try {
      const nextDisplayUrl = await createArticleImageDisplayUrl(imagePath);

      setDisplayUrl(nextDisplayUrl);
      setImageState(nextDisplayUrl ? "idle" : "error");
    } catch {
      setDisplayUrl(null);
      setImageState("error");
    }
  }

  const baseClassName =
    "inline-flex max-w-full cursor-pointer items-center truncate text-sm font-medium text-stone-700 transition-colors hover:text-[#f44336] dark:text-stone-300 dark:hover:text-[#ff8a3d]";
  const labelClassName = [baseClassName, className].join(" ");

  return (
    <>
      {onClick ? (
        <button
          ref={triggerRef as RefObject<HTMLButtonElement>}
          type="button"
          onClick={onClick}
          onMouseEnter={() => void showPreview()}
          onMouseLeave={() => setTooltipPosition(null)}
          className={labelClassName}
        >
          <span className="truncate">{imageName}</span>
        </button>
      ) : (
        <span
          ref={triggerRef as RefObject<HTMLSpanElement>}
          onMouseEnter={() => void showPreview()}
          onMouseLeave={() => setTooltipPosition(null)}
          className={labelClassName}
        >
          <span className="truncate">{imageName}</span>
        </span>
      )}

      {tooltipPosition
        ? createPortal(
            <span
              className="pointer-events-none fixed z-[10001] w-48 overflow-hidden rounded-xl border border-[#ffb199]/40 bg-[#2a1815] p-1.5 text-xs font-semibold text-[#ffe7e2] shadow-2xl shadow-black/30"
              style={{
                left: tooltipPosition.left,
                top: tooltipPosition.top,
                transform:
                  tooltipPosition.placement === "top"
                    ? "translate(-50%, -100%)"
                    : "translate(-50%, 0)",
              }}
            >
              <span className="mb-1 block truncate px-1">{imageName}</span>
              <span className="flex h-28 items-center justify-center overflow-hidden rounded-lg bg-black/20">
                {imageState === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                {imageState === "error" || !displayUrl ? (
                  <ImageOff className="h-5 w-5 opacity-80" aria-hidden="true" />
                ) : null}
                {displayUrl && imageState !== "error" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayUrl}
                    alt={alt ?? ""}
                    onError={() => setImageState("error")}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </span>
            </span>,
            document.body,
          )
        : null}
    </>
  );
}

export function getArticleImageName(imagePath: string, fallbackName?: string | null) {
  try {
    const url = new URL(imagePath);
    const filename = url.pathname.split("/").filter(Boolean).at(-1);

    return getDisplayImageName(filename, fallbackName);
  } catch {
    const filename = imagePath.split("/").filter(Boolean).at(-1);

    return getDisplayImageName(filename, fallbackName);
  }
}

function getDisplayImageName(
  filename: string | null | undefined,
  fallbackName?: string | null,
) {
  if (!filename) {
    return fallbackName?.trim() || "Image de couverture";
  }

  const decodedFilename = decodeURIComponent(filename);

  if (/^cover\.[a-z0-9]+$/i.test(decodedFilename)) {
    return fallbackName?.trim() || "Image de couverture";
  }

  return decodedFilename;
}
