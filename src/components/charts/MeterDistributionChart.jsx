// src/components/charts/MeterDistributionChart.jsx
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

const MeterDistributionChart = ({ meterCounts }) => {
  // Проверим, определены ли meterCounts и являются ли они объектом
  if (!meterCounts) {
    console.warn("MeterDistributionChart: meterCounts is null or undefined");
    return <div>Нет данных для отображения распределения размеров.</div>; // или return null;
  }

  // Подготовим данные для Chart.js
  const labels = Object.keys(meterCounts);
  const data = Object.values(meterCounts);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Количество стихотворений",
        data: data,
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Распределение стихотворений по размерам",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0, // Показывать только целые числа
        },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
};

export default MeterDistributionChart;
