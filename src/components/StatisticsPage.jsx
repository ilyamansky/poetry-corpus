// src/components/StatisticsPage.jsx
import { useMemo, useState } from "react";
import MeterDistributionChart from "./charts/MeterDistributionChart";
import SectionDistributionChart from "./charts/SectionDistributionChart";
import LengthByMeterChart from "./charts/LengthByMeterChart";
import StabilityChart from "./charts/StabilityChart";
import CycleAnalysisChart from "./charts/CycleAnalysisChart";
import CorpusComparison from "./CorpusComparison";
import FrequencyChart from "./charts/FrequencyChart";
import FrequencyTable from "./tables/FrequencyTable";
import SimpleWordCloudChart from "./charts/SimpleWordCloudChart";
import DynamicAnalysisChart from "./charts/DynamicAnalysisChart";
import CooccurrenceNetworkChart from "./charts/CooccurrenceNetworkChart";
import PartOfSpeechDensityChart from "./charts/PartOfSpeechDensityChart"; // Импортируем компонент
import DispersionChart from "./charts/DispersionChart";
import AdvancedFrequencyStats from "./AdvancedFrequencyStats";
import ConcordanceFinder from "./ConcordanceFinder";
import CollocationFinder from "./CollocationFinder";
import Tabs from "./Tabs";
import { useAppContext } from "../App";
import { HistoryProvider } from "../contexts/HistoryContext"; // Импортируем HistoryProvider

const StatisticsPageContent = () => {
  const { poems, lemmas, meterAnalysis } = useAppContext();

  // Определяем уникальные имена разделов для визуализаций
  const orderedSections = useMemo(() => {
    if (!poems) return [];
    const sectionSet = new Set();
    poems.forEach((poem) => {
      if (poem.section_name) {
        sectionSet.add(poem.section_name);
      }
    });
    return Array.from(sectionSet).sort();
  }, [poems]);

  // Определяем вкладки
  const tabs = [
    { key: "dispersion", label: "Дисперсия" },
    { key: "distributions", label: "Распределения" },
    { key: "frequencies", label: "Частоты" },
    { key: "connections", label: "Связи" },
    { key: "comparisons", label: "Сравнения" },
    { key: "advanced-freq", label: "Подробная частотность" },
    { key: "concordance", label: "Конкорданс" },
    { key: "collocations", label: "Коллокации" },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Статистика по корпусу</h1>
      <Tabs tabs={tabs}>
        {/* Вкладка Дисперсия */}
        <div tabKey="dispersion" className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-2">
              Дисперсия лемм по разделам
            </h2>
            <DispersionChart />
          </div>
        </div>

        {/* Вкладка Распределения */}
        <div tabKey="distributions" className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-2">
              Распределение размеров
            </h2>
            <MeterDistributionChart />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">
              Распределение по разделам
            </h2>
            <SectionDistributionChart />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">
              Длина стихотворений по размерам
            </h2>
            <LengthByMeterChart />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">
              Стабильность размера по разделам
            </h2>
            <StabilityChart />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Анализ циклов</h2>
            <CycleAnalysisChart />
          </div>
          {/* --- НОВОЕ: Добавляем Плотность частей речи --- */}
          <div>
            <h2 className="text-xl font-semibold mb-2">
              Плотность частей речи по разделам
            </h2>
            <PartOfSpeechDensityChart />
          </div>
        </div>

        {/* Вкладка Частоты */}
        <div tabKey="frequencies" className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-2">Облако слов</h2>
            <SimpleWordCloudChart />
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">
              Частотность слов (график)
            </h2>
            <FrequencyChart />
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">
              Частотный словарь (таблица)
            </h2>
            <FrequencyTable />
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">
              Расширенная статистика частотности
            </h2>
            <AdvancedFrequencyStats />
          </div>
        </div>

        {/* Вкладка Связи */}
        <div tabKey="connections" className="space-y-8">
          {/* --- УДАЛЯЕМ: Плотность частей речи --- */}
          {/* <div>
            <h2 className="text-xl font-semibold mb-2">Плотность частей речи по разделам</h2>
            <PartOfSpeechDensityChart />
          </div> */}
          {/* --- ОСТАВЛЯЕМ: Сеть совместных появлений --- */}
          <div>
            <h2 className="text-xl font-semibold mb-2">
              Сеть совместных появлений (Co-occurrence Network)
            </h2>
            <CooccurrenceNetworkChart />
          </div>
        </div>

        {/* Вкладка Сравнения */}
        <div tabKey="comparisons" className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-2">
              Сравнение подкорпусов
            </h2>
            <CorpusComparison />
          </div>
        </div>

        {/* Вкладка Подробная частотность */}
        <div tabKey="advanced-freq" className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-2">
              Расширенная статистика частотности
            </h2>
            <AdvancedFrequencyStats />
          </div>
        </div>

        {/* Вкладка Конкорданс */}
        <div tabKey="concordance" className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-2">
              Поиск по контексту (Конкорданс)
            </h2>
            <ConcordanceFinder />
          </div>
        </div>

        {/* Вкладка Коллокации */}
        <div tabKey="collocations" className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-2">Поиск коллокаций</h2>
            <CollocationFinder />
          </div>
        </div>
      </Tabs>
    </div>
  );
};

// Оборачиваем StatisticsPage в HistoryProvider
const StatisticsPage = () => {
  return (
    <HistoryProvider>
      <StatisticsPageContent />
    </HistoryProvider>
  );
};

export default StatisticsPage;
