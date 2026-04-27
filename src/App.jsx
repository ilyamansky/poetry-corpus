// src/App.jsx
import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom"; // Добавлен Link
import { X } from "lucide-react";
import PoemList from "./components/PoemList";
import FilterPanel from "./components/FilterPanel";
import PoemPage from "./components/PoemPage";
import StatisticsPage from "./components/StatisticsPage"; // Импорт нового компонента

/* ----------  контекст для передачи данных  ---------- */
const AppContext = createContext();

function AppProvider({ children, value }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// --- ЭКСПОРТИРУЕМ хук ---
export function useAppContext() {
  return useContext(AppContext);
}

/* ----------  нормализация лемм  ---------- */
const normalizeLemmas = (raw) => {
  const norm = {};
  Object.entries(raw).forEach(([w, arr]) => {
    const clean = w.toLowerCase().replace(/[.,;:!?()"\-–—]/g, "");
    norm[clean] = arr;
  });
  return norm;
};

/* ----------  обратный словарь: лемма → Set(словоформ)  ---------- */
const buildReverse = (norm) => {
  const rev = {}; // lemma -> Set(wordforms)
  Object.entries(norm).forEach(([word, arr]) => {
    arr.forEach((e) => {
      const nf = e.normal_form.toLowerCase();
      if (!rev[nf]) rev[nf] = new Set();
      rev[nf].add(word);
    });
  });
  return rev;
};

// --- Компонент для общих данных ---
const DataProvider = ({ children }) => {
  const [poems, setPoems] = useState([]); // Теперь содержит объединенные данные
  const [loading, setLoading] = useState(true);

  const [lemmas, setLemmas] = useState({});
  const [reverseLemmas, setReverseLemmas] = useState({}); // lemma -> Set(wordforms)

  const [meterAnalysis, setMeterAnalysis] = useState([]); // <-- Новое состояние для данных метрики

  /* ----------  загрузка  ---------- */
  useEffect(() => {
    // Загружаем три файла: основной корпус, леммы и метрический анализ
    Promise.all([
      fetch("/poems_minimal.json").then((r) => r.json()),
      fetch("/lemmas.json").then((r) => r.json()),
      fetch("/meter-analysis.json").then((r) => r.json()), // Добавлено
    ])
      .then(([data, lemmasData, meterAnalysisData]) => {
        // Добавлен meterAnalysisData
        // Нормализуем леммы
        const normalizedLemmas = normalizeLemmas(lemmasData);

        // Создаем Map из meter-analysis для быстрого поиска
        const meterMap = new Map(
          meterAnalysisData.map((item) => [item.id, item]),
        );

        // Объединяем данные из poems_minimal и meter-analysis
        const enriched = data.map((p) => {
          const meterInfo = meterMap.get(p.id); // Находим данные по id
          return {
            ...p,
            lineCount: p.lines?.length || 0,
            // Добавляем метрические данные
            meter: meterInfo?.meter || null,
            rhyme_scheme: meterInfo?.rhyme_scheme || null,
            scansion_score: meterInfo?.score || null,
          };
        });

        setPoems(enriched);
        setLemmas(normalizedLemmas);
        setReverseLemmas(buildReverse(normalizedLemmas));
        setMeterAnalysis(meterAnalysisData); // <-- Сохраняем отдельно
        setLoading(false);
      })
      .catch((e) => {
        console.error("Ошибка загрузки данных:", e);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Загрузка…
      </div>
    );
  }

  const appValue = { poems, meterAnalysis, lemmas, reverseLemmas }; // Передаём все необходимые данные

  return <AppProvider value={appValue}>{children}</AppProvider>;
};

// --- Компонент для основного UI (Список, Фильтры, Детали) ---
function AppContent({ poems, lemmas, reverseLemmas }) {
  // Принимаем данные как пропсы
  const [filteredPoems, setFilteredPoems] = useState(poems); // Инициализируем начальным значением
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});

  /* ----------  фильтрация  ---------- */
  const applyFilters = useCallback(
    (filters) => {
      let res = [...poems]; // Используем переданные poems

      /* 1. обычный текстовый поиск по отдельным словам */
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase().trim();
        if (searchTerm) {
          const cleanSearchTerm = searchTerm.replace(
            /[.,;:!?()"\-–—\u2026\u00AB\u00BB]/g,
            "",
          );

          res = res.filter((p) => {
            const fullText = [
              p.title,
              p.display_title,
              p.text,
              p.epigraph,
              p.dedication,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            const tokens = fullText
              .split(/[\s\n]+/)
              .map((t) => t.replace(/[.,;:!?()"\-–—\u2026\u00AB\u00BB]/g, ""))
              .filter((w) => w);

            return tokens.includes(cleanSearchTerm);
          });
        }
      }

      /* 2. поиск по лемме (-ам) - теперь ищем стихи, содержащие ВСЕ леммы */
      if (filters.lemmas && filters.lemmas.length > 0) {
        const targetLemmas = filters.lemmas.map((l) => l.toLowerCase());
        console.log(
          "🔍 Lemmas to search for (all must be present):",
          targetLemmas,
        );

        res = res.filter((p) => {
          const text = [
            p.title,
            p.display_title,
            p.text,
            p.epigraph,
            p.dedication,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const tokens = text
            .split(/[\s\n]+/)
            .map((t) => t.replace(/[.,;:!?()"\-–—\u2026\u00AB\u00BB]/g, ""))
            .filter((w) => w);

          const allLemmasFound = targetLemmas.every((targetLemma) => {
            const wordformsForLemma = reverseLemmas[targetLemma]; // Используем переданные reverseLemmas
            if (!wordformsForLemma) {
              return false;
            }
            return tokens.some((token) => wordformsForLemma.has(token));
          });

          return allLemmasFound;
        });

        console.log("📄 After lemma filter, remaining poems:", res.length);
      }

      /* 3. фильтр по размеру */
      if (filters.meter) {
        res = res.filter((p) => p.meter === filters.meter);
      }

      /* 4. фильтр по типу стихотворения */
      if (filters.poemType === "individual") {
        res = res.filter((p) => !p.in_cycle);
      } else if (filters.poemType === "in_cycle") {
        res = res.filter((p) => p.in_cycle);
      } else if (filters.poemType === "cycles_with_names") {
        res = res.filter((p) => p.in_cycle && p.cycle_has_title);
      } else if (filters.poemType === "cycles_without_names") {
        res = res.filter((p) => p.in_cycle && !p.cycle_has_title);
      }

      /* 5. остальные фильтры */
      if (filters.section)
        res = res.filter((p) => p.section_name === filters.section);
      if (filters.minLines)
        res = res.filter((p) => p.lineCount >= parseInt(filters.minLines));
      if (filters.maxLines)
        res = res.filter((p) => p.lineCount <= parseInt(filters.maxLines));
      if (filters.hasEpigraph) res = res.filter((p) => p.epigraph?.trim());
      if (filters.hasDedication) res = res.filter((p) => p.dedication?.trim());

      setFilteredPoems(res);
      setActiveFilters(filters);
      setShowFilters(false);
    },
    [poems, reverseLemmas], // Зависимости теперь от пропсов
  );

  /* ----------  шапка  ---------- */
  const ResultsHeader = () => {
    if (!activeFilters || !Object.keys(activeFilters).length)
      return (
        <div className="mb-6 text-center text-sm text-gray-600">
          Найдено: {filteredPoems.length}{" "}
          {filteredPoems.length === 1
            ? "стихотворение"
            : filteredPoems.length % 10 >= 2 &&
                filteredPoems.length % 10 <= 4 &&
                (filteredPoems.length % 100 < 10 ||
                  filteredPoems.length % 100 >= 20)
              ? "стихотворения"
              : "стихотворений"}
        </div>
      );

    const labels = [];
    if (activeFilters.search) labels.push(`Поиск: «${activeFilters.search}»`);
    if (activeFilters.lemmas && activeFilters.lemmas.length > 0) {
      labels.push(`Леммы: «${activeFilters.lemmas.join("», «")}»`);
    }
    if (activeFilters.meter) labels.push(`Размер: ${activeFilters.meter}`);
    if (activeFilters.poemType === "individual")
      labels.push("Только отдельные стихи");
    if (activeFilters.poemType === "in_cycle") labels.push("Только в циклах");
    if (activeFilters.poemType === "cycles_with_names")
      labels.push("Циклы с названиями");
    if (activeFilters.poemType === "cycles_without_names")
      labels.push("Циклы без названий");
    if (activeFilters.section) labels.push(`Раздел: ${activeFilters.section}`);
    if (activeFilters.minLines || activeFilters.maxLines) {
      const min = activeFilters.minLines || 0;
      const max = activeFilters.maxLines || "∞";
      labels.push(`Строк: ${min}–${max}`);
    }
    if (activeFilters.hasEpigraph) labels.push("С эпиграфами");
    if (activeFilters.hasDedication) labels.push("С посвящениями");

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-800">
              Активные фильтры:
            </span>
            <div className="flex flex-wrap gap-2">
              {labels.map((l, i) => (
                <span
                  key={i}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              setActiveFilters({});
              setFilteredPoems(poems); // Сброс к исходному списку
            }}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <X className="w-5 h-5" />
            Сбросить все
          </button>
        </div>
        <div className="text-center text-sm text-gray-600">
          Найдено: {filteredPoems.length}{" "}
          {filteredPoems.length === 1
            ? "стихотворение"
            : filteredPoems.length % 10 >= 2 &&
                filteredPoems.length % 10 <= 4 &&
                (filteredPoems.length % 100 < 10 ||
                  filteredPoems.length % 100 >= 20)
              ? "стихотворения"
              : "стихотворений"}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8 relative">
        <div className="grid grid-cols-[128px_1fr_128px] gap-4 items-start mb-8">
          <div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showFilters ? "Скрыть" : "Фильтры"}
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Стихотворения Б.И. Непомнящего
            </h1>
            <p className="text-gray-600">Избранное, 2020</p>
            {/* Добавляем ссылку на страницу статистики */}
            <Link
              to="/statistics"
              className="text-blue-600 hover:underline text-sm block mt-1"
            >
              Перейти к статистике
            </Link>
          </div>
          <div />
        </div>

        <div className="grid grid-cols-[128px_1fr_128px] gap-4">
          <div />
          <ResultsHeader />
          <div />
        </div>

        {showFilters && (
          <div className="absolute top-24 left-4 w-96 z-50 bg-white p-4 rounded-lg shadow-lg border">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-lg">Фильтры</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <FilterPanel
              onApplyFilters={applyFilters}
              poems={poems} // Передаем объединенные данные
              activeFilters={activeFilters}
              lemmas={lemmas}
            />
          </div>
        )}

        <div className="grid grid-cols-[128px_1fr_128px] gap-4">
          <div />
          <div className="mb-16">
            <PoemList
              poems={filteredPoems}
              resetPageOnFilter={Object.keys(activeFilters).length > 0}
              key={JSON.stringify(activeFilters)}
            />
            {filteredPoems.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Стихотворения по заданным фильтрам не найдены.
              </div>
            )}
          </div>
          <div />
        </div>
      </div>
    </>
  );
}

// --- Главный App компонент ---
export default function App() {
  return (
    <Router>
      <DataProvider>
        {" "}
        {/* Помещаем DataProvider на уровень Router */}
        <Routes>
          {/* Рендерим AppContent напрямую внутри DataProvider */}
          <Route
            path="/"
            element={
              <AppContent poems={[]} lemmas={{}} reverseLemmas={{}} /> // Заглушка, будет заменена ниже
            }
          />
          <Route path="/poem/:id" element={<PoemPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
        </Routes>
      </DataProvider>
    </Router>
  );
}

// --- Реальный App компонент, который получает данные от DataProvider ---
function RealApp() {
  const { poems, lemmas, reverseLemmas } = useAppContext();

  if (!poems || !lemmas || !reverseLemmas) {
    // Это условие может сработать, если что-то пойдёт не так, но DataProvider должен отрендерить после загрузки
    return <div>Загрузка данных...</div>;
  }

  return (
    <AppContent poems={poems} lemmas={lemmas} reverseLemmas={reverseLemmas} />
  );
}

// Обновим маршрут, чтобы использовать RealApp
export function AppWithRoutes() {
  return (
    <Router>
      <DataProvider>
        <Routes>
          <Route path="/" element={<RealApp />} />
          <Route path="/poem/:id" element={<PoemPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
        </Routes>
      </DataProvider>
    </Router>
  );
}
