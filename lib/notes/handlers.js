import { SESSION_STEPS } from "@/lib/notes/constants";
import {
  clearSchedule,
  clearSession,
  createNote,
  deleteNote,
  ensureUser,
  getNote,
  getSession,
  listNotes,
  scheduleNote,
  setSession,
  updateNote,
} from "@/lib/notes/db";
import {
  cancelKeyboard,
  deleteConfirmKeyboard,
  mainMenuKeyboard,
  noteActionsKeyboard,
  notesListKeyboard,
  paginateNotes,
} from "@/lib/notes/keyboards";
import {
  cancelMessage,
  deleteConfirmMessage,
  helpMessage,
  invalidScheduleMessage,
  mainMenuMessage,
  noteCreatedMessage,
  noteDeletedMessage,
  noteDetailMessage,
  noteUpdatedMessage,
  notesListMessage,
  promptContentMessage,
  promptEditContentMessage,
  promptEditTitleMessage,
  promptScheduleMessage,
  promptTitleMessage,
  scheduleSavedMessage,
  unknownActionMessage,
} from "@/lib/notes/messages";
import {
  answerCallbackQuery,
  editTelegramMessage,
  sendTelegramMessage,
} from "@/lib/telegram";

function parseScheduleInput(text) {
  const match = text.trim().match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  if (date.getTime() <= Date.now()) {
    return null;
  }

  return date;
}

function getProfileFromMessage(message) {
  return {
    username: message.from?.username ?? null,
    firstName: message.from?.first_name ?? null,
  };
}

function getProfileFromCallback(callbackQuery) {
  return {
    username: callbackQuery.from?.username ?? null,
    firstName: callbackQuery.from?.first_name ?? null,
  };
}

async function sendMainMenu(chatId, profile) {
  await sendTelegramMessage(chatId, mainMenuMessage(profile), {
    replyMarkup: mainMenuKeyboard(),
  });
}

async function sendNoteDetail(chatId, telegramId, noteId) {
  const note = await getNote(telegramId, noteId);

  if (!note) {
    await sendTelegramMessage(chatId, "Note not found.", {
      replyMarkup: mainMenuKeyboard(),
    });
    return;
  }

  await sendTelegramMessage(chatId, noteDetailMessage(note), {
    replyMarkup: noteActionsKeyboard(noteId),
  });
}

async function sendNotesList(chatId, telegramId, page, scheduledOnly) {
  const notes = await listNotes(telegramId, { scheduledOnly });
  const paginated = paginateNotes(notes, page);
  const message = notesListMessage({
    notes: paginated.items,
    page: paginated.page,
    totalPages: paginated.totalPages,
    scheduledOnly,
  });

  await sendTelegramMessage(chatId, message, {
    replyMarkup: notesListKeyboard({
      notes: paginated.items,
      page: paginated.page,
      totalPages: paginated.totalPages,
      scheduledOnly,
    }),
  });
}

async function startNewNote(chatId, telegramId) {
  await setSession(telegramId, {
    step: SESSION_STEPS.CREATING_TITLE,
    noteId: null,
    draft: {},
  });

  await sendTelegramMessage(chatId, promptTitleMessage(), {
    replyMarkup: cancelKeyboard(),
  });
}

