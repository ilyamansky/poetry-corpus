// src/components/charts/SimpleWordCloudChart.jsx
import { useMemo } from "react";
import { useAppContext } from "../../App";

const SimpleWordCloudChart = () => {
  const { poems, lemmas } = useAppContext();

  // Подсчёт частотности
  const wordCloudData = useMemo(() => {
    if (!poems || !lemmas) return [];

    const freqMap = {};

    poems.forEach((poem) => {
      const text = [
        poem.title,
        poem.display_title,
        poem.text,
        poem.epigraph,
        poem.dedication,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const tokens = text
        .split(/[\s\n]+/)
        .map((t) => t.replace(/[.,;:!?()"\-–—\u2026\u00AB\u00BB]/g, ""))
        .filter((w) => w);

      tokens.forEach((token) => {
        const analyses = lemmas[token];
        if (analyses && analyses.length > 0) {
          const firstLemma = analyses[0].normal_form;
          freqMap[firstLemma] = (freqMap[firstLemma] || 0) + 1;
        }
      });
    });

    // Преобразуем в формат {text: 'word', value: 12}
    const words = Object.entries(freqMap).map(([lemma, count]) => ({
      text: lemma,
      value: count,
    }));

    // Сортируем по значению (частоте)
    words.sort((a, b) => b.value - a.value);

    // Находим min и max значения для масштабирования
    const values = words.map((w) => w.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    // Масштабируем значения к диапазону размеров шрифта (например, 12px - 40px)
    const minFontSize = 12;
    const maxFontSize = 40;
    const range = maxValue - minValue || 1; // Избегаем деления на 0, если все значения равны

    const scaledWords = words.map((word) => {
      const scaledValue = (word.value - minValue) / range;
      const fontSize = minFontSize + scaledValue * (maxFontSize - minFontSize);
      return {
        ...word,
        fontSize: fontSize,
      };
    });

    // Ограничиваем количество слов (например, 100)
    return scaledWords.slice(0, 100);
  }, [poems, lemmas]);

  // Функция для получения случайного цвета (опционально)
  const getRandomColor = () => {
    const colors = [
      "#1f77b4",
      "#ff7f0e",
      "#2ca02c",
      "#d62728",
      "#9467bd",
      "#8c564b",
      "#e377c2",
      "#7f7f7f",
      "#bcbd22",
      "#17becf",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Облако слов (лемм)</h2>
      {/* Контейнер для облака слов */}
      <div
        style={{
          height: "600px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          alignContent: "center",
          gap: "8px",
          padding: "10px",
          backgroundColor: "#f9fafb", // Светлый фон для контраста
          borderRadius: "4px",
        }}
        className="cursor-default" // Отключаем стандартный курсор
      >
        {wordCloudData.map((word, index) => (
          <span
            key={index}
            style={{
              fontSize: `${word.fontSize}px`,
              fontWeight: "normal",
              color: getRandomColor(),
              lineHeight: 1.2,
              padding: "2px 4px",
              // borderRadius: '3px', // Можно добавить скругления
              // transition: 'transform 0.2s', // Анимация при наведении
              // '&:hover': { transform: 'scale(1.1)' } // Не работает в style object, нужно CSS
            }}
            className="hover:opacity-90 transition-opacity duration-200" // Tailwind для простого эффекта
            title={`${word.text}: ${word.value}`} // Подсказка при наведении
          >
            {word.text}
          </span>
        ))}
      </div>
    </div>
  );
};

export default SimpleWordCloudChart;
