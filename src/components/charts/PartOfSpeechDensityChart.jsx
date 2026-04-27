// src/components/charts/PartOfSpeechDensityChart.jsx
import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { useAppContext } from "../../App";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

const PartOfSpeechDensityChart = () => {
  const { poems, lemmas } = useAppContext();

  // Состояния для фильтрации
  const [minOccurrence, setMinOccurrence] = useState(1); // Минимальное количество слов для учёта POS

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

  // Подсчёт плотности частей речи по разделам
  const posData = useMemo(() => {
    if (!poems || !lemmas || !orderedSections.length)
      return { labels: [], datasets: [] };

    const posCountsPerSection = {};

    orderedSections.forEach((section) => {
      posCountsPerSection[section] = {};
    });

    poems.forEach((poem) => {
      const sectionName = poem.section_name;
      if (!sectionName || !posCountsPerSection[sectionName]) return;

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
          const pos = analyses[0].pos; // Берём первую часть речи
          if (pos) {
            posCountsPerSection[sectionName][pos] =
              (posCountsPerSection[sectionName][pos] || 0) + 1;
          }
        }
      });
    });

    // Вычисляем плотность (например, процент от общего числа слов в разделе)
    const posDensityData = {};
    orderedSections.forEach((section) => {
      const totalCount = Object.values(posCountsPerSection[section]).reduce(
        (sum, count) => sum + count,
        0,
      );
      if (totalCount === 0) return;

      Object.entries(posCountsPerSection[section]).forEach(([pos, count]) => {
        if (count >= minOccurrence) {
          // Применяем фильтр
          if (!posDensityData[pos]) posDensityData[pos] = [];
          posDensityData[pos].push((count / totalCount) * 100); // Процент
        }
      });
    });

    // Подготовка данных для Chart.js
    const labels = orderedSections;
    const datasets = Object.entries(posDensityData).map(
      ([pos, data], index) => {
        // Генерируем цвета
        const hue = (index * 137.508) % 360; // Golden angle approximation
        const color = `hsl(${hue}, 70%, 50%)`;

        return {
          label: pos,
          data,
          backgroundColor: color.replace("hsl", "hsla").replace(")", ", 0.6)"),
          borderColor: color,
          borderWidth: 1,
        };
      },
    );

    return {
      labels,
      datasets,
    };
  }, [poems, lemmas, orderedSections, minOccurrence]);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      title: {
        display: true,
        text: `Плотность частей речи по разделам (%)`,
      },
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(2) + "%";
            }
            return label;
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
          text: "Плотность (%)",
        },
      },
    },
    interaction: {
      mode: "nearest",
      axis: "x",
      intersect: false,
    },
  };

  // Обработчик изменения фильтра
  const handleMinOccurrenceChange = (e) =>
    setMinOccurrence(parseInt(e.target.value) || 1);

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">
        Плотность частей речи по разделам
      </h2>

      {/* Панель фильтров */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Мин. вхождений слова для учёта POS
          </label>
          <input
            type="number"
            value={minOccurrence}
            onChange={handleMinOccurrenceChange}
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* График */}
      <div style={{ height: "600px" }}>
        <Bar data={posData} options={options} />
      </div>

      <p className="text-sm text-gray-600 mt-2">
        График показывает, какую долю (в процентах) от общего числа слов в
        разделе составляют разные части речи. Используется первая доступная
        часть речи для леммы.
      </p>
    </div>
  );
};

export default PartOfSpeechDensityChart;
