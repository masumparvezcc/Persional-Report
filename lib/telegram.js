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

export async function sendTelegramMessage(chatId, text, options = {}) {
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: options.parseMode,
    reply_markup: options.replyMarkup,
  });
}

export async function editTelegramMessage(chatId, messageId, text, options = {}) {
  return callTelegram("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: options.parseMode,
    reply_markup: options.replyMarkup,
  });
}

export async function answerCallbackQuery(callbackQueryId, text) {
  return callTelegram("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
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
