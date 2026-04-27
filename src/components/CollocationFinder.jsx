// src/components/CollocationFinder.jsx
import { useMemo, useState } from "react";
import { useAppContext } from "../App";

const CollocationFinder = () => {
  const { poems, lemmas } = useAppContext();

  // Состояния
  const [targetTerm, setTargetTerm] = useState(""); // Целевое слово/лемма
  const [windowSize, setWindowSize] = useState(5); // Размер окна (N)
  const [minFreq, setMinFreq] = useState(1); // Минимальная частота коллоката
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Список стандартных стоп-слов (аналогично AdvancedFrequencyStats)
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

  // Поиск коллокаций
  const collocations = useMemo(() => {
    if (!poems || !lemmas || !targetTerm.trim() || windowSize < 1) return [];

    const targetLower = targetTerm.trim().toLowerCase();
    const collocationMap = {}; // { word: { count: number, positions: [] } }
    const allTokensWithContext = []; // Для отладки или более сложных расчётов

    poems.forEach((poem) => {
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
      // Используем более сложное регулярное выражение для лучшего разделения
      const tokens = fullText
        .toLowerCase()
        .split(/(\s+|[.,;:!?()"\-–—\u2026\u00AB\u00BB])/) // Разбиваем по пробелам и пунктуации, сохраняем разделители
        .filter((t) => t.trim() !== ""); // Убираем пустые строки

      // Находим индексы, где встречается целевое слово
      tokens.forEach((token, index) => {
        // Очищаем токен от знаков препинания для проверки
        const cleanToken = token.replace(
          /[.,;:!?()"\-–—\u2026\u00AB\u00BB]/g,
          "",
        );

        let isMatch = false;
        // Проверяем, совпадает ли токен с искомым
        if (cleanToken === targetLower) {
          isMatch = true;
        } else {
          // Проверяем также, есть ли токен в lemmas.json и совпадает ли его normal_form
          const analyses = lemmas[cleanToken];
          if (
            analyses &&
            analyses.some((a) => a.normal_form.toLowerCase() === targetLower)
          ) {
            isMatch = true;
          }
        }

        if (isMatch) {
          // Определяем границы окна
          const startIdx = Math.max(0, index - windowSize);
          const endIdx = Math.min(tokens.length - 1, index + windowSize);

          // Проходим по токенам в окне
          for (let i = startIdx; i <= endIdx; i++) {
            if (i === index) continue; // Пропускаем само целевое слово

            const collocToken = tokens[i];
            // Опять очищаем от пунктуации
            const cleanCollocToken = collocToken.replace(
              /[.,;:!?()"\-–—\u2026\u00AB\u00BB]/g,
              "",
            );
            if (!cleanCollocToken) continue; // Пропускаем пустые

            // Проверяем, является ли коллокат стоп-словом
            if (defaultStopWords.has(cleanCollocToken)) continue;

            // Обновляем статистику для коллоката
            if (!collocationMap[cleanCollocToken]) {
              collocationMap[cleanCollocToken] = { count: 0, positions: [] };
            }
            collocationMap[cleanCollocToken].count++;
            // Записываем относительную позицию (-windowSize .. +windowSize)
            const relativePosition = i - index;
            collocationMap[cleanCollocToken].positions.push(relativePosition);
          }
        }
      });
    });

    // Преобразуем Map в массив и сортируем по частоте (убыванию)
    let results = Object.entries(collocationMap)
      .map(([word, { count, positions }]) => {
        // Вычисляем среднюю позицию
        const avgPosition =
          positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
        return { word, count, avgPosition, positions };
      })
      .filter((item) => item.count >= minFreq) // Применяем фильтр по минимальной частоте
      .sort((a, b) => b.count - a.count); // Сортировка по убыванию частоты

    return results;
  }, [poems, lemmas, targetTerm, windowSize, minFreq, defaultStopWords]);

  // Пагинация
  const paginatedCols = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return collocations.slice(startIndex, startIndex + itemsPerPage);
  }, [collocations, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(collocations.length / itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Обработчики
  const handleTargetTermChange = (e) => setTargetTerm(e.target.value);
  const handleWindowSizeChange = (e) => setWindowSize(Number(e.target.value));
  const handleMinFreqChange = (e) => setMinFreq(Number(e.target.value));
  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Сброс на первую страницу
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Коллокации</h2>

      {/* Фильтры */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Целевое слово/лемма
          </label>
          <input
            type="text"
            value={targetTerm}
            onChange={handleTargetTermChange}
            placeholder="Введите лемму или слово..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Размер окна (± слов)
          </label>
          <input
            type="number"
            value={windowSize}
            onChange={handleWindowSizeChange}
            min="1"
            max="20"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Мин. частота коллоката
          </label>
          <input
            type="number"
            value={minFreq}
            onChange={handleMinFreqChange}
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            На странице
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

      {/* Результаты */}
      {targetTerm.trim() && (
        <>
          <div className="mb-2 text-sm text-gray-600">
            Найдено {collocations.length} коллокатов для "{targetTerm}" (окно ±
            {windowSize}, мин. частота: {minFreq}).
          </div>

          {paginatedCols.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
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
                      Коллокат
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Частота
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Ср. позиция
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedCols.map((col, index) => (
                    <tr
                      key={col.word}
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
                        {col.word}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {col.count}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {col.avgPosition.toFixed(2)} (от{" "}
                        {Math.min(...col.positions)}, до{" "}
                        {Math.max(...col.positions)})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-gray-500 text-sm">
              Коллокатов не найдено или не указано целевое слово.
            </div>
          )}

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Показано {paginatedCols.length} из {collocations.length}{" "}
                коллокатов
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
      {!targetTerm.trim() && (
        <p className="text-gray-500 text-sm">
          Введите слово или лемму, чтобы найти её коллокаты.
        </p>
      )}
    </div>
  );
};

export default CollocationFinder;
