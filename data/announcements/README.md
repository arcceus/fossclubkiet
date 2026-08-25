# FOSS Club KIET Announcements

To add a new announcement to the gazette, simply create a new `.json` file in this directory (`data/announcements/`).

### File Naming Convention
Use a number prefix or slug, e.g. `4-hackathon-2026.json`.

### Schema

```json
{
  "id": "unique-slug",
  "title": "Headline of the announcement",
  "category": "Club Notice & General Sync | Flagship Event Announcement | Research Group | Workshop & Tutorial",
  "categoryColor": "text-[#8a1f11] dark:text-[#ff7777]",
  "author": "Author Name / Role",
  "date": "August 25, 2026",
  "venueOrDetails": "Venue: Room H808, CSE-AI Dept",
  "content": [
    "First paragraph of the announcement...",
    "Second paragraph of the announcement..."
  ],
  "actionText": "[Optional link button text]",
  "actionView": "frontpage | bootcamp | manpage | officers | discord",
  "order": 4
}
```

- **id**: Unique string identifier.
- **title**: Heading displayed in the gazette.
- **category**: Category label.
- **categoryColor**: Optional Tailwind color class (defaults to burgundy if omitted).
- **author**: Author name or club officer handle.
- **date**: Date string (e.g. "August 25, 2026").
- **venueOrDetails**: Optional venue, cadence, or location snippet.
- **content**: Array of paragraph strings.
- **actionText**: Optional text for the bottom action button.
- **actionView**: Optional internal tab target when clicking the action button.
- **order**: Optional integer for custom ordering (lowest number appears first).
