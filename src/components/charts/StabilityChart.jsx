// src/components/charts/StabilityChart.jsx
import { useMemo } from "react";
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

const StabilityChart = () => {
  const { meterAnalysis } = useAppContext(); // Получаем meterAnalysis из контекста

  // Подсчёт распределения scansion_score
  const stabilityData = useMemo(() => {
    if (!meterAnalysis) return { labels: [], datasets: [] };

    // Определим диапазоны для группировки scores (например, 0.0-0.1, 0.1-0.2, ...)
    // Можно настроить количество бинов
    const numBins = 10;
    const binWidth = 1.0 / numBins;
    const bins = Array(numBins).fill(0); // [0, 0, 0, ...]

    meterAnalysis.forEach((item) => {
      const score = item.score;
      if (score !== undefined && score !== null) {
        // Проверяем, что score есть
        // Определяем бин для score
        let binIndex = Math.floor(score / binWidth);
        // Убедимся, что бин не выходит за пределы массива (score = 1.0 попадёт в последний)
        if (binIndex >= numBins) binIndex = numBins - 1;
        if (binIndex < 0) binIndex = 0; // На всякий случай, если score < 0

        bins[binIndex]++;
      }
    });

    // Подготовим метки для оси X
    const labels = bins.map((_, i) => {
      const start = (i * binWidth).toFixed(2);
      const end = ((i + 1) * binWidth).toFixed(2);
      return `${start} - ${end}`;
    });

    return {
      labels,
      datasets: [
        {
          label: "Количество стихотворений",
          data: bins,
          backgroundColor: "rgba(255, 159, 64, 0.6)",
          borderColor: "rgba(255, 159, 64, 1)",
          borderWidth: 1,
        },
      ],
    };
  }, [meterAnalysis]);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Распределение scansion_score (метрическая стабильность)",
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Диапазон scansion_score",
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0, // Только целые числа
        },
        title: {
          display: true,
          text: "Количество стихотворений",
        },
      },
    },
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-2">Метрическая стабильность</h2>
      <p className="text-sm text-gray-600 mb-2">
        Распределение значений scansion_score. Низкие значения означают более
        стабильное соблюдение размера.
      </p>
      <Bar data={stabilityData} options={options} />
    </div>
  );
};

export default StabilityChart;
