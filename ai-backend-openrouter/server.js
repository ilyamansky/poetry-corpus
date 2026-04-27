const express = require("express");
const OpenAI = require("openai");
require("dotenv").config();
const cors = require("cors");

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);
app.use(express.json());

if (!process.env.OPENROUTER_API_KEY) {
  console.error("FATAL ERROR: OPENROUTER_API_KEY is not set. Exiting.");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL,
});

app.post("/api/ai-insight", async (req, res) => {
  const { summary, context } = req.body;

  if (!summary) {
    console.error("Ошибка: В запросе отсутствует summary.");
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
    const response = await openai.chat.completions.create({
      model: "deepseek/deepseek-v3.2",
      messages: [
        {
          role: "system",
          content:
            "Ты лингвист, анализирующий русский поэтический корпус. Отвечай на русском языке.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.5,
    });

    res.json({ insight: response.choices[0].message.content.trim() });
  } catch (error) {
    console.error(
      "Ошибка вызова OpenRouter (DeepSeek):",
      error.response?.data || error.message,
    );
    res.status(500).json({ error: "Ошибка при вызове API OpenRouter" });
  }
});

const PORT = 5003;
app.listen(PORT, () => {
  console.log(
    `AI Backend (OpenRouter DeepSeek) сервер запущен на http://localhost:${PORT}`,
  );
});
