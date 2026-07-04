function formatDate(timestamp) {
  if (!timestamp?.toDate) {
    return "Not set";
  }

  return timestamp.toDate().toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function truncate(text, max = 40) {
  if (!text) {
    return "";
  }

  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function mainMenuMessage(profile) {
  const name = profile?.firstName || profile?.username || "there";

  return [
    `Hello ${name}!`,
    "",
    "Welcome to your personal Note Taking app.",
    "",
    "Use the buttons below to create, edit, delete, or schedule notes.",
    "All notes are saved under your Telegram ID in Firestore.",
  ].join("\n");
}

export function helpMessage() {
  return [
    "How to use this bot:",
    "",
    "• New Note — create a note with title and content",
    "• My Notes — browse and open your saved notes",
    "• Scheduled — view notes with reminders",
    "• Open a note — edit, schedule, or delete it",
    "",
    "Schedule format: YYYY-MM-DD HH:mm",
    "Example: 2026-07-05 14:30",
    "",
    "Commands: /start /menu /notes /new /help",
  ].join("\n");
}

export function promptTitleMessage() {
  return "Send the note title:";
}

export function promptContentMessage(title) {
  return [`Title saved: ${title}`, "", "Now send the note content:"].join("\n");
}

export function promptEditTitleMessage(note) {
  return [
    `Editing title for: ${note.title}`,
    "",
    "Send the new title:",
  ].join("\n");
}

export function promptEditContentMessage(note) {
  return [
    `Editing content for: ${note.title}`,
    "",
    "Send the new content:",
  ].join("\n");
}

export function promptScheduleMessage(note) {
  return [
    `Schedule reminder for: ${note.title}`,
    "",
    "Send date and time as:",
    "YYYY-MM-DD HH:mm",
    "",
    "Example: 2026-07-05 14:30",
  ].join("\n");
}

export function noteCreatedMessage(noteId) {
  return `Note created successfully. ID: ${noteId}`;
}

export function noteUpdatedMessage(field) {
  return `${field} updated successfully.`;
}

export function noteDeletedMessage(title) {
  return `Deleted note: ${title}`;
}

export function scheduleSavedMessage(date) {
  return `Reminder scheduled for ${date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  })}.`;
}

export function scheduleClearedMessage() {
  return "Schedule removed. Note is active again.";
}

export function invalidScheduleMessage() {
  return [
    "Invalid date format.",
    "",
    "Use: YYYY-MM-DD HH:mm",
    "Example: 2026-07-05 14:30",
  ].join("\n");
}

export function noteDetailMessage(note) {
  const lines = [
    `Title: ${note.title}`,
    "",
    note.content,
    "",
    `Status: ${note.status}`,
    `Scheduled: ${formatDate(note.scheduledAt)}`,
    `Updated: ${formatDate(note.updatedAt)}`,
  ];

  return lines.join("\n");
}

export function notesListMessage({ notes, page, totalPages, scheduledOnly }) {
  if (notes.length === 0) {
    return scheduledOnly
      ? "No scheduled notes yet."
      : "No notes yet. Tap New Note to create one.";
  }

  const header = scheduledOnly ? "Scheduled notes" : "Your notes";
  const lines = [`${header} (page ${page + 1}/${totalPages})`, ""];

  notes.forEach((note, index) => {
    const schedule = note.scheduledAt
      ? ` — ${formatDate(note.scheduledAt)}`
      : "";
    lines.push(`${page * 5 + index + 1}. ${truncate(note.title, 32)}${schedule}`);
  });

  lines.push("", "Tap a note to open it.");
  return lines.join("\n");
}

export function deleteConfirmMessage(note) {
  return [
    "Delete this note?",
    "",
    `Title: ${note.title}`,
    "",
    "This action cannot be undone.",
  ].join("\n");
}

export function reminderMessage(note) {
  return [
    "Reminder",
    "",
    `Title: ${note.title}`,
    "",
    note.content,
  ].join("\n");
}

export function cancelMessage() {
  return "Action cancelled.";
}

export function unknownActionMessage() {
  return "Unknown action. Opening main menu.";
}
