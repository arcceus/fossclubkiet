export type ViewId =
  | "frontpage"
  | "weekly"
  | "papers"
  | "manpage"
  | "bootcamp"
  | "officers"
  | "discord";

export type RecruitmentStatus = "open" | "closed" | "hidden";

export interface Announcement {
  id: string;
  title: string;
  date: string;
  venueOrDetails?: string;
  content: string[];
  actionText?: string;
  actionView?: ViewId;
  actionUrl?: string;
  order?: number;
  hidden?: boolean;
}

export interface WeeklyMeetupItem {
  id: string;
  weekLabel: string; // e.g. "Week 12 • November 17, 2026"
  date: string;
  venue: string;
  title: string;
  gist: string[];
  links?: { label: string; url: string }[];
  isUpcoming?: boolean;
}

export interface ResearchPaper {
  id: string;
  title: string;
  authors: string;
  year: string;
  gist: string;
  pdfUrl?: string;
  notesUrl?: string;
}

export interface PaperSession {
  id: string;
  monthLabel: string; // e.g. "November 2026 Reading Circle"
  date: string;
  venue: string;
  status: "upcoming" | "completed";
  intro?: string;
  papers: ResearchPaper[];
}

export interface SidebarScheduleItem {
  id: string;
  label: string;
  value: string;
}

export interface MemberItem {
  id: string;
  name: string;
  role?: string;
  discord: string;
  github: string;
}

export interface BootcampModule {
  id: string;
  number: number;
  title: string;
  description: string;
}

export interface BootcampConfig {
  bannerLabel: string;
  dateLabel: string;
  title: string;
  venue: string;
  dateAndTime: string;
  intro: string;
  prerequisites: string;
  copyText: string;
  modules: BootcampModule[];
}

export interface ManpageTableRow {
  id: string;
  cadence: string;
  schedule: string;
  venue: string;
}

export interface ManpageConfig {
  nameDesc: string;
  synopsis: string;
  description: string;
  rows: ManpageTableRow[];
  discordUrl: string;
  venueFooter: string;
}

export interface RecruitmentConfig {
  status: RecruitmentStatus;
  sidebarLabelOpen: string;
  sidebarLabelClosed: string;
  applyUrl: string;
  closedNotice: string;
}

export interface SiteContent {
  masthead: {
    title: string;
    subtitle: string;
  };
  recruitment: RecruitmentConfig;
  sidebarSchedule: SidebarScheduleItem[];
  discordUrl: string;
  discordHub: {
    title: string;
    subtitle: string;
    cardTitle: string;
    description: string;
    buttonLabel: string;
  };
  announcements: Announcement[];
  weeklyMeetups: {
    subtitle: string;
    defaultTimeAndVenue: string;
    items: WeeklyMeetupItem[];
  };
  paperReading: {
    subtitle: string;
    defaultChannel: string;
    sessions: PaperSession[];
  };
  bootcamp: BootcampConfig;
  manpage: ManpageConfig;
  members: {
    academicYear: string;
    subtitle: string;
    list: MemberItem[];
  };
  updatedAt?: string;
}

export interface Officer {
  id: string;
  role: string;
  team: string;
  discord: string;
  email: string;
  keyId: string;
  fingerprint: string;
}

export interface Quote {
  text: string;
  author: string;
}