async function handleTextStep(chatId, telegramId, text, session) {
  if (session.step === SESSION_STEPS.CREATING_TITLE) {
    const title = text.trim();

    if (!title) {
      await sendTelegramMessage(chatId, "Title cannot be empty. Try again:", {
        replyMarkup: cancelKeyboard(),
      });
      return;
    }

    await setSession(telegramId, {
      step: SESSION_STEPS.CREATING_CONTENT,
      draft: { title },
    });

    await sendTelegramMessage(chatId, promptContentMessage(title), {
      replyMarkup: cancelKeyboard(),
    });
    return;
  }

  if (session.step === SESSION_STEPS.CREATING_CONTENT) {
    const content = text.trim();

    if (!content) {
      await sendTelegramMessage(chatId, "Content cannot be empty. Try again:", {
        replyMarkup: cancelKeyboard(),
      });
      return;
    }

    const noteId = await createNote(telegramId, {
      title: session.draft.title,
      content,
    });

    await clearSession(telegramId);
    await sendTelegramMessage(chatId, noteCreatedMessage(noteId));
    await sendNoteDetail(chatId, telegramId, noteId);
    return;
  }

  if (session.step === SESSION_STEPS.EDITING_TITLE) {
    const title = text.trim();

    if (!title) {
      await sendTelegramMessage(chatId, "Title cannot be empty. Try again:", {
        replyMarkup: cancelKeyboard(),
      });
      return;
    }

    await updateNote(telegramId, session.noteId, { title });
    await clearSession(telegramId);
    await sendTelegramMessage(chatId, noteUpdatedMessage("Title"));
    await sendNoteDetail(chatId, telegramId, session.noteId);
    return;
  }

  if (session.step === SESSION_STEPS.EDITING_CONTENT) {
    const content = text.trim();

    if (!content) {
      await sendTelegramMessage(chatId, "Content cannot be empty. Try again:", {
        replyMarkup: cancelKeyboard(),
      });
      return;
    }

    await updateNote(telegramId, session.noteId, { content });
    await clearSession(telegramId);
    await sendTelegramMessage(chatId, noteUpdatedMessage("Content"));
    await sendNoteDetail(chatId, telegramId, session.noteId);
    return;
  }

  if (session.step === SESSION_STEPS.SCHEDULING) {
    const scheduledAt = parseScheduleInput(text);

    if (!scheduledAt) {
      await sendTelegramMessage(chatId, invalidScheduleMessage(), {
        replyMarkup: cancelKeyboard(),
      });
      return;
    }

    await scheduleNote(telegramId, session.noteId, scheduledAt);
    await clearSession(telegramId);
    await sendTelegramMessage(chatId, scheduleSavedMessage(scheduledAt));
    await sendNoteDetail(chatId, telegramId, session.noteId);
  }
}

async function handleCommand(chatId, telegramId, text, profile) {
  const command = text.split(" ")[0].toLowerCase();

  if (command === "/start" || command === "/menu") {
    await clearSession(telegramId);
    await sendMainMenu(chatId, profile);
    return;
  }

  if (command === "/help") {
    await sendTelegramMessage(chatId, helpMessage(), {
      replyMarkup: mainMenuKeyboard(),
    });
    return;
  }

  if (command === "/new") {
    await startNewNote(chatId, telegramId);
    return;
  }

  if (command === "/notes") {
    await sendNotesList(chatId, telegramId, 0, false);
    return;
  }

  await sendTelegramMessage(chatId, unknownActionMessage(), {
    replyMarkup: mainMenuKeyboard(),
  });
}

export async function handleTelegramMessage(message) {
  const chatId = message.chat.id;
  const telegramId = String(message.from?.id ?? chatId);
  const text = message.text?.trim() ?? "";
  const profile = getProfileFromMessage(message);

  await ensureUser(telegramId, profile);

  const session = await getSession(telegramId);

  if (text.startsWith("/")) {
    await handleCommand(chatId, telegramId, text, profile);
    return;
  }

  if (session.step !== SESSION_STEPS.IDLE) {
    await handleTextStep(chatId, telegramId, text, session);
    return;
  }

  await sendMainMenu(chatId, profile);
}

async function handleMenuCallback(chatId, messageId, telegramId, data, profile) {
  const parts = data.split(":");
  const action = parts[1];

  if (action === "menu") {
    await clearSession(telegramId);
    await editTelegramMessage(chatId, messageId, mainMenuMessage(profile), {
      replyMarkup: mainMenuKeyboard(),
    });
    return;
  }

  if (action === "help") {
    await editTelegramMessage(chatId, messageId, helpMessage(), {
      replyMarkup: mainMenuKeyboard(),
    });
    return;
  }

  if (action === "new") {
    await startNewNote(chatId, telegramId);
    return;
  }

  if (action === "list") {
    const page = Number(parts[2] ?? 0);
    const notes = await listNotes(telegramId, { scheduledOnly: false });
    const paginated = paginateNotes(notes, page);
    const message = notesListMessage({
      notes: paginated.items,
      page: paginated.page,
      totalPages: paginated.totalPages,
      scheduledOnly: false,
    });

    await editTelegramMessage(chatId, messageId, message, {
      replyMarkup: notesListKeyboard({
        notes: paginated.items,
        page: paginated.page,
        totalPages: paginated.totalPages,
        scheduledOnly: false,
      }),
    });
    return;
  }

  if (action === "sched") {
    const page = Number(parts[2] ?? 0);
    const notes = await listNotes(telegramId, { scheduledOnly: true });
    const paginated = paginateNotes(notes, page);
    const message = notesListMessage({
      notes: paginated.items,
      page: paginated.page,
      totalPages: paginated.totalPages,
      scheduledOnly: true,
    });

    await editTelegramMessage(chatId, messageId, message, {
      replyMarkup: notesListKeyboard({
        notes: paginated.items,
        page: paginated.page,
        totalPages: paginated.totalPages,
        scheduledOnly: true,
      }),
    });
    return;
  }

  if (action === "cancel") {
    await clearSession(telegramId);
    await editTelegramMessage(chatId, messageId, cancelMessage(), {
      replyMarkup: mainMenuKeyboard(),
    });
  }
}

