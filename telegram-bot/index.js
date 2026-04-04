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

function formatMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return String(n ?? "0");
  return x.toLocaleString("uz-UZ");
}

function formatOrderItemsBlock(order) {
  const items = order.items;
  if (!Array.isArray(items) || items.length === 0) return "";
  let block = "\n\nTaomlar:\n";
  for (const it of items) {
    const name = String(it.name ?? "—").trim() || "—";
    const qty = Number(it.quantity) || 0;
    const line =
      it.lineTotal != null && it.lineTotal !== ""
        ? Number(it.lineTotal)
        : (Number(it.unitPrice) || 0) * qty;
    block += `• ${name} × ${qty} = ${formatMoney(line)} so'm\n`;
  }
  return block;
}

async function sendOrderNotification(chatId, order, kind) {
  const code = order.shortCode != null && String(order.shortCode).length > 0 ? String(order.shortCode) : String(order.id).slice(0, 8);
  const head =
    kind === "courier_ready"
      ? `Yetkazib berishga tayyor buyurtma #${code}`
      : `Yangi buyurtma #${code}`;
  let text =
    `${head}\n` +
    `Restoran: ${order.restaurantName}\n` +
    `Jami: ${formatMoney(order.total)} so'm\n` +
    `Mijoz: ${order.customerName || "-"}\n` +
    `Telefon: ${order.phone || "-"}`;

  if (order.addressLine) {
    text += `\nManzil: ${order.addressLine}`;
  }
  if (order.comment) {
    text += `\nIzoh: ${order.comment}`;
  }
  text += formatOrderItemsBlock(order);

  if (text.length > 4000) {
    text = text.slice(0, 3997) + "...";
  }

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
  const msg = update.message;
  if (!msg || !msg.chat) return;
  const text = (msg.text || "").trim().toLowerCase();
  const chatId = msg.chat.id;

  if (text === "/id" || text === "id" || text === "chat id") {
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: "Sizning Chat ID (quyidagi raqamni nusxa oling):",
    });
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: String(chatId),
    });
    return;
  }

  if (text === "/start" || text.startsWith("/start")) {
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text:
        "Assalomu alaykum! Bu Minutka boti.\n\n" +
        "Quyidagi xabarda sizning Chat ID raqamingiz bo‘ladi — uni nusxa olib:\n" +
        "• restoran: admin panel → Telegram\n" +
        "• kuryer: Kuryer paneli → Telegram",
    });
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: String(chatId),
    });
    return;
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
        const { chatId, order, kind } = payload;
        if (!chatId || !order) {
          res.statusCode = 400;
          res.end("chatId and order are required");
          return;
        }
        await sendOrderNotification(chatId, order, kind);
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

async function runPolling() {
  let offset = 0;
  for (;;) {
    try {
      const res = await fetch(`${API}/getUpdates?offset=${offset}&timeout=25`).then((r) => r.json());
      if (!res.ok || !Array.isArray(res.result)) continue;
      for (const update of res.result) {
        offset = update.update_id + 1;
        await handleTelegramUpdate(update);
      }
    } catch (e) {
      console.error("Polling error:", e.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

server.listen(PORT, async () => {
  console.log("Telegram bot server listening on", PORT);
  const publicUrl = process.env.PUBLIC_URL || process.env.RAILWAY_STATIC_URL;
  if (publicUrl) {
    const url = publicUrl.replace(/\/$/, "") + "/webhook";
    const r = await fetch(`${API}/setWebhook?url=${encodeURIComponent(url)}`).then((x) => x.json()).catch(() => ({}));
    if (r.ok) console.log("Webhook set:", url);
  } else {
    await fetch(`${API}/deleteWebhook`).catch(() => {});
    console.log("PUBLIC_URL yo'q — long polling ishlatiladi. Botga /start yuboring.");
    runPolling();
  }
});