"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Building2,
  FileText,
  FolderTree,
  LogOut,
  Mail,
  Menu,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Tags,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { SelectDropdown } from "@/components/forms/select-dropdown";
import { logoutAction } from "@/features/auth/actions/auth.actions";
import { ArticlesAdminList } from "@/features/articles/components/articles-admin-list";
import { MembersAdminSection } from "@/features/members/components/members-admin-section";
import { ProfileAdminSection } from "@/features/profile/components/profile-admin-section";
import type { ProfileView } from "@/features/profile/types/profile";
import { isGlobalAdminRole } from "@/features/profile/utils/global-role";
import { ActiveSiteProvider } from "@/features/sites/components/active-site-provider";
import { SitesManagementSection } from "@/features/sites/components/sites-management-section";
import { getCurrentSitePermissionsAction } from "@/features/sites/actions/site-permissions.actions";
import type { Site } from "@/features/sites/types/site";
import { TaxonomyAdminSection } from "@/features/taxonomy/components/taxonomy-admin-section";

type AdminSectionId =
  | "articles"
  | "categories"
  | "tags"
  | "members-list"
  | "members-invitations"
  | "sites-management"
  | "profile-edit"
  | "profile-security";
type ThemeMode = "light" | "dark" | "forest";

const ACTIVE_SITE_STORAGE_PREFIX = "content-admin-saas-active-site";
const themeOptions = [
  { id: "light", label: "Clair" },
  { id: "dark", label: "Sombre" },
  { id: "forest", label: "Sapin" },
] satisfies Array<{ id: ThemeMode; label: string }>;

const profileSectionIds: AdminSectionId[] = [
  "profile-edit",
  "profile-security",
];
const memberSectionIds: AdminSectionId[] = [
  "members-list",
  "members-invitations",
];

