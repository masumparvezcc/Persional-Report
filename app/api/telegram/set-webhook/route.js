import {
  getTelegramWebhookInfo,
  getWebhookUrl,
  setTelegramWebhook,
} from "@/lib/telegram";

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

  try {
    const webhookInfo = await getTelegramWebhookInfo();

    return Response.json({
      ok: true,
      webhook: webhookInfo,
      expectedUrl: getWebhookUrl(),
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error.message || "Failed to read webhook info" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const webhookUrl = getWebhookUrl();
    const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
    const result = await setTelegramWebhook(webhookUrl, secretToken);

    return Response.json({
      ok: true,
      webhookUrl,
      result: result.result,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error.message || "Failed to set webhook" },
      { status: 500 }
    );
  }
}
