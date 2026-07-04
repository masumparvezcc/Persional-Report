import { listAllUsers, getDueNotes, markNoteNotified } from "@/lib/notes/db";
import { reminderMessage } from "@/lib/notes/messages";
import { noteActionsKeyboard } from "@/lib/notes/keyboards";
import { sendTelegramMessage } from "@/lib/telegram";

function isAuthorized(request) {
  const setupSecret = process.env.TELEGRAM_SETUP_SECRET;

  if (!setupSecret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${setupSecret}`;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const users = await listAllUsers();
  let sent = 0;

  for (const user of users) {
    const dueNotes = await getDueNotes(user.id);

    for (const note of dueNotes) {
      await sendTelegramMessage(user.id, reminderMessage(note), {
        replyMarkup: noteActionsKeyboard(note.id),
      });
      await markNoteNotified(user.id, note.id);
      sent += 1;
    }
  }

  return Response.json({ ok: true, sent });
}
