// src/components/charts/LengthByMeterChart.jsx
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

const LengthByMeterChart = () => {
  const { poems, meterAnalysis } = useAppContext(); // Получаем данные из контекста

  // Подсчёт количества стихов по размеру и длине (в строках)
  const lengthByMeterData = useMemo(() => {
    if (!poems || !meterAnalysis) return { meters: [], datasets: [] };

    const meterMap = new Map(meterAnalysis.map((item) => [item.id, item])); // Для быстрого поиска по id

    const dataMap = {}; // meter -> { length -> count }

    poems.forEach((poem) => {
      const analysis = meterMap.get(poem.id);
      const meter = analysis?.meter || "Не определен";
      const length = poem.lineCount || poem.lines?.length || 0; // Используем lineCount, если есть

      if (!dataMap[meter]) {
        dataMap[meter] = {};
      }
      if (!dataMap[meter][length]) {
        dataMap[meter][length] = 0;
      }
      dataMap[meter][length]++;
    });

    // Преобразуем в формат, подходящий для Chart.js (grouped bar chart)
    // Нужно получить все уникальные длины и размеры
    const allMeters = Object.keys(dataMap).sort();
    const allLengths = [
      ...new Set(Object.values(dataMap).flatMap((obj) => Object.keys(obj))),
    ]
      .map(Number)
      .sort((a, b) => a - b);

    // Генерируем datasets для каждой длины
    const datasets = allLengths.map((length) => ({
      label: `${length} строк`,
      data: allMeters.map((meter) => dataMap[meter][length] || 0),
      backgroundColor: `hsla(${Math.floor(Math.random() * 360)}, 70%, 80%, 0.7)`, // Случайный цвет для каждой длины
    }));

    return {
      meters: allMeters,
      lengths: allLengths,
      datasets,
    };
  }, [poems, meterAnalysis]);

  // Подготовка данных для Chart.js
  const chartData = useMemo(() => {
    return {
      labels: lengthByMeterData.meters,
      datasets: lengthByMeterData.datasets,
    };
  }, [lengthByMeterData]);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        // Для лучшего отображения длин, можно сократить названия или отфильтровать
        labels: {
          // Пример: показывать только длины до 10 строк
          filter: (legendItem, chartData) => {
            // В данном случае фильтр в labels не работает как ожидалось для сокращения легенды
            // Лучше обрабатывать это при формировании datasets выше
            // Пока оставим как есть, можно будет улучшить позже
            return true;
          },
        },
      },
      title: {
        display: true,
        text: "Связь длины стихотворения и размера (количество стихов)",
      },
    },
    scales: {
      x: {
        stacked: true, // Группировка столбцов
        title: {
          display: true,
          text: "Размер",
        },
      },
      y: {
        stacked: true, // Группировка столбцов
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
      <h2 className="text-xl font-semibold mb-2">
        Связь длины стихотворения и размера
      </h2>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default LengthByMeterChart;
