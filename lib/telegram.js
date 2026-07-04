const TELEGRAM_API = "https://api.telegram.org";

export function getBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }

  return token;
}

export function getWebhookUrl() {
  const configuredUrl = process.env.TELEGRAM_WEBHOOK_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    throw new Error(
      "Set TELEGRAM_WEBHOOK_URL or NEXT_PUBLIC_SITE_URL to register the webhook"
    );
  }

  return `${siteUrl.replace(/\/$/, "")}/api/telegram/webhook`;
}

export function verifyWebhookSecret(request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!secret) {
    return true;
  }

  return (
    request.headers.get("x-telegram-bot-api-secret-token") === secret
  );
}

async function callTelegram(method, body) {
  const token = getBotToken();
  const response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.description || "Telegram API request failed");
  }

  return data;
}

export async function sendTelegramMessage(chatId, text) {
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text,
  });
}

export async function setTelegramWebhook(url, secretToken) {
  const payload = { url };

  if (secretToken) {
    payload.secret_token = secretToken;
  }

  return callTelegram("setWebhook", payload);
}

export async function getTelegramWebhookInfo() {
  const token = getBotToken();
  const response = await fetch(`${TELEGRAM_API}/bot${token}/getWebhookInfo`);
  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.description || "Telegram API request failed");
  }

  return data.result;
}

export function buildTestReply(text) {
  if (text === "/start") {
    return [
      "Webhook test bot is online.",
      "",
      "Try these commands:",
      "/test - verify the webhook",
      "/ping - quick health check",
      "",
      "Send any other text and I will echo it back.",
    ].join("\n");
  }

  if (text === "/test") {
    return "Test OK. Your Telegram webhook is working.";
  }

  if (text === "/ping") {
    return `Pong from ${process.env.NEXT_PUBLIC_SITE_URL || "your site"}`;
  }

  return `Echo: ${text}`;
}
