import fetch from "node-fetch";
import http from "http";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is not set");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;

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
  } else {
    res.statusCode = 404;
    res.end("not found");
  }
});

server.listen(PORT, () => {
  console.log("Telegram bot server listening on", PORT);
});