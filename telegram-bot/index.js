import http from "http";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is not set");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;

/** /notify dan kelgan apiBaseUrl — callback da ishlatiladi (bot qayta ishga tushsa yo‘qoladi). */
const orderApiBaseByOrderId = new Map();

/** Vercel/Netlify — odatda frontend; /internal Nest da yo‘q. */
function isBadCallbackBaseUrl(url) {
  if (!url || typeof url !== "string") return true;
  const allowVercel = process.env.ALLOW_VERCEL_AS_TELEGRAM_API === "true";
  const allowNetlify = process.env.ALLOW_NETLIFY_AS_TELEGRAM_API === "true";
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (h.endsWith(".vercel.app") && !allowVercel) return true;
    if (h.endsWith(".netlify.app") && !allowNetlify) return true;
  } catch {
    return true;
  }
  return false;
}

function normalizeApiBase(raw) {
  if (raw == null || String(raw).trim() === "") return "";
  let u = String(raw).trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  if (isBadCallbackBaseUrl(u)) return "";
  return u;
}

/**
 * Faqat aniq API URLlar. RAILWAY_PUBLIC_DOMAIN, RENDER_EXTERNAL_URL, FLY, HEROKU
 * bot servisida ko‘pincha boshqa xizmat (botning o‘zi) — ularni ishlatmaslik kerak.
 * Bot Railway da: MINUTKA_API_URL=https://your-nest-api.up.railway.app
 */
function resolveApiBaseFromEnv() {
  const keys = [
    "TELEGRAM_API_CALLBACK_BASE_URL",
    "PUBLIC_API_URL",
    "MINUTKA_API_URL",
    "API_PUBLIC_URL",
    "BACKEND_PUBLIC_URL",
    "API_URL",
    "SERVER_URL",
    "APP_URL",
    "API_BASE_URL",
    "BACKEND_URL",
  ];
  for (const k of keys) {
    const raw = process.env[k];
    if (raw && String(raw).trim()) {
      const b = normalizeApiBase(raw);
      if (b) return b;
    }
  }
  return "";
}

function resolveApiBaseForCallback(orderId) {
  const cached = orderId != null ? orderApiBaseByOrderId.get(String(orderId)) : undefined;
  const fromCache = normalizeApiBase(cached);
  if (fromCache) return fromCache;
  return resolveApiBaseFromEnv();
}

