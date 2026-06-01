"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  FileText,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { logoutAction } from "@/features/auth/actions/auth.actions";
import { ArticlesAdminList } from "@/features/articles/components/articles-admin-list";
import { ProfileAdminSection } from "@/features/profile/components/profile-admin-section";
import type { ProfileView } from "@/features/profile/types/profile";

type AdminSectionId = "articles" | "profile-edit" | "profile-security";
type ThemeMode = "light" | "dark";

const profileSectionIds: AdminSectionId[] = [
  "profile-edit",
  "profile-security",
];

const profileSubsections = [
  {
    id: "profile-edit",
    label: "Modifier mon profil",
    icon: UserRound,
  },
  {
    id: "profile-security",
    label: "Securite",
    icon: ShieldCheck,
  },
] satisfies Array<{
  id: AdminSectionId;
  label: string;
  icon: typeof FileText;
}>;

export function AdminShell({
  initialProfile,
  userEmail,
  userId,
}: {
  initialProfile: ProfileView | null;
  userEmail: string;
  userId: string;
}) {
  const [activeSectionId, setActiveSectionId] =
    useState<AdminSectionId>("articles");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [profile, setProfile] = useState<ProfileView | null>(initialProfile);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [areSidebarLabelsVisible, setAreSidebarLabelsVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const isProfileActive = profileSectionIds.includes(activeSectionId);
  const userLabel =
    profile?.first_name?.trim() || userEmail.split("@")[0] || "Admin";

  useEffect(() => {
    if (isProfileActive) {
      setIsProfileMenuOpen(true);
    }
  }, [isProfileActive]);

  useEffect(() => {
    setIsMounted(true);

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

  const mobileMenu = (
    <div className="fixed left-0 top-0 z-[9999] h-dvh w-dvw lg:hidden">
      <button
        type="button"
        onClick={() => setIsMobileMenuOpen(false)}
        className="mobile-menu-backdrop-in absolute inset-0 z-0 cursor-pointer bg-black/35"
        aria-label="Fermer le menu"
      />

      <aside
        className="mobile-menu-drawer-in absolute bottom-0 right-0 top-0 z-[1] flex w-[min(86dvw,340px)] flex-col border-l border-stone-200 bg-white px-5 py-6 shadow-2xl dark:border-[#2d2e30] dark:bg-[#141517]"
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
          <SidebarButton
            icon={FileText}
            isActive={activeSectionId === "articles"}
            label="Articles"
            onClick={() => {
              setActiveSectionId("articles");
              setIsMobileMenuOpen(false);
            }}
          />

          <SidebarButton
            icon={Settings}
            isActive={isProfileActive}
            isDropdownOpen={isProfileMenuOpen}
            label="Mon profil"
            onClick={() => {
              setIsProfileMenuOpen((value) => !value);
            }}
          />

          <div
            className={[
              "ml-7 mt-2 grid border-l border-stone-200 pl-3 transition-[grid-template-rows] duration-200 dark:border-[#2d2e30]",
              isProfileMenuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            ].join(" ")}
          >
            <div className="flex min-h-0 flex-col gap-1 overflow-hidden">
              {profileSubsections.map((section) => (
                <SidebarButton
                  key={section.id}
                  icon={section.icon}
                  isCompact
                  isActive={activeSectionId === section.id}
                  label={section.label}
                  onClick={() => {
                    setActiveSectionId(section.id);
                    setIsMobileMenuOpen(false);
                  }}
                />
              ))}
            </div>
          </div>
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

          <form action={logoutAction}>
            <button
              type="submit"
              className="flex h-12 w-full cursor-pointer items-center gap-4 rounded-md px-4 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-[#18191b] dark:hover:text-white"
            >
              <LogOut
                className="h-5 w-5 shrink-0 text-stone-700 dark:text-[#ff6b16]"
                aria-hidden="true"
              />
              <span>Logout</span>
            </button>
          </form>
        </div>
      </aside>
    </div>
  );

  return (
    <main className="h-screen overflow-hidden bg-white text-stone-950 dark:bg-[#090b0b] dark:text-stone-50">
      <div className="flex h-full flex-col bg-white dark:bg-[#141517]">
        <header className="flex h-18 shrink-0 items-center justify-between bg-white px-5 dark:bg-[#141517] lg:h-20 lg:px-8">
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

          <div className="hidden min-w-0 text-right md:block">
            <p className="truncate text-xl font-normal text-stone-800 dark:text-stone-100">
              Hello{" "}
              <span className="font-bold text-[#f44336] dark:text-[#ff8a3d]">
                {userLabel}
              </span>
            </p>
            <p className="mt-1 truncate text-xs text-stone-500 dark:text-stone-300">
              {userEmail}
            </p>
          </div>

          <div className="flex items-center gap-3 md:hidden">
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

        {isMounted && isMobileMenuOpen
          ? createPortal(mobileMenu, document.body)
          : null}

        <div className="flex min-h-0 flex-1 overflow-hidden bg-white dark:bg-[#141517]">
        <aside
          className={[
            "hidden shrink-0 bg-white px-4 py-6 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-[#141517] lg:flex lg:flex-col",
            isSidebarCollapsed ? "w-[84px]" : "w-80",
            isSidebarCollapsed ? "overflow-visible" : "overflow-hidden",
          ].join(" ")}
        >
          <div className="flex flex-1 flex-col">
            <nav
              className={[
                "flex flex-col gap-2",
                "w-full",
              ].join(" ")}
            >
              <SidebarButton
                icon={FileText}
                isActive={activeSectionId === "articles"}
                isCollapsed={isSidebarCollapsed}
                isLabelVisible={areSidebarLabelsVisible}
                label="Articles"
                onClick={() => setActiveSectionId("articles")}
              />

              <SidebarButton
                icon={Settings}
                isActive={isProfileActive}
                isCollapsed={isSidebarCollapsed}
                isDropdownOpen={isProfileMenuOpen}
                isLabelVisible={areSidebarLabelsVisible}
                label="Mon profil"
                onClick={() => {
                  setIsProfileMenuOpen((value) => !value);
                }}
              />

              {!isSidebarCollapsed && isProfileMenuOpen ? (
                <div className="ml-7 mt-2 flex flex-col gap-1 overflow-hidden border-l border-stone-200 pl-3 dark:border-[#2d2e30]">
                  {profileSubsections.map((section) => (
                    <SidebarButton
                      key={section.id}
                      icon={section.icon}
                      isCompact
                      isActive={activeSectionId === section.id}
                      isLabelVisible={areSidebarLabelsVisible}
                      label={section.label}
                      onClick={() => setActiveSectionId(section.id)}
                    />
                  ))}
                </div>
              ) : null}
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

            <form action={logoutAction}>
              <button
                type="submit"
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
            </form>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-white dark:bg-[#141517]">
          <div className="flex min-h-0 flex-1 overflow-y-auto border-l border-t border-stone-200 bg-white px-6 py-6 [scrollbar-gutter:stable] dark:border-[#2d2e30] dark:bg-[#090b0b] sm:px-10 lg:rounded-tl-[5px]">
            <div className="min-h-full w-full">
              {activeSectionId === "articles" ? <ArticlesAdminList /> : null}
              {isProfileActive ? (
                <ProfileAdminSection
                  initialProfile={profile}
                  mode={
                    activeSectionId === "profile-security"
                      ? "security"
                      : "edit"
                  }
                  userEmail={userEmail}
                  userId={userId}
                  onProfileChange={setProfile}
                />
              ) : null}
            </div>
          </div>
        </section>
        </div>
      </div>
    </main>
  );
}

function SidebarButton({
  icon: Icon,
  isActive,
  isCollapsed = false,
  isCompact = false,
  isDropdownOpen,
  isLabelVisible = true,
  label,
  onClick,
}: {
  icon: typeof FileText;
  isActive: boolean;
  isCollapsed?: boolean;
  isCompact?: boolean;
  isDropdownOpen?: boolean;
  isLabelVisible?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative flex items-center rounded-md text-left font-medium transition-colors",
        isCompact ? "h-10 gap-3 px-3 text-sm" : "h-12 gap-4 px-4 text-sm",
        isActive
          ? "bg-red-50 text-stone-950 dark:bg-[#24262a] dark:text-white"
          : "text-stone-600 hover:bg-stone-100 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-[#18191b] dark:hover:text-white",
        isCollapsed ? "w-full overflow-visible" : "w-full overflow-hidden",
        "cursor-pointer",
      ].join(" ")}
      aria-current={isActive ? "page" : undefined}
      title={label}
    >
      <Icon
        className={[
          isCompact ? "h-4 w-4" : "h-5 w-5",
          "shrink-0",
          isActive
            ? "text-[#f44336] dark:text-[#ff8a3d]"
            : "text-stone-700 dark:text-[#ff8a3d]",
        ].join(" ")}
        aria-hidden="true"
      />
      <span
        className={[
          "min-w-0 flex-1 truncate whitespace-nowrap transition-opacity duration-150 ease-out",
          isLabelVisible ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        {label}
      </span>
      {typeof isDropdownOpen === "boolean" && isLabelVisible ? (
        <ChevronDown
          className={[
            "h-4 w-4 shrink-0 text-stone-500 transition-transform duration-200 dark:text-stone-400",
            isDropdownOpen ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden="true"
        />
      ) : null}
    </button>
  );
}
