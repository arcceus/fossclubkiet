import fs from "node:fs";
import path from "node:path";
import type { Announcement } from "@/types";

export function getAnnouncements(): Announcement[] {
  const announcementsDir = path.join(process.cwd(), "data", "announcements");

  if (!fs.existsSync(announcementsDir)) {
    return [];
  }

  const files = fs.readdirSync(announcementsDir);
  const jsonFiles = files.filter((file) => file.endsWith(".json"));

  const announcements: Announcement[] = [];

  for (const file of jsonFiles) {
    try {
      const filePath = path.join(announcementsDir, file);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(fileContent);

      if (parsed.id && parsed.title) {
        announcements.push({
          id: String(parsed.id),
          title: String(parsed.title),
          category: String(parsed.category || "Club Notice"),
          categoryColor:
            parsed.categoryColor || "text-[#8a1f11] dark:text-[#ff7777]",
          author: String(parsed.author || "FOSS Club KIET"),
          date: String(parsed.date || "2026"),
          venueOrDetails: parsed.venueOrDetails || undefined,
          content: Array.isArray(parsed.content)
            ? parsed.content
            : [String(parsed.content || "")],
          actionText: parsed.actionText || undefined,
          actionView: parsed.actionView || undefined,
          order: typeof parsed.order === "number" ? parsed.order : 999,
        });
      }
    } catch (err) {
      console.error(`Error reading announcement file ${file}:`, err);
    }
  }

  // Sort by order asc
  announcements.sort((a, b) => {
    const orderA = a.order ?? 999;
    const orderB = b.order ?? 999;
    return orderA - orderB;
  });

  return announcements;
}