const memberSubsections = [
  {
    id: "members-list",
    label: "Membres",
    icon: UserRound,
  },
  {
    id: "members-invitations",
    label: "Invitations",
    icon: Mail,
  },
] satisfies Array<{
  id: AdminSectionId;
  label: string;
  icon: typeof FileText;
}>;

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
  initialSites,
  userEmail,
  userId,
}: {
  initialProfile: ProfileView | null;
  initialSites: Site[];
  userEmail: string;
  userId: string;
}) {
  const router = useRouter();
  const isGlobalAdmin = isGlobalAdminRole(initialProfile?.global_role);
  const [sites, setSites] = useState<Site[]>(initialSites);
  const [activeSectionId, setActiveSectionId] =
    useState<AdminSectionId>(() =>
      isGlobalAdmin && initialSites.length === 0 ? "sites-management" : "articles",
    );
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [profile, setProfile] = useState<ProfileView | null>(initialProfile);
  const [activeSite, setActiveSite] = useState<Site | null>(null);
  const [isSiteReady, setIsSiteReady] = useState(false);
  const [hasHeaderAvatarError, setHasHeaderAvatarError] = useState(false);
  const [isMembersMenuOpen, setIsMembersMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [areSidebarLabelsVisible, setAreSidebarLabelsVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileMenuClosing, setIsMobileMenuClosing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const isProfileActive = profileSectionIds.includes(activeSectionId);
  const isMembersActive = memberSectionIds.includes(activeSectionId);
  const isSitesManagementActive = activeSectionId === "sites-management";
  const [canManageInvitations, setCanManageInvitations] = useState(
    false,
  );
  const [canManageContent, setCanManageContent] = useState(false);
  const [areSitePermissionsLoaded, setAreSitePermissionsLoaded] =
    useState(false);
  const effectiveCanManageInvitations = isGlobalAdmin || canManageInvitations;
  const effectiveCanManageContent = isGlobalAdmin || canManageContent;
  const visibleMemberSubsections = effectiveCanManageInvitations
    ? memberSubsections
    : memberSubsections.filter((section) => section.id !== "members-invitations");
  const userLabel =
    profile?.first_name?.trim() || userEmail.split("@")[0] || "Admin";
  const headerInitials = getUserInitials(
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
      userEmail,
  );
  const activeSiteStorageKey = getActiveSiteStorageKey(userId);

  useEffect(() => {
    setSites(initialSites);
  }, [initialSites]);

  useEffect(() => {
    if (isMembersActive) {
      setIsMembersMenuOpen(true);
    }
  }, [isMembersActive]);

  useEffect(() => {
    if (
      activeSite &&
      areSitePermissionsLoaded &&
      activeSectionId === "members-invitations" &&
      !effectiveCanManageInvitations
    ) {
      setActiveSectionId("members-list");
    }
  }, [
    activeSectionId,
    activeSite,
    areSitePermissionsLoaded,
    effectiveCanManageInvitations,
  ]);

  useEffect(() => {
    if (isGlobalAdmin) {
      setCanManageInvitations(true);
      setCanManageContent(true);
      setAreSitePermissionsLoaded(true);
      return;
    }

    if (!activeSite?.id) {
      setCanManageInvitations(false);
      setCanManageContent(false);
      setAreSitePermissionsLoaded(true);
      return;
    }

    let isCurrentSite = true;

    setCanManageInvitations(false);
    setCanManageContent(false);
    setAreSitePermissionsLoaded(false);

    void getCurrentSitePermissionsAction({ siteId: activeSite.id })
      .then((permissions) => {
        if (isCurrentSite) {
          setCanManageInvitations(permissions.canManageUsers);
          setCanManageContent(permissions.canManageContent);
          setAreSitePermissionsLoaded(true);
        }
      })
      .catch(() => {
        if (isCurrentSite) {
          setCanManageInvitations(false);
          setCanManageContent(false);
          setAreSitePermissionsLoaded(true);
        }
      });

    return () => {
      isCurrentSite = false;
    };
  }, [activeSite?.id, isGlobalAdmin]);

  useEffect(() => {
    if (isProfileActive) {
      setIsProfileMenuOpen(true);
    }
  }, [isProfileActive]);

  useEffect(() => {
    setHasHeaderAvatarError(false);
  }, [profile?.avatarDisplayUrl]);

  useEffect(() => {
    setIsMounted(true);

    const storedTheme = window.localStorage.getItem("content-admin-saas-theme");

    if (
      storedTheme === "dark" ||
      storedTheme === "light" ||
      storedTheme === "forest"
    ) {
      setThemeMode(storedTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      themeMode === "dark" || themeMode === "forest",
    );
    document.documentElement.classList.toggle(
      "theme-forest",
      themeMode === "forest",
    );
    window.localStorage.setItem("content-admin-saas-theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (sites.length === 0) {
      setActiveSite(null);
      setIsSiteReady(true);
      return;
    }

    if (sites.length === 1) {
      const [site] = sites;
      setActiveSite(site);
      setCanManageInvitations(isGlobalAdmin);
      setCanManageContent(isGlobalAdmin);
      setAreSitePermissionsLoaded(isGlobalAdmin);
      window.localStorage.setItem(activeSiteStorageKey, site.id);
      setIsSiteReady(true);
      return;
    }

    const storedSiteId = window.localStorage.getItem(activeSiteStorageKey);
    const storedSite = sites.find((site) => site.id === storedSiteId);

    if (!storedSite) {
      if (isGlobalAdmin) {
        const [firstSite] = sites;
        window.localStorage.setItem(activeSiteStorageKey, firstSite.id);
        setActiveSite(firstSite);
        setCanManageInvitations(true);
        setCanManageContent(true);
        setAreSitePermissionsLoaded(true);
        setIsSiteReady(true);
        return;
      }

      window.localStorage.removeItem(activeSiteStorageKey);
      router.replace("/select-site");
      return;
    }

    setActiveSite(storedSite);
    setCanManageInvitations(isGlobalAdmin);
    setCanManageContent(isGlobalAdmin);
    setAreSitePermissionsLoaded(isGlobalAdmin);
    setIsSiteReady(true);
  }, [activeSiteStorageKey, isGlobalAdmin, router, sites]);

  function handleActiveSiteChange(siteId: string) {
    const nextSite = sites.find((site) => site.id === siteId);

    if (!nextSite) {
      return;
    }

    window.localStorage.setItem(activeSiteStorageKey, nextSite.id);
    setActiveSite(nextSite);
    setCanManageInvitations(isGlobalAdmin);
    setCanManageContent(isGlobalAdmin);
    setAreSitePermissionsLoaded(isGlobalAdmin);
    setActiveSectionId("articles");
  }

  function handleManagedSitesChange(nextSites: Site[]) {
    setSites(nextSites);
    setActiveSite((currentSite) => {
      if (!currentSite) {
        return nextSites[0] ?? null;
      }

      const nextActiveSite = nextSites.find((site) => site.id === currentSite.id);

      if (nextActiveSite) {
        return nextActiveSite;
      }

      const fallbackSite = nextSites[0] ?? null;

      if (fallbackSite) {
        window.localStorage.setItem(activeSiteStorageKey, fallbackSite.id);
      } else {
        window.localStorage.removeItem(activeSiteStorageKey);
        setActiveSectionId("sites-management");
      }

      return fallbackSite;
    });
  }

  function handleOpenManagedSite(siteId: string) {
    const nextSite = sites.find((site) => site.id === siteId);

    if (!nextSite) {
      return;
    }

    window.localStorage.setItem(activeSiteStorageKey, nextSite.id);
    setActiveSite(nextSite);
    setCanManageInvitations(isGlobalAdmin);
    setCanManageContent(isGlobalAdmin);
    setAreSitePermissionsLoaded(isGlobalAdmin);
    setActiveSectionId("articles");
  }

  function toggleSidebar() {
    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
      setAreSidebarLabelsVisible(true);
      return;
    }

    setIsSidebarCollapsed(true);
    setAreSidebarLabelsVisible(false);
  }

  function openMobileMenu() {
    setIsMobileMenuClosing(false);
    setIsMobileMenuOpen(true);
  }

  function closeMobileMenu() {
    setIsMobileMenuClosing(true);
  }

  function finishMobileMenuClose() {
    if (!isMobileMenuClosing) {
      return;
    }

    setIsMobileMenuOpen(false);
    setIsMobileMenuClosing(false);
  }

  const mobileMenu = (
    <div className="fixed left-0 top-0 z-[9999] h-dvh w-dvw lg:hidden">
      <button
        type="button"
        onClick={closeMobileMenu}
        className={[
          isMobileMenuClosing
            ? "mobile-menu-backdrop-out"
            : "mobile-menu-backdrop-in",
          "absolute inset-0 z-0 cursor-pointer bg-black/35",
        ].join(" ")}
        aria-label="Fermer le menu"
      />

      <aside
        className={[
          isMobileMenuClosing ? "mobile-menu-drawer-out" : "mobile-menu-drawer-in",
          "absolute bottom-0 right-0 top-0 z-[1] flex w-[min(88dvw,360px)] flex-col border-l border-stone-200 bg-white px-5 py-6 shadow-2xl dark:border-[#2d2e30] dark:bg-[#141517]",
        ].join(" ")}
        onAnimationEnd={finishMobileMenuClose}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveSectionId("profile-edit");
                setIsProfileMenuOpen(true);
                closeMobileMenu();
              }}
              className="h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-full border border-stone-200 bg-stone-100 dark:border-[#2d2e30] dark:bg-[#24262a]"
              aria-label="Modifier mon profil"
            >
              {profile?.avatarDisplayUrl && !hasHeaderAvatarError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarDisplayUrl}
                  alt={userLabel}
                  className="h-full w-full object-cover"
                  onError={() => setHasHeaderAvatarError(true)}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs font-bold text-stone-500 dark:text-stone-200">
                  {headerInitials}
                </span>
              )}
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-stone-950 dark:text-white">
                {userLabel}
              </p>
              <p className="truncate text-[11px] text-stone-500 dark:text-stone-400">
                {userEmail}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeMobileMenu}
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-[#151617] dark:text-stone-300 dark:hover:bg-[#101112]"
            aria-label="Fermer le menu"
            title="Fermer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {activeSite ? (
          <div className="mt-9 flex justify-center">
            <SiteSwitcher
              activeSiteId={activeSite.id}
              sites={sites}
              onChange={(siteId) => {
                handleActiveSiteChange(siteId);
                closeMobileMenu();
              }}
            />
          </div>
        ) : null}

        <nav className="mt-5 flex flex-col gap-1">
          <SidebarButton
            icon={FileText}
            isActive={activeSectionId === "articles"}
            label="Articles"
            onClick={() => {
              setActiveSectionId("articles");
              closeMobileMenu();
            }}
          />

          <SidebarButton
            icon={FolderTree}
            isActive={activeSectionId === "categories"}
            label="Categories"
            onClick={() => {
              setActiveSectionId("categories");
              closeMobileMenu();
            }}
          />

          <SidebarButton
            icon={Tags}
            isActive={activeSectionId === "tags"}
            label="Tags"
            onClick={() => {
              setActiveSectionId("tags");
              closeMobileMenu();
            }}
          />

          <SidebarButton
            icon={Users}
            isActive={isMembersActive}
            isDropdownOpen={isMembersMenuOpen}
            label="Utilisateurs"
            onClick={() => {
              setIsMembersMenuOpen((value) => !value);
              setIsProfileMenuOpen(false);
            }}
          />

          <div
            className={[
              "ml-7 grid border-l border-stone-200 pl-3 transition-[grid-template-rows,margin-top] duration-200 dark:border-[#2d2e30]",
              isMembersMenuOpen ? "mt-2" : "mt-0",
              isMembersMenuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            ].join(" ")}
          >
            <div className="flex min-h-0 flex-col gap-1 overflow-hidden">
              {visibleMemberSubsections.map((section) => (
                <SidebarButton
                  key={section.id}
                  icon={section.icon}
                  isCompact
                  isActive={activeSectionId === section.id}
                  label={section.label}
                  onClick={() => {
                    setActiveSectionId(section.id);
                    closeMobileMenu();
                  }}
                />
              ))}
            </div>
          </div>

          <SidebarButton
            icon={Settings}
            isActive={isProfileActive}
            isDropdownOpen={isProfileMenuOpen}
            label="Mon profil"
            onClick={() => {
              setIsProfileMenuOpen((value) => !value);
              setIsMembersMenuOpen(false);
            }}
          />

          <div
            className={[
              "ml-7 grid border-l border-stone-200 pl-3 transition-[grid-template-rows,margin-top] duration-200 dark:border-[#2d2e30]",
              isProfileMenuOpen ? "mt-2" : "mt-0",
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
                    closeMobileMenu();
                  }}
                />
              ))}
            </div>
          </div>

          {isGlobalAdmin ? (
            <>
              <SidebarDivider />
              <SidebarButton
                icon={Building2}
                isActive={isSitesManagementActive}
                label="Sites"
                onClick={() => {
                  setActiveSectionId("sites-management");
                  closeMobileMenu();
                }}
              />
            </>
          ) : null}
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <ThemeSelector
            themeMode={themeMode}
            onThemeChange={setThemeMode}
          />

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

  if (!isSiteReady) {
    return <SiteLoadingState />;
  }

  if (sites.length === 0 && !isGlobalAdmin) {
    return <NoSitesState />;
  }

  if (!activeSite && !isGlobalAdmin) {
    return <SiteLoadingState />;
  }

  const adminContent = (
    <main className="h-screen overflow-hidden bg-white text-stone-950 dark:bg-[#090b0b] dark:text-stone-50">
      <div className="flex h-full flex-col bg-white dark:bg-[#141517]">
        <header className="flex h-18 shrink-0 items-center justify-between bg-white px-5 dark:bg-[#141517] lg:h-20 lg:px-8">
          <div className="flex min-w-0 items-center gap-24">
            <div className="min-w-0">
              <p className="text-base font-bold text-[#f44336] dark:text-[#ff8a3d] lg:text-lg">
                content-admin-saas
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

          <div className="absolute left-1/2 hidden min-w-0 -translate-x-1/2 text-center md:block">
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

          <div className="hidden items-center gap-3 lg:flex">
            {activeSite ? (
              <SiteSwitcher
                activeSiteId={activeSite.id}
                sites={sites}
                onChange={handleActiveSiteChange}
              />
            ) : null}

            <button
              type="button"
              onClick={() => {
                setActiveSectionId("profile-edit");
                setIsProfileMenuOpen(true);
              }}
              className="h-10 w-10 cursor-pointer overflow-hidden rounded-full border border-stone-200 bg-stone-100 transition-transform duration-200 hover:scale-105 dark:border-[#2d2e30] dark:bg-[#111213]"
              aria-label="Modifier mon profil"
              title="Modifier mon profil"
            >
              {profile?.avatarDisplayUrl && !hasHeaderAvatarError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarDisplayUrl}
                  alt={userLabel}
                  className="h-full w-full object-cover"
                  onError={() => setHasHeaderAvatarError(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-stone-500 dark:text-stone-300">
                  {headerInitials}
                </div>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={openMobileMenu}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 dark:border-[#2d2e30] dark:bg-[#111213] dark:text-stone-200 dark:hover:bg-[#18191b] lg:hidden"
              aria-label="Ouvrir le menu"
              title="Menu"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        {isMounted && (isMobileMenuOpen || isMobileMenuClosing)
          ? createPortal(mobileMenu, document.body)
          : null}

        <div className="flex min-h-0 flex-1 overflow-hidden bg-white dark:bg-[#141517]">
        <aside
          className={[
            "hidden shrink-0 bg-white px-4 py-6 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-[#141517] lg:flex lg:flex-col",
            isSidebarCollapsed ? "w-[84px]" : "w-72",
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
                icon={FolderTree}
                isActive={activeSectionId === "categories"}
                isCollapsed={isSidebarCollapsed}
                isLabelVisible={areSidebarLabelsVisible}
                label="Categories"
                onClick={() => setActiveSectionId("categories")}
              />

              <SidebarButton
                icon={Tags}
                isActive={activeSectionId === "tags"}
                isCollapsed={isSidebarCollapsed}
                isLabelVisible={areSidebarLabelsVisible}
                label="Tags"
                onClick={() => setActiveSectionId("tags")}
              />

              <SidebarButton
                icon={Users}
                isActive={isMembersActive}
                isCollapsed={isSidebarCollapsed}
                collapsedItems={visibleMemberSubsections.map((section) => ({
                  icon: section.icon,
                  isActive: activeSectionId === section.id,
                  label: section.label,
                  onClick: () => setActiveSectionId(section.id),
                }))}
                isDropdownOpen={isMembersMenuOpen}
                isLabelVisible={areSidebarLabelsVisible}
                label="Utilisateurs"
                onClick={() => {
                  setIsMembersMenuOpen((value) => !value);
                }}
              />

              {!isSidebarCollapsed && isMembersMenuOpen ? (
                <div className="ml-7 mt-2 flex flex-col gap-1 overflow-hidden border-l border-stone-200 pl-3 dark:border-[#2d2e30]">
                  {visibleMemberSubsections.map((section) => (
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

              <SidebarButton
                icon={Settings}
                isActive={isProfileActive}
                isCollapsed={isSidebarCollapsed}
                collapsedItems={profileSubsections.map((section) => ({
                  icon: section.icon,
                  isActive: activeSectionId === section.id,
                  label: section.label,
                  onClick: () => setActiveSectionId(section.id),
                }))}
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

              {isGlobalAdmin ? (
                <>
                  <SidebarDivider isCollapsed={isSidebarCollapsed} />
                  <SidebarButton
                    icon={Building2}
                    isActive={isSitesManagementActive}
                    isCollapsed={isSidebarCollapsed}
                    isLabelVisible={areSidebarLabelsVisible}
                    label="Sites"
                    onClick={() => setActiveSectionId("sites-management")}
                  />
                </>
              ) : null}
            </nav>

            <ThemeSelector
              className="mt-auto"
              isLabelVisible={areSidebarLabelsVisible}
              themeMode={themeMode}
              onThemeChange={setThemeMode}
            />

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
          <div className="flex min-h-0 flex-1 overflow-y-auto border-l border-t border-stone-200 bg-white px-6 pb-12 pt-6 [scrollbar-gutter:stable] dark:border-[#2d2e30] dark:bg-[#090b0b] sm:px-10 sm:pb-14 lg:rounded-tl-[5px]">
            <div className="min-h-full w-full">
              {activeSectionId === "sites-management" && isGlobalAdmin ? (
                <SitesManagementSection
                  onOpenSite={handleOpenManagedSite}
                  onSitesChange={handleManagedSitesChange}
                />
              ) : null}
              {!activeSite && activeSectionId !== "sites-management" ? (
                <NoActiveSiteState />
              ) : null}
              {activeSite && activeSectionId === "articles" ? (
                <ArticlesAdminList canManageContent={effectiveCanManageContent} />
              ) : null}
              {activeSite && activeSectionId === "categories" ? (
                <TaxonomyAdminSection
                  canManageContent={effectiveCanManageContent}
                  mode="categories"
                />
              ) : null}
              {activeSite && activeSectionId === "tags" ? (
                <TaxonomyAdminSection
                  canManageContent={effectiveCanManageContent}
                  mode="tags"
                />
              ) : null}
              {activeSite && isMembersActive ? (
                <MembersAdminSection
                  canBypassLastAdminRule={isGlobalAdmin}
                  canManageInvitations={effectiveCanManageInvitations}
                  currentUserId={userId}
                  mode={
                    activeSectionId === "members-invitations"
                      ? "invitations"
                      : "members"
                  }
                />
              ) : null}
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

  if (!activeSite) {
    return adminContent;
  }

  return (
    <ActiveSiteProvider
      activeSite={activeSite}
      setActiveSiteId={handleActiveSiteChange}
      sites={sites}
    >
      {adminContent}
    </ActiveSiteProvider>
  );
}

function getActiveSiteStorageKey(userId: string) {
  return `${ACTIVE_SITE_STORAGE_PREFIX}:${userId}`;
}

function ThemeSelector({
  className = "",
  isLabelVisible = true,
  themeMode,
  onThemeChange,
}: {
  className?: string;
  isLabelVisible?: boolean;
  themeMode: ThemeMode;
  onThemeChange: (themeMode: ThemeMode) => void;
}) {
  return (
    <div
      className={[
        "flex h-12 w-full items-center gap-4 overflow-visible rounded-md px-4",
        className,
      ].join(" ")}
    >
      <Palette
        className="h-5 w-5 shrink-0 text-stone-700 dark:text-[#ff8a3d]"
        aria-hidden="true"
      />
      <div
        className={[
          "min-w-0 flex-1 transition-opacity duration-150 ease-out",
          isLabelVisible
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
      >
        <SelectDropdown
          ariaLabel="Choisir le theme"
          buttonClassName="h-10"
          menuPlacement="top"
          options={themeOptions}
          placeholder="Theme"
          value={themeMode}
          onChange={(value) => onThemeChange(value as ThemeMode)}
        />
      </div>
    </div>
  );
}

function SiteSwitcher({
  activeSiteId,
  sites,
  onChange,
}: {
  activeSiteId: string;
  sites: Site[];
  onChange: (siteId: string) => void;
}) {
  if (sites.length === 1) {
    const [site] = sites;

    return (
      <div className="flex h-10 max-w-[180px] items-center rounded-md border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700 dark:border-[#2d2e30] dark:bg-[#111213] dark:text-stone-200">
        <span className="truncate">{site.name}</span>
      </div>
    );
  }

  return (
    <SelectDropdown
      ariaLabel="Choisir un site"
      className="w-[180px]"
      options={sites.map((site) => ({
        id: site.id,
        label: site.name,
      }))}
      placeholder="Choisir un site"
      value={activeSiteId}
      onChange={onChange}
    />
  );
}

function SiteLoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-5 text-stone-950 dark:bg-[#090b0b] dark:text-stone-50">
      <p className="text-sm text-stone-500 dark:text-stone-300">
        Chargement du site actif...
      </p>
    </main>
  );
}

function NoSitesState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-5 py-10 text-stone-950 dark:bg-[#090b0b] dark:text-stone-50">
      <section className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 text-center shadow-sm dark:border-[#2d2e30] dark:bg-[#141517]">
        <p className="text-base font-bold text-[#f44336] dark:text-[#ff8a3d]">
          content-admin-saas
        </p>
        <h1 className="mt-3 text-2xl font-bold">Aucun site disponible</h1>
        <p className="mt-3 text-sm text-stone-500 dark:text-stone-300">
          Votre compte ne dispose actuellement d'aucun site administrable.
        </p>
      </section>
    </main>
  );
}

function NoActiveSiteState() {
  return (
    <div className="flex min-h-full items-center justify-center p-8 text-center">
      <div>
        <p className="text-base font-semibold text-stone-950 dark:text-white">
          Aucun site actif
        </p>
        <p className="mt-2 max-w-md text-sm text-stone-500 dark:text-stone-400">
          Ouvrez un site depuis la section Sites pour acceder a son contenu.
        </p>
      </div>
    </div>
  );
}

function getUserInitials(value: string) {
  const parts = value.split(/[ @._-]/).filter(Boolean);
  const firstInitial = parts[0]?.[0] ?? "A";
  const secondInitial = parts[1]?.[0] ?? "";

  return `${firstInitial}${secondInitial}`.toUpperCase();
}

function SidebarDivider({ isCollapsed = false }: { isCollapsed?: boolean }) {
  return (
    <div
      className={[
        "py-2",
        isCollapsed ? "px-2" : "px-4",
      ].join(" ")}
      aria-hidden="true"
    >
      <div className="h-px w-full bg-stone-200 dark:bg-[#2d2e30]" />
    </div>
  );
}

function SidebarButton({
  collapsedItems,
  icon: Icon,
  isActive,
  isCollapsed = false,
  isCompact = false,
  isDropdownOpen,
  isLabelVisible = true,
  label,
  onClick,
}: {
  collapsedItems?: Array<{
    icon: typeof FileText;
    isActive: boolean;
    label: string;
    onClick: () => void;
  }>;
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
    <div
      className={[
        "group relative",
        isCollapsed ? "w-full overflow-visible" : "w-full overflow-hidden",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onClick}
        className={[
          "flex w-full cursor-pointer items-center rounded-md text-left font-medium transition-colors",
          isCompact ? "h-10 gap-3 px-3 text-sm" : "h-12 gap-4 px-4 text-sm",
          isActive
            ? "bg-red-50 text-stone-950 dark:bg-[#24262a] dark:text-white"
            : "text-stone-600 hover:bg-stone-100 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-[#18191b] dark:hover:text-white",
          isCollapsed ? "overflow-visible" : "overflow-hidden",
        ].join(" ")}
        aria-current={isActive ? "page" : undefined}
        aria-label={label}
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
      {isCollapsed ? (
        <CollapsedSidebarTooltip
          isActive={isActive}
          items={collapsedItems}
          label={label}
          onClick={onClick}
        />
      ) : null}
    </div>
  );
}

function CollapsedSidebarTooltip({
  isActive,
  items,
  label,
  onClick,
}: {
  isActive: boolean;
  items?: Array<{
    icon: typeof FileText;
    isActive: boolean;
    label: string;
    onClick: () => void;
  }>;
  label: string;
  onClick: () => void;
}) {
  const hasItems = Boolean(items?.length);

  return (
    <div
      className={[
        "absolute left-[calc(100%+0.85rem)] z-50 translate-x-1 opacity-0 shadow-2xl transition-[opacity,transform] duration-150 ease-out before:absolute before:bottom-0 before:left-[-0.9rem] before:top-0 before:w-[0.9rem] before:content-[''] group-hover:translate-x-0 group-hover:opacity-100",
        hasItems ? "top-0" : "top-1/2 -translate-y-1/2",
        "pointer-events-none group-hover:pointer-events-auto",
      ].join(" ")}
    >
      <div
        className={[
          "relative min-w-36 rounded-xl border border-[#f44336]/25 bg-white px-3.5 py-2 text-sm font-bold text-stone-950 shadow-[#7f1d16]/15 ring-1 ring-[#f44336]/10 before:absolute before:left-[-5px] before:h-2.5 before:w-2.5 before:-translate-y-1/2 before:rotate-45 before:border-b before:border-l before:border-[#f44336]/25 before:bg-white dark:border-[#ff8a3d]/35 dark:bg-[#141517] dark:text-stone-100 dark:shadow-black/45 dark:ring-[#ff8a3d]/10 dark:before:border-[#ff8a3d]/35 dark:before:bg-[#141517]",
          hasItems ? "before:top-6" : "before:top-1/2",
        ].join(" ")}
      >
        {hasItems ? (
          <div
            className={[
              "flex min-h-7 w-full items-center justify-center whitespace-nowrap rounded-md text-center",
              isActive ? "text-[#f44336] dark:text-[#ff8a3d]" : "",
            ].join(" ")}
          >
            {label}
          </div>
        ) : (
          <button
            type="button"
            onClick={onClick}
            className={[
              "flex min-h-7 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-md text-center transition-colors hover:text-[#f44336] dark:hover:text-[#ff8a3d]",
              isActive ? "text-[#f44336] dark:text-[#ff8a3d]" : "",
            ].join(" ")}
          >
            {label}
          </button>
        )}
        {hasItems ? (
          <div className="mt-2 grid gap-1 border-t border-stone-200 pt-2 dark:border-[#5a342b]">
            {items?.map((item) => {
              const ItemIcon = item.icon;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className={[
                    "flex h-9 min-w-48 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-left text-xs font-semibold transition-colors",
                    item.isActive
                      ? "text-[#f44336] dark:text-[#ff8a3d]"
                      : "text-stone-600 hover:text-[#f44336] dark:text-[#ffe7e2]/80 dark:hover:text-[#ff8a3d]",
                  ].join(" ")}
                >
                  <ItemIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
