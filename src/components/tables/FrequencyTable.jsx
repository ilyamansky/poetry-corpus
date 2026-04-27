// src/components/tables/FrequencyTable.jsx
import { useMemo, useState } from "react";
import { useAppContext } from "../../App"; // Путь к App.jsx

const FrequencyTable = () => {
  const { poems, lemmas } = useAppContext(); // Получаем данные из контекста

  // Состояния для фильтров и сортировки
  const [posFilter, setPosFilter] = useState(""); // 'noun', 'verb', 'adj', '', etc.
  const [minFreq, setMinFreq] = useState(1); // Минимальная частота
  const [sortBy, setSortBy] = useState("freq"); // 'freq' или 'lemma'
  const [sortOrder, setSortOrder] = useState("desc"); // 'asc' или 'desc'

  // Список уникальных частей речи для фильтра (опционально)
  const uniquePos = useMemo(() => {
    const posSet = new Set();
    if (lemmas) {
      Object.values(lemmas).forEach((arr) => {
        arr.forEach((item) => {
          if (item.pos) {
            posSet.add(item.pos);
          }
        });
      });
    }
    return Array.from(posSet).sort();
  }, [lemmas]);

  // Подсчёт частотности
  const frequencyData = useMemo(() => {
    if (!poems || !lemmas) return [];

    const freqMap = {};

    // Проходим по всем стихотворениям
    poems.forEach((poem) => {
      const text = [
        poem.title,
        poem.display_title,
        poem.text,
        poem.epigraph,
        poem.dedication,
      ]
        .filter(Boolean) // Убираем null/undefined
        .join(" ") // Соединяем в один текст
        .toLowerCase(); // Приводим к нижнему регистру

      // Разбиваем на "токены" (слова без пунктуации)
      const tokens = text
        .split(/[\s\n]+/) // по пробелам и переводам строк
        .map((t) => t.replace(/[.,;:!?()"\-–—\u2026\u00AB\u00BB]/g, "")) // убираем пунктуацию
        .filter((w) => w); // убираем пустые строки

      // Для каждого токена находим его лемму и увеличиваем счётчик
      tokens.forEach((token) => {
        const analyses = lemmas[token]; // Получаем массив анализов для словаформы
        if (analyses && analyses.length > 0) {
          // Берём первую доступную лемму (можно улучшить логику выбора)
          const firstLemma = analyses[0].normal_form;
          freqMap[firstLemma] = (freqMap[firstLemma] || 0) + 1;
        }
        // Если лемма не найдена, можно игнорировать или добавить токен как есть (редко)
        // else {
        //   freqMap[token] = (freqMap[token] || 0) + 1;
        // }
      });
    });

    // Преобразуем Map в массив объектов {lemma, count}
    let freqArray = Object.entries(freqMap).map(([lemma, count]) => ({
      lemma,
      count,
      // Пытаемся получить часть речи для леммы (берём первую попавшуюся из любого вхождения)
      pos:
        lemmas[
          Object.keys(lemmas).find((key) =>
            lemmas[key].some((a) => a.normal_form === lemma),
          )
        ]?.[0]?.pos || "N/A",
    }));

    // Фильтрация
    freqArray = freqArray.filter((item) => item.count >= minFreq);
    if (posFilter) {
      freqArray = freqArray.filter((item) => item.pos === posFilter);
    }

    // Сортировка
    freqArray.sort((a, b) => {
      if (sortBy === "freq") {
        return sortOrder === "desc" ? b.count - a.count : a.count - b.count;
      } else {
        // sortBy === 'lemma'
        return sortOrder === "asc"
          ? a.lemma.localeCompare(b.lemma, "ru")
          : b.lemma.localeCompare(a.lemma, "ru");
      }
    });

    return freqArray;
  }, [poems, lemmas, minFreq, posFilter, sortBy, sortOrder]);

  // Обработчики изменения фильтров и сортировки
  const handlePosFilterChange = (e) => setPosFilter(e.target.value);
  const handleMinFreqChange = (e) => setMinFreq(parseInt(e.target.value) || 1);
  const handleSortChange = (field) => {
    if (sortBy === field) {
      // Переключаем порядок сортировки
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Меняем поле сортировки и сбрасываем порядок на убывание по умолчанию
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Частотный словарь</h2>

      {/* Панель фильтров и сортировки */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
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
            {uniquePos.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Мин. частота
          </label>
          <input
            type="number"
            value={minFreq}
            onChange={handleMinFreqChange}
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div className="flex items-end">
          <div className="flex space-x-2">
            <button
              onClick={() => handleSortChange("freq")}
              className={`px-3 py-1.5 text-xs rounded ${
                sortBy === "freq"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              По частоте{" "}
              {sortBy === "freq" && (sortOrder === "desc" ? "↓" : "↑")}
            </button>
            <button
              onClick={() => handleSortChange("lemma")}
              className={`px-3 py-1.5 text-xs rounded ${
                sortBy === "lemma"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              По алфавиту{" "}
              {sortBy === "lemma" && (sortOrder === "desc" ? "↓" : "↑")}
            </button>
          </div>
        </div>
      </div>

      {/* Таблица с прокруткой */}
      <div className="overflow-x-auto">
        {/* Обертка для вертикальной прокрутки таблицы */}
        <div className="max-h-[400px] overflow-y-auto border border-gray-200 rounded">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              {" "}
              {/* Sticky header */}
              <tr>
                <th
                  scope="col"
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortChange("lemma")}
                >
                  Лемма{" "}
                  {sortBy === "lemma" && (sortOrder === "desc" ? "↓" : "↑")}
                </th>
                <th
                  scope="col"
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortChange("freq")}
                >
                  Частота{" "}
                  {sortBy === "freq" && (sortOrder === "desc" ? "↓" : "↑")}
                </th>
                <th
                  scope="col"
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Часть речи
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {frequencyData.map((item, index) => (
                <tr
                  key={index}
                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
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
      </div>
    </div>
  );
};

export default FrequencyTable;
