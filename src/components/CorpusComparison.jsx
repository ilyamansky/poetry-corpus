// src/components/CorpusComparison.jsx
import { useMemo, useState } from "react";
import { useAppContext } from "../App";
import AIInsightButton from "./AIInsightButton"; // Импортируем AIInsightButton

const CorpusComparison = () => {
  const { poems, lemmas, meterAnalysis } = useAppContext(); // Добавим meterAnalysis, если понадобится

  const [subcorpusA, setSubcorpusA] = useState("");
  const [subcorpusB, setSubcorpusB] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // --- НОВОЕ: Состояния для сортировки ---
  const [sortConfig, setSortConfig] = useState({
    key: "diff",
    direction: "desc",
  });

  // --- НОВОЕ: Тип сравнения ---
  const [comparisonType, setComparisonType] = useState("lemmas"); // 'lemmas' или 'pos'

  // Список уникальных разделов для выбора
  const sectionNames = useMemo(() => {
    if (!poems) return [];
    const set = new Set();
    poems.forEach((p) => {
      if (p.section_name) set.add(p.section_name);
    });
    return Array.from(set).sort();
  }, [poems]);

  // --- НОВОЕ: Вспомогательная функция для подсчёта токенов (теперь выше) ---
  const getTokenCountForSection = (section) => {
    let count = 0;
    poems.forEach((poem) => {
      if (poem.section_name === section) {
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

        count += tokens.length;
      }
    });
    return count;
  };

  // --- НОВОЕ: Вычисление данных для сравнения (леммы или POS) с относительными частотами ---
  const comparisonData = useMemo(() => {
    if (
      !poems ||
      !lemmas ||
      !subcorpusA ||
      !subcorpusB ||
      subcorpusA === subcorpusB
    ) {
      return [];
    }

    // --- НОВОЕ: Подсчёт общего количества токенов в каждом подкорпусе ---
    const totalTokensA = getTokenCountForSection(subcorpusA);
    const totalTokensB = getTokenCountForSection(subcorpusB);

    if (comparisonType === "lemmas") {
      // --- СТАРЫЙ КОД ДЛЯ СРАВНЕНИЯ ЛЕММ + НОВОЕ: вычисление относительных частот ---
      const getLemmasForSection = (section) => {
        const lemmaFreq = {};
        poems.forEach((poem) => {
          if (poem.section_name === section) {
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
                const lemma = analyses[0].normal_form;
                lemmaFreq[lemma] = (lemmaFreq[lemma] || 0) + 1;
              }
            });
          }
        });
        return lemmaFreq;
      };

      const freqA = getLemmasForSection(subcorpusA);
      const freqB = getLemmasForSection(subcorpusB);

      const allLemmas = new Set([...Object.keys(freqA), ...Object.keys(freqB)]);
      const data = [];

      allLemmas.forEach((lemma) => {
        const countA = freqA[lemma] || 0;
        const countB = freqB[lemma] || 0;
        const total = countA + countB;
        const diff = Math.abs(countA - countB);
        // --- НОВОЕ: Вычисление относительных частот ---
        const relA = totalTokensA > 0 ? countA / totalTokensA : 0;
        const relB = totalTokensB > 0 ? countB / totalTokensB : 0;
        const relDiff = Math.abs(relA - relB);
        data.push({ lemma, countA, countB, total, diff, relA, relB, relDiff });
      });

      return data;
    } else if (comparisonType === "pos") {
      // --- НОВЫЙ КОД ДЛЯ СРАВНЕНИЯ POS + НОВОЕ: вычисление относительных частот ---
      const getPosForSection = (section) => {
        const posFreq = {};
        poems.forEach((poem) => {
          if (poem.section_name === section) {
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
                // Берём первую POS
                const pos = analyses[0].pos;
                if (pos) {
                  posFreq[pos] = (posFreq[pos] || 0) + 1;
                }
              }
            });
          }
        });
        return posFreq;
      };

      const freqA = getPosForSection(subcorpusA);
      const freqB = getPosForSection(subcorpusB);

      const allPos = new Set([...Object.keys(freqA), ...Object.keys(freqB)]);
      const data = [];

      allPos.forEach((pos) => {
        const countA = freqA[pos] || 0;
        const countB = freqB[pos] || 0;
        const total = countA + countB;
        const diff = Math.abs(countA - countB);
        // --- НОВОЕ: Вычисление относительных частот ---
        const relA = totalTokensA > 0 ? countA / totalTokensA : 0;
        const relB = totalTokensB > 0 ? countB / totalTokensB : 0;
        const relDiff = Math.abs(relA - relB);
        data.push({ pos, countA, countB, total, diff, relA, relB, relDiff });
      });

      return data;
    }

    return [];
  }, [poems, lemmas, subcorpusA, subcorpusB, comparisonType]);

  // --- НОВОЕ: Сортировка данных (теперь включает relA, relB, relDiff) ---
  const sortedData = useMemo(() => {
    const sortableData = [...comparisonData];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        // Для строк (лемма, pos)
        if (typeof aValue === "string" && typeof bValue === "string") {
          const comparison = aValue.localeCompare(bValue, "ru");
          return sortConfig.direction === "asc" ? comparison : -comparison;
        }

        // Для чисел (countA, countB, total, diff, relA, relB, relDiff)
        if (typeof aValue === "number" && typeof bValue === "number") {
          if (aValue < bValue) {
            return sortConfig.direction === "asc" ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === "asc" ? 1 : -1;
          }
          return 0;
        }

        return 0;
      });
    }
    return sortableData;
  }, [comparisonData, sortConfig]);

  // --- НОВОЕ: Функция для установки сортировки ---
  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Сброс на первую страницу
  };

  // Пагинация
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Обработчики
  const handleComparisonTypeChange = (e) => {
    setComparisonType(e.target.value);
    setCurrentPage(1); // Сброс
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Сброс
  };

  // --- НОВОЕ: Заголовки и отображение данных в зависимости от типа ---
  const renderHeaders = () => {
    if (comparisonType === "lemmas") {
      return (
        <>
          <th
            scope="col"
            className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
          >
            {/* --- ВЕРНУЛИ: Кнопка сортировки для леммы --- */}
            <button
              type="button"
              onClick={() => requestSort("lemma")}
              className="focus:outline-none"
            >
              Лемма{" "}
              {sortConfig.key === "lemma" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </button>
          </th>
        </>
      );
    } else {
      // pos
      return (
        <>
          <th
            scope="col"
            className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
          >
            {/* --- ВЕРНУЛИ: Кнопка сортировки для pos --- */}
            <button
              type="button"
              onClick={() => requestSort("pos")}
              className="focus:outline-none"
            >
              Часть речи{" "}
              {sortConfig.key === "pos" &&
                (sortConfig.direction === "asc" ? "↑" : "↓")}
            </button>
          </th>
        </>
      );
    }
  };

  const renderDataCells = (item) => {
    if (comparisonType === "lemmas") {
      return (
        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
          {item.lemma}
        </td>
      );
    } else {
      // pos
      return (
        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
          {item.pos}
        </td>
      );
    }
  };

  // --- НОВОЕ: Подготовка данных для AIInsightButton ---
  const insightRequestData = useMemo(() => {
    if (sortedData.length === 0 || !subcorpusA || !subcorpusB) {
      return null;
    }

    // Сформируем краткое резюме анализа сравнения
    let summary = "";
    summary += `Сравнение подкорпусов "${subcorpusA}" и "${subcorpusB}" по ${comparisonType === "lemmas" ? "леммам" : "частям речи"}:\n`;
    summary += `- Подкорпус A: ${subcorpusA} (всего токенов: ${getTokenCountForSection(subcorpusA)})\n`;
    summary += `- Подкорпус B: ${subcorpusB} (всего токенов: ${getTokenCountForSection(subcorpusB)})\n`;
    summary += `- Всего элементов для сравнения: ${sortedData.length}.\n`;

    // --- НОВОЕ: Добавим первые 15 записей с относительными частотами ---
    const top15Entries = sortedData.slice(0, 15);
    if (top15Entries.length > 0) {
      summary += `- Топ-${top15Entries.length} элементов с наибольшей разницей (абсолютной и относительной):\n`;
      top15Entries.forEach((item, index) => {
        const elem = comparisonType === "lemmas" ? item.lemma : item.pos;
        summary += `  ${index + 1}. "${elem}":\n`;
        summary += `     - Абс. частота: ${subcorpusA}: ${item.countA}, ${subcorpusB}: ${item.countB}, Разница: ${item.diff}\n`;
        summary += `     - Отн. частота: ${subcorpusA}: ${(item.relA * 100).toFixed(4)}%, ${subcorpusB}: ${(item.relB * 100).toFixed(4)}%, Разница: ${(item.relDiff * 100).toFixed(4)}%\n`;
      });
    }

    // Добавим общий контекст
    const context = {
      totalPoems: poems?.length || 0,
      totalSections: sectionNames.length,
      totalLemmas: Object.keys(lemmas || {}).length,
    };

    return {
      summary: summary.trim(), // Краткое резюме анализа
      context: context, // Общий контекст
    };
  }, [
    sortedData,
    subcorpusA,
    subcorpusB,
    comparisonType,
    poems,
    lemmas,
    sectionNames.length,
  ]); // getTokenCountForSection не нужна в зависимостях, так как она внутри useMemo и использует только стабильные значения или значения из зависимостей

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Сравнение подкорпусов</h2>

      {/* --- Flex контейнер для фильтров и AIInsightButton --- */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        {/* --- Основной контент (фильтры) --- */}
        <div className="flex-grow">
          {" "}
          {/* Занимает доступное место */}
          {/* Фильтры - 1 ряд на md и выше, 3 колонки + 1 на всю ширину */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Подкорпус A
              </label>
              <select
                value={subcorpusA}
                onChange={(e) => setSubcorpusA(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Выберите раздел</option>
                {sectionNames.map((name) => (
                  <option key={`a-${name}`} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Подкорпус B
              </label>
              <select
                value={subcorpusB}
                onChange={(e) => setSubcorpusB(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Выберите раздел</option>
                {sectionNames.map((name) => (
                  <option key={`b-${name}`} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тип сравнения
              </label>
              <select
                value={comparisonType}
                onChange={handleComparisonTypeChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="lemmas">По леммам</option>
                <option value="pos">По частям речи</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Количество на странице
              </label>
              <select
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {[10, 25, 50, 100].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* --- Блок для AIInsightButton --- */}
        <div className="md:w-2/5">
          {" "}
          {/* Ширина 2/5 на md и выше */}
          <AIInsightButton insightRequestData={insightRequestData} />
        </div>
      </div>

      {/* --- Таблица результатов (в той же левой колонке под фильтрами) --- */}
      <div className="overflow-x-auto mb-4">
        {" "}
        {/* mb-4 для отступа перед пагинацией */}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th
                scope="col"
                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                №
              </th>
              {renderHeaders()}
              <th
                scope="col"
                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <button
                  type="button"
                  onClick={() => requestSort("countA")}
                  className="focus:outline-none"
                >
                  {subcorpusA || "A"}{" "}
                  {sortConfig.key === "countA" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </button>
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <button
                  type="button"
                  onClick={() => requestSort("countB")}
                  className="focus:outline-none"
                >
                  {subcorpusB || "B"}{" "}
                  {sortConfig.key === "countB" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </button>
              </th>
              {/* --- НОВОЕ: Добавим колонки для относительных частот --- */}
              <th
                scope="col"
                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <button
                  type="button"
                  onClick={() => requestSort("relA")}
                  className="focus:outline-none"
                >
                  Отн. {subcorpusA || "A"} (%){" "}
                  {sortConfig.key === "relA" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </button>
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <button
                  type="button"
                  onClick={() => requestSort("relB")}
                  className="focus:outline-none"
                >
                  Отн. {subcorpusB || "B"} (%){" "}
                  {sortConfig.key === "relB" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </button>
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <button
                  type="button"
                  onClick={() => requestSort("total")}
                  className="focus:outline-none"
                >
                  Всего{" "}
                  {sortConfig.key === "total" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </button>
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <button
                  type="button"
                  onClick={() => requestSort("diff")}
                  className="focus:outline-none"
                >
                  Разница{" "}
                  {sortConfig.key === "diff" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </button>
              </th>
              {/* --- НОВОЕ: Добавим колонку для разницы относительных частот --- */}
              <th
                scope="col"
                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <button
                  type="button"
                  onClick={() => requestSort("relDiff")}
                  className="focus:outline-none"
                >
                  Отн. разница (%){" "}
                  {sortConfig.key === "relDiff" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((item, index) => (
              <tr
                key={comparisonType === "lemmas" ? item.lemma : item.pos}
                className={
                  (currentPage - 1) * itemsPerPage + (index % 2) === 0
                    ? "bg-white"
                    : "bg-gray-50"
                }
              >
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                  {(currentPage - 1) * itemsPerPage + index + 1}
                </td>
                {renderDataCells(item)}
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                  {item.countA}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                  {item.countB}
                </td>
                {/* --- НОВОЕ: Ячейки для относительных частот --- */}
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                  {(item.relA * 100).toFixed(4)}%
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                  {(item.relB * 100).toFixed(4)}%
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                  {item.total}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                  {item.diff}
                </td>
                {/* --- НОВОЕ: Ячейка для разницы относительных частот --- */}
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                  {(item.relDiff * 100).toFixed(4)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Показано {paginatedData.length} из {sortedData.length} записей
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Назад
            </button>
            <span className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700">
              {currentPage} из {totalPages}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Вперед
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorpusComparison;
