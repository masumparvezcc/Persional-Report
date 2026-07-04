import { NOTES_PAGE_SIZE } from "@/lib/notes/constants";

function chunk(items, size) {
  const rows = [];

  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }

  return rows;
}

export function mainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "New Note", callback_data: "m:new" },
        { text: "My Notes", callback_data: "m:list:0" },
      ],
      [
        { text: "Scheduled", callback_data: "m:sched:0" },
        { text: "Help", callback_data: "m:help" },
      ],
    ],
  };
}

export function noteActionsKeyboard(noteId) {
  return {
    inline_keyboard: [
      [
        { text: "Edit Title", callback_data: `n:et:${noteId}` },
        { text: "Edit Content", callback_data: `n:ec:${noteId}` },
      ],
      [
        { text: "Schedule", callback_data: `n:sc:${noteId}` },
        { text: "Clear Schedule", callback_data: `n:cs:${noteId}` },
      ],
      [
        { text: "Delete", callback_data: `n:dl:${noteId}` },
        { text: "Back", callback_data: "m:list:0" },
      ],
      [{ text: "Main Menu", callback_data: "m:menu" }],
    ],
  };
}

export function deleteConfirmKeyboard(noteId) {
  return {
    inline_keyboard: [
      [
        { text: "Yes, delete", callback_data: `n:dy:${noteId}` },
        { text: "Cancel", callback_data: `n:dn:${noteId}` },
      ],
    ],
  };
}

export function notesListKeyboard({ notes, page, totalPages, scheduledOnly }) {
  const noteButtons = notes.map((note) => ({
    text: note.title.slice(0, 28),
    callback_data: `n:vw:${note.id}`,
  }));

  const rows = chunk(noteButtons, 1);
  const navRow = [];

  if (page > 0) {
    navRow.push({
      text: "Previous",
      callback_data: scheduledOnly
        ? `m:sched:${page - 1}`
        : `m:list:${page - 1}`,
    });
  }

  if (page + 1 < totalPages) {
    navRow.push({
      text: "Next",
      callback_data: scheduledOnly
        ? `m:sched:${page + 1}`
        : `m:list:${page + 1}`,
    });
  }

  if (navRow.length > 0) {
    rows.push(navRow);
  }

  rows.push([{ text: "Main Menu", callback_data: "m:menu" }]);

  return { inline_keyboard: rows };
}

export function cancelKeyboard() {
  return {
    inline_keyboard: [[{ text: "Cancel", callback_data: "m:cancel" }]],
  };
}

export function paginateNotes(notes, page) {
  const totalPages = Math.max(1, Math.ceil(notes.length / NOTES_PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = safePage * NOTES_PAGE_SIZE;

  return {
    page: safePage,
    totalPages,
    items: notes.slice(start, start + NOTES_PAGE_SIZE),
  };
}
