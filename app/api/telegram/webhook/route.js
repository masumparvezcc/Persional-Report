import { handleTelegramUpdate } from "@/lib/notes/handlers";
import { verifyWebhookSecret } from "@/lib/telegram";

export async function GET() {
  return Response.json({
    ok: true,
    message: "Telegram note-taking webhook is ready",
    path: "/api/telegram/webhook",
  });
}

export async function POST(request) {
  if (!verifyWebhookSecret(request)) {
    return Response.json({ ok: false, error: "Invalid webhook secret" }, { status: 401 });
  }

  let update;

  try {
    update = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    await handleTelegramUpdate(update);
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return Response.json(
      { ok: false, error: error.message || "Failed to handle update" },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}
