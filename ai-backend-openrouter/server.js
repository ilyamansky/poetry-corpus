require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://poetry-corpus.vercel.app",
];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

if (!process.env.GIGACHAT_AUTH_KEY) {
  console.error("FATAL ERROR: GIGACHAT_AUTH_KEY не задан в .env");
  process.exit(1);
}

let accessToken = null;
let tokenExpiresAt = 0;

async function getGigaChatToken() {
  const url = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
  const authKey = process.env.GIGACHAT_AUTH_KEY;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${authKey}`,
      RqUID: crypto.randomUUID(),
    },
    body: new URLSearchParams({ scope: "GIGACHAT_API_PERS" }).toString(),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`HTTP ${response.status}. ${raw}`);
  }

  const data = await response.json();
  accessToken = data.access_token;

  if (data.expires_at) {
    tokenExpiresAt = data.expires_at - 60000;
  } else if (data.expires_in) {
    tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  } else {
    tokenExpiresAt = Date.now() + 29 * 60 * 1000;
  }

  return accessToken;
}

async function ensureValidToken() {
  if (!accessToken || Date.now() >= tokenExpiresAt) {
    await getGigaChatToken();
  }
  return accessToken;
}

app.post("/api/ai-insight", async (req, res) => {
  const { summary, context } = req.body;

  if (!summary) {
    return res
      .status(400)
      .json({ error: "Ошибка: В запросе отсутствует summary." });
  }

  const prompt = `
Ты - лингвист, анализирующий русский поэтический корпус.
Контекст корпуса:
- Всего стихотворений: ${context?.totalPoems || "N/A"}
- Всего разделов: ${context?.totalSections || "N/A"}
- Всего уникальных лемм (в анализе): ${context?.totalLemmas || "N/A"}

Результаты анализа:
${summary}

Проанализируй данные анализа в контексте общего корпуса и дай краткий, но содержательный комментарий на русском языке, ограничь ответ 500 токенами.
  `;

  try {
    const token = await ensureValidToken();

    const payload = {
      model: "GigaChat-2-Pro",
      messages: [
        {
          role: "system",
          content:
            "Ты лингвист, анализирующий русский поэтический корпус. Отвечай на русском языке.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 500,
    };

    const chatUrl = "https://api.giga.chat/v1/chat/completions";

    const chatResponse = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Request-ID": crypto.randomUUID(),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });

    if (!chatResponse.ok) {
      const raw = await chatResponse.text();
      return res.status(500).json({
        error: "Ошибка при вызове API GigaChat",
        details: raw,
        status: chatResponse.status,
      });
    }

    const data = await chatResponse.json();
    res.json({ insight: data.choices[0].message.content.trim() });
  } catch (error) {
    console.error("/api/ai-insight error:", error.message);
    return res.status(500).json({
      error: "Внутренняя ошибка сервера",
      details: error.message,
    });
  }
});

const PORT = 5003;
app.listen(PORT, () => {
  console.log(`AI Backend (GigaChat) запущен на http://localhost:${PORT}`);
});
