// src/components/charts/CycleAnalysisChart.jsx
import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PieController,
  ArcElement,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import { useAppContext } from "../../App"; // Путь к App.jsx

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PieController,
  ArcElement,
);

const CycleAnalysisChart = () => {
  const { poems } = useAppContext(); // Получаем данные из контекста

  // Подсчёт количества стихов в циклах и отдельных
  const cycleData = useMemo(() => {
    if (!poems) return { inCycle: 0, individual: 0, cyclesByName: {} };

    let inCycleCount = 0;
    let individualCount = 0;
    const cyclesByName = {}; // cycle_name -> count

    poems.forEach((poem) => {
      if (poem.in_cycle) {
        inCycleCount++;
        // Увеличиваем счётчик для конкретного цикла
        const cycleName = poem.cycle_display_name || "Без названия";
        cyclesByName[cycleName] = (cyclesByName[cycleName] || 0) + 1;
      } else {
        individualCount++;
      }
    });

    return {
      inCycle: inCycleCount,
      individual: individualCount,
      cyclesByName,
    };
  }, [poems]);

  // Подготовка данных для Pie Chart (в цикле / отдельные)
  const pieChartData = {
    labels: ["В циклах", "Отдельные"],
    datasets: [
      {
        label: "Количество",
        data: [cycleData.inCycle, cycleData.individual],
        backgroundColor: [
          "rgba(255, 99, 132, 0.6)", // Красный для "в циклах"
          "rgba(54, 162, 235, 0.6)", // Синий для "отдельные"
        ],
        borderColor: ["rgba(255, 99, 132, 1)", "rgba(54, 162, 235, 1)"],
        borderWidth: 1,
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Стихотворения: В циклах vs Отдельные",
      },
    },
  };

  // Подготовка данных для Bar Chart (циклы по названиям)
  const barChartData = {
    labels: Object.keys(cycleData.cyclesByName),
    datasets: [
      {
        label: "Количество стихотворений в цикле",
        data: Object.values(cycleData.cyclesByName),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "Распределение стихотворений по названиям циклов",
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 0,
        },
        title: {
          display: true,
          text: "Название цикла",
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
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
      <h2 className="text-xl font-semibold mb-4">Анализ циклов</h2>

      {/* Сетка для двух графиков */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <Pie data={pieChartData} options={pieChartOptions} />
        </div>
        <div>
          <Bar data={barChartData} options={barChartOptions} />
        </div>
      </div>

      {/* Статистика по циклам */}
      <div className="mt-4">
        <p className="text-sm text-gray-700">
          <strong>Всего в циклах:</strong> {cycleData.inCycle}
        </p>
        <p className="text-sm text-gray-700">
          <strong>Отдельные:</strong> {cycleData.individual}
        </p>
        <p className="text-sm text-gray-700">
          <strong>Количество уникальных циклов:</strong>{" "}
          {Object.keys(cycleData.cyclesByName).length}
        </p>
      </div>
    </div>
  );
};

export default CycleAnalysisChart;