async function handleNoteCallback(chatId, messageId, telegramId, data) {
  const parts = data.split(":");
  const action = parts[1];
  const noteId = parts[2];

  if (action === "vw") {
    const note = await getNote(telegramId, noteId);

    if (!note) {
      await editTelegramMessage(chatId, messageId, "Note not found.", {
        replyMarkup: mainMenuKeyboard(),
      });
      return;
    }

    await editTelegramMessage(chatId, messageId, noteDetailMessage(note), {
      replyMarkup: noteActionsKeyboard(noteId),
    });
    return;
  }

  if (action === "et") {
    const note = await getNote(telegramId, noteId);

    if (!note) {
      await editTelegramMessage(chatId, messageId, "Note not found.", {
        replyMarkup: mainMenuKeyboard(),
      });
      return;
    }

    await setSession(telegramId, {
      step: SESSION_STEPS.EDITING_TITLE,
      noteId,
      draft: {},
    });

    await sendTelegramMessage(chatId, promptEditTitleMessage(note), {
      replyMarkup: cancelKeyboard(),
    });
    return;
  }

  if (action === "ec") {
    const note = await getNote(telegramId, noteId);

    if (!note) {
      await editTelegramMessage(chatId, messageId, "Note not found.", {
        replyMarkup: mainMenuKeyboard(),
      });
      return;
    }

    await setSession(telegramId, {
      step: SESSION_STEPS.EDITING_CONTENT,
      noteId,
      draft: {},
    });

    await sendTelegramMessage(chatId, promptEditContentMessage(note), {
      replyMarkup: cancelKeyboard(),
    });
    return;
  }

  if (action === "sc") {
    const note = await getNote(telegramId, noteId);

    if (!note) {
      await editTelegramMessage(chatId, messageId, "Note not found.", {
        replyMarkup: mainMenuKeyboard(),
      });
      return;
    }

    await setSession(telegramId, {
      step: SESSION_STEPS.SCHEDULING,
      noteId,
      draft: {},
    });

    await sendTelegramMessage(chatId, promptScheduleMessage(note), {
      replyMarkup: cancelKeyboard(),
    });
    return;
  }

  if (action === "cs") {
    await clearSchedule(telegramId, noteId);
    const note = await getNote(telegramId, noteId);

    if (!note) {
      await editTelegramMessage(chatId, messageId, "Note not found.", {
        replyMarkup: mainMenuKeyboard(),
      });
      return;
    }

    await editTelegramMessage(chatId, messageId, noteDetailMessage(note), {
      replyMarkup: noteActionsKeyboard(noteId),
    });
    return;
  }

  if (action === "dl") {
    const note = await getNote(telegramId, noteId);

    if (!note) {
      await editTelegramMessage(chatId, messageId, "Note not found.", {
        replyMarkup: mainMenuKeyboard(),
      });
      return;
    }

    await editTelegramMessage(chatId, messageId, deleteConfirmMessage(note), {
      replyMarkup: deleteConfirmKeyboard(noteId),
    });
    return;
  }

  if (action === "dy") {
    const note = await getNote(telegramId, noteId);
    const title = note?.title ?? "Note";

    await deleteNote(telegramId, noteId);
    await editTelegramMessage(chatId, messageId, noteDeletedMessage(title), {
      replyMarkup: mainMenuKeyboard(),
    });
    return;
  }

  if (action === "dn") {
    await sendNoteDetail(chatId, telegramId, noteId);
  }
}

export async function handleTelegramCallback(callbackQuery) {
  const chatId = callbackQuery.message?.chat?.id;
  const messageId = callbackQuery.message?.message_id;
  const telegramId = String(callbackQuery.from.id);
  const data = callbackQuery.data ?? "";
  const profile = getProfileFromCallback(callbackQuery);

  if (!chatId || !messageId) {
    return;
  }

  await ensureUser(telegramId, profile);
  await answerCallbackQuery(callbackQuery.id);

  if (data.startsWith("m:")) {
    await handleMenuCallback(chatId, messageId, telegramId, data, profile);
    return;
  }

  if (data.startsWith("n:")) {
    await handleNoteCallback(chatId, messageId, telegramId, data);
  }
}

export async function handleTelegramUpdate(update) {
  if (update.callback_query) {
    await handleTelegramCallback(update.callback_query);
    return;
  }

  if (update.message?.text) {
    await handleTelegramMessage(update.message);
  }
}