if (!resolveApiBaseFromEnv()) {
  console.warn(
    "[telegram-bot] MINUTKA_API_URL yoki PUBLIC_API_URL yo‘q — «Qabul qilish» / «Buyurtmani olish» Nest API ga ulanmaydi. Qiymat: faqat backend (masalan https://xxx.up.railway.app), Vercel emas.",
  );
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
    orderApiBaseByOrderId.set(String(orderId), base);
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

function buildRestaurantOrderFullText(order) {
  const code =
    order.shortCode != null && String(order.shortCode).length > 0
      ? String(order.shortCode)
      : String(order.id).slice(0, 8);
  let text =
    `Qabul qilingan buyurtma #${code}\n` +
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

async function sendRestaurantNewPreview(chatId, preview) {
  const { orderId, shortCode, restaurantName, total, sig, apiBaseUrl } = preview;
  if (!orderId || !sig) {
    throw new Error("preview.orderId and preview.sig required");
  }
  const base = normalizeApiBase(apiBaseUrl);
  if (base) {
    orderApiBaseByOrderId.set(String(orderId), base);
  }
  const text =
    `Yangi buyurtma #${String(shortCode || "----")}\n` +
    `${String(restaurantName || "—")}\n` +
    `Jami: ${formatMoney(total)} so'm`;
  const callbackData = `r|${orderId}|${sig}|a`;
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
        inline_keyboard: [[{ text: "Qabul qilish", callback_data: callbackData }]],
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
  const base = resolveApiBaseForCallback(orderId);
  if (!base) {
    await answerCallbackQuery(
      q.id,
      "API manzili yo‘q. Bot servisiga MINUTKA_API_URL=Backend URL qo‘ying (masalan xxx.up.railway.app — Vercel emas). Brauzerda .../internal/telegram/ping tekshiring. Keyin botni qayta ishga tushiring.",
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

async function handleRestaurantOrderCallback(q) {
  const data = String(q.data || "").trim();
  if (!data.startsWith("r|")) {
    await answerCallbackQuery(q.id);
    return;
  }
  const parts = data.split("|");
  if (parts.length !== 4) {
    await answerCallbackQuery(q.id);
    return;
  }
  const [, orderId, sig, action] = parts;
  const base = resolveApiBaseForCallback(orderId);
  if (!base) {
    await answerCallbackQuery(
      q.id,
      "API manzili yo‘q. Bot servisiga MINUTKA_API_URL=Backend URL (Nest API, Vercel emas). Tekshiruv: .../internal/telegram/ping",
      true,
    );
    return;
  }

  const errMsg = (m) => {
    if (Array.isArray(m)) return m.join(", ");
    if (typeof m === "string") return m;
    return "";
  };

  if (action === "a") {
    const url = `${base}/internal/telegram/restaurant-order/${encodeURIComponent(orderId)}/accept?sig=${encodeURIComponent(sig)}`;
    let res;
    try {
      res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
    } catch (e) {
      console.error("restaurant accept fetch", e);
      await answerCallbackQuery(q.id, "Serverga ulanib bo‘lmadi.", true);
      return;
    }
    const rawText = await res.text();
    let j = {};
    try {
      j = JSON.parse(rawText || "{}");
    } catch {
      j = {};
    }
    if (!res.ok || !j.order) {
      let msg = errMsg(j.message);
      if (!msg && res.status === 403) {
        msg =
          "Ruxsat yo‘q (imzo). API va buyurtma workerida bir xil TELEGRAM_ORDER_HMAC_SECRET yoki JWT_SECRET bo‘lsin.";
      }
      if (!msg && res.status === 404) {
        const t = rawText || "";
        if (
          t.includes("Cannot GET") ||
          t.includes("Cannot POST") ||
          t.includes('"statusCode":404') ||
          /not\s*found/i.test(t)
        ) {
          msg =
            "404: so‘rov Nest API ga emas (masalan Vercel/saytga) ketgan. PUBLIC_API_URL / MINUTKA_API_URL faqat backend manzili bo‘lsin. Tekshiruv: brauzerda .../internal/telegram/ping";
        } else {
          msg =
            "Buyurtma topilmadi: API va worker bir xil DATABASE_URL (bir xil PostgreSQL) bo‘lishi kerak.";
        }
      }
      if (!msg && rawText) {
        msg = rawText.slice(0, 220);
      }
      if (!msg) {
        msg = `Qabul qilishda xatolik (HTTP ${res.status}).`;
      }
      console.error("[telegram] restaurant accept", res.status, rawText?.slice(0, 500));
      await answerCallbackQuery(q.id, msg, true);
      return;
    }
    const order = j.order;
    const fullText = buildRestaurantOrderFullText(order);
    const readyCb = `r|${orderId}|${sig}|t`;
    if (Buffer.byteLength(readyCb, "utf8") > 64) {
      await answerCallbackQuery(q.id, "callback_data juda uzun.", true);
      return;
    }
    await answerCallbackQuery(q.id, "Buyurtma qabul qilindi.", false);

    const msg = q.message;
    if (!msg || !msg.chat) return;
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const rows = [];
    if (order.lat != null && order.lng != null) {
      rows.push([
        {
          text: "Xaritada ochish",
          url: `https://maps.google.com/?q=${order.lat},${order.lng}`,
        },
      ]);
    }
    rows.push([{ text: "Tayyor", callback_data: readyCb }]);

    const editRes = await fetch(`${API}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: fullText,
        reply_markup: { inline_keyboard: rows },
      }),
    });
    if (!editRes.ok) {
      await fetch(`${API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: fullText,
          reply_markup: { inline_keyboard: rows },
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
    return;
  }

  if (action === "t") {
    const url = `${base}/internal/telegram/restaurant-order/${encodeURIComponent(orderId)}/ready?sig=${encodeURIComponent(sig)}`;
    let res;
    try {
      res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
    } catch (e) {
      console.error("restaurant ready fetch", e);
      await answerCallbackQuery(q.id, "Serverga ulanib bo‘lmadi.", true);
      return;
    }
    let j = {};
    try {
      j = await res.json();
    } catch {
      j = {};
    }
    if (!res.ok || !j.ok) {
      const msg = errMsg(j.message) || "Tayyor qilishda xatolik.";
      await answerCallbackQuery(q.id, msg, true);
      return;
    }
    if (j.alreadyReady) {
      await answerCallbackQuery(q.id, "Buyurtma allaqachon tayyor.", true);
      return;
    }
    await answerCallbackQuery(q.id, "Kuryerlarga yuborildi.", false);

    const msg = q.message;
    if (!msg || !msg.chat) return;
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const prev = String(msg.text || "");
    const extra = "\n\n✅ Tayyor. Kuryerlarga xabar yuborildi.";
    let newText = prev + extra;
    if (newText.length > 4096) {
      newText = newText.slice(0, 4093 - extra.length) + extra;
    }
    await fetch(`${API}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: newText,
        reply_markup: { inline_keyboard: [] },
      }),
    });
    return;
  }

  await answerCallbackQuery(q.id);
}

async function handleTelegramUpdate(update) {
  if (update.callback_query) {
    const d = String(update.callback_query.data || "").trim();
    if (d.startsWith("r|")) {
      await handleRestaurantOrderCallback(update.callback_query);
    } else {
      await handleCourierOrderCallback(update.callback_query);
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
        "Quyidagi xabarda Chat ID — nusxa olib sozlamaga kiriting.\n" +
        "• Restoran: «Qabul qilish» → manzil/xarita → «Tayyor» (keyin kuryerlar).\n" +
        "• Kuryer: qisqa xabar → «Buyurtmani olish» → batafsil.\n" +
        "Sozlash: restoran — admin Telegram; kuryer — Kuryer paneli → Telegram.",
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
        } else if (kind === "restaurant_new" && preview && typeof preview === "object") {
          await sendRestaurantNewPreview(chatId, preview);
        } else if (order) {
          await sendOrderNotification(chatId, order, kind);
        } else {
          res.statusCode = 400;
          res.end("order or courier/restaurant preview required");
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