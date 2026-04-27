// src/components/charts/FrequencyChart.jsx
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
import { useAppContext } from "../../App"; // Путь к App.jsx

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

const FrequencyChart = () => {
  const { poems, lemmas } = useAppContext(); // Получаем данные из контекста

  // Состояния для фильтров
  const [limit, setLimit] = useState(20); // Количество слов для отображения
  const [minFreq, setMinFreq] = useState(1); // Минимальная частота

  // Подсчёт частотности (тот же код, что и в FrequencyTable, но с ограничением по limit)
  const chartData = useMemo(() => {
    if (!poems || !lemmas) return { labels: [], datasets: [] };

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

    let freqArray = Object.entries(freqMap).map(([lemma, count]) => ({
      lemma,
      count,
    }));

    // Фильтрация по минимальной частоте
    freqArray = freqArray.filter((item) => item.count >= minFreq);

    // Сортировка по убыванию частоты
    freqArray.sort((a, b) => b.count - a.count);

    // Ограничение количества слов
    const limitedArray = freqArray.slice(0, limit);

    // Подготовка данных для Chart.js
    const labels = limitedArray.map((item) => item.lemma);
    const data = limitedArray.map((item) => item.count);

    return {
      labels,
      datasets: [
        {
          label: "Частота",
          data: data,
          backgroundColor: "rgba(75, 192, 192, 0.6)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    };
  }, [poems, lemmas, limit, minFreq]);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false, // Для столбчатой диаграммы лейбл обычно не нужен
      },
      title: {
        display: true,
        text: `Топ-${limit} самых частотных лемм`,
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 45, // Поворот меток, если они длинные
          minRotation: 0,
        },
        title: {
          display: true,
          text: "Лемма",
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0, // Только целые числа
        },
        title: {
          display: true,
          text: "Частота",
        },
      },
    },
    indexAxis: "y", // Горизонтальная гистограмма (опционально, можно убрать для вертикальной)
  };

  // Обработчики изменения фильтров
  const handleLimitChange = (e) => setLimit(parseInt(e.target.value) || 10);
  const handleMinFreqChange = (e) => setMinFreq(parseInt(e.target.value) || 1);

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Частотность слов</h2>

      {/* Панель фильтров */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Количество слов (Top-N)
          </label>
          <input
            type="number"
            value={limit}
            onChange={handleLimitChange}
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Мин. частота
          </label>
          <input
            type="number"
            value={minFreq}
            onChange={handleMinFreqChange}
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* График */}
      <div style={{ height: "60vh", maxHeight: "800px" }}>
        {" "}
        {/* Высота графика */}
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default FrequencyChart;
