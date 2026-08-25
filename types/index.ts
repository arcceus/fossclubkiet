export type ViewId =
  | "frontpage"
  | "weekly"
  | "manpage"
  | "bootcamp"
  | "officers"
  | "discord";

export interface Announcement {
  id: string;
  title: string;
  category: string;
  categoryColor: string;
  author: string;
  date: string;
  venueOrDetails?: string;
  content: string[];
  actionText?: string;
  actionView?: ViewId;
  order?: number;
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

export interface BootcampModule {
  number: number;
  title: string;
  description: string;
}
