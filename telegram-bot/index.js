import http from "http";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is not set");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;

async function telegramRequest(method, body) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok ? res.json() : null;
}

async function sendOrderNotification(chatId, order) {
  const text =
    `Yangi buyurtma #${order.id}\n` +
    `Restoran: ${order.restaurantName}\n` +
    `Jami: ${order.total} so'm\n` +
    `Mijoz: ${order.customerName || "-"}\n` +
    `Telefon: ${order.phone || "-"}`;

  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: order.lat && order.lng
        ? {
            inline_keyboard: [[
              {
                text: "Xaritada ochish",
                url: `https://maps.google.com/?q=${order.lat},${order.lng}`
              }
            ]]
          }
        : undefined
    })
  });

  if (order.lat && order.lng) {
    await fetch(`${API}/sendLocation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        latitude: order.lat,
        longitude: order.lng
      })
    });
  }
}

async function handleTelegramUpdate(update) {
  const callback = update.callback_query;
  if (callback) {
    if (callback.data === "get_chat_id") {
      const chatId = callback.message?.chat?.id ?? callback.from?.id;
      await telegramRequest("answerCallbackQuery", { callback_query_id: callback.id });
      await telegramRequest("sendMessage", {
        chat_id: chatId,
        text: `Sizning Chat ID: ${chatId}\n\nBuni restoran admin panelida Sozlamalar → Telegram Chat ID maydoniga kiriting.`,
      });
    }
    return;
  }
  const msg = update.message;
  if (!msg || !msg.chat) return;
  const text = (msg.text || "").trim().toLowerCase();
  const chatId = msg.chat.id;

  if (text === "/id" || text === "id" || text === "chat id") {
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: `Sizning Chat ID: ${chatId}\n\nBuni restoran admin panelida Sozlamalar → Telegram Chat ID maydoniga kiriting.`,
    });
    return;
  }

  if (text === "/start" || text.startsWith("/start") || text) {
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: "Buyurtmalar haqida xabar olish uchun Chat ID kerak. Quyidagi tugmani bosing:",
      reply_markup: {
        inline_keyboard: [[{ text: "Chat ID ni olish", callback_data: "get_chat_id" }]],
      },
    });
  }
}

const PORT = process.env.PORT || 3001;

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/notify") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const { chatId, order } = payload;
        if (!chatId || !order) {
          res.statusCode = 400;
          res.end("chatId and order are required");
          return;
        }
        await sendOrderNotification(chatId, order);
        res.statusCode = 200;
        res.end("ok");
      } catch (e) {
        console.error(e);
        res.statusCode = 500;
        res.end("error");
      }
    });
    return;
  }
  if (req.method === "POST" && (req.url === "/" || req.url === "/webhook")) {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      res.statusCode = 200;
      res.end("ok");
      try {
        const update = JSON.parse(body || "{}");
        await handleTelegramUpdate(update);
      } catch (e) {
        console.error(e);
      }
    });
    return;
  }
  res.statusCode = 404;
  res.end("not found");
});

server.listen(PORT, async () => {
  console.log("Telegram bot server listening on", PORT);
  const publicUrl = process.env.PUBLIC_URL || process.env.RAILWAY_STATIC_URL;
  if (publicUrl) {
    const url = publicUrl.replace(/\/$/, "") + "/webhook";
    const r = await fetch(`${API}/setWebhook?url=${encodeURIComponent(url)}`).then((x) => x.json()).catch(() => ({}));
    if (r.ok) console.log("Webhook set:", url);
  }
});