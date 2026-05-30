"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  FileText,
  Home,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
  X,
} from "lucide-react";

type AdminSectionId = "overview" | "articles" | "seo" | "settings";
type ThemeMode = "light" | "dark";

type AdminSection = {
  id: AdminSectionId;
  label: string;
  title: string;
  icon: typeof Home;
};

const sections: AdminSection[] = [
  {
    id: "overview",
    label: "Dashboard",
    title: "Dashboard",
    icon: Home,
  },
  {
    id: "articles",
    label: "Articles",
    title: "Articles",
    icon: FileText,
  },
  {
    id: "seo",
    label: "SEO",
    title: "SEO",
    icon: BarChart3,
  },
  {
    id: "settings",
    label: "Settings",
    title: "Settings",
    icon: Settings,
  },
];

export function AdminShell() {
  const [activeSectionId, setActiveSectionId] =
    useState<AdminSectionId>("overview");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [areSidebarLabelsVisible, setAreSidebarLabelsVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const activeSection = useMemo(
    () =>
      sections.find((section) => section.id === activeSectionId) ??
      sections[0],
    [activeSectionId],
  );

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("blog-admin-kit-theme");

    if (storedTheme === "dark" || storedTheme === "light") {
      setThemeMode(storedTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", themeMode === "dark");
    window.localStorage.setItem("blog-admin-kit-theme", themeMode);
  }, [themeMode]);

  function toggleSidebar() {
    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
      setAreSidebarLabelsVisible(true);
      return;
    }

    setIsSidebarCollapsed(true);
    setAreSidebarLabelsVisible(false);
  }

  return (
    <main className="min-h-screen bg-white text-stone-950 dark:bg-[#090b0b] dark:text-stone-50">
      <div className="flex min-h-screen flex-col bg-white dark:bg-[#202124]">
        <header className="flex h-18 shrink-0 items-center justify-between bg-white px-5 dark:bg-[#202124] lg:h-20 lg:px-8">
          <div className="flex min-w-0 items-center gap-24">
            <div className="min-w-0">
              <p className="text-base font-bold text-[#f44336] dark:text-[#ff8a3d] lg:text-lg">
                Blog Admin Kit
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-300 lg:text-sm">
                Backoffice
              </p>
            </div>

            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-[#151617] dark:text-stone-300 dark:hover:bg-[#101112] lg:inline-flex"
              aria-label={
                isSidebarCollapsed ? "Deployer la sidebar" : "Reduire la sidebar"
              }
              title={
                isSidebarCollapsed ? "Deployer la sidebar" : "Reduire la sidebar"
              }
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="absolute left-1/2 hidden -translate-x-1/2 text-center md:block">
            <p className="truncate text-xl font-bold text-stone-950 dark:text-white">
              {activeSection.title}
            </p>
          </div>

          <div className="hidden min-w-0 text-right md:block">
            <p className="truncate text-xl font-normal text-stone-800 dark:text-stone-100">
              Hello{" "}
              <span className="font-bold text-[#f44336] dark:text-[#ff8a3d]">
                Admin
              </span>
            </p>
            <p className="mt-1 truncate text-xs text-stone-500 dark:text-stone-300">
              Welcome to your dashboard
            </p>
          </div>

          <div className="flex items-center gap-3 md:hidden">
            <button
              type="button"
              onClick={() =>
                setThemeMode((mode) => (mode === "dark" ? "light" : "dark"))
              }
              className="hidden"
              aria-label={
                themeMode === "dark"
                  ? "Activer le mode clair"
                  : "Activer le mode sombre"
              }
              title={
                themeMode === "dark"
                  ? "Activer le mode clair"
                  : "Activer le mode sombre"
              }
            >
              {themeMode === "dark" ? (
                <Sun className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Moon className="h-5 w-5" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 dark:border-[#2d2e30] dark:bg-[#111213] dark:text-stone-200 dark:hover:bg-[#18191b] lg:hidden"
              aria-label="Ouvrir le menu"
              title="Menu"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div
          className={[
            "fixed inset-0 z-50 lg:hidden",
            isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none",
          ].join(" ")}
          aria-hidden={!isMobileMenuOpen}
        >
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className={[
              "absolute inset-0 cursor-pointer bg-black/35 transition-opacity duration-300",
              isMobileMenuOpen ? "opacity-100" : "opacity-0",
            ].join(" ")}
            aria-label="Fermer le menu"
          />

          <aside
            className={[
              "absolute right-0 top-0 flex h-full w-[min(86vw,340px)] flex-col border-l border-stone-200 bg-white px-5 py-6 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-[#2d2e30] dark:bg-[#202124]",
              isMobileMenuOpen ? "translate-x-0" : "translate-x-full",
            ].join(" ")}
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-[#151617] dark:text-stone-300 dark:hover:bg-[#101112]"
                aria-label="Fermer le menu"
                title="Fermer"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <nav className="mt-8 flex flex-col gap-2">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = section.id === activeSection.id;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => {
                      setActiveSectionId(section.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={[
                      "flex h-12 cursor-pointer items-center gap-4 rounded-md px-4 text-left text-sm font-medium transition-colors",
                      isActive
                        ? "bg-red-50 text-stone-950 dark:bg-[#111213] dark:text-white"
                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-[#18191b] dark:hover:text-white",
                    ].join(" ")}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon
                      className={[
                        "h-5 w-5 shrink-0",
                        isActive
                          ? "text-[#ff6b6b] dark:text-[#ff8a3d]"
                          : "text-stone-700 dark:text-[#ff8a3d]",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto flex flex-col gap-2">
              <button
                type="button"
                onClick={() =>
                  setThemeMode((mode) => (mode === "dark" ? "light" : "dark"))
                }
                className="flex h-12 cursor-pointer items-center gap-4 rounded-md px-4 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-[#18191b] dark:hover:text-white"
              >
                {themeMode === "dark" ? (
                  <Sun
                    className="h-5 w-5 shrink-0 text-[#ff6b16]"
                    aria-hidden="true"
                  />
                ) : (
                  <Moon
                    className="h-5 w-5 shrink-0 text-stone-700"
                    aria-hidden="true"
                  />
                )}
                <span>{themeMode === "dark" ? "Mode clair" : "Mode sombre"}</span>
              </button>

              <button
                type="button"
                className="flex h-12 cursor-pointer items-center gap-4 rounded-md px-4 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-[#18191b] dark:hover:text-white"
              >
                <LogOut
                  className="h-5 w-5 shrink-0 text-stone-700 dark:text-[#ff6b16]"
                  aria-hidden="true"
                />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>

        <div className="flex min-h-0 flex-1 bg-white dark:bg-[#202124]">
        <aside
          className={[
            "hidden shrink-0 overflow-hidden bg-white px-4 py-6 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-[#202124] lg:flex lg:flex-col",
            isSidebarCollapsed ? "w-[84px]" : "w-80",
          ].join(" ")}
        >
          <div className="flex flex-1 flex-col">
            <nav
              className={[
                "flex flex-col gap-2",
                "w-full",
              ].join(" ")}
            >
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = section.id === activeSection.id;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSectionId(section.id)}
                    className={[
                      "relative flex h-12 cursor-pointer items-center rounded-md text-left text-sm font-medium transition-colors",
                      isActive
                        ? "bg-red-50 text-stone-950 dark:bg-[#111213] dark:text-white"
                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-[#18191b] dark:hover:text-white",
                      "w-full overflow-hidden px-4",
                      "gap-4",
                    ].join(" ")}
                    aria-current={isActive ? "page" : undefined}
                    title={section.label}
                  >
                    <Icon
                      className={[
                        "h-5 w-5 shrink-0",
                        isActive
                          ? "text-[#f44336] dark:text-[#ff8a3d]"
                          : "text-stone-700 dark:text-[#ff8a3d]",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                    <span
                      className={[
                        "block w-40 whitespace-nowrap transition-opacity duration-150 ease-out",
                        areSidebarLabelsVisible ? "opacity-100" : "opacity-0",
                      ].join(" ")}
                    >
                      {section.label}
                    </span>
                  </button>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={() =>
                setThemeMode((mode) => (mode === "dark" ? "light" : "dark"))
              }
              className={[
                "mt-auto flex h-12 cursor-pointer items-center gap-4 rounded-md text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-[#18191b] dark:hover:text-white",
                "w-full overflow-hidden px-4",
              ].join(" ")}
              title={themeMode === "dark" ? "Mode clair" : "Mode sombre"}
            >
              {themeMode === "dark" ? (
                <Sun
                    className="h-5 w-5 shrink-0 text-[#ff8a3d]"
                  aria-hidden="true"
                />
              ) : (
                <Moon
                  className="h-5 w-5 shrink-0 text-stone-700"
                  aria-hidden="true"
                />
              )}
              <span
                className={[
                  "whitespace-nowrap transition-opacity duration-150 ease-out",
                  areSidebarLabelsVisible ? "opacity-100" : "opacity-0",
                ].join(" ")}
              >
                {themeMode === "dark" ? "Mode clair" : "Mode sombre"}
              </span>
            </button>

            <button
              type="button"
              className={[
                "mt-2 flex h-12 cursor-pointer items-center gap-4 rounded-md text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-[#18191b] dark:hover:text-white",
                "w-full overflow-hidden px-4",
              ].join(" ")}
              title="Logout"
            >
              <LogOut
                  className="h-5 w-5 shrink-0 text-stone-700 dark:text-[#ff8a3d]"
                aria-hidden="true"
              />
              <span
                className={[
                  "whitespace-nowrap transition-opacity duration-150 ease-out",
                  areSidebarLabelsVisible ? "opacity-100" : "opacity-0",
                ].join(" ")}
              >
                Logout
              </span>
            </button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-white dark:bg-[#202124]">
          <div className="flex flex-1 border-l border-t border-stone-200 bg-white px-6 py-6 dark:border-[#2d2e30] dark:bg-[#090b0b] sm:px-10 lg:rounded-tl-[5px]">
            <div className="min-h-full w-full" />
          </div>
        </section>
        </div>
      </div>
    </main>
  );
}
