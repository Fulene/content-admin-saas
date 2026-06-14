"use client";

import {
  type ButtonHTMLAttributes,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type TooltipPosition = {
  left: number;
  placement: "top" | "bottom";
  top: number;
};

export function IconButtonTooltip({
  children,
  className,
  label,
  onBlur,
  onFocus,
  onMouseEnter,
  onMouseLeave,
  type = "button",
  ...buttonProps
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  label: string;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [tooltipPosition, setTooltipPosition] =
    useState<TooltipPosition | null>(null);

  function showTooltip() {
    const buttonElement = buttonRef.current;

    if (!buttonElement || buttonProps.disabled) {
      return;
    }

    const buttonRect = buttonElement.getBoundingClientRect();
    const tooltipWidth = Math.min(240, Math.max(96, label.length * 7 + 28));
    const viewportPadding = 12;
    const left = Math.min(
      Math.max(
        buttonRect.left + buttonRect.width / 2,
        viewportPadding + tooltipWidth / 2,
      ),
      window.innerWidth - viewportPadding - tooltipWidth / 2,
    );
    const hasEnoughSpaceAbove = buttonRect.top > 52;

    setTooltipPosition({
      left,
      placement: hasEnoughSpaceAbove ? "top" : "bottom",
      top: hasEnoughSpaceAbove ? buttonRect.top - 8 : buttonRect.bottom + 8,
    });
  }

  function hideTooltip() {
    setTooltipPosition(null);
  }

  function handleMouseEnter(event: MouseEvent<HTMLButtonElement>) {
    onMouseEnter?.(event);
    showTooltip();
  }

  function handleMouseLeave(event: MouseEvent<HTMLButtonElement>) {
    onMouseLeave?.(event);
    hideTooltip();
  }

  function handleFocus(event: FocusEvent<HTMLButtonElement>) {
    onFocus?.(event);
    showTooltip();
  }

  function handleBlur(event: FocusEvent<HTMLButtonElement>) {
    onBlur?.(event);
    hideTooltip();
  }

  return (
    <>
      <button
        {...buttonProps}
        ref={buttonRef}
        type={type}
        className={className}
        aria-label={buttonProps["aria-label"] ?? label}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </button>

      {tooltipPosition
        ? createPortal(
            <span
              className="pointer-events-none fixed z-[10001] max-w-60 rounded-lg border border-[#ffb199]/50 bg-[#2a1815] px-3 py-2 text-xs font-semibold text-[#ffe7e2] shadow-2xl shadow-black/30"
              style={{
                left: tooltipPosition.left,
                top: tooltipPosition.top,
                transform:
                  tooltipPosition.placement === "top"
                    ? "translate(-50%, -100%)"
                    : "translate(-50%, 0)",
              }}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
