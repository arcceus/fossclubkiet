"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ViewId,
  Announcement,
  Quote,
  SiteContent,
  RecruitmentStatus,
  WeeklyMeetupItem,
  PaperSession,
  ResearchPaper,
  MemberItem,
} from "@/types";
import { getQuoteForDate } from "@/lib/quotes";

// Values derived from the viewer's clock are client-only. useSyncExternalStore
// renders the server snapshot during SSR/hydration (so markup matches) and the
// client snapshot right after, without a setState-in-effect cascade.
// The quote's server snapshot is the `initialQuote` prop (computed by the
// server for its own date) so the SSR HTML already shows a real quote and the
// hydrated value is guaranteed identical to it; the client then re-checks its
// local day and swaps only if it differs.
const subscribeNever = () => () => {};
const getTodayDate = () =>
  new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
const getServerTodayDate = () => "";
const getTodayQuote = () => getQuoteForDate(new Date());

// Theme: the `dark` class on <html> is the single source of truth. Read it as
// an external store so the mount effect and the toggle only touch the DOM.
const subscribeToThemeClass = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
};
const getIsDark = () => document.documentElement.classList.contains("dark");
const getServerIsDark = () => false;

function EditableText({
  value,
  onChange,
  editable,
  multiline = false,
  className = "",
  placeholder = "Click to edit...",
}: {
  value: string;
  onChange: (next: string) => void;
  editable: boolean;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
}) {
  if (!editable) {
    return <span className={className}>{value}</span>;
  }
  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={Math.max(2, Math.ceil(value.length / 85))}
        className={`w-full bg-[#fffef2] dark:bg-[#1e1e14] border border-dashed border-[#b58900] dark:border-[#856700] px-2 py-1 rounded-xs focus:outline-none focus:border-solid ${className}`}
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`bg-[#fffef2] dark:bg-[#1e1e14] border border-dashed border-[#b58900] dark:border-[#856700] px-1.5 py-0.5 rounded-xs focus:outline-none focus:border-solid ${className}`}
    />
  );
}

