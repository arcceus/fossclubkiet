import { getAnnouncements } from "@/lib/announcements";
import GazetteClient from "./GazetteClient";

export default function Home() {
  const announcements = getAnnouncements();
  return <GazetteClient initialAnnouncements={announcements} />;
}
