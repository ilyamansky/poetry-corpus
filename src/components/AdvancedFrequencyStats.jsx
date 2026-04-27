// src/components/AdvancedFrequencyStats.jsx
import { useMemo, useState } from "react";
import { useAppContext } from "../App";
import AIInsightButton from "./AIInsightButton"; // Импортируем AIInsightButton

const AdvancedFrequencyStats = () => {
  const { poems, lemmas } = useAppContext();

  // Состояния для фильтров
  const [posFilter, setPosFilter] = useState(""); // 'NOUN', 'ADJF', 'VERB', 'ADVB', ''
  const [stopWordsInput, setStopWordsInput] = useState(""); // Поле ввода стоп-слов
  const [customStopWords, setCustomStopWords] = useState([]); // Массив стоп-слов из ввода
  const [itemsPerPage, setItemsPerPage] = useState(50); // Количество на странице
  const [currentPage, setCurrentPage] = useState(1); // Текущая страница

  // --- НОВОЕ: Состояния для сортировки ---
  const [sortConfig, setSortConfig] = useState({
    key: "count",
    direction: "desc",
  }); // Сортировка по умолчанию по частоте (убыванию)

  // Обработка ввода стоп-слов
  const handleStopWordsChange = (e) => {
    setStopWordsInput(e.target.value);
  };

  const addStopWords = () => {
    if (stopWordsInput.trim()) {
      const newWords = stopWordsInput
        .toLowerCase()
        .split(/[\s,]+/)
        .filter((w) => w); // Разделение по пробелу и запятой
      setCustomStopWords((prev) => [...new Set([...prev, ...newWords])]); // Уникальные
      setStopWordsInput(""); // Очистить поле
    }
  };

  const removeStopWord = (wordToRemove) => {
    setCustomStopWords((prev) => prev.filter((w) => w !== wordToRemove));
  };

  // Список стандартных стоп-слов (можно расширить)
  const defaultStopWords = useMemo(() => {
    const set = new Set([
      "и",
      "в",
      "на",
      "не",
      "что",
      "быть",
      "с",
      "а",
      "за",
      "по",
      "о",
      "из",
      "у",
      "как",
      "то",
      "все",
      "же",
      "от",
      "он",
      "наш",
      "ты",
      "вы",
      "этот",
      "так",
      "его",
      "свой",
      "к",
      "у",
      "же",
      "бы",
      "вот",
      "быть",
      "который",
      "один",
      "такой",
      "только",
      "себя",
      "сказать",
      "вдруг",
      "уж",
      "ну",
      "быть",
      "ли",
      "около",
      "ещё",
      "всё",
      "них",
      "будто",
      "ж",
      "будет",
      "там",
      "того",
      "потом",
      "себе",
      "под",
      "жизнь",
      "ну",
      "мочь",
      "просто",
      "при",
      "мой",
      "много",
      "раз",
      "тоже",
      "ни",
      "стать",
      "другой",
      "вас",
      "день",
      "сам",
      "чтобы",
      "даже",
      "друг",
      "тут",
      "него",
      "для",
      "ваш",
      "the",
      "and",
      "to",
      "of",
      "a",
      "in",
      "that",
      "have",
      "i",
      "it",
      "for",
      "not",
      "on",
      "with",
      "he",
      "as",
      "you",
      "do",
      "at",
      "this",
      "but",
      "his",
      "by",
      "from",
      "they",
      "she",
      "or",
      "an",
      "her",
      "will",
      "my",
      "one",
      "all",
      "would",
      "there",
      "their",
    ]);
    return set;
  }, []);

  // Объединённый список стоп-слов
  const allStopWords = useMemo(() => {
    const combined = new Set(defaultStopWords);
    customStopWords.forEach((w) => combined.add(w));
    return combined;
  }, [defaultStopWords, customStopWords]);

  // Подсчёт частотности и POS (аналогично FrequencyTable, но с POS)
  const rawFrequencyData = useMemo(() => {
    if (!poems || !lemmas) return [];

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
          // Берём первую лемму и её POS (можно улучшить логику выбора POS)
          const firstLemma = analyses[0].normal_form;
          const firstPos = analyses[0].pos;

          // Пропускаем стоп-слова
          if (allStopWords.has(firstLemma)) {
            return;
          }

          if (!freqMap[firstLemma]) {
            freqMap[firstLemma] = { count: 0, pos: firstPos };
          }
          freqMap[firstLemma].count++;
          // Обновляем POS, если текущая встречается чаще для этой леммы (опционально)
          // Для простоты берём первую
        }
      });
    });

    // Преобразуем в массив
    return Object.entries(freqMap).map(([lemma, { count, pos }]) => ({
      lemma,
      count,
      pos,
    }));
  }, [poems, lemmas, allStopWords]);

  // Фильтрация по части речи
  const filteredData = useMemo(() => {
    if (!posFilter) return rawFrequencyData;
    return rawFrequencyData.filter((item) => item.pos === posFilter);
  }, [rawFrequencyData, posFilter]);

  // --- НОВОЕ: Сортировка ---
  const sortedData = useMemo(() => {
    const sortableData = [...filteredData]; // Создаём копию, чтобы не мутировать исходный массив
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        // Обработка строк (для леммы и pos)
        if (typeof aValue === "string" && typeof bValue === "string") {
          const comparison = aValue.localeCompare(bValue, "ru"); // Сортировка по алфавиту с учётом русского языка
          return sortConfig.direction === "asc" ? comparison : -comparison;
        }

        // Обработка чисел (для count)
        if (typeof aValue === "number" && typeof bValue === "number") {
          if (aValue < bValue) {
            return sortConfig.direction === "asc" ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === "asc" ? 1 : -1;
          }
          return 0;
        }

        // На всякий случай, если типы не совпадают
        return 0;
      });
    }
    return sortableData;
  }, [filteredData, sortConfig]);

  // --- НОВОЕ: Функция для установки сортировки ---
  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Сброс на первую страницу при изменении сортировки
  };

  // Пагинация
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  // Уникальные POS для фильтра
  const uniquePosList = useMemo(() => {
    const posSet = new Set(
      rawFrequencyData.map((item) => item.pos).filter(Boolean),
    );
    return Array.from(posSet).sort();
  }, [rawFrequencyData]);

  // Обработчики изменения фильтров
  const handlePosFilterChange = (e) => {
    setPosFilter(e.target.value);
    setCurrentPage(1); // Сброс на первую страницу при изменении фильтра
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Сброс на первую страницу при изменении количества на странице
  };

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // --- НОВОЕ: Подготовка данных для AIInsightButton ---
  const insightRequestData = useMemo(() => {
    if (sortedData.length === 0) {
      return null;
    }

    // Сформируем краткое резюме анализа частотности
    let summary = "";
    summary += `Анализ частотности лемм:\n`;
    summary += `- Найдено ${sortedData.length} уникальных лемм (исключая стоп-слова).\n`;
    if (posFilter) {
      summary += `- Фильтр по части речи: "${posFilter}".\n`;
    }
    summary += `- Всего стихотворений в корпусе: ${poems?.length || "N/A"}.\n`;
    summary += `- Всего уникальных лемм в корпусе: ${Object.keys(lemmas || {}).length}.\n`;

    // --- НОВОЕ: Добавим первые 15 записей ---
    const top15Entries = sortedData.slice(0, 15);
    if (top15Entries.length > 0) {
      summary += `- Топ-${top15Entries.length} самых частых лемм:\n`;
      top15Entries.forEach((item, index) => {
        summary += `  ${index + 1}. "${item.lemma}" - ${item.count} раз (POS: ${item.pos || "N/A"})\n`;
      });
    }

    // Добавим общий контекст
    const context = {
      totalPoems: poems?.length || 0,
      totalSections: new Set(poems?.map((p) => p.section_name)).size || 0,
      totalLemmas: Object.keys(lemmas || {}).length,
    };

    return {
      summary: summary.trim(), // Краткое резюме анализа
      context: context, // Общий контекст
    };
  }, [sortedData, poems, lemmas, posFilter]);

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">
        Расширенная статистика частотности лемм
      </h2>

      {/* --- Flex контейнер для фильтров, таблицы и AIInsightButton --- */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* --- Основной контент (фильтры и таблица) --- */}
        <div className="flex-grow">
          {" "}
          {/* Занимает доступное место */}
          {/* Фильтры - 1 ряд на md и выше, 4 колонки */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Часть речи
              </label>
              <select
                value={posFilter}
                onChange={handlePosFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Все</option>
                {uniquePosList.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>
            <div>
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Исключить слова (через запятую или пробел)
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={stopWordsInput}
                  onChange={handleStopWordsChange}
                  placeholder="например, любовь, мир, свет"
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  type="button"
                  onClick={addStopWords}
                  className="px-3 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 text-sm"
                >
                  +
                </button>
              </div>
              {/* Отображение добавленных стоп-слов */}
              <div className="flex flex-wrap gap-2 mt-1">
                {customStopWords.map((word, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs"
                  >
                    {word}
                    <button
                      type="button"
                      onClick={() => removeStopWord(word)}
                      className="ml-1 text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          {/* Таблица результатов */}
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
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {/* --- НОВОЕ: Добавим кликабельность и индикатор сортировки для Леммы --- */}
                    <button
                      type="button"
                      onClick={() => requestSort("lemma")}
                      className="flex items-center space-x-1 focus:outline-none"
                    >
                      <span>Лемма</span>
                      {sortConfig.key === "lemma" && (
                        <span>
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {/* --- НОВОЕ: Добавим кликабельность и индикатор сортировки для Частоты --- */}
                    <button
                      type="button"
                      onClick={() => requestSort("count")}
                      className="flex items-center space-x-1 focus:outline-none"
                    >
                      <span>Частота</span>
                      {sortConfig.key === "count" && (
                        <span>
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {/* --- НОВОЕ: Добавим кликабельность и индикатор сортировки для POS --- */}
                    <button
                      type="button"
                      onClick={() => requestSort("pos")}
                      className="flex items-center space-x-1 focus:outline-none"
                    >
                      <span>Часть речи</span>
                      {sortConfig.key === "pos" && (
                        <span>
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.map((item, index) => (
                  <tr
                    key={item.lemma}
                    className={
                      (currentPage - 1) * itemsPerPage + (index % 2) === 0
                        ? "bg-white"
                        : "bg-gray-50"
                    }
                  >
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {item.lemma}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {item.count}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {item.pos}
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

        {/* --- Блок для AIInsightButton --- */}
        <div className="md:w-2/5">
          {" "}
          {/* Ширина 2/5 на md и выше */}
          <AIInsightButton insightRequestData={insightRequestData} />
        </div>
      </div>
    </div>
  );
};

export default AdvancedFrequencyStats;
