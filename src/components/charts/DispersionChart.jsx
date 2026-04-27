// src/components/charts/DispersionChart.jsx
import { useMemo, useRef, useEffect, useState } from "react";
import { useAppContext } from "../../App"; // или ваш контекст
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
} from "chart.js";
import { Line } from "react-chartjs-2";
import AIInsightButton from "../AIInsightButton"; // Импортируем обновлённый AIInsightButton

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
);

const DispersionChart = () => {
  const { poems, lemmas } = useAppContext(); // Получаем данные из контекста
  const [selectedLemmas, setSelectedLemmas] = useState([]);
  const [newLemma, setNewLemma] = useState("");
  const chartRef = useRef(null);

  // Определяем уникальные имена разделов
  const orderedSections = useMemo(() => {
    if (!poems) return [];
    const seen = new Set(); // Для отслеживания уникальности
    const result = []; // Для сохранения порядка
    poems.forEach((poem) => {
      if (poem.section_name && !seen.has(poem.section_name)) {
        seen.add(poem.section_name);
        result.push(poem.section_name);
      }
    });
    return result; // Возвращаем в порядке первого появления
  }, [poems]);

  // --- НОВОЕ: Получаем список всех возможных лемм ---
  const allLemmas = useMemo(() => {
    if (!lemmas) return [];
    return Array.from(
      new Set(
        Object.values(lemmas)
          .flat()
          .map((item) => item.normal_form),
      ),
    ).sort();
  }, [lemmas]);

  // --- НОВОЕ: Фильтрация лемм для подсказки ---
  const filteredSuggestions = useMemo(() => {
    if (!newLemma.trim()) return [];
    const lowerCaseInput = newLemma.toLowerCase().trim();
    return allLemmas
      .filter((lemma) => lemma.toLowerCase().startsWith(lowerCaseInput))
      .slice(0, 10); // Показываем первые 10 совпадений
  }, [newLemma, allLemmas]);

  // Подсчёт дисперсии для выбранных лемм
  const dispersionData = useMemo(() => {
    if (
      !poems ||
      !lemmas ||
      !orderedSections.length ||
      selectedLemmas.length === 0
    ) {
      console.log("[DispersionChart] Выхожу early, недостаточно данных");
      return { labels: [], datasets: [] };
    }

    console.log(
      "[DispersionChart] Вычисляю дисперсию для лемм:",
      selectedLemmas,
    );

    const datasets = selectedLemmas.map((lemma, index) => {
      console.log(`[DispersionChart] Обрабатываю лемму: "${lemma}"`);
      // Подсчитываем количество упоминаний леммы в каждом разделе
      const sectionCounts = {};
      orderedSections.forEach((section) => (sectionCounts[section] = 0));

      poems.forEach((poem) => {
        const sectionName = poem.section_name;
        if (!sectionName || !(sectionName in sectionCounts)) {
          console.log(
            `[DispersionChart] Пропускаю стихотворение, sectionName="${sectionName}" не найден в sectionCounts.`,
          );
          return;
        }

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

        // Проверяем, содержит ли стихотворение лемму
        const containsLemma = tokens.some((token) => {
          const analyses = lemmas[token];
          const found =
            analyses &&
            analyses.some(
              (a) => a.normal_form.toLowerCase() === lemma.toLowerCase(),
            );
          return found;
        });

        if (containsLemma) {
          sectionCounts[sectionName]++;
          console.log(
            `[DispersionChart] Лемма "${lemma}" найдена в стихотворении "${poem.title || poem.display_title || "Без названия"}" (${sectionName}), увеличили счётчик до ${sectionCounts[sectionName]}.`,
          );
        }
      });

      console.log(
        `[DispersionChart] sectionCounts для "${lemma}" (после цикла):`,
        sectionCounts,
      );

      // Вычисляем индекс дисперсии D = V / N
      const sectionsWithLemma = Object.values(sectionCounts).filter(
        (count) => count > 0,
      ).length;
      const totalSections = orderedSections.length;
      const dispersionIndex =
        totalSections > 0 ? sectionsWithLemma / totalSections : 0;

      console.log(
        `[DispersionChart] sectionsWithLemma: ${sectionsWithLemma}, totalSections: ${totalSections}`,
      );
      console.log(`[DispersionChart] D для "${lemma}": ${dispersionIndex}`);

      // Подготавливаем данные для линейного графика (показываем количество упоминаний по разделам)
      const data = orderedSections.map((section) => sectionCounts[section]);

      // Генерируем цвета
      const hue = (index * 137.508) % 360;
      const color = `hsl(${hue}, 70%, 50%)`;

      return {
        label: `${lemma} (D=${dispersionIndex.toFixed(2)})`,
        data,
        borderColor: color,
        backgroundColor: color.replace("hsl", "hsla").replace(")", ", 0.5)"),
        tension: 0.1,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: false,
      };
    });

    console.log("[DispersionChart] Подготовленные datasets:", datasets);

    return {
      labels: orderedSections,
      datasets,
    };
  }, [poems, lemmas, orderedSections, selectedLemmas]);

  // --- ОБНОВЛЁННАЯ ЛОГИКА ПОДГОТОВКИ ДАННЫХ ДЛЯ ИИ ---
  const insightRequestData = useMemo(() => {
    if (!selectedLemmas.length || !dispersionData.datasets) {
      return null;
    }

    // Сформируем краткое резюме для каждого типа анализа
    let summary = "";

    if (dispersionData.datasets && dispersionData.datasets.length > 0) {
      summary += "Анализ дисперсии лемм:\n";
      dispersionData.datasets.forEach((dataset) => {
        const lemma = dataset.label.split(" ")[0]; // Извлекаем лемму из label "свет (D=0.8)"
        const dispersionMatch = dataset.label.match(/\(D=([\d.]+)\)/);
        const dispersionIndex = dispersionMatch
          ? parseFloat(dispersionMatch[1])
          : 0;
        const sectionsWithData = dataset.data.filter(
          (count) => count > 0,
        ).length;
        const totalSections = dataset.data.length;
        const totalOccurrences = dataset.data.reduce(
          (sum, count) => sum + count,
          0,
        );

        summary += `- Лемма "${lemma}": Всего ${totalOccurrences} вхождений, `;
        summary += `в ${sectionsWithData}/${totalSections} разделах, `;
        summary += `индекс дисперсии D=${dispersionIndex.toFixed(2)}.\n`;
      });
    }

    // Добавим общий контекст
    const context = {
      totalPoems: poems?.length || 0,
      totalSections: orderedSections.length,
      totalLemmas: Object.keys(lemmas || {}).length,
    };

    return {
      summary: summary.trim(), // Краткое резюме анализа
      context: context, // Общий контекст
    };
  }, [dispersionData, selectedLemmas, poems, lemmas, orderedSections]); // Зависимости

  // Функция для добавления леммы
  const handleAddLemma = () => {
    if (newLemma.trim() && !selectedLemmas.includes(newLemma.trim())) {
      setSelectedLemmas([...selectedLemmas, newLemma.trim()]);
      setNewLemma(""); // Очистить поле ввода
    }
  };

  // Функция для удаления леммы
  const handleRemoveLemma = (lemmaToRemove) => {
    setSelectedLemmas(selectedLemmas.filter((l) => l !== lemmaToRemove));
  };

  // Функция для выбора леммы из подсказки
  const handleSelectSuggestion = (suggestedLemma) => {
    setNewLemma(suggestedLemma);
    // Не добавляем автоматически, пусть пользователь нажмет "Добавить"
  };

  // Опции для Chart.js
  const options = {
    responsive: true,
    maintainAspectRatio: false, // Позволяем компоненту управлять высотой
    scales: {
      x: {
        title: {
          display: true,
          text: "Разделы",
        },
      },
      y: {
        title: {
          display: true,
          text: "Количество вхождений",
        },
        beginAtZero: true,
      },
    },
    plugins: {
      legend: {
        display: true,
        position: "top",
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex flex-col md:flex-row gap-4">
        {" "}
        {/* Flex контейнер для графика и AI Insight */}
        <div className="flex-grow">
          {" "}
          {/* Основной график занимает оставшееся место */}
          {/* Форма для добавления леммы */}
          <div className="mb-4 flex flex-col gap-1">
            {" "}
            {/* Столбиком для подсказок */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newLemma}
                onChange={(e) => setNewLemma(e.target.value)}
                placeholder="Введите лемму"
                className="flex-grow px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                onClick={handleAddLemma}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Добавить
              </button>
            </div>
            {/* Подсказки */}
            {filteredSuggestions.length > 0 && (
              <div className="mt-1 bg-white border border-gray-200 rounded-md shadow-sm max-h-40 overflow-y-auto z-10">
                {filteredSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Список выбранных лемм */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-1">
              Выбранные леммы:
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedLemmas.map((lemma) => (
                <span
                  key={lemma}
                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                >
                  {lemma}
                  <button
                    type="button"
                    onClick={() => handleRemoveLemma(lemma)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          {/* График */}
          <div ref={chartRef} style={{ height: "400px", width: "100%" }}>
            {dispersionData.datasets.length > 0 ? (
              <Line data={dispersionData} options={options} />
            ) : (
              <p className="text-gray-500 text-center">
                Добавьте леммы для отображения графика.
              </p>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            График показывает, сколько раз каждая лемма встречается в каждом
            разделе. Индекс дисперсии (D) близкий к 1 означает равномерное
            распределение, близкий к 0 — локализацию. D = (Количество разделов с
            леммой) / (Общее количество разделов).
          </p>
        </div>
        <div className="md:w-3/5 ">
          {" "}
          {/* Блок для AI Insight, занимает 1/3 ширины на md экранах и больше, max-width для узких экранов */}
          <AIInsightButton insightRequestData={insightRequestData} />
        </div>
      </div>
    </div>
  );
};

export default DispersionChart;
