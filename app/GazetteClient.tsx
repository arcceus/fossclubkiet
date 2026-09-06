"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ViewId, Announcement, Quote } from "@/types";
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

const CORE_MEMBERS: { name: string; email: string; discord: string; github: string }[] = [
  { name: "Nikhil", email: "nikhil@fossclubkiet.org", discord: "badnikhil", github: "badnikhil" },
  { name: "Deepak Anand", email: "deepak@fossclubkiet.org", discord: "arcceus", github: "arcceus" },
];

export default function GazetteClient({
  initialAnnouncements,
  initialQuote,
}: {
  initialAnnouncements: Announcement[];
  initialQuote: Quote;
}) {
  const [activeView, setActiveView] = useState<ViewId>("frontpage");
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
    const text =
      "Linux Basics & Open-Source History Bootcamp by FOSS CLUB KIET\nDate: September 9, 2026\nVenue: Room H106, KIET\nCurriculum: Linux Fundamentals, Open-Source History, Browser-based Linux Quest\nDiscord: https://discord.gg/JK272Ef8Pm";
    navigator.clipboard.writeText(text);
    setCopiedBootcamp(true);
    setTimeout(() => setCopiedBootcamp(false), 2000);
  };

  return (
    <div className="bg-[#ffffff] dark:bg-[#0e0e0e] text-[#111111] dark:text-[#e0e0e0] min-h-screen">
      <div className="max-w-[1200px] mx-auto px-3 sm:px-6">
        
        {/* LWN Classic Masthead Banner */}
        <header className="sticky top-0 z-30 bg-[#ffffff] dark:bg-[#0e0e0e] pt-4 pb-2 mb-4 border-b-2 border-[#333333] dark:border-[#666666]">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#000000] dark:text-[#ffffff] tracking-tight">
                FOSS Club KIET
              </h1>
              <div className="text-xs font-serif italic text-[#555555] dark:text-[#aaaaaa]">
                Published weekly by the FOSS Club at KIET Deemed to be University • Room H808, CSE-AI/AI&amp;ML Dept
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
            </div>
          </div>
        </header>

        {/* Main LWN 2-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-[210px_1fr] gap-6 items-start pb-8">
          
          {/* LEFT SIDEBAR: LWN Navigation & Tickers */}
          <aside className="w-full md:sticky md:top-[100px] self-start">
            
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
                  <li>
                    <button
                      onClick={() => handleNav("weekly")}
                      className={`lwn-link text-left w-full ${
                        activeView === "weekly" ? "font-bold" : ""
                      }`}
                    >
                      Weekly edition
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
                      onClick={() => handleNav("bootcamp")}
                      className={`lwn-link text-left w-full ${
                        activeView === "bootcamp" ? "font-bold" : ""
                      }`}
                    >
                      <strong>Bootcamp (Sep 3)</strong>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleNav("officers")}
                      className={`lwn-link text-left w-full ${
                        activeView === "officers" ? "font-bold" : ""
                      }`}
                    >
                      Core Members
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
              <div className="lwn-sidebar-title">HOURS &amp; VENUE</div>
              <div className="lwn-sidebar-body text-xs space-y-2 font-sans">
                <div>
                  <strong>Daily Open Hours:</strong>
                  <br />
                  Everyday after classes end
                </div>
                <div>
                  <strong>Weekly Meetup:</strong>
                  <br />
                  Fridays @ 5:00 PM IST
                </div>
                <div>
                  <strong>Club Room Location:</strong>
                  <br />
                  H808, CSE-AI / AI&amp;ML Dept, KIET
                </div>
                <div>
                  <strong>Paper Reading:</strong>
                  <br />
                  Monthly discussion date varies
                </div>
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
                href="https://discord.gg/JK272Ef8Pm"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-[#222] text-[#fff] dark:bg-[#333] hover:bg-[#000] text-xs font-sans font-bold px-2 py-1 border border-[#000]"
              >
                Join Discord ↗
              </a>
            </div>
          </aside>

          {/* RIGHT MAIN STAGE: LWN Editorial Articles & Views */}
          <main className="w-full min-w-0">
            
            {/* VIEW 1: Front Page & Weekly Edition */}
            {(activeView === "frontpage" || activeView === "weekly") && (
              <section className="lwn-view">
                <div className="bg-[#f0ede6] dark:bg-[#1a1a1a] border-y border-[#333] dark:border-[#555] px-3 py-1 mb-4 flex justify-between items-center text-xs font-sans">
                  <span className="font-bold uppercase tracking-wider text-[#333] dark:text-[#ddd]">
                    Weekly Edition • Front Page
                  </span>
                  <span className="text-[#666] dark:text-[#888]">{todayDate}</span>
                </div>

                {initialAnnouncements.length === 0 && (
                  <div className="p-4 text-xs italic text-[#666] border border-dashed border-[#ccc]">
                    No announcements currently posted. Add a JSON file to <code>data/announcements/</code>.
                  </div>
                )}

                {/* Render All JSON Announcements */}
                {initialAnnouncements.map((item) => (
                  <article key={item.id} className="lwn-article-box">
                    <div
                      className={`text-xs font-sans font-bold uppercase mb-1 ${item.categoryColor}`}
                    >
                      {item.category}
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#000] dark:text-[#fff] mb-1.5 leading-snug">
                      {item.title}
                    </h2>
                    <div className="text-xs font-sans text-[#666] dark:text-[#999] mb-3">
                      [{item.date}] By <strong>{item.author}</strong>
                      {item.venueOrDetails ? ` • ${item.venueOrDetails}` : ""}
                    </div>

                    <div className="font-serif text-[15px] leading-relaxed text-[#222] dark:text-[#ddd] space-y-3">
                      {item.content.map((p, idx) => (
                        <p key={idx}>{p}</p>
                      ))}
                    </div>

                    {item.actionText && item.actionView && (
                      <div className="mt-3 text-xs font-sans">
                        <button
                          onClick={() => handleNav(item.actionView!)}
                          className="lwn-link font-bold text-left"
                        >
                          {item.actionText}
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </section>
            )}

            {/* VIEW 2: Bootcamp Details */}
{activeView === "bootcamp" && (
              <section className="lwn-view">
                <div className="bg-[#f0ede6] dark:bg-[#1a1a1a] border-y border-[#333] dark:border-[#555] px-3 py-1 mb-4 flex justify-between items-center text-xs font-sans">
                  <span className="font-bold uppercase tracking-wider">
                    Event Dossier // Linux Basics &amp; Open-Source History Bootcamp
                  </span>
                  <span>September 9, 2026</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#000] dark:text-[#fff] mb-2">
                  Linux Basics &amp; Open-Source History Bootcamp (September 9)
                </h2>
                <div className="text-xs font-sans text-[#666] dark:text-[#999] mb-4 pb-2 border-b border-[#ccc] dark:border-[#333]">
                  Venue: <strong>Room H106, KIET</strong> • Date:{" "}
                  <strong>September 9, 2026 (17:00 – 20:30)</strong>
                </div>

                <div className="font-serif text-[15px] leading-relaxed text-[#222] dark:text-[#ddd] space-y-4 mb-6">
                  <p>
                    A beginner-friendly session where you won&apos;t just learn Linux, you&apos;ll play it. Explore an abandoned system in our browser adventure, uncover hidden files, unlock gates, and learn how to start contributing to open source this semester.
                  </p>

                  <h3 className="font-serif font-bold text-lg text-[#000] dark:text-[#fff] border-b border-[#ddd] dark:border-[#333] pb-1 mt-4">
                    Curriculum &amp; Workshop Modules
                  </h3>

                  <div className="space-y-3 font-sans text-xs">
                    <div className="border border-[#ccc] dark:border-[#444] p-3 bg-[#fdfdfc] dark:bg-[#161616]">
                      <div className="font-bold text-sm text-[#000] dark:text-[#fff]">
                        Module 1: Linux Fundamentals
                      </div>
                      <div className="text-[#555] dark:text-[#aaa] mt-1">
                        Core CLI navigation, filesystem hierarchy exploration, and essential command-line utilities.
                      </div>
                    </div>

                    <div className="border border-[#ccc] dark:border-[#444] p-3 bg-[#fdfdfc] dark:bg-[#161616]">
                      <div className="font-bold text-sm text-[#000] dark:text-[#fff]">
                        Module 2: Open-Source History
                      </div>
                      <div className="text-[#555] dark:text-[#aaa] mt-1">
                        The evolution of FOSS culture, open collaboration philosophy, and community onboarding for the semester.
                      </div>
                    </div>

                    <div className="border border-[#ccc] dark:border-[#444] p-3 bg-[#fdfdfc] dark:bg-[#161616]">
                      <div className="font-bold text-sm text-[#000] dark:text-[#fff]">
                        Module 3: Browser-based Linux Quest
                      </div>
                      <div className="text-[#555] dark:text-[#aaa] mt-1">
                        A browser-based terminal puzzle adventure: explore an abandoned system, spot misleading clues, unlock gates, and mint a completion certificate.
                      </div>
                    </div>
                  </div>

                  <div className="border border-[#333] dark:border-[#666] p-3 bg-[#f6f6f4] dark:bg-[#181818] font-sans text-xs">
                    <strong>Prerequisites:</strong> Absolute beginners welcome. Bring a laptop with a modern web browser and a Google account. Nothing to install.
                  </div>
                </div>
              </section>
            )}

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

            {/* VIEW 3: Groff Manual Page (man fossc) */}
            {activeView === "manpage" && (
              <section className="lwn-view">
                <div className="bg-[#f0ede6] dark:bg-[#1a1a1a] border-y border-[#333] dark:border-[#555] px-3 py-1 mb-4 flex justify-between items-center text-xs font-mono font-bold">
                  <span>FOSSC(1)</span>
                  <span>Linux Reference Manual</span>
                  <span>FOSSC(1)</span>
                </div>

                <div className="font-mono text-xs sm:text-[13px] leading-relaxed space-y-4 bg-[#fdfdfc] dark:bg-[#111] border border-[#ccc] dark:border-[#333] p-4 sm:p-6">
                  <div>
                    <div className="font-bold uppercase underline mb-1">NAME</div>
                    <div className="pl-4">
                      <strong>fossc</strong> - FOSS Club KIET operational handbook and gateway
                    </div>
                  </div>

                  <div>
                    <div className="font-bold uppercase underline mb-1">SYNOPSIS</div>
                    <div className="pl-4 bg-[#eee] dark:bg-[#222] p-2 border-l-2 border-[#333] dark:border-[#888]">
                      <strong>fossc</strong> [<strong>--discord</strong>] [<strong>--bootcamp</strong>] [<strong>--meeting</strong> <em>friday-5pm</em>] [<strong>--research-paper</strong>] [<em>command</em>]
                    </div>
                  </div>

                  <div>
                    <div className="font-bold uppercase underline mb-1">DESCRIPTION</div>
                    <div className="pl-4 font-serif text-[14px] leading-relaxed">
                      <strong>FOSS Club KIET</strong> is the student-led software freedom collective at KIET Deemed To Be University. We run open labs in <strong>Room H808</strong> every day after class hours conclude.
                    </div>
                  </div>

                  <div>
                    <div className="font-bold uppercase underline mb-1">MEETINGS &amp; TIMINGS</div>
                    <div className="pl-4 overflow-x-auto">
                      <table className="w-full text-left border-collapse border border-[#888] text-xs">
                        <thead>
                          <tr className="bg-[#333] text-white dark:bg-[#222]">
                            <th className="p-1.5 border border-[#888]">Cadence</th>
                            <th className="p-1.5 border border-[#888]">Time &amp; Schedule</th>
                            <th className="p-1.5 border border-[#888]">Venue / Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-[#ccc] dark:border-[#444]">
                            <td className="p-1.5 border border-[#888] font-bold">Daily Hours</td>
                            <td className="p-1.5 border border-[#888]">Everyday after classes</td>
                            <td className="p-1.5 border border-[#888]">Room H808, CSE-AI Dept</td>
                          </tr>
                          <tr className="border-b border-[#ccc] dark:border-[#444] bg-[#f5f5f5] dark:bg-[#181818]">
                            <td className="p-1.5 border border-[#888] font-bold">Weekly Sync</td>
                            <td className="p-1.5 border border-[#888]">Every Friday @ 5:00 PM</td>
                            <td className="p-1.5 border border-[#888]">General meetings &amp; lightning talks</td>
                          </tr>
                          <tr>
                            <td className="p-1.5 border border-[#888] font-bold">Paper Group</td>
                            <td className="p-1.5 border border-[#888]">Monthly</td>
                            <td className="p-1.5 border border-[#888]">Systems &amp; architecture review</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <div className="font-bold uppercase underline mb-1">COMMUNICATION</div>
                    <div className="pl-4">
                      <div>
                        Discord:{" "}
                        <a
                          href="https://discord.gg/JK272Ef8Pm"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="lwn-link"
                        >
                          https://discord.gg/JK272Ef8Pm
                        </a>
                      </div>
                      <div>Venue: Room H808, CSE-AI / AI&amp;ML Dept, KIET</div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* VIEW 4: Core Members */}
            {activeView === "officers" && (
              <section className="lwn-view">
                <div className="bg-[#f0ede6] dark:bg-[#1a1a1a] border-y border-[#333] dark:border-[#555] px-3 py-1 mb-4 flex justify-between items-center text-xs font-sans font-bold">
                  <span>CORE MEMBERS</span>
                  <span>Academic Year 2026-27</span>
                </div>

                <h2 className="text-2xl font-serif font-bold text-[#000] dark:text-[#fff] mb-2">
                  Core Members
                </h2>
                <p className="text-xs font-sans text-[#666] dark:text-[#999] mb-4">
                  Contact details for the core members of FOSS Club KIET.
                </p>

                <div className="space-y-4 font-mono text-xs">
                  {CORE_MEMBERS.map((member) => (
                    <div
                      key={member.email}
                      className="border border-[#999] dark:border-[#444] p-3 bg-[#fdfdfc] dark:bg-[#161616]"
                    >
                      <div className="font-bold text-sm mb-1">{member.name}</div>
                      <div className="text-[#555] dark:text-[#aaa] space-y-0.5 text-xs">
                        <div>Discord: @{member.discord}</div>
                        <div>
                          GitHub:{" "}
                          <a
                            href={`https://github.com/${member.github}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="lwn-link"
                          >
                            @{member.github}
                          </a>
                        </div>
                        <div>Email: {member.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* VIEW 5: Discord Community Hub */}
            {activeView === "discord" && (
              <section className="lwn-view">
                <div className="bg-[#f0ede6] dark:bg-[#1a1a1a] border-y border-[#333] dark:border-[#555] px-3 py-1 mb-4 flex justify-between items-center text-xs font-sans font-bold">
                  <span>COMMUNITY // DISCORD HUB</span>
                  <span>Real-time Chat</span>
                </div>

                <h2 className="text-2xl font-serif font-bold text-[#000] dark:text-[#fff] mb-2">
                  FOSS Club KIET Discord Community
                </h2>
                <p className="text-xs font-sans text-[#666] dark:text-[#999] mb-4">
                  Connect with 200+ fellow KIET Linux enthusiasts and developers.
                </p>

                <div className="border border-[#999] dark:border-[#444] p-5 bg-[#fbfbfa] dark:bg-[#151515] mb-6">
                  <div className="font-serif font-bold text-lg mb-2">Join the Official Server</div>
                  <p className="font-serif text-[15px] text-[#444] dark:text-[#ccc] mb-4">
                    Get immediate assistance with Linux installations, receive workshop announcements, collaborate on open source repositories, and participate in paper reading discussions.
                  </p>
                  <a
                    href="https://discord.gg/JK272Ef8Pm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-[#003399] text-white dark:bg-[#3366cc] font-sans font-bold px-4 py-2 text-sm hover:opacity-90"
                  >
                    discord.gg/JK272Ef8Pm ↗
                  </a>
                </div>

                <h3 className="font-serif font-bold text-base mb-2 border-b border-[#ddd] dark:border-[#333] pb-1">
                  Server Channels
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans text-xs">
                  <div className="border border-[#ccc] dark:border-[#444] p-2.5">
                    <strong>#announcements</strong>
                    <div className="text-[#666] dark:text-[#aaa] text-[11px] mt-0.5">
                      Official notifications and room schedules.
                    </div>
                  </div>
                  <div className="border border-[#ccc] dark:border-[#444] p-2.5">
                    <strong>#linux-help-desk</strong>
                    <div className="text-[#666] dark:text-[#aaa] text-[11px] mt-0.5">
                      Dual boot, driver, and kernel assistance.
                    </div>
                  </div>
                  <div className="border border-[#ccc] dark:border-[#444] p-2.5">
                    <strong>#paper-reading</strong>
                    <div className="text-[#666] dark:text-[#aaa] text-[11px] mt-0.5">
                      Monthly research paper circle.
                    </div>
                  </div>
                  <div className="border border-[#ccc] dark:border-[#444] p-2.5">
                    <strong>#project-showcase</strong>
                    <div className="text-[#666] dark:text-[#aaa] text-[11px] mt-0.5">
                      Share repositories and pull requests.
                    </div>
                  </div>
                </div>
              </section>
            )}

          </main>
        </div>

      </div>
    </div>
  );
}