export default function GazetteClient({
  initialSiteContent,
  initialQuote,
  isAdmin = false,
  adminUser = null,
  storageSource = "local",
  supabaseConfigured = false,
}: {
  initialSiteContent: SiteContent;
  initialQuote: Quote;
  isAdmin?: boolean;
  adminUser?: string | null;
  storageSource?: "supabase" | "local";
  supabaseConfigured?: boolean;
}) {
  const [activeView, setActiveView] = useState<ViewId>("frontpage");
  const [site, setSite] = useState<SiteContent>(initialSiteContent);
  const [adminLoggedIn, setAdminLoggedIn] = useState<boolean>(isAdmin);
  const [editMode, setEditMode] = useState<boolean>(isAdmin);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginUsername, setLoginUsername] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragGroup, setDragGroup] = useState<string | null>(null);

  const isDark = useSyncExternalStore(
    subscribeToThemeClass,
    getIsDark,
    getServerIsDark
  );
  const [copiedBootcamp, setCopiedBootcamp] = useState(false);
  const todayDate = useSyncExternalStore(
    subscribeNever,
    getTodayDate,
    getServerTodayDate
  );
  const quote = useSyncExternalStore(
    subscribeNever,
    getTodayQuote,
    () => initialQuote
  );

  useEffect(() => {
    const savedTheme = localStorage.getItem("fossc_dark");
    if (
      savedTheme === "1" ||
      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const updateSite = (updater: (prev: SiteContent) => SiteContent) => {
    setSite((prev) => updater(prev));
    setIsDirty(true);
    setSaveBanner(null);
  };

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("fossc_dark", "1");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("fossc_dark", "0");
    }
  };

  const handleNav = (view: ViewId) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCopyBootcamp = () => {
    navigator.clipboard.writeText(site.bootcamp.copyText);
    setCopiedBootcamp(true);
    setTimeout(() => setCopiedBootcamp(false), 2000);
  };

  const handleSaveContent = async (seedFromLocal = false) => {
    setSaving(true);
    setSaveBanner(null);
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          seedFromLocal ? { action: "seed_from_local" } : { content: site }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveBanner(`Error: ${data.error || "Could not save changes"}`);
      } else {
        if (data.content) setSite(data.content);
        setIsDirty(false);
        const targets = (data.savedTo || []).join(" + ");
        setSaveBanner(
          data.warning
            ? `Saved (${targets}) with warning: ${data.warning}`
            : `Saved & published live (${targets || "storage"})!`
        );
      }
    } catch (err) {
      setSaveBanner(
        `Save error: ${err instanceof Error ? err.message : "Network error"}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "Invalid credentials");
        return;
      }
      setAdminLoggedIn(true);
      setEditMode(true);
      setShowLoginModal(false);
      setLoginPassword("");
    } catch {
      setLoginError("Network error while logging in.");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAdminLoggedIn(false);
    setEditMode(false);
  };

  // Drag-and-drop reorder helper
  const reorderList = <T,>(list: T[], fromIdx: number, toIdx: number): T[] => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return list;
    const copy = [...list];
    const [moved] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, moved);
    return copy;
  };

  const isEditing = adminLoggedIn && editMode;

  const setRecruitmentStatus = (status: RecruitmentStatus) => {
    updateSite((prev) => ({
      ...prev,
      recruitment: {
        ...prev.recruitment,
        status,
      },
      announcements: prev.announcements.map((a) =>
        a.id === "recruitment"
          ? {
              ...a,
              hidden: status === "hidden",
              title:
                status === "closed"
                  ? "Recruitment Concluded for Current Cycle"
                  : status === "open" && a.title.includes("Concluded")
                  ? "Recruitment Is Open"
                  : a.title,
            }
          : a
      ),
    }));
  };

  const addAnnouncement = () => {
    const newItem: Announcement = {
      id: `post-${Date.now()}`,
      title: "New Club Announcement Title",
      date: todayDate || "November 2026",
      venueOrDetails: "Room H808, CSE-AI / AI&ML Dept",
      content: [
        "Write your announcement paragraph here. Click any text to edit or drag cards to reorder.",
      ],
      actionText: "[Join Discussion on Discord →]",
      actionView: "discord",
      order: 0,
      hidden: false,
    };
    updateSite((prev) => ({
      ...prev,
      announcements: [newItem, ...prev.announcements].map((a, idx) => ({
        ...a,
        order: idx,
      })),
    }));
    setActiveView("frontpage");
  };

  const addWeeklyMeetup = () => {
    const count = site.weeklyMeetups.items.length + 1;
    const newMeetup: WeeklyMeetupItem = {
      id: `week-${Date.now()}`,
      weekLabel: `Week ${String(count).padStart(2, "0")} • Tuesday Sync`,
      date: todayDate || "Tuesday @ 5:00 PM",
      venue: "Room H808, CSE-AI Dept",
      title: "New Weekly Meetup Topic & Lightning Talks",
      gist: [
        "Key takeaway or lightning talk summary from this week's session.",
        "Open PR reviews and upcoming project sprint tasks.",
      ],
      links: [],
      isUpcoming: true,
    };
    updateSite((prev) => ({
      ...prev,
      weeklyMeetups: {
        ...prev.weeklyMeetups,
        items: [
          newMeetup,
          ...prev.weeklyMeetups.items.map((i) => ({ ...i, isUpcoming: false })),
        ],
      },
    }));
    setActiveView("weekly");
  };

  const addPaperSession = () => {
    const newSession: PaperSession = {
      id: `session-${Date.now()}`,
      monthLabel: "New Monthly Reading Circle Session",
      date: "Thursday @ 5:15 PM onwards",
      venue: "AI Skills Lab",
      status: "upcoming",
      intro:
        "Monthly research paper discussion dissecting foundational computer science and systems papers.",
      papers: [
        {
          id: `paper-${Date.now()}`,
          title: "New Research Paper Title",
          authors: "Author Name et al.",
          year: "2026",
          gist: "2-3 sentence gist explaining the core architecture, problem statement, and key takeaway of the paper.",
          pdfUrl: "https://arxiv.org",
        },
      ],
    };
    updateSite((prev) => ({
      ...prev,
      paperReading: {
        ...prev.paperReading,
        sessions: [newSession, ...prev.paperReading.sessions],
      },
    }));
    setActiveView("papers");
  };

  const addPaperToSession = (sessionIdx: number) => {
    const newPaper: ResearchPaper = {
      id: `paper-${Date.now()}`,
      title: "Research Paper Title",
      authors: "Authors",
      year: "2026",
      gist: "Brief gist/summary of what this paper covers and why we are reading it.",
      pdfUrl: "",
    };
    updateSite((prev) => ({
      ...prev,
      paperReading: {
        ...prev.paperReading,
        sessions: prev.paperReading.sessions.map((s, idx) =>
          idx === sessionIdx ? { ...s, papers: [...s.papers, newPaper] } : s
        ),
      },
    }));
  };

  const addMember = () => {
    const newMember: MemberItem = {
      id: `mem-${Date.now()}`,
      name: "New Member Name",
      discord: "discord_handle",
      github: "github_handle",
    };
    updateSite((prev) => ({
      ...prev,
      members: {
        ...prev.members,
        list: [...prev.members.list, newMember],
      },
    }));
    setActiveView("officers");
  };

  const latestMeetup = site.weeklyMeetups.items[0];
  const latestPaperSession = site.paperReading.sessions[0];

  const visibleAnnouncements = site.announcements.filter((item) => {
    if (isEditing) return true;
    if (item.hidden) return false;
    if (item.id === "recruitment" && site.recruitment.status === "hidden") {
      return false;
    }
    return true;
  });

  return (
    <div className="bg-[#ffffff] dark:bg-[#0e0e0e] text-[#111111] dark:text-[#e0e0e0] min-h-screen">
      {/* ADMIN VISUAL EDITOR TOP TOOLBAR */}
      {adminLoggedIn && (
        <div className="sticky top-0 z-50 bg-[#1b1b1b] text-[#f0f0f0] border-b-2 border-[#b58900] px-3 py-2 text-xs font-sans shadow-md">
          <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-[#b58900] text-black font-bold px-2 py-0.5 rounded-xs uppercase tracking-wider text-[11px]">
                CMS Admin {adminUser ? `(${adminUser})` : ""}
              </span>

              <button
                onClick={() => setEditMode(!editMode)}
                className={`px-2.5 py-1 rounded-xs font-bold border ${
                  editMode
                    ? "bg-[#2e7d32] border-[#4caf50] text-white"
                    : "bg-[#333] border-[#666] text-[#ddd]"
                }`}
              >
                {editMode ? "✏️ Live Edit & Drag: ON" : "👁️ Visitor Preview Mode"}
              </button>

              {/* Quick Recruitment Status Toggle */}
              <div className="flex items-center gap-1 bg-[#2a2a2a] border border-[#444] px-2 py-0.5 rounded-xs">
                <span className="text-[#aaa] text-[11px]">Recruitment:</span>
                {(["open", "closed", "hidden"] as RecruitmentStatus[]).map(
                  (st) => (
                    <button
                      key={st}
                      onClick={() => setRecruitmentStatus(st)}
                      className={`px-1.5 py-0.5 text-[11px] uppercase font-bold rounded-xs ${
                        site.recruitment.status === st
                          ? st === "open"
                            ? "bg-[#2e7d32] text-white"
                            : st === "closed"
                            ? "bg-[#c62828] text-white"
                            : "bg-[#555] text-white"
                          : "text-[#aaa] hover:text-white"
                      }`}
                    >
                      {st}
                    </button>
                  )
                )}
              </div>

              {/* Quick Add Buttons */}
              <button
                onClick={addAnnouncement}
                className="bg-[#2a2a2a] hover:bg-[#3a3a3a] border border-[#555] px-2 py-1 rounded-xs"
              >
                + Announcement
              </button>
              <button
                onClick={addWeeklyMeetup}
                className="bg-[#2a2a2a] hover:bg-[#3a3a3a] border border-[#555] px-2 py-1 rounded-xs"
              >
                + Weekly Meetup Gist
              </button>
              <button
                onClick={addPaperSession}
                className="bg-[#2a2a2a] hover:bg-[#3a3a3a] border border-[#555] px-2 py-1 rounded-xs"
              >
                + Monthly Paper Session
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span
                className="text-[11px] text-[#aaa] hidden sm:inline"
                title={
                  supabaseConfigured
                    ? "Connected to Supabase"
                    : "Saving to local JSON files (add NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY in .env.local for Supabase)"
                }
              >
                DB:{" "}
                <strong className="text-[#eee]">
                  {storageSource === "supabase"
                    ? "Supabase Live"
                    : supabaseConfigured
                    ? "Supabase Ready"
                    : "Local JSON"}
                </strong>
              </span>

              {supabaseConfigured && (
                <button
                  onClick={() => handleSaveContent(true)}
                  disabled={saving}
                  className="bg-[#333] hover:bg-[#444] border border-[#666] px-2 py-1 rounded-xs text-[11px]"
                  title="Push local data/site-content.json into Supabase"
                >
                  Sync Local → Supabase
                </button>
              )}

              <button
                onClick={() => handleSaveContent(false)}
                disabled={saving}
                className={`px-3 py-1 rounded-xs font-bold border ${
                  isDirty
                    ? "bg-[#b58900] hover:bg-[#d4a000] text-black border-[#ffd54f]"
                    : "bg-[#333] hover:bg-[#444] text-white border-[#666]"
                }`}
              >
                {saving
                  ? "Saving..."
                  : isDirty
                  ? "💾 Save & Publish*"
                  : "💾 Saved"}
              </button>

              <button
                onClick={handleLogout}
                className="text-[#ff8a80] hover:underline px-1.5 py-1"
              >
                Logout
              </button>
            </div>
          </div>

          {saveBanner && (
            <div className="max-w-[1200px] mx-auto mt-1.5 px-2 py-1 bg-[#263238] border border-[#4f5b62] text-[#a5d6a7] text-[11px] flex justify-between items-center">
              <span>{saveBanner}</span>
              <button
                onClick={() => setSaveBanner(null)}
                className="text-white font-bold ml-4"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      <div className="max-w-[1200px] mx-auto px-3 sm:px-6">
        {/* LWN Classic Masthead Banner */}
        <header
          className={`sticky ${
            adminLoggedIn ? "top-[42px]" : "top-0"
          } z-30 bg-[#ffffff] dark:bg-[#0e0e0e] pt-4 pb-2 mb-4 border-b-2 border-[#333333] dark:border-[#666666]`}
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#000000] dark:text-[#ffffff] tracking-tight">
                <EditableText
                  value={site.masthead.title}
                  editable={isEditing}
                  onChange={(val) =>
                    updateSite((prev) => ({
                      ...prev,
                      masthead: { ...prev.masthead, title: val },
                    }))
                  }
                />
              </h1>
              <div className="text-xs font-serif italic text-[#555555] dark:text-[#aaaaaa] mt-0.5">
                <EditableText
                  value={site.masthead.subtitle}
                  editable={isEditing}
                  className="w-full max-w-[650px]"
                  onChange={(val) =>
                    updateSite((prev) => ({
                      ...prev,
                      masthead: { ...prev.masthead, subtitle: val },
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-sans">
              <span className="text-[#666666] dark:text-[#888888]">
                <strong>{todayDate || "August 2026"}</strong>
              </span>
              <span>•</span>
              <button
                onClick={toggleDarkMode}
                className="border border-[#777] px-1.5 py-0.5 rounded text-[11px] font-mono hover:bg-[#eee] dark:hover:bg-[#222]"
                aria-label="Toggle dark mode"
              >
                <span>{isDark ? "☀️ Light" : "🌙 Dark"}</span>
              </button>
              {!adminLoggedIn && (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="border border-[#777] px-1.5 py-0.5 rounded text-[11px] font-mono hover:bg-[#eee] dark:hover:bg-[#222] text-[#555] dark:text-[#aaa]"
                  title="Admin Login"
                >
                  🔒 Admin
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main LWN 2-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 items-start pb-8">
          {/* LEFT SIDEBAR: LWN Navigation & Tickers */}
          <aside className="w-full md:sticky md:top-[110px] self-start">
            {/* Sidebar Box 1: Club Navigation */}
            <div className="lwn-sidebar-box">
              <div className="lwn-sidebar-title">FOSS CLUB KIET</div>
              <div className="lwn-sidebar-body">
                <ul className="lwn-sidebar-list">
                  <li>
                    <button
                      onClick={() => handleNav("frontpage")}
                      className={`lwn-link text-left w-full ${
                        activeView === "frontpage" ? "font-bold" : ""
                      }`}
                    >
                      Front page
                    </button>
                  </li>

                  {site.recruitment.status !== "hidden" && (
                    <li>
                      {site.recruitment.status === "open" ? (
                        <a
                          href={site.recruitment.applyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="lwn-link text-left w-full block"
                        >
                          <strong>{site.recruitment.sidebarLabelOpen}</strong>
                        </a>
                      ) : (
                        <span className="text-[#777] dark:text-[#888] text-xs block py-0.5">
                          {site.recruitment.sidebarLabelClosed}
                        </span>
                      )}
                      {isEditing && (
                        <div className="mt-1 space-y-1 bg-[#fffef2] dark:bg-[#1e1e14] p-1 border border-dashed border-[#b58900] text-[11px]">
                          <div>
                            Label (Open):
                            <EditableText
                              value={site.recruitment.sidebarLabelOpen}
                              editable={true}
                              className="w-full"
                              onChange={(v) =>
                                updateSite((p) => ({
                                  ...p,
                                  recruitment: {
                                    ...p.recruitment,
                                    sidebarLabelOpen: v,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div>
                            Apply URL:
                            <EditableText
                              value={site.recruitment.applyUrl}
                              editable={true}
                              className="w-full"
                              onChange={(v) =>
                                updateSite((p) => ({
                                  ...p,
                                  recruitment: {
                                    ...p.recruitment,
                                    applyUrl: v,
                                  },
                                }))
                              }
                            />
                          </div>
                        </div>
                      )}
                    </li>
                  )}

                  <li>
                    <button
                      onClick={() => handleNav("weekly")}
                      className={`lwn-link text-left w-full ${
                        activeView === "weekly" ? "font-bold" : ""
                      }`}
                    >
                      Weekly Meetups ({site.weeklyMeetups.items.length})
                    </button>
                  </li>

                  <li>
                    <button
                      onClick={() => handleNav("papers")}
                      className={`lwn-link text-left w-full ${
                        activeView === "papers" ? "font-bold" : ""
                      }`}
                    >
                      Research Papers
                    </button>
                  </li>

                  <li>
                    <button
                      onClick={() => handleNav("bootcamp")}
                      className={`lwn-link text-left w-full ${
                        activeView === "bootcamp" ? "font-bold" : ""
                      }`}
                    >
                      Linux Bootcamp
                    </button>
                  </li>

                  <li>
                    <button
                      onClick={() => handleNav("manpage")}
                      className={`lwn-link text-left w-full ${
                        activeView === "manpage" ? "font-bold" : ""
                      }`}
                    >
                      man fossc(1)
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleNav("officers")}
                      className={`lwn-link text-left w-full ${
                        activeView === "officers" ? "font-bold" : ""
                      }`}
                    >
                      Members
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleNav("discord")}
                      className={`lwn-link text-left w-full ${
                        activeView === "discord" ? "font-bold" : ""
                      }`}
                    >
                      Discord Community
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            {/* Sidebar Box 2: Meeting & Lab Schedule */}
            <div className="lwn-sidebar-box">
              <div className="lwn-sidebar-title flex justify-between items-center">
                <span>HOURS &amp; VENUE</span>
                {isEditing && (
                  <button
                    onClick={() =>
                      updateSite((prev) => ({
                        ...prev,
                        sidebarSchedule: [
                          ...prev.sidebarSchedule,
                          {
                            id: `sched-${Date.now()}`,
                            label: "New Item:",
                            value: "Details here",
                          },
                        ],
                      }))
                    }
                    className="bg-[#b58900] text-black px-1 text-[10px] rounded-xs"
                  >
                    + Add
                  </button>
                )}
              </div>
              <div className="lwn-sidebar-body text-xs space-y-2 font-sans">
                {site.sidebarSchedule.map((item, idx) => (
                  <div
                    key={item.id}
                    draggable={isEditing}
                    onDragStart={() => {
                      setDragGroup("sidebar-schedule");
                      setDragIndex(idx);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (
                        dragGroup === "sidebar-schedule" &&
                        dragIndex !== null
                      ) {
                        updateSite((prev) => ({
                          ...prev,
                          sidebarSchedule: reorderList(
                            prev.sidebarSchedule,
                            dragIndex,
                            idx
                          ),
                        }));
                      }
                      setDragIndex(null);
                    }}
                    className={
                      isEditing
                        ? "border border-dashed border-[#ccc] dark:border-[#444] p-1 relative"
                        : ""
                    }
                  >
                    {isEditing && (
                      <div className="flex justify-between text-[10px] text-[#888] mb-0.5">
                        <span className="cursor-grab">⋮⋮ Drag</span>
                        <button
                          onClick={() =>
                            updateSite((prev) => ({
                              ...prev,
                              sidebarSchedule: prev.sidebarSchedule.filter(
                                (_, i) => i !== idx
                              ),
                            }))
                          }
                          className="text-[#c62828] font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    <strong>
                      <EditableText
                        value={item.label}
                        editable={isEditing}
                        className="w-full"
                        onChange={(v) =>
                          updateSite((prev) => ({
                            ...prev,
                            sidebarSchedule: prev.sidebarSchedule.map(
                              (s, i) => (i === idx ? { ...s, label: v } : s)
                            ),
                          }))
                        }
                      />
                    </strong>
                    <br />
                    <EditableText
                      value={item.value}
                      editable={isEditing}
                      className="w-full"
                      onChange={(v) =>
                        updateSite((prev) => ({
                          ...prev,
                          sidebarSchedule: prev.sidebarSchedule.map((s, i) =>
                            i === idx ? { ...s, value: v } : s
                          ),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar Box 3: Quote of the Day */}
            <div className="lwn-sidebar-box">
              <div className="lwn-sidebar-title">QUOTE OF THE DAY</div>
              <div className="lwn-sidebar-body font-serif italic text-xs">
                &ldquo;{quote.text}&rdquo;
                <div className="font-sans not-italic font-bold text-right mt-1 text-[11px] text-[#555] dark:text-[#888]">
                  — {quote.author}
                </div>
              </div>
            </div>

            {/* Sidebar Box 4: Discord Access */}
            <div className="lwn-sidebar-box text-center p-2">
              <a
                href={site.discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-[#222] text-[#fff] dark:bg-[#333] hover:bg-[#000] text-xs font-sans font-bold px-2 py-1 border border-[#000]"
              >
                Join Discord ↗
              </a>
              {isEditing && (
                <div className="mt-1 text-[10px] text-left">
                  Discord URL:
                  <EditableText
                    value={site.discordUrl}
                    editable={true}
                    className="w-full"
                    onChange={(v) =>
                      updateSite((prev) => ({ ...prev, discordUrl: v }))
                    }
                  />
                </div>
              )}
            </div>
          </aside>

          {/* RIGHT MAIN STAGE: LWN Editorial Articles & Views */}
          <main className="w-full min-w-0">
            {/* VIEW 1: Front Page */}
            {activeView === "frontpage" && (
              <section className="lwn-view">
                <div className="bg-[#f0ede6] dark:bg-[#1a1a1a] border-y border-[#333] dark:border-[#555] px-3 py-1 mb-4 flex justify-between items-center text-xs font-sans">
                  <span className="font-bold uppercase tracking-wider text-[#333] dark:text-[#ddd]">
                    Weekly Edition • Front Page
                  </span>
                  <div className="flex items-center gap-2">
                    {isEditing && (
                      <button
                        onClick={addAnnouncement}
                        className="bg-[#b58900] text-black font-bold px-2 py-0.5 rounded-xs"
                      >
                        + Add Front-Page Post
                      </button>
                    )}
                    <span className="text-[#666] dark:text-[#888]">
                      {todayDate}
                    </span>
                  </div>
                </div>

                {visibleAnnouncements.length === 0 && (
                  <div className="p-4 text-xs italic text-[#666] border border-dashed border-[#ccc]">
                    No announcements currently posted.
                  </div>
                )}

                {visibleAnnouncements.map((item) => {
                  const realIdx = site.announcements.findIndex(
                    (a) => a.id === item.id
                  );
                  const isRecruitmentClosed =
                    item.id === "recruitment" &&
                    site.recruitment.status === "closed";

                  return (
                    <article
                      key={item.id}
                      draggable={isEditing}
                      onDragStart={() => {
                        setDragGroup("announcements");
                        setDragIndex(realIdx);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (
                          dragGroup === "announcements" &&
                          dragIndex !== null
                        ) {
                          updateSite((prev) => ({
                            ...prev,
                            announcements: reorderList(
                              prev.announcements,
                              dragIndex,
                              realIdx
                            ).map((a, i) => ({ ...a, order: i })),
                          }));
                        }
                        setDragIndex(null);
                      }}
                      className={`lwn-article-box ${
                        isEditing
                          ? "border border-dashed border-[#b58900] p-3 rounded-xs bg-[#fdfdf9] dark:bg-[#141410]"
                          : ""
                      } ${item.hidden ? "opacity-50" : ""}`}
                    >
                      {isEditing && (
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[#e0dcc8] dark:border-[#333] text-xs font-sans">
                          <div className="flex items-center gap-2">
                            <span className="cursor-grab bg-[#eee] dark:bg-[#222] px-1.5 py-0.5 rounded-xs font-mono text-[11px]">
                              ⋮⋮ Drag Card #{realIdx + 1}
                            </span>
                            <button
                              onClick={() =>
                                updateSite((prev) => ({
                                  ...prev,
                                  announcements: reorderList(
                                    prev.announcements,
                                    realIdx,
                                    Math.max(0, realIdx - 1)
                                  ),
                                }))
                              }
                              disabled={realIdx === 0}
                              className="px-1.5 py-0.5 border border-[#aaa] disabled:opacity-30"
                            >
                              ↑ Up
                            </button>
                            <button
                              onClick={() =>
                                updateSite((prev) => ({
                                  ...prev,
                                  announcements: reorderList(
                                    prev.announcements,
                                    realIdx,
                                    Math.min(
                                      prev.announcements.length - 1,
                                      realIdx + 1
                                    )
                                  ),
                                }))
                              }
                              disabled={
                                realIdx === site.announcements.length - 1
                              }
                              className="px-1.5 py-0.5 border border-[#aaa] disabled:opacity-30"
                            >
                              ↓ Down
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                updateSite((prev) => ({
                                  ...prev,
                                  announcements: prev.announcements.map(
                                    (a, idx) =>
                                      idx === realIdx
                                        ? { ...a, hidden: !a.hidden }
                                        : a
                                  ),
                                }))
                              }
                              className="px-2 py-0.5 border border-[#888] rounded-xs text-[11px]"
                            >
                              {item.hidden ? "👁️ Unhide" : "🙈 Hide / Archive"}
                            </button>
                            <button
                              onClick={() =>
                                updateSite((prev) => ({
                                  ...prev,
                                  announcements: prev.announcements.filter(
                                    (_, idx) => idx !== realIdx
                                  ),
                                }))
                              }
                              className="px-2 py-0.5 bg-[#c62828] text-white rounded-xs text-[11px]"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}

                      <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#000] dark:text-[#fff] mb-1.5 leading-snug">
                        <EditableText
                          value={item.title}
                          editable={isEditing}
                          className="w-full"
                          onChange={(val) =>
                            updateSite((prev) => ({
                              ...prev,
                              announcements: prev.announcements.map((a, idx) =>
                                idx === realIdx ? { ...a, title: val } : a
                              ),
                            }))
                          }
                        />
                      </h2>

                      <div className="text-xs font-sans text-[#666] dark:text-[#999] mb-3 flex flex-wrap items-center gap-1">
                        <span>[</span>
                        <EditableText
                          value={item.date}
                          editable={isEditing}
                          onChange={(val) =>
                            updateSite((prev) => ({
                              ...prev,
                              announcements: prev.announcements.map((a, idx) =>
                                idx === realIdx ? { ...a, date: val } : a
                              ),
                            }))
                          }
                        />
                        <span>]</span>
                        {(item.venueOrDetails || isEditing) && (
                          <>
                            <span>•</span>
                            <EditableText
                              value={item.venueOrDetails || ""}
                              editable={isEditing}
                              placeholder="Venue or details..."
                              className="flex-1 min-w-[200px]"
                              onChange={(val) =>
                                updateSite((prev) => ({
                                  ...prev,
                                  announcements: prev.announcements.map(
                                    (a, idx) =>
                                      idx === realIdx
                                        ? { ...a, venueOrDetails: val }
                                        : a
                                  ),
                                }))
                              }
                            />
                          </>
                        )}
                      </div>

                      {isRecruitmentClosed ? (
                        <div className="font-serif text-[15px] leading-relaxed text-[#222] dark:text-[#ddd] p-3 bg-[#f6f6f4] dark:bg-[#181818] border-l-2 border-[#888]">
                          <EditableText
                            value={site.recruitment.closedNotice}
                            editable={isEditing}
                            multiline={true}
                            onChange={(val) =>
                              updateSite((prev) => ({
                                ...prev,
                                recruitment: {
                                  ...prev.recruitment,
                                  closedNotice: val,
                                },
                              }))
                            }
                          />
                        </div>
                      ) : (
                        <div className="font-serif text-[15px] leading-relaxed text-[#222] dark:text-[#ddd] space-y-3">
                          {item.content.map((p, pIdx) => (
                            <div
                              key={pIdx}
                              className={
                                isEditing ? "flex items-start gap-2" : ""
                              }
                            >
                              <p className="flex-1">
                                <EditableText
                                  value={p}
                                  editable={isEditing}
                                  multiline={true}
                                  onChange={(val) =>
                                    updateSite((prev) => ({
                                      ...prev,
                                      announcements: prev.announcements.map(
                                        (a, idx) =>
                                          idx === realIdx
                                            ? {
                                                ...a,
                                                content: a.content.map(
                                                  (oldP, i) =>
                                                    i === pIdx ? val : oldP
                                                ),
                                              }
                                            : a
                                      ),
                                    }))
                                  }
                                />
                              </p>
                              {isEditing && (
                                <button
                                  onClick={() =>
                                    updateSite((prev) => ({
                                      ...prev,
                                      announcements: prev.announcements.map(
                                        (a, idx) =>
                                          idx === realIdx
                                            ? {
                                                ...a,
                                                content: a.content.filter(
                                                  (_, i) => i !== pIdx
                                                ),
                                              }
                                            : a
                                      ),
                                    }))
                                  }
                                  className="text-xs font-sans text-[#c62828] px-1.5 py-0.5 border border-[#ccc] rounded-xs"
                                  title="Delete paragraph"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}

                          {isEditing && (
                            <button
                              onClick={() =>
                                updateSite((prev) => ({
                                  ...prev,
                                  announcements: prev.announcements.map(
                                    (a, idx) =>
                                      idx === realIdx
                                        ? {
                                            ...a,
                                            content: [
                                              ...a.content,
                                              "New paragraph...",
                                            ],
                                          }
                                        : a
                                  ),
                                }))
                              }
                              className="text-xs font-sans bg-[#eee] dark:bg-[#222] border border-[#999] px-2 py-0.5 rounded-xs"
                            >
                              + Add Paragraph
                            </button>
                          )}
                        </div>
                      )}

                      {/* Embedded Live Snapshot for Weekly Meetup on Front Page */}
                      {item.id === "sync" && latestMeetup && (
                        <div className="mt-4 border border-[#ccc] dark:border-[#333] bg-[#faf9f5] dark:bg-[#151515] p-3">
                          <div className="flex flex-wrap justify-between items-center gap-2 text-xs font-sans border-b border-[#ddd] dark:border-[#333] pb-1.5 mb-2">
                            <span className="font-bold uppercase tracking-wider text-[#8a1f11] dark:text-[#ff9999]">
                              Latest Weekly Meetup Gist •{" "}
                              {latestMeetup.weekLabel}
                            </span>
                            <span className="text-[#666] dark:text-[#999]">
                              {latestMeetup.date} • {latestMeetup.venue}
                            </span>
                          </div>
                          <div className="font-serif font-bold text-base mb-1.5 text-[#000] dark:text-[#fff]">
                            {latestMeetup.title}
                          </div>
                          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-[13px] font-serif text-[#333] dark:text-[#ccc]">
                            {latestMeetup.gist.map((g, gIdx) => (
                              <li key={gIdx}>{g}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Embedded Live Snapshot for Research Paper Reading Circle on Front Page */}
                      {item.id === "paper-reading" && latestPaperSession && (
                        <div className="mt-4 border border-[#ccc] dark:border-[#333] bg-[#faf9f5] dark:bg-[#151515] p-3">
                          <div className="flex flex-wrap justify-between items-center gap-2 text-xs font-sans border-b border-[#ddd] dark:border-[#333] pb-1.5 mb-2">
                            <span className="font-bold uppercase tracking-wider text-[#003399] dark:text-[#66b2ff]">
                              {latestPaperSession.monthLabel}
                            </span>
                            <span className="text-[#666] dark:text-[#999]">
                              {latestPaperSession.date} •{" "}
                              {latestPaperSession.venue}
                            </span>
                          </div>
                          <div className="space-y-2.5">
                            {latestPaperSession.papers.map((paper, pIdx) => (
                              <div
                                key={paper.id}
                                className="text-xs sm:text-[13px] font-serif"
                              >
                                <div className="font-bold text-[#000] dark:text-[#fff]">
                                  {pIdx + 1}. &ldquo;{paper.title}&rdquo;{" "}
                                  <span className="font-normal text-[#555] dark:text-[#aaa]">
                                    — {paper.authors} ({paper.year})
                                  </span>
                                </div>
                                <div className="text-[#333] dark:text-[#ccc] mt-0.5 pl-4">
                                  <strong>Gist:</strong> {paper.gist}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Link / View Switcher */}
                      {!isRecruitmentClosed &&
                        (item.actionText || isEditing) && (
                          <div className="mt-3 text-xs font-sans">
                            {isEditing ? (
                              <div className="flex flex-wrap items-center gap-2 bg-[#fffef2] dark:bg-[#1e1e14] p-2 border border-dashed border-[#b58900]">
                                <span>CTA Label:</span>
                                <EditableText
                                  value={item.actionText || ""}
                                  editable={true}
                                  placeholder="[Action text →]"
                                  onChange={(val) =>
                                    updateSite((prev) => ({
                                      ...prev,
                                      announcements: prev.announcements.map(
                                        (a, idx) =>
                                          idx === realIdx
                                            ? { ...a, actionText: val }
                                            : a
                                      ),
                                    }))
                                  }
                                />
                                <span>Target View:</span>
                                <select
                                  value={item.actionView || ""}
                                  onChange={(e) =>
                                    updateSite((prev) => ({
                                      ...prev,
                                      announcements: prev.announcements.map(
                                        (a, idx) =>
                                          idx === realIdx
                                            ? {
                                                ...a,
                                                actionView: (e.target.value ||
                                                  undefined) as
                                                  | ViewId
                                                  | undefined,
                                              }
                                            : a
                                      ),
                                    }))
                                  }
                                  className="border border-[#888] bg-white dark:bg-[#222] px-1 py-0.5"
                                >
                                  <option value="">(External URL)</option>
                                  <option value="weekly">
                                    weekly (Weekly Meetups)
                                  </option>
                                  <option value="papers">
                                    papers (Research Papers)
                                  </option>
                                  <option value="bootcamp">bootcamp</option>
                                  <option value="manpage">manpage</option>
                                  <option value="officers">officers</option>
                                  <option value="discord">discord</option>
                                </select>
                                {!item.actionView && (
                                  <>
                                    <span>URL:</span>
                                    <EditableText
                                      value={item.actionUrl || ""}
                                      editable={true}
                                      placeholder="https://..."
                                      className="flex-1"
                                      onChange={(val) =>
                                        updateSite((prev) => ({
                                          ...prev,
                                          announcements:
                                            prev.announcements.map((a, idx) =>
                                              idx === realIdx
                                                ? { ...a, actionUrl: val }
                                                : a
                                            ),
                                        }))
                                      }
                                    />
                                  </>
                                )}
                              </div>
                            ) : item.actionView ? (
                              <button
                                onClick={() => handleNav(item.actionView!)}
                                className="lwn-link font-bold text-left"
                              >
                                {item.actionText}
                              </button>
                            ) : item.actionUrl ? (
                              <a
                                href={item.actionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="lwn-link font-bold text-left inline-block"
                              >
                                {item.actionText}
                              </a>
                            ) : null}
                          </div>
                        )}
                    </article>
                  );
                })}
              </section>
            )}

            {/* VIEW 2: Weekly Meetups & Week-by-Week Gists */}
            {activeView === "weekly" && (
              <section className="lwn-view">
                <div className="bg-[#f0ede6] dark:bg-[#1a1a1a] border-y border-[#333] dark:border-[#555] px-3 py-1 mb-4 flex justify-between items-center text-xs font-sans">
                  <span className="font-bold uppercase tracking-wider">
                    Club Log // Weekly Meetups &amp; Session Gists
                  </span>
                  <div className="flex items-center gap-2">
                    {isEditing && (
                      <button
                        onClick={addWeeklyMeetup}
                        className="bg-[#b58900] text-black font-bold px-2 py-0.5 rounded-xs"
                      >
                        + Add Week Log
                      </button>
                    )}
                    <span>{site.weeklyMeetups.defaultTimeAndVenue}</span>
                  </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#000] dark:text-[#fff] mb-1">
                  Weekly Meetup Archive &amp; Gists
                </h2>
                <p className="text-xs font-sans text-[#666] dark:text-[#999] mb-5 pb-2 border-b border-[#ccc] dark:border-[#333]">
                  <EditableText
                    value={site.weeklyMeetups.subtitle}
                    editable={isEditing}
                    className="w-full"
                    onChange={(v) =>
                      updateSite((prev) => ({
                        ...prev,
                        weeklyMeetups: { ...prev.weeklyMeetups, subtitle: v },
                      }))
                    }
                  />
                </p>

                <div className="space-y-5">
                  {site.weeklyMeetups.items.length === 0 && (
                    <div className="p-4 text-xs italic text-[#666] dark:text-[#999] border border-dashed border-[#ccc] dark:border-[#444]">
                      No weekly meetup logs posted yet.{" "}
                      {isEditing
                        ? "Click '+ Add Week Log' above to log a weekly session and its gist."
                        : "Check back after our Tuesday 5:00 PM meetup in Room H808 / H108."}
                    </div>
                  )}
                  {site.weeklyMeetups.items.map((week, wIdx) => (
                    <article
                      key={week.id}
                      draggable={isEditing}
                      onDragStart={() => {
                        setDragGroup("weekly-meetups");
                        setDragIndex(wIdx);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (
                          dragGroup === "weekly-meetups" &&
                          dragIndex !== null
                        ) {
                          updateSite((prev) => ({
                            ...prev,
                            weeklyMeetups: {
                              ...prev.weeklyMeetups,
                              items: reorderList(
                                prev.weeklyMeetups.items,
                                dragIndex,
                                wIdx
                              ),
                            },
                          }));
                        }
                        setDragIndex(null);
                      }}
                      className="border border-[#aaa] dark:border-[#444] bg-[#fdfdfc] dark:bg-[#151515] p-4"
                    >
                      {isEditing && (
                        <div className="flex justify-between items-center mb-2 pb-1 border-b border-dashed border-[#ccc] dark:border-[#333] text-xs font-sans">
                          <span className="cursor-grab font-mono">
                            ⋮⋮ Drag Week Entry #{wIdx + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={Boolean(week.isUpcoming)}
                                onChange={(e) =>
                                  updateSite((prev) => ({
                                    ...prev,
                                    weeklyMeetups: {
                                      ...prev.weeklyMeetups,
                                      items: prev.weeklyMeetups.items.map(
                                        (it, idx) =>
                                          idx === wIdx
                                            ? {
                                                ...it,
                                                isUpcoming: e.target.checked,
                                              }
                                            : it
                                      ),
                                    },
                                  }))
                                }
                              />
                              Latest / Highlight badge
                            </label>
                            <button
                              onClick={() =>
                                updateSite((prev) => ({
                                  ...prev,
                                  weeklyMeetups: {
                                    ...prev.weeklyMeetups,
                                    items: prev.weeklyMeetups.items.filter(
                                      (_, idx) => idx !== wIdx
                                    ),
                                  },
                                }))
                              }
                              className="bg-[#c62828] text-white px-2 py-0.5 rounded-xs"
                            >
                              Delete Week
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-sans text-[#666] dark:text-[#aaa] mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#000] dark:text-[#fff] bg-[#e8e4d8] dark:bg-[#252525] px-2 py-0.5">
                            <EditableText
                              value={week.weekLabel}
                              editable={isEditing}
                              onChange={(v) =>
                                updateSite((prev) => ({
                                  ...prev,
                                  weeklyMeetups: {
                                    ...prev.weeklyMeetups,
                                    items: prev.weeklyMeetups.items.map(
                                      (it, idx) =>
                                        idx === wIdx
                                          ? { ...it, weekLabel: v }
                                          : it
                                    ),
                                  },
                                }))
                              }
                            />
                          </span>
                          {week.isUpcoming && (
                            <span className="bg-[#2e7d32] text-white text-[10px] font-bold uppercase px-1.5 py-0.5">
                              Latest Session
                            </span>
                          )}
                        </div>
                        <div>
                          <EditableText
                            value={week.date}
                            editable={isEditing}
                            onChange={(v) =>
                              updateSite((prev) => ({
                                ...prev,
                                weeklyMeetups: {
                                  ...prev.weeklyMeetups,
                                  items: prev.weeklyMeetups.items.map(
                                    (it, idx) =>
                                      idx === wIdx ? { ...it, date: v } : it
                                  ),
                                },
                              }))
                            }
                          />{" "}
                          •{" "}
                          <EditableText
                            value={week.venue}
                            editable={isEditing}
                            onChange={(v) =>
                              updateSite((prev) => ({
                                ...prev,
                                weeklyMeetups: {
                                  ...prev.weeklyMeetups,
                                  items: prev.weeklyMeetups.items.map(
                                    (it, idx) =>
                                      idx === wIdx ? { ...it, venue: v } : it
                                  ),
                                },
                              }))
                            }
                          />
                        </div>
                      </div>

                      <h3 className="text-xl font-serif font-bold text-[#000] dark:text-[#fff] mb-2">
                        <EditableText
                          value={week.title}
                          editable={isEditing}
                          className="w-full"
                          onChange={(v) =>
                            updateSite((prev) => ({
                              ...prev,
                              weeklyMeetups: {
                                ...prev.weeklyMeetups,
                                items: prev.weeklyMeetups.items.map((it, idx) =>
                                  idx === wIdx ? { ...it, title: v } : it
                                ),
                              },
                            }))
                          }
                        />
                      </h3>

                      <div className="text-xs font-sans uppercase font-bold text-[#555] dark:text-[#888] mb-1">
                        Session Gist &amp; Key Takeaways:
                      </div>
                      <ul className="list-disc pl-5 space-y-1.5 font-serif text-[15px] text-[#222] dark:text-[#ddd]">
                        {week.gist.map((point, gIdx) => (
                          <li key={gIdx}>
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <EditableText
                                  value={point}
                                  editable={isEditing}
                                  multiline={true}
                                  onChange={(v) =>
                                    updateSite((prev) => ({
                                      ...prev,
                                      weeklyMeetups: {
                                        ...prev.weeklyMeetups,
                                        items: prev.weeklyMeetups.items.map(
                                          (it, idx) =>
                                            idx === wIdx
                                              ? {
                                                  ...it,
                                                  gist: it.gist.map((oldG, i) =>
                                                    i === gIdx ? v : oldG
                                                  ),
                                                }
                                              : it
                                        ),
                                      },
                                    }))
                                  }
                                />
                              </div>
                              {isEditing && (
                                <button
                                  onClick={() =>
                                    updateSite((prev) => ({
                                      ...prev,
                                      weeklyMeetups: {
                                        ...prev.weeklyMeetups,
                                        items: prev.weeklyMeetups.items.map(
                                          (it, idx) =>
                                            idx === wIdx
                                              ? {
                                                  ...it,
                                                  gist: it.gist.filter(
                                                    (_, i) => i !== gIdx
                                                  ),
                                                }
                                              : it
                                        ),
                                      },
                                    }))
                                  }
                                  className="text-xs font-sans text-[#c62828] border border-[#ccc] px-1"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>

                      {isEditing && (
                        <button
                          onClick={() =>
                            updateSite((prev) => ({
                              ...prev,
                              weeklyMeetups: {
                                ...prev.weeklyMeetups,
                                items: prev.weeklyMeetups.items.map((it, idx) =>
                                  idx === wIdx
                                    ? {
                                        ...it,
                                        gist: [
                                          ...it.gist,
                                          "New takeaway / gist bullet point...",
                                        ],
                                      }
                                    : it
                                ),
                              },
                            }))
                          }
                          className="mt-2 text-xs font-sans bg-[#eee] dark:bg-[#222] border border-[#999] px-2 py-0.5"
                        >
                          + Add Gist Bullet
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* VIEW 3: Monthly Research Paper Reading Circle */}
            {activeView === "papers" && (
              <section className="lwn-view">
                <div className="bg-[#f0ede6] dark:bg-[#1a1a1a] border-y border-[#333] dark:border-[#555] px-3 py-1 mb-4 flex justify-between items-center text-xs font-sans">
                  <span className="font-bold uppercase tracking-wider">
                    Research Circle // Monthly Papers &amp; Gists
                  </span>
                  <div className="flex items-center gap-2">
                    {isEditing && (
                      <button
                        onClick={addPaperSession}
                        className="bg-[#b58900] text-black font-bold px-2 py-0.5 rounded-xs"
                      >
                        + Add Monthly Session
                      </button>
                    )}
                    <span>{site.paperReading.defaultChannel}</span>
                  </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#000] dark:text-[#fff] mb-1">
                  Monthly Research Paper Reading Circle
                </h2>
                <p className="text-xs font-sans text-[#666] dark:text-[#999] mb-5 pb-2 border-b border-[#ccc] dark:border-[#333]">
                  <EditableText
                    value={site.paperReading.subtitle}
                    editable={isEditing}
                    className="w-full"
                    onChange={(v) =>
                      updateSite((prev) => ({
                        ...prev,
                        paperReading: { ...prev.paperReading, subtitle: v },
                      }))
                    }
                  />
                </p>

                <div className="space-y-6">
                  {site.paperReading.sessions.map((session, sIdx) => (
                    <div
                      key={session.id}
                      className="border border-[#999] dark:border-[#444] bg-[#fdfdfc] dark:bg-[#141414] p-4"
                    >
                      {isEditing && (
                        <div className="flex flex-wrap justify-between items-center gap-2 mb-3 pb-2 border-b border-dashed border-[#ccc] dark:border-[#333] text-xs font-sans">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">
                              Session #{sIdx + 1}
                            </span>
                            <select
                              value={session.status}
                              onChange={(e) =>
                                updateSite((prev) => ({
                                  ...prev,
                                  paperReading: {
                                    ...prev.paperReading,
                                    sessions: prev.paperReading.sessions.map(
                                      (s, i) =>
                                        i === sIdx
                                          ? {
                                              ...s,
                                              status: e.target.value as
                                                | "upcoming"
                                                | "completed",
                                            }
                                          : s
                                    ),
                                  },
                                }))
                              }
                              className="border border-[#888] bg-white dark:bg-[#222] px-1.5 py-0.5"
                            >
                              <option value="upcoming">Upcoming Session</option>
                              <option value="completed">Completed</option>
                            </select>
                            <button
                              onClick={() => addPaperToSession(sIdx)}
                              className="bg-[#2e7d32] text-white px-2 py-0.5 rounded-xs"
                            >
                              + Add Paper to This Session
                            </button>
                          </div>
                          <button
                            onClick={() =>
                              updateSite((prev) => ({
                                ...prev,
                                paperReading: {
                                  ...prev.paperReading,
                                  sessions: prev.paperReading.sessions.filter(
                                    (_, i) => i !== sIdx
                                  ),
                                },
                              }))
                            }
                            className="bg-[#c62828] text-white px-2 py-0.5 rounded-xs"
                          >
                            Delete Session
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h3 className="text-xl font-serif font-bold text-[#000] dark:text-[#fff]">
                          <EditableText
                            value={session.monthLabel}
                            editable={isEditing}
                            className="w-full"
                            onChange={(v) =>
                              updateSite((prev) => ({
                                ...prev,
                                paperReading: {
                                  ...prev.paperReading,
                                  sessions: prev.paperReading.sessions.map(
                                    (s, i) =>
                                      i === sIdx ? { ...s, monthLabel: v } : s
                                  ),
                                },
                              }))
                            }
                          />
                        </h3>
                        <span
                          className={`text-[11px] font-sans font-bold uppercase px-2 py-0.5 ${
                            session.status === "upcoming"
                              ? "bg-[#003399] text-white"
                              : "bg-[#ddd] dark:bg-[#333] text-[#333] dark:text-[#ccc]"
                          }`}
                        >
                          {session.status}
                        </span>
                      </div>

                      <div className="text-xs font-sans text-[#666] dark:text-[#aaa] mb-3">
                        <strong>Date:</strong>{" "}
                        <EditableText
                          value={session.date}
                          editable={isEditing}
                          onChange={(v) =>
                            updateSite((prev) => ({
                              ...prev,
                              paperReading: {
                                ...prev.paperReading,
                                sessions: prev.paperReading.sessions.map(
                                  (s, i) => (i === sIdx ? { ...s, date: v } : s)
                                ),
                              },
                            }))
                          }
                        />{" "}
                        • <strong>Venue:</strong>{" "}
                        <EditableText
                          value={session.venue}
                          editable={isEditing}
                          onChange={(v) =>
                            updateSite((prev) => ({
                              ...prev,
                              paperReading: {
                                ...prev.paperReading,
                                sessions: prev.paperReading.sessions.map(
                                  (s, i) =>
                                    i === sIdx ? { ...s, venue: v } : s
                                ),
                              },
                            }))
                          }
                        />
                      </div>

                      {(session.intro || isEditing) && (
                        <p className="font-serif text-[15px] text-[#222] dark:text-[#ddd] mb-4">
                          <EditableText
                            value={session.intro || ""}
                            editable={isEditing}
                            multiline={true}
                            placeholder="Session introduction..."
                            onChange={(v) =>
                              updateSite((prev) => ({
                                ...prev,
                                paperReading: {
                                  ...prev.paperReading,
                                  sessions: prev.paperReading.sessions.map(
                                    (s, i) =>
                                      i === sIdx ? { ...s, intro: v } : s
                                  ),
                                },
                              }))
                            }
                          />
                        </p>
                      )}

                      <div className="space-y-3">
                        {session.papers.map((paper, pIdx) => (
                          <div
                            key={paper.id}
                            className="border border-[#ccc] dark:border-[#333] bg-[#f8f7f3] dark:bg-[#1b1b1b] p-3"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="font-serif font-bold text-base text-[#000] dark:text-[#fff] flex-1">
                                Paper #{pIdx + 1}: &ldquo;
                                <EditableText
                                  value={paper.title}
                                  editable={isEditing}
                                  onChange={(v) =>
                                    updateSite((prev) => ({
                                      ...prev,
                                      paperReading: {
                                        ...prev.paperReading,
                                        sessions:
                                          prev.paperReading.sessions.map(
                                            (s, i) =>
                                              i === sIdx
                                                ? {
                                                    ...s,
                                                    papers: s.papers.map(
                                                      (p, j) =>
                                                        j === pIdx
                                                          ? { ...p, title: v }
                                                          : p
                                                    ),
                                                  }
                                                : s
                                          ),
                                      },
                                    }))
                                  }
                                />
                                &rdquo;
                              </div>
                              {isEditing && (
                                <button
                                  onClick={() =>
                                    updateSite((prev) => ({
                                      ...prev,
                                      paperReading: {
                                        ...prev.paperReading,
                                        sessions:
                                          prev.paperReading.sessions.map(
                                            (s, i) =>
                                              i === sIdx
                                                ? {
                                                    ...s,
                                                    papers: s.papers.filter(
                                                      (_, j) => j !== pIdx
                                                    ),
                                                  }
                                                : s
                                          ),
                                      },
                                    }))
                                  }
                                  className="text-xs font-sans text-[#c62828] border border-[#ccc] px-1.5 py-0.5"
                                >
                                  Delete Paper
                                </button>
                              )}
                            </div>

                            <div className="text-xs font-sans text-[#555] dark:text-[#aaa] mt-0.5 mb-2">
                              Authors:{" "}
                              <EditableText
                                value={paper.authors}
                                editable={isEditing}
                                onChange={(v) =>
                                  updateSite((prev) => ({
                                    ...prev,
                                    paperReading: {
                                      ...prev.paperReading,
                                      sessions: prev.paperReading.sessions.map(
                                        (s, i) =>
                                          i === sIdx
                                            ? {
                                                ...s,
                                                papers: s.papers.map((p, j) =>
                                                  j === pIdx
                                                    ? { ...p, authors: v }
                                                    : p
                                                ),
                                              }
                                            : s
                                      ),
                                    },
                                  }))
                                }
                              />{" "}
                              (
                              <EditableText
                                value={paper.year}
                                editable={isEditing}
                                onChange={(v) =>
                                  updateSite((prev) => ({
                                    ...prev,
                                    paperReading: {
                                      ...prev.paperReading,
                                      sessions: prev.paperReading.sessions.map(
                                        (s, i) =>
                                          i === sIdx
                                            ? {
                                                ...s,
                                                papers: s.papers.map((p, j) =>
                                                  j === pIdx
                                                    ? { ...p, year: v }
                                                    : p
                                                ),
                                              }
                                            : s
                                      ),
                                    },
                                  }))
                                }
                              />
                              )
                            </div>

                            <div className="font-serif text-[14px] text-[#222] dark:text-[#ddd] leading-relaxed">
                              <strong className="font-sans text-xs uppercase tracking-wide text-[#444] dark:text-[#aaa]">
                                Gist / TL;DR:{" "}
                              </strong>
                              <EditableText
                                value={paper.gist}
                                editable={isEditing}
                                multiline={true}
                                onChange={(v) =>
                                  updateSite((prev) => ({
                                    ...prev,
                                    paperReading: {
                                      ...prev.paperReading,
                                      sessions: prev.paperReading.sessions.map(
                                        (s, i) =>
                                          i === sIdx
                                            ? {
                                                ...s,
                                                papers: s.papers.map((p, j) =>
                                                  j === pIdx
                                                    ? { ...p, gist: v }
                                                    : p
                                                ),
                                              }
                                            : s
                                      ),
                                    },
                                  }))
                                }
                              />
                            </div>

                            {(paper.pdfUrl || isEditing) && (
                              <div className="mt-2 text-xs font-sans">
                                {isEditing ? (
                                  <div>
                                    PDF / Reference Link:{" "}
                                    <EditableText
                                      value={paper.pdfUrl || ""}
                                      editable={true}
                                      placeholder="https://..."
                                      className="w-72"
                                      onChange={(v) =>
                                        updateSite((prev) => ({
                                          ...prev,
                                          paperReading: {
                                            ...prev.paperReading,
                                            sessions:
                                              prev.paperReading.sessions.map(
                                                (s, i) =>
                                                  i === sIdx
                                                    ? {
                                                        ...s,
                                                        papers: s.papers.map(
                                                          (p, j) =>
                                                            j === pIdx
                                                              ? {
                                                                  ...p,
                                                                  pdfUrl: v,
                                                                }
                                                              : p
                                                        ),
                                                      }
                                                    : s
                                              ),
                                          },
                                        }))
                                      }
                                    />
                                  </div>
                                ) : (
                                  <a
                                    href={paper.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="lwn-link font-bold"
                                  >
                                    [Read Paper PDF ↗]
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* VIEW 4: Bootcamp Details */}
            {activeView === "bootcamp" && (
              <section className="lwn-view">
                <div className="bg-[#f0ede6] dark:bg-[#1a1a1a] border-y border-[#333] dark:border-[#555] px-3 py-1 mb-4 flex justify-between items-center text-xs font-sans">
                  <span className="font-bold uppercase tracking-wider">
                    <EditableText
                      value={site.bootcamp.bannerLabel}
                      editable={isEditing}
                      onChange={(v) =>
                        updateSite((p) => ({
                          ...p,
                          bootcamp: { ...p.bootcamp, bannerLabel: v },
                        }))
                      }
                    />
                  </span>
                  <span>
                    <EditableText
                      value={site.bootcamp.dateLabel}
                      editable={isEditing}
                      onChange={(v) =>
                        updateSite((p) => ({
                          ...p,
                          bootcamp: { ...p.bootcamp, dateLabel: v },
                        }))
                      }
                    />
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#000] dark:text-[#fff] mb-2">
                  <EditableText
                    value={site.bootcamp.title}
                    editable={isEditing}
                    className="w-full"
                    onChange={(v) =>
                      updateSite((p) => ({
                        ...p,
                        bootcamp: { ...p.bootcamp, title: v },
                      }))
                    }
                  />
                </h2>
                <div className="text-xs font-sans text-[#666] dark:text-[#999] mb-4 pb-2 border-b border-[#ccc] dark:border-[#333]">
                  Venue:{" "}
                  <strong>
                    <EditableText
                      value={site.bootcamp.venue}
                      editable={isEditing}
                      onChange={(v) =>
                        updateSite((p) => ({
                          ...p,
                          bootcamp: { ...p.bootcamp, venue: v },
                        }))
                      }
                    />
                  </strong>{" "}
                  • Date:{" "}
                  <strong>
                    <EditableText
                      value={site.bootcamp.dateAndTime}
                      editable={isEditing}
                      onChange={(v) =>
                        updateSite((p) => ({
                          ...p,
                          bootcamp: { ...p.bootcamp, dateAndTime: v },
                        }))
                      }
                    />
                  </strong>
                </div>

                <div className="font-serif text-[15px] leading-relaxed text-[#222] dark:text-[#ddd] space-y-4 mb-6">
                  <p>
                    <EditableText
                      value={site.bootcamp.intro}
                      editable={isEditing}
                      multiline={true}
                      onChange={(v) =>
                        updateSite((p) => ({
                          ...p,
                          bootcamp: { ...p.bootcamp, intro: v },
                        }))
                      }
                    />
                  </p>

                  <div className="flex justify-between items-center border-b border-[#ddd] dark:border-[#333] pb-1 mt-4">
                    <h3 className="font-serif font-bold text-lg text-[#000] dark:text-[#fff]">
                      Curriculum &amp; Workshop Modules
                    </h3>
                    {isEditing && (
                      <button
                        onClick={() =>
                          updateSite((p) => ({
                            ...p,
                            bootcamp: {
                              ...p.bootcamp,
                              modules: [
                                ...p.bootcamp.modules,
                                {
                                  id: `mod-${Date.now()}`,
                                  number: p.bootcamp.modules.length + 1,
                                  title: `Module ${
                                    p.bootcamp.modules.length + 1
                                  }: New Module`,
                                  description: "Module description...",
                                },
                              ],
                            },
                          }))
                        }
                        className="text-xs font-sans bg-[#b58900] text-black font-bold px-2 py-0.5"
                      >
                        + Add Module
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 font-sans text-xs">
                    {site.bootcamp.modules.map((mod, mIdx) => (
                      <div
                        key={mod.id}
                        className="border border-[#ccc] dark:border-[#444] p-3 bg-[#fdfdfc] dark:bg-[#161616]"
                      >
                        <div className="flex justify-between items-center">
                          <div className="font-bold text-sm text-[#000] dark:text-[#fff] flex-1">
                            <EditableText
                              value={mod.title}
                              editable={isEditing}
                              className="w-full"
                              onChange={(v) =>
                                updateSite((p) => ({
                                  ...p,
                                  bootcamp: {
                                    ...p.bootcamp,
                                    modules: p.bootcamp.modules.map((m, i) =>
                                      i === mIdx ? { ...m, title: v } : m
                                    ),
                                  },
                                }))
                              }
                            />
                          </div>
                          {isEditing && (
                            <button
                              onClick={() =>
                                updateSite((p) => ({
                                  ...p,
                                  bootcamp: {
                                    ...p.bootcamp,
                                    modules: p.bootcamp.modules.filter(
                                      (_, i) => i !== mIdx
                                    ),
                                  },
                                }))
                              }
                              className="text-[#c62828] font-bold ml-2"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <div className="text-[#555] dark:text-[#aaa] mt-1">
                          <EditableText
                            value={mod.description}
                            editable={isEditing}
                            multiline={true}
                            onChange={(v) =>
                              updateSite((p) => ({
                                ...p,
                                bootcamp: {
                                  ...p.bootcamp,
                                  modules: p.bootcamp.modules.map((m, i) =>
                                    i === mIdx ? { ...m, description: v } : m
                                  ),
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border border-[#333] dark:border-[#666] p-3 bg-[#f6f6f4] dark:bg-[#181818] font-sans text-xs">
                    <strong>Prerequisites:</strong>{" "}
                    <EditableText
                      value={site.bootcamp.prerequisites}
                      editable={isEditing}
                      multiline={true}
                      onChange={(v) =>
                        updateSite((p) => ({
                          ...p,
                          bootcamp: { ...p.bootcamp, prerequisites: v },
                        }))
                      }
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleCopyBootcamp}
                      className="border border-[#333] dark:border-[#777] bg-[#eee] dark:bg-[#222] hover:bg-[#ddd] px-3 py-1 text-xs font-sans font-bold"
                    >
                      {copiedBootcamp
                        ? "[Copied to Clipboard!]"
                        : "[Copy Bootcamp Announcement Text]"}
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* VIEW 5: Groff Manual Page (man fossc) */}
            {activeView === "manpage" && (
              <section className="lwn-view">
                <div className="bg-[#f0ede6] dark:bg-[#1a1a1a] border-y border-[#333] dark:border-[#555] px-3 py-1 mb-4 flex justify-between items-center text-xs font-mono font-bold">
                  <span>FOSSC(1)</span>
                </div>

                <div className="font-mono text-xs sm:text-[13px] leading-relaxed space-y-4 bg-[#fdfdfc] dark:bg-[#111] border border-[#ccc] dark:border-[#333] p-4 sm:p-6">
                  <div>
                    <div className="font-bold uppercase underline mb-1">
                      NAME
                    </div>
                    <div className="pl-4">
                      <EditableText
                        value={site.manpage.nameDesc}
                        editable={isEditing}
                        className="w-full"
                        onChange={(v) =>
                          updateSite((p) => ({
                            ...p,
                            manpage: { ...p.manpage, nameDesc: v },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <div className="font-bold uppercase underline mb-1">
                      SYNOPSIS
                    </div>
                    <div className="pl-4 bg-[#eee] dark:bg-[#222] p-2 border-l-2 border-[#333] dark:border-[#888]">
                      <EditableText
                        value={site.manpage.synopsis}
                        editable={isEditing}
                        className="w-full"
                        onChange={(v) =>
                          updateSite((p) => ({
                            ...p,
                            manpage: { ...p.manpage, synopsis: v },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <div className="font-bold uppercase underline mb-1">
                      DESCRIPTION
                    </div>
                    <div className="pl-4 font-serif text-[14px] leading-relaxed">
                      <EditableText
                        value={site.manpage.description}
                        editable={isEditing}
                        multiline={true}
                        onChange={(v) =>
                          updateSite((p) => ({
                            ...p,
                            manpage: { ...p.manpage, description: v },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <div className="font-bold uppercase underline mb-1">
                      MEETINGS &amp; TIMINGS
                    </div>
                    <div className="pl-4 overflow-x-auto">
                      <table className="w-full text-left border-collapse border border-[#888] text-xs">
                        <thead>
                          <tr className="bg-[#333] text-white dark:bg-[#222]">
                            <th className="p-1.5 border border-[#888]">
                              Cadence
                            </th>
                            <th className="p-1.5 border border-[#888]">
                              Time &amp; Schedule
                            </th>
                            <th className="p-1.5 border border-[#888]">
                              Venue / Details
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {site.manpage.rows.map((row, rIdx) => (
                            <tr
                              key={row.id}
                              className="border-b border-[#ccc] dark:border-[#444]"
                            >
                              <td className="p-1.5 border border-[#888] font-bold">
                                <EditableText
                                  value={row.cadence}
                                  editable={isEditing}
                                  onChange={(v) =>
                                    updateSite((p) => ({
                                      ...p,
                                      manpage: {
                                        ...p.manpage,
                                        rows: p.manpage.rows.map((r, i) =>
                                          i === rIdx ? { ...r, cadence: v } : r
                                        ),
                                      },
                                    }))
                                  }
                                />
                              </td>
                              <td className="p-1.5 border border-[#888]">
                                <EditableText
                                  value={row.schedule}
                                  editable={isEditing}
                                  onChange={(v) =>
                                    updateSite((p) => ({
                                      ...p,
                                      manpage: {
                                        ...p.manpage,
                                        rows: p.manpage.rows.map((r, i) =>
                                          i === rIdx ? { ...r, schedule: v } : r
                                        ),
                                      },
                                    }))
                                  }
                                />
                              </td>
                              <td className="p-1.5 border border-[#888]">
                                <EditableText
                                  value={row.venue}
                                  editable={isEditing}
                                  onChange={(v) =>
                                    updateSite((p) => ({
                                      ...p,
                                      manpage: {
                                        ...p.manpage,
                                        rows: p.manpage.rows.map((r, i) =>
                                          i === rIdx ? { ...r, venue: v } : r
                                        ),
                                      },
                                    }))
                                  }
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <div className="font-bold uppercase underline mb-1">
                      COMMUNICATION
                    </div>
                    <div className="pl-4">
                      <div>
                        Discord:{" "}
                        <a
                          href={site.manpage.discordUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="lwn-link"
                        >
                          {site.manpage.discordUrl}
                        </a>
                      </div>
                      <div>
                        Venue:{" "}
                        <EditableText
                          value={site.manpage.venueFooter}
                          editable={isEditing}
                          className="w-full"
                          onChange={(v) =>
                            updateSite((p) => ({
                              ...p,
                              manpage: { ...p.manpage, venueFooter: v },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* VIEW 6: Members */}
            {activeView === "officers" && (
              <section className="lwn-view">
                <div className="bg-[#f0ede6] dark:bg-[#1a1a1a] border-y border-[#333] dark:border-[#555] px-3 py-1 mb-4 flex justify-between items-center text-xs font-sans font-bold">
                  <span>MEMBERS</span>
                  <div className="flex items-center gap-2">
                    {isEditing && (
                      <button
                        onClick={addMember}
                        className="bg-[#b58900] text-black font-bold px-2 py-0.5 rounded-xs"
                      >
                        + Add Member
                      </button>
                    )}
                    <span>
                      <EditableText
                        value={site.members.academicYear}
                        editable={isEditing}
                        onChange={(v) =>
                          updateSite((p) => ({
                            ...p,
                            members: { ...p.members, academicYear: v },
                          }))
                        }
                      />
                    </span>
                  </div>
                </div>

                <h2 className="text-2xl font-serif font-bold text-[#000] dark:text-[#fff] mb-2">
                  Members
                </h2>
                <p className="text-xs font-sans text-[#666] dark:text-[#999] mb-4">
                  <EditableText
                    value={site.members.subtitle}
                    editable={isEditing}
                    className="w-full"
                    onChange={(v) =>
                      updateSite((p) => ({
                        ...p,
                        members: { ...p.members, subtitle: v },
                      }))
                    }
                  />
                </p>

                <div className="space-y-4 font-mono text-xs">
                  {site.members.list.map((member, mIdx) => (
                    <div
                      key={member.id}
                      draggable={isEditing}
                      onDragStart={() => {
                        setDragGroup("members");
                        setDragIndex(mIdx);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragGroup === "members" && dragIndex !== null) {
                          updateSite((prev) => ({
                            ...prev,
                            members: {
                              ...prev.members,
                              list: reorderList(
                                prev.members.list,
                                dragIndex,
                                mIdx
                              ),
                            },
                          }));
                        }
                        setDragIndex(null);
                      }}
                      className="border border-[#999] dark:border-[#444] p-3 bg-[#fdfdfc] dark:bg-[#161616]"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="font-bold text-sm">
                          {isEditing && (
                            <span className="cursor-grab mr-2 text-[#888]">
                              ⋮⋮
                            </span>
                          )}
                          <EditableText
                            value={member.name}
                            editable={isEditing}
                            onChange={(v) =>
                              updateSite((p) => ({
                                ...p,
                                members: {
                                  ...p.members,
                                  list: p.members.list.map((m, i) =>
                                    i === mIdx ? { ...m, name: v } : m
                                  ),
                                },
                              }))
                            }
                          />
                        </div>
                        {isEditing && (
                          <button
                            onClick={() =>
                              updateSite((p) => ({
                                ...p,
                                members: {
                                  ...p.members,
                                  list: p.members.list.filter(
                                    (_, i) => i !== mIdx
                                  ),
                                },
                              }))
                            }
                            className="text-[#c62828] font-sans font-bold"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <div className="text-[#555] dark:text-[#aaa] space-y-0.5 text-xs">
                        <div>
                          Discord: @
                          <EditableText
                            value={member.discord}
                            editable={isEditing}
                            onChange={(v) =>
                              updateSite((p) => ({
                                ...p,
                                members: {
                                  ...p.members,
                                  list: p.members.list.map((m, i) =>
                                    i === mIdx ? { ...m, discord: v } : m
                                  ),
                                },
                              }))
                            }
                          />
                        </div>
                        <div>
                          GitHub:{" "}
                          {isEditing ? (
                            <EditableText
                              value={member.github}
                              editable={true}
                              onChange={(v) =>
                                updateSite((p) => ({
                                  ...p,
                                  members: {
                                    ...p.members,
                                    list: p.members.list.map((m, i) =>
                                      i === mIdx ? { ...m, github: v } : m
                                    ),
                                  },
                                }))
                              }
                            />
                          ) : (
                            <a
                              href={`https://github.com/${member.github}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="lwn-link"
                            >
                              @{member.github}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* VIEW 7: Discord Community Hub */}
            {activeView === "discord" && (
              <section className="lwn-view">
                <div className="bg-[#f0ede6] dark:bg-[#1a1a1a] border-y border-[#333] dark:border-[#555] px-3 py-1 mb-4 flex justify-between items-center text-xs font-sans font-bold">
                  <span>COMMUNITY // DISCORD HUB</span>
                  <span>Real-time Chat</span>
                </div>

                <h2 className="text-2xl font-serif font-bold text-[#000] dark:text-[#fff] mb-2">
                  <EditableText
                    value={site.discordHub.title}
                    editable={isEditing}
                    className="w-full"
                    onChange={(v) =>
                      updateSite((p) => ({
                        ...p,
                        discordHub: { ...p.discordHub, title: v },
                      }))
                    }
                  />
                </h2>
                <p className="text-xs font-sans text-[#666] dark:text-[#999] mb-4">
                  <EditableText
                    value={site.discordHub.subtitle}
                    editable={isEditing}
                    className="w-full"
                    onChange={(v) =>
                      updateSite((p) => ({
                        ...p,
                        discordHub: { ...p.discordHub, subtitle: v },
                      }))
                    }
                  />
                </p>

                <div className="border border-[#999] dark:border-[#444] p-5 bg-[#fbfbfa] dark:bg-[#151515] mb-6">
                  <div className="font-serif font-bold text-lg mb-2">
                    <EditableText
                      value={site.discordHub.cardTitle}
                      editable={isEditing}
                      onChange={(v) =>
                        updateSite((p) => ({
                          ...p,
                          discordHub: { ...p.discordHub, cardTitle: v },
                        }))
                      }
                    />
                  </div>
                  <p className="font-serif text-[15px] text-[#444] dark:text-[#ccc] mb-4">
                    <EditableText
                      value={site.discordHub.description}
                      editable={isEditing}
                      multiline={true}
                      onChange={(v) =>
                        updateSite((p) => ({
                          ...p,
                          discordHub: { ...p.discordHub, description: v },
                        }))
                      }
                    />
                  </p>
                  <a
                    href={site.discordUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-[#003399] text-white dark:bg-[#3366cc] font-sans font-bold px-4 py-2 text-sm hover:opacity-90"
                  >
                    {site.discordHub.buttonLabel}
                  </a>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>

      {/* ADMIN CREDENTIALS LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#f6f6f4] dark:bg-[#161616] border-2 border-[#333] dark:border-[#777] max-w-sm w-full shadow-xl font-sans">
            <div className="bg-[#2b2b2b] text-white px-3 py-2 font-bold text-xs flex justify-between items-center">
              <span>FOSS CLUB KIET // ADMIN LOGIN</span>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-white hover:text-[#ff8a80]"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleLoginSubmit} className="p-4 space-y-3 text-xs">
              <p className="text-[#555] dark:text-[#aaa] font-serif italic">
                Log in with admin credentials to enable inline editing,
                drag-and-drop reordering, recruitment status toggle, and
                weekly/research paper updates.
              </p>

              {loginError && (
                <div className="p-2 bg-[#ffebee] dark:bg-[#3b1212] border border-[#c62828] text-[#c62828] dark:text-[#ff8a80] font-bold">
                  {loginError}
                </div>
              )}

              <div>
                <label className="block font-bold mb-1">Admin Username</label>
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full border border-[#888] bg-white dark:bg-[#0e0e0e] px-2.5 py-1.5"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Admin Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-[#888] bg-white dark:bg-[#0e0e0e] px-2.5 py-1.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="border border-[#888] px-3 py-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#222] dark:bg-[#b58900] text-white dark:text-black font-bold px-4 py-1 border border-black"
                >
                  Sign In &amp; Edit →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
