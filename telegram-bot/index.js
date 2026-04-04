import http from "http";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is not set");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;

/** /notify dan kelgan apiBaseUrl — callback da ishlatiladi (bot qayta ishga tushsa yo‘qoladi). */
const courierOrderApiBaseByOrderId = new Map();

function normalizeApiBase(raw) {
  if (raw == null || String(raw).trim() === "") return "";
  let u = String(raw).trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
}

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

function buildCourierOrderDetailText(order) {
  const code =
    order.shortCode != null && String(order.shortCode).length > 0
      ? String(order.shortCode)
      : String(order.id).slice(0, 8);
  let text =
    `Yetkazib berishga tayyor buyurtma #${code}\n` +
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
  return text;
}

/** Birinchi xabar: faqat restoran + jami; tugma bosilgach API dan to‘liq ma’lumot. */
async function sendCourierReadyPreview(chatId, preview) {
  const { orderId, restaurantName, total, sig, apiBaseUrl } = preview;
  if (!orderId || !sig) {
    throw new Error("preview.orderId and preview.sig required");
  }
  const base = normalizeApiBase(apiBaseUrl);
  if (base) {
    courierOrderApiBaseByOrderId.set(String(orderId), base);
  }
  const text = `${String(restaurantName || "—")}\nJami: ${formatMoney(total)} so'm`;
  const callbackData = `c|${orderId}|${sig}`;
  if (Buffer.byteLength(callbackData, "utf8") > 64) {
    throw new Error("callback_data > 64 bytes");
  }
  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: {
        inline_keyboard: [[{ text: "Buyurtmani olish", callback_data: callbackData }]],
      },
    }),
  });
}

async function answerCallbackQuery(callbackQueryId, text, showAlert) {
  await telegramRequest("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text: String(text).slice(0, 200) } : {}),
    show_alert: !!showAlert,
  });
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

async function handleCourierOrderCallback(q) {
  const data = String(q.data || "").trim();
  if (!data.startsWith("c|")) {
    await answerCallbackQuery(q.id);
    return;
  }
  const parts = data.split("|");
  if (parts.length !== 3) {
    await answerCallbackQuery(q.id);
    return;
  }
  const [, orderId, sig] = parts;
  const base =
    normalizeApiBase(courierOrderApiBaseByOrderId.get(String(orderId))) ||
    normalizeApiBase(process.env.MINUTKA_API_URL) ||
    normalizeApiBase(process.env.API_BASE_URL) ||
    normalizeApiBase(process.env.BACKEND_URL);
  if (!base) {
    await answerCallbackQuery(
      q.id,
      "API manzili topilmadi. API serverda PUBLIC_API_URL yoki MINUTKA_API_URL qo‘ying (botni qayta ishga tushirsangiz, xabarni qayta yuboring).",
      true,
    );
    return;
  }
  const url = `${base}/internal/telegram/courier-order/${encodeURIComponent(orderId)}?sig=${encodeURIComponent(sig)}`;
  let res;
  try {
    res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
  } catch (e) {
    console.error("courier-order fetch", e);
    await answerCallbackQuery(q.id, "Serverga ulanib bo‘lmadi.", true);
    return;
  }
  let j = {};
  try {
    j = await res.json();
  } catch {
    j = {};
  }
  const errMsg = (m) => {
    if (Array.isArray(m)) return m.join(", ");
    if (typeof m === "string") return m;
    return "";
  };
  if (!res.ok || !j.order) {
    const msg =
      errMsg(j.message) ||
      (res.status === 403 ? "Ruxsat yo‘q." : "Buyurtma topilmadi yoki boshqa kuryer oldi.");
    await answerCallbackQuery(q.id, msg || "Xatolik", true);
    return;
  }
  await answerCallbackQuery(q.id, "Buyurtma ma’lumotlari yuborildi.", false);

  const order = j.order;
  const fullText = buildCourierOrderDetailText(order);
  const msg = q.message;
  if (!msg || !msg.chat) return;
  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const mapMarkup =
    order.lat != null && order.lng != null
      ? {
          inline_keyboard: [
            [{ text: "Xaritada ochish", url: `https://maps.google.com/?q=${order.lat},${order.lng}` }],
          ],
        }
      : undefined;

  const editRes = await fetch(`${API}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: fullText,
      reply_markup: mapMarkup,
    }),
  });
  if (!editRes.ok) {
    await fetch(`${API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: fullText,
        reply_markup: mapMarkup,
      }),
    });
  }

  if (order.lat != null && order.lng != null) {
    await fetch(`${API}/sendLocation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        latitude: order.lat,
        longitude: order.lng,
      }),
    });
  }
}

async function handleTelegramUpdate(update) {
  if (update.callback_query) {
    await handleCourierOrderCallback(update.callback_query);
    return;
  }
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
        const { chatId, order, kind, preview } = payload;
        if (!chatId) {
          res.statusCode = 400;
          res.end("chatId is required");
          return;
        }
        if (kind === "courier_ready" && preview && typeof preview === "object") {
          await sendCourierReadyPreview(chatId, preview);
        } else if (order) {
          await sendOrderNotification(chatId, order, kind);
        } else {
          res.statusCode = 400;
          res.end("order or courier preview required");
          return;
        }
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