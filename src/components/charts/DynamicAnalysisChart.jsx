// src/components/charts/DynamicAnalysisChart.jsx
import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useAppContext } from "../../App";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

const DynamicAnalysisChart = () => {
  const { poems, lemmas } = useAppContext();

  // Состояния для ввода леммы
  const [lemmaInput, setLemmaInput] = useState("");
  const [selectedLemmas, setSelectedLemmas] = useState([]); // Массив выбранных лемм

  // Получаем уникальные леммы для автодополнения
  const lemmaList = useMemo(() => {
    const set = new Set();
    if (lemmas) {
      Object.values(lemmas).forEach((arr) =>
        arr.forEach((a) => set.add(a.normal_form)),
      );
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [lemmas]);

  // Фильтруем список для автодополнения
  const datalistOptions = useMemo(() => {
    if (!lemmaInput) return [];
    const low = lemmaInput.toLowerCase();
    return lemmaList
      .filter(
        (l) => l.toLowerCase().startsWith(low) && !selectedLemmas.includes(l),
      ) // Исключаем уже добавленные
      .slice(0, 50);
  }, [lemmaInput, lemmaList, selectedLemmas]);

  // Получаем уникальные разделы, отсортированные по порядку в корпусе
  const orderedSections = useMemo(() => {
    if (!poems) return [];
    const sectionMap = new Map();
    poems.forEach((poem) => {
      if (poem.section_name) {
        sectionMap.set(poem.section_name, true);
      }
    });
    return Array.from(sectionMap.keys());
  }, [poems]);

  // Подсчёт частотности выбранных лемм по разделам
  const frequencyData = useMemo(() => {
    if (!poems || !lemmas || selectedLemmas.length === 0)
      return { labels: [], datasets: [] };

    // Создаём Map для подсчёта в каждом разделе для каждой леммы
    const sectionCounts = {};
    selectedLemmas.forEach((lemma) => {
      sectionCounts[lemma] = new Map();
      orderedSections.forEach((section) =>
        sectionCounts[lemma].set(section, 0),
      );
    });

    poems.forEach((poem) => {
      const sectionName = poem.section_name;
      if (!sectionName) return;

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

      // Проверяем, содержит ли стихотворение каждую из выбранных лемм
      selectedLemmas.forEach((lemma) => {
        const containsLemma = tokens.some((token) => {
          const analyses = lemmas[token];
          return (
            analyses &&
            analyses.some(
              (a) => a.normal_form.toLowerCase() === lemma.toLowerCase(),
            )
          );
        });

        if (containsLemma) {
          sectionCounts[lemma].set(
            sectionName,
            sectionCounts[lemma].get(sectionName) + 1,
          );
        }
      });
    });

    // Подготовка данных для Chart.js
    const labels = orderedSections;
    const datasets = selectedLemmas.map((lemma, index) => {
      const data = orderedSections.map((section) =>
        sectionCounts[lemma].get(section),
      );
      // Генерируем цвета (можно использовать палитру)
      const hue = (index * 137.508) % 360; // Golden angle approximation
      const color = `hsl(${hue}, 70%, 50%)`;

      return {
        label: lemma,
        data,
        borderColor: color,
        backgroundColor: color.replace("hsl", "hsla").replace(")", ", 0.5)"),
        tension: 0.1,
        pointRadius: 4,
        pointHoverRadius: 6,
      };
    });

    return {
      labels,
      datasets,
    };
  }, [poems, lemmas, selectedLemmas, orderedSections]);

  // Опции для Chart.js
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          // Улучшаем отображение легенды
          usePointStyle: true,
          padding: 20,
        },
      },
      title: {
        display: true,
        text: `Динамика частотности лемм по разделам`,
      },
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          // Показываем общее количество употреблений в разделе
          afterLabel: function (context) {
            const section = context.dataset.label;
            const value = context.parsed.y;
            const sectionName = orderedSections[context.dataIndex];
            return `В разделе "${sectionName}": ${value} раз`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Раздел",
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Количество стихотворений",
        },
        ticks: {
          precision: 0,
        },
      },
    },
    interaction: {
      mode: "nearest",
      axis: "x",
      intersect: false,
    },
  };

  // Функции для управления леммами
  const addLemma = () => {
    if (lemmaInput.trim() && !selectedLemmas.includes(lemmaInput.trim())) {
      setSelectedLemmas((prev) => [...prev, lemmaInput.trim()]);
      setLemmaInput(""); // Очистить поле ввода
    }
  };

  const removeLemma = (lemmaToRemove) => {
    setSelectedLemmas((prev) => prev.filter((l) => l !== lemmaToRemove));
  };

  const handleAddLemmaKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addLemma();
    }
  };

  const handleSelectFromList = (selected) => {
    addLemma(selected);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">
        Динамика по разделам (аппроксимация времени)
      </h2>

      {/* Блок ввода и добавления лемм */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Добавьте лемму(ы) для отслеживания (нажмите Enter или кнопку "+"):
        </label>
        <div className="flex">
          <input
            type="text"
            value={lemmaInput}
            onChange={(e) => setLemmaInput(e.target.value)}
            onKeyDown={handleAddLemmaKeyDown}
            list="lemma-datalist"
            placeholder="Введите начало леммы..."
            className="flex-grow px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            type="button"
            onClick={addLemma}
            className="px-3 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 text-sm"
          >
            +
          </button>
          <datalist id="lemma-datalist">
            {datalistOptions.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </div>

        {/* Отображение добавленных лемм как тегов */}
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedLemmas.map((lemma, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {lemma}
              <button
                type="button"
                onClick={() => removeLemma(lemma)}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* График */}
      {selectedLemmas.length > 0 && (
        <div style={{ height: "500px" }}>
          <Line data={frequencyData} options={options} />
        </div>
      )}

      {/* Инструкция */}
      {!selectedLemmas.length && (
        <p className="text-gray-500 text-sm">
          Добавьте леммы, чтобы увидеть их динамику по разделам.
        </p>
      )}
    </div>
  );
};

export default DynamicAnalysisChart;
