// src/components/AIInsightButton.jsx
import { useState } from "react";
import { useHistory } from "../contexts/HistoryContext"; // Импорт useHistory

const AIInsightButton = ({ insightRequestData }) => {
  const { history, addItem, removeItem, clearHistory } = useHistory(); // Получаем данные и функции из контекста
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false); // Состояние загрузки

  const fetchAIInsight = async (useHistory = false) => {
    let promptData = {};

    if (useHistory) {
      // Используем только историю
      if (history.length === 0) {
        alert("Нет данных в истории для анализа.");
        return;
      }
      promptData = {
        summary: history.map((h) => h.summary).join("\n---\n"), // Объединяем все summary
        context: insightRequestData?.context || {}, // Берём контекст из последнего запроса или {}
      };
    } else {
      // Используем текущие данные
      if (!insightRequestData || !insightRequestData.summary) {
        alert("Нет данных для анализа.");
        return;
      }
      promptData = insightRequestData;
    }

    setLoading(true); // Устанавливаем состояние загрузки
    setInsight(""); // Очистить предыдущий инсайт

    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5003";
      const response = await fetch(`${API_URL}/api/ai-insight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promptData),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      setInsight(data.insight);
    } catch (err) {
      console.error("Ошибка получения инсайта:", err);
      setInsight(`Ошибка: ${err.message}`);
    } finally {
      setLoading(false); // Сбрасываем состояние загрузки
    }
  };

  const handleAddToHistory = () => {
    if (insightRequestData && insightRequestData.summary) {
      addItem(insightRequestData.summary);
    } else {
      alert("Нет данных для добавления в историю.");
    }
  };

  return (
    <div className="mt-0 w-full">
      {" "}
      {/* mt-0 вместо mt-4, w-full сохранён */}
      {/* Кнопки: увеличили ширину (px-4), увеличили высоту (h-12), добавили flex для центрирования текста */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <button
          onClick={() => fetchAIInsight(false)}
          disabled={loading} // Отключаем при загрузке
          className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm" // py-2 (как в DispersionChart), text-sm (крупнее)
        >
          {loading ? "AI думает..." : "AI Анализ (Текущий)"}
        </button>
        <button
          onClick={handleAddToHistory}
          disabled={
            !insightRequestData || !insightRequestData.summary || loading
          }
          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm" // py-2 (как в DispersionChart), text-sm (крупнее)
        >
          Добавить в историю
        </button>
        <button
          onClick={() => fetchAIInsight(true)}
          disabled={loading || history.length === 0}
          className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm" // py-2 (как в DispersionChart), text-sm (крупнее)
        >
          {loading ? "AI думает..." : "AI Анализ (История)"}
        </button>
        <button
          onClick={clearHistory}
          disabled={history.length === 0 || loading}
          className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm" // py-2 (как в DispersionChart), text-sm (крупнее)
        >
          Очистить историю
        </button>
      </div>
      {/* Поле для ответа ИИ: оставляем w-full, min-h, max-h, overflow-y-auto */}
      <div className="mt-2 p-3 bg-gray-100 rounded-lg text-sm w-full min-h-[100px] max-h-60 overflow-y-auto">
        <strong>AI Комментарий:</strong>
        {loading && (
          <div className="inline-block ml-2 align-middle">
            <svg
              className="animate-spin h-4 w-4 text-gray-600 inline"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        )}
        {!loading && insight && <span className="block mt-1">{insight}</span>}
        {!loading && !insight && (
          <span className="block mt-1">(Ответ ИИ появится здесь)</span>
        )}
      </div>
      {/* Список истории */}
      {history.length > 0 && (
        <div className="mt-2 w-full">
          <h4 className="text-sm font-medium text-gray-700">История:</h4>
          {/* Убрали break-words и truncate из li и span, добавили word-break и min-width */}
          <ul className="list-disc pl-5 text-xs text-gray-600 max-h-32 overflow-y-auto overflow-x-hidden">
            {history.map((item) => (
              <li
                key={item.id}
                className="flex justify-between items-start min-w-0"
              >
                {" "}
                {/* min-w-0 важно для flex child */}
                {/* span теперь использует flex-grow и word-break */}
                <span className="flex-grow mr-2 break-words">
                  {" "}
                  {/* flex-grow позволяет ему занимать доступное место, break-words для переноса */}
                  {item.summary}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-red-500 hover:text-red-700 ml-1 flex-shrink-0 self-start" /* self-start для выравнивания кнопки по верхнему краю */
                  title="Remove"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AIInsightButton;
