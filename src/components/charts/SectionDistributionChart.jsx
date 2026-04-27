// src/components/charts/SectionDistributionChart.jsx
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

const SectionDistributionChart = () => {
  const { poems } = useAppContext(); // Получаем данные из контекста

  // Подсчёт количества стихов по разделам
  const sectionCounts = useMemo(() => {
    if (!poems) return {};

    const counts = {};
    poems.forEach((poem) => {
      const sectionName = poem.section_name || "Без раздела"; // Обрабатываем null/undefined
      counts[sectionName] = (counts[sectionName] || 0) + 1;
    });
    return counts;
  }, [poems]);

  // Подготовка данных для Chart.js
  const chartData = useMemo(() => {
    const labels = Object.keys(sectionCounts);
    const data = Object.values(sectionCounts);

    return {
      labels,
      datasets: [
        {
          label: "Количество стихотворений",
          data,
          backgroundColor: "rgba(153, 102, 255, 0.6)",
          borderColor: "rgba(153, 102, 255, 1)",
          borderWidth: 1,
        },
      ],
    };
  }, [sectionCounts]);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Распределение стихотворений по разделам",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0, // Только целые числа
        },
      },
      x: {
        ticks: {
          maxRotation: 45, // Поворот меток, если они длинные
          minRotation: 0,
        },
      },
    },
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-2">Распределение по разделам</h2>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default SectionDistributionChart;
