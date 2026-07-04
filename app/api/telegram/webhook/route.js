import {
  buildTestReply,
  sendTelegramMessage,
  verifyWebhookSecret,
} from "@/lib/telegram";

export async function GET() {
  return Response.json({
    ok: true,
    message: "Telegram webhook endpoint is ready",
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

  const message = update.message ?? update.edited_message;

  if (!message?.text || message.chat?.id == null) {
    return Response.json({ ok: true, ignored: true });
  }

  try {
    const reply = buildTestReply(message.text.trim());
    await sendTelegramMessage(message.chat.id, reply);
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return Response.json(
      { ok: false, error: error.message || "Failed to handle update" },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}
