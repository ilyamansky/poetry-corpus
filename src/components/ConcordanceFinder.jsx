// src/components/ConcordanceFinder.jsx
import { useMemo, useState } from "react";
import { useAppContext } from "../App";
import AIInsightButton from "./AIInsightButton"; // Импортируем AIInsightButton
import { useHistory } from "../contexts/HistoryContext"; // Импортируем useHistory

const ConcordanceFinder = () => {
  const { poems, lemmas } = useAppContext();

  // Состояния
  const [searchTerm, setSearchTerm] = useState(""); // Лемма или словоформа для поиска
  const [contextSize, setContextSize] = useState(5); // Количество слов слева/справа от найденного
  const [subcorpusFilter, setSubcorpusFilter] = useState(""); // Фильтр по подкорпусу (разделу)
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Список уникальных разделов для фильтра
  const sectionNames = useMemo(() => {
    if (!poems) return [];
    const set = new Set();
    poems.forEach((p) => {
      if (p.section_name) set.add(p.section_name);
    });
    return Array.from(set).sort();
  }, [poems]);

  // Поиск конкордансов
  const concordances = useMemo(() => {
    if (!poems || !lemmas || !searchTerm.trim()) return [];

    const termLower = searchTerm.trim().toLowerCase();
    const results = [];

    poems.forEach((poem) => {
      // Применяем фильтр по подкорпусу
      if (subcorpusFilter && poem.section_name !== subcorpusFilter) return;

      // Объединяем все текстовые поля
      const fullText = [
        poem.title || "",
        poem.display_title || "",
        poem.text || "",
        poem.epigraph || "",
        poem.dedication || "",
      ]
        .filter(Boolean)
        .join(" \n ");

      // Разбиваем на токены, сохраняя индексы
      const tokens = fullText
        .toLowerCase()
        .split(/(\s+)/) // Разбиваем по пробелам, но сохраняем их как токены
        .filter((t) => t !== ""); // Убираем пустые строки

      // Находим индексы, где встречается искомый термин
      tokens.forEach((token, index) => {
        // Очищаем токен от знаков препинания для проверки
        const cleanToken = token.replace(
          /[.,;:!?()"\-–—\u2026\u00AB\u00BB]/g,
          "",
        );
        // Проверяем, совпадает ли токен с искомым
        if (cleanToken === termLower) {
          // Определяем границы контекста
          const startIdx = Math.max(0, index - contextSize);
          const endIdx = Math.min(tokens.length - 1, index + contextSize);

          // Формируем строки левого и правого контекста
          const leftContext = tokens.slice(startIdx, index).join("").trim();
          const matchWord = tokens[index]; // Оригинальный токен (с пунктуацией)
          const rightContext = tokens
            .slice(index + 1, endIdx + 1)
            .join("")
            .trim();

          results.push({
            poemId: poem.id,
            poemTitle: poem.title || poem.display_title || "Без названия",
            poemSection: poem.section_name || "Неизвестный раздел",
            left: leftContext,
            match: matchWord,
            right: rightContext,
            // Добавим также индекс вхождения для возможной сортировки по позиции
            position: index,
          });
        } else {
          // Проверяем также, есть ли искомая лемма через лемматизацию
          // Проверим, есть ли токен в lemmas.json и совпадает ли его normal_form
          const analyses = lemmas[cleanToken];
          if (
            analyses &&
            analyses.some((a) => a.normal_form.toLowerCase() === termLower)
          ) {
            const startIdx = Math.max(0, index - contextSize);
            const endIdx = Math.min(tokens.length - 1, index + contextSize);

            const leftContext = tokens.slice(startIdx, index).join("").trim();
            const matchWord = tokens[index]; // Оригинальный токен (с пунктуацией)
            const rightContext = tokens
              .slice(index + 1, endIdx + 1)
              .join("")
              .trim();

            results.push({
              poemId: poem.id,
              poemTitle: poem.title || poem.display_title || "Без названия",
              poemSection: poem.section_name || "Неизвестный раздел",
              left: leftContext,
              match: matchWord,
              right: rightContext,
              position: index,
            });
          }
        }
      });
    });

    return results;
  }, [poems, lemmas, searchTerm, contextSize, subcorpusFilter]);

  // --- Подготовка данных для AIInsightButton (статистика)---
  const insightRequestData = useMemo(() => {
    if (!searchTerm.trim() || concordances.length === 0) {
      return null;
    }

    // Сформируем краткое резюме поиска
    let summary = "";
    summary += `Поиск конкордансов для термина: "${searchTerm}".\n`;
    summary += `Найдено ${concordances.length} вхождений.\n`;
    if (subcorpusFilter) {
      summary += `Фильтр по разделу: "${subcorpusFilter}".\n`;
    }
    summary += `Контекст: ±${contextSize} слов.\n`;

    // Добавим информацию о распределении по разделам
    const sectionCounts = {};
    concordances.forEach((c) => {
      sectionCounts[c.poemSection] = (sectionCounts[c.poemSection] || 0) + 1;
    });
    summary += "\nРаспределение по разделам:\n";
    Object.entries(sectionCounts).forEach(([section, count]) => {
      summary += `- ${section}: ${count} вхождений\n`;
    });

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
    searchTerm,
    concordances,
    subcorpusFilter,
    contextSize,
    poems,
    sectionNames,
    lemmas,
  ]);

  // Пагинация
  const paginatedConcordances = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return concordances.slice(startIndex, startIndex + itemsPerPage);
  }, [concordances, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(concordances.length / itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Обработчики
  const handleSearchTermChange = (e) => setSearchTerm(e.target.value);
  const handleContextSizeChange = (e) => setContextSize(Number(e.target.value));
  const handleSubcorpusChange = (e) => {
    setSubcorpusFilter(e.target.value);
    setCurrentPage(1); // Сброс на первую страницу
  };
  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Сброс на первую страницу
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Конкорданс</h2>

      {/* --- Flex контейнер для основного контента и AIInsightButton --- */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* --- Основной контент (фильтры, результаты, пагинация) --- */}
        <div className="flex-grow">
          {/* Фильтры - 1 ряд на md и выше, 4 колонки */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              {" "}
              {/* Поле поиска занимает 1 колонку */}
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Поиск (лемма или слово)
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchTermChange}
                placeholder="Введите лемму или слово..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              {" "}
              {/* Узкое поле для числа */}
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Контекст (± слов)
              </label>
              <input
                type="number"
                value={contextSize}
                onChange={handleContextSizeChange}
                min="1"
                max="20"
                className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" // px-2 для узкого поля
              />
            </div>
            <div>
              {" "}
              {/* Фильтр по разделу занимает 1 колонку */}
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Фильтр по разделу
              </label>
              <select
                value={subcorpusFilter}
                onChange={handleSubcorpusChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Все разделы</option>
                {sectionNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              {" "}
              {/* Узкое поле для числа */}
              <label className="block text-sm font-medium text-gray-700 mb-1">
                На странице
              </label>
              <select
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" // px-2 для узкого поля
              >
                {[10, 25, 50, 100].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Результаты */}
          {searchTerm.trim() && (
            <>
              <div className="mb-2 text-sm text-gray-600">
                Найдено {concordances.length} вхождений "{searchTerm}"
                {subcorpusFilter && ` в разделе "${subcorpusFilter}"`}.
              </div>

              {paginatedConcordances.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                  {paginatedConcordances.map((conc, index) => (
                    <div
                      key={`${conc.poemId}-${conc.position}`}
                      className={`p-3 border-b border-gray-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                    >
                      <div className="text-xs text-gray-500 mb-1">
                        {conc.poemTitle} ({conc.poemSection})
                      </div>
                      <div className="flex items-start text-sm">
                        <span className="text-gray-600">{conc.left}</span>
                        <span className="mx-1 font-semibold text-blue-600">
                          "{conc.match}"
                        </span>
                        <span className="text-gray-600">{conc.right}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-sm mb-4">
                  Совпадений не найдено.
                </div>
              )}

              {/* Пагинация */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Показано {paginatedConcordances.length} из{" "}
                    {concordances.length} вхождений
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
            </>
          )}

          {/* Инструкция */}
          {!searchTerm.trim() && (
            <p className="text-gray-500 text-sm">
              Введите лемму или словоформу для поиска конкордансов.
            </p>
          )}
        </div>

        {/* --- Блок для AIInsightButton --- */}
        <div className="md:w-2/5">
          <AIInsightButton insightRequestData={insightRequestData} />
          {/* Кнопка для добавления вхождений */}
          {concordances.length > 0 && (
            <AddConcordancesToHistoryButton
              concordances={concordances}
              searchTerm={searchTerm}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// --- НОВЫЙ КОМПОНЕНТ: Кнопка для добавления вхождений ---
const AddConcordancesToHistoryButton = ({ concordances, searchTerm }) => {
  const { addItem } = useHistory(); // Получаем addItem из контекста внутри нового компонента

  const handleClick = () => {
    // Формируем краткий список вхождений
    const maxEntriesForHistory = 10; // Максимальное количество вхождений для добавления
    const entriesText = concordances
      .slice(0, maxEntriesForHistory)
      .map((c) => `[${c.poemSection}] ${c.left} <${c.match}> ${c.right}`)
      .join("\n");
    const remainingCount = concordances.length - maxEntriesForHistory;
    const suffix =
      remainingCount > 0 ? `\n... и ещё ${remainingCount} вхождений.` : "";

    // Добавляем в историю
    if (addItem) {
      addItem(`Вхождения для "${searchTerm}":\n${entriesText}${suffix}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="mt-2 w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
    >
      Добавить в историю (вхождения)
    </button>
  );
};

export default ConcordanceFinder;
