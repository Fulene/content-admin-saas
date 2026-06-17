"use client";

import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "forest";

const APP_THEME_STORAGE_KEY = "content-admin-saas-theme";

const appLogoSources: Record<ThemeMode, string> = {
  light: "/awone/logos/awone-logo-red.png",
  dark: "/awone/logos/awone-logo-orange.png",
  forest: "/awone/logos/awone-logo-green.png",
};

export function AppLogo({
  className,
  logoClassName = "h-auto w-22 object-contain sm:w-26 lg:w-30",
  nameClassName = "text-[9px] font-bold leading-none text-stone-950 dark:text-white sm:text-[10px] lg:text-[11px]",
  themeMode,
}: {
  className?: string;
  logoClassName?: string;
  nameClassName?: string;
  themeMode?: ThemeMode;
}) {
  const [storedThemeMode, setStoredThemeMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    if (themeMode) {
      return;
    }

    const storedTheme = window.localStorage.getItem(APP_THEME_STORAGE_KEY);

    if (isThemeMode(storedTheme)) {
      setStoredThemeMode(storedTheme);
    }
  }, [themeMode]);

  const effectiveThemeMode = themeMode ?? storedThemeMode;

  return (
    <div
      className={["flex min-w-0 flex-col items-start gap-1", className]
        .filter(Boolean)
        .join(" ")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={appLogoSources[effectiveThemeMode]}
        alt="Awone"
        className={logoClassName}
      />
      <p className={nameClassName}>content-admin-saas</p>
    </div>
  );
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "forest";
}
