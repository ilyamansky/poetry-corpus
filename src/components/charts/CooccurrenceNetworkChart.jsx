// src/components/charts/CooccurrenceNetworkChart.jsx
import { useMemo, useState, useRef, useEffect } from "react";
import { Network } from "vis-network";
import { useAppContext } from "../../App";
import AIInsightButton from "../AIInsightButton"; // Импортируем AIInsightButton

const CooccurrenceNetworkChart = () => {
  const { poems, lemmas } = useAppContext();
  const networkRef = useRef(null);
  const networkInstanceRef = useRef(null);

  const [minCooccurrence, setMinCooccurrence] = useState(2);
  const [maxNodes, setMaxNodes] = useState(50);
  const [lemmaInput, setLemmaInput] = useState("");
  const [selectedLemmaForLinks, setSelectedLemmaForLinks] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  // --- НОВОЕ: Определим набор служебных частей речи ---
  const servicePosTags = useMemo(
    () => new Set(["PART", "PRCL", "CONJ", "PREP", "INTJ", "PNCT"]),
    [],
  ); // Пример, добавьте свои теги

  const lemmaList = useMemo(() => {
    const set = new Set();
    if (lemmas) {
      Object.values(lemmas).forEach((arr) =>
        arr.forEach((a) => set.add(a.normal_form)),
      );
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [lemmas]);

  useEffect(() => {
    if (!lemmaInput) {
      setSuggestions([]);
      return;
    }
    const lowerInput = lemmaInput.toLowerCase();
    const filtered = lemmaList.filter((lemma) =>
      lemma.toLowerCase().includes(lowerInput),
    );
    setSuggestions(filtered.slice(0, 10));
  }, [lemmaInput, lemmaList]);

  const graphData = useMemo(() => {
    if (!poems || !lemmas) return { nodes: [], edges: [] };

    const cooccurrenceMap = new Map();

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

      // --- ИЗМЕНЕНО: Фильтрация лемм по части речи ---
      const uniqueLemmasInPoem = new Set();
      tokens.forEach((token) => {
        const analyses = lemmas[token];
        if (analyses && analyses.length > 0) {
          const primaryAnalysis = analyses[0]; // Берём первую аналитическую форму
          const posTag = primaryAnalysis.pos; // Предполагаем, что у объекта анализа есть поле 'pos'
          // Проверяем, является ли часть речи служебной
          if (posTag && !servicePosTags.has(posTag)) {
            uniqueLemmasInPoem.add(primaryAnalysis.normal_form);
          } else if (!posTag) {
            // Если тега части речи нет, можно добавить лемму или пропустить
            // Решение зависит от качества ваших данных lemmas.json
            // Пока добавим, если тега нет, можно потом уточнить
            uniqueLemmasInPoem.add(primaryAnalysis.normal_form);
          }
        }
      });

      const lemmasArray = Array.from(uniqueLemmasInPoem).sort();

      for (let i = 0; i < lemmasArray.length; i++) {
        for (let j = i + 1; j < lemmasArray.length; j++) {
          const pair = [lemmasArray[i], lemmasArray[j]];
          const pairStr = pair.join("-");
          cooccurrenceMap.set(pairStr, (cooccurrenceMap.get(pairStr) || 0) + 1);
        }
      }
    });

    let edges = Array.from(cooccurrenceMap.entries()).map(
      ([pairStr, count]) => {
        const [from, to] = pairStr.split("-");
        return {
          from,
          to,
          value: count,
          label: count.toString(),
          title: `Встречаются вместе: ${count} раз`,
        };
      },
    );

    edges = edges.filter((edge) => edge.value >= minCooccurrence);

    if (selectedLemmaForLinks) {
      edges = edges.filter(
        (edge) =>
          edge.from === selectedLemmaForLinks ||
          edge.to === selectedLemmaForLinks,
      );
    }

    const nodesMap = new Map();
    edges.forEach((edge) => {
      if (!nodesMap.has(edge.from)) nodesMap.set(edge.from, { id: edge.from });
      if (!nodesMap.has(edge.to)) nodesMap.set(edge.to, { id: edge.to });
    });

    let nodes = Array.from(nodesMap.values());

    if (nodes.length > maxNodes) {
      const nodeDegrees = new Map();
      edges.forEach((edge) => {
        nodeDegrees.set(
          edge.from,
          (nodeDegrees.get(edge.from) || 0) + edge.value,
        );
        nodeDegrees.set(edge.to, (nodeDegrees.get(edge.to) || 0) + edge.value);
      });

      nodes.sort(
        (a, b) => (nodeDegrees.get(b.id) || 0) - (nodeDegrees.get(a.id) || 0),
      );
      const topNodeIds = new Set(nodes.slice(0, maxNodes).map((n) => n.id));
      nodes = nodes.filter((node) => topNodeIds.has(node.id));
      edges = edges.filter(
        (edge) => topNodeIds.has(edge.from) && topNodeIds.has(edge.to),
      );
    }

    nodes = nodes.map((node) => {
      const degree = edges.reduce((sum, edge) => {
        if (edge.from === node.id || edge.to === node.id)
          return sum + edge.value;
        return sum;
      }, 0);
      return {
        ...node,
        size: Math.min(30, Math.max(10, degree)),
        color: degree > 10 ? "#d62728" : degree > 5 ? "#ff7f0e" : "#1f77b4",
        title: `Лемма: ${node.id}<br/>Связей: ${degree}`,
        label: node.id,
      };
    });

    edges = edges.map((edge) => ({
      ...edge,
      width: Math.min(5, Math.max(1, edge.value / 2)),
    }));

    return { nodes, edges };
  }, [
    poems,
    lemmas,
    minCooccurrence,
    maxNodes,
    selectedLemmaForLinks,
    servicePosTags,
  ]); // Добавлен servicePosTags в зависимости

  // --- Подготовка данных для AIInsightButton ---
  const insightRequestData = useMemo(() => {
    if (graphData.edges.length === 0) {
      return null;
    }

    // Сформируем краткое резюме анализа сети
    let summary = "";
    summary += `Анализ сети совместных появлений:\n`;
    summary += `- Найдено ${graphData.nodes.length} уникальных лемм (исключая служебные слова).\n`;
    summary += `- Найдено ${graphData.edges.length} связей (пар лемм), встречающихся не менее ${minCooccurrence} раз.\n`;

    // --- ИЗМЕНЕНО: Убрано ограничение slice(0, 5) ---
    const sortedEdges = [...graphData.edges].sort((a, b) => b.value - a.value);
    if (sortedEdges.length > 0) {
      // Можно добавить ТОП-N, если боимся перегрузки, например, sortedEdges.slice(0, 10)
      // Но по условиям задачи, убираем ограничение
      summary += `- Все связи отсортированы по частоте (от самой частой):\n`;
      sortedEdges.forEach((edge) => {
        summary += `  - "${edge.from}" <-> "${edge.to}": ${edge.value} раз\n`;
      });
    } else {
      summary += `- Нет связей для отображения.\n`;
    }

    // Добавим фильтры в резюме
    if (selectedLemmaForLinks) {
      summary += `- Фильтр по лемме: "${selectedLemmaForLinks}".\n`;
    }
    summary += `- Максимальное число узлов: ${maxNodes}.\n`;

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
  }, [
    graphData,
    poems,
    lemmas,
    minCooccurrence,
    maxNodes,
    selectedLemmaForLinks,
  ]);

  // Вынесем networkOptions из рендера, чтобы они не пересоздавались
  const networkOptions = useMemo(
    () => ({
      nodes: {
        shape: "dot",
        font: {
          size: 12,
          color: "#333",
          face: "arial",
        },
        scaling: { min: 10, max: 30 },
      },
      edges: {
        width: 2,
        scaling: { min: 1, max: 5, label: true },
        arrows: { to: { enabled: false } },
        smooth: { enabled: true },
      },
      physics: {
        stabilization: { iterations: 100 },
        barnesHut: {
          gravitationalConstant: -2000,
          springLength: 150,
          springConstant: 0.05,
        },
      },
      interaction: {
        hover: true,
      },
      layout: { improvedLayout: true },
    }),
    [],
  ); // Пустой массив зависимостей, т.к. опции не зависят от состояней

  // useEffect для инициализации и обновления данных
  useEffect(() => {
    if (
      networkRef.current &&
      graphData.nodes.length > 0 &&
      graphData.edges.length > 0
    ) {
      if (networkInstanceRef.current) {
        // Обновляем ТОЛЬКО данные
        networkInstanceRef.current.setData(graphData);
        // fit() можно вызвать, если нужно, но не обязательно каждый раз
        // networkInstanceRef.current.fit();
      } else {
        // Создаём новый экземпляр, передавая ему опции
        networkInstanceRef.current = new Network(
          networkRef.current,
          graphData,
          networkOptions,
        );
      }
    } else if (networkInstanceRef.current) {
      networkInstanceRef.current.destroy();
      networkInstanceRef.current = null;
    }

    return () => {
      if (networkInstanceRef.current) {
        networkInstanceRef.current.destroy();
        networkInstanceRef.current = null;
      }
    };
  }, [graphData, networkOptions]); // Добавим networkOptions в зависимости

  const handleMinCooccurrenceChange = (e) =>
    setMinCooccurrence(parseInt(e.target.value) || 1);
  const handleMaxNodesChange = (e) =>
    setMaxNodes(parseInt(e.target.value) || 10);

  const handleLemmaInputChange = (e) => {
    setLemmaInput(e.target.value);
  };

  const handleSuggestionClick = (suggestion) => {
    console.log("Выбрана подсказка:", suggestion);
    setLemmaInput(suggestion);
    setSelectedLemmaForLinks(suggestion);
    setSuggestions([]);
  };

  const handleInputBlur = () => {
    setSuggestions([]);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter" && suggestions.length > 0) {
      handleSuggestionClick(suggestions[0]);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">
        Сеть совместного появления лемм
      </h2>

      {/* --- Flex контейнер для фильтров/графика и AIInsightButton --- */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* --- Основной контент (фильтры и график) --- */}
        <div className="flex-grow">
          {" "}
          {/* Занимает доступное место */}
          {/* Фильтры - 1 ряд на md и выше, 3 колонки */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Мин. совместное появление
              </label>
              <input
                type="number"
                value={minCooccurrence}
                onChange={handleMinCooccurrenceChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Макс. узлов
              </label>
              <input
                type="number"
                value={maxNodes}
                onChange={handleMaxNodesChange}
                min="1"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Фильтр по лемме (показать связи)
              </label>
              <input
                type="text"
                value={lemmaInput}
                onChange={handleLemmaInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                placeholder="Начните вводить лемму..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {suggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {suggestions.map((suggestion, index) => (
                    <li
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-sm"
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {/* --- Сам график (в той же колонке, что и фильтры) --- */}
          <div
            ref={networkRef}
            style={{
              height: "600px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
            className="mb-2" // Добавлен отступ снизу перед описанием
          />
          {graphData.nodes.length === 0 && (
            <div className="flex items-center justify-center h-64 text-gray-500 mb-2">
              {" "}
              {/* Высота для пустого состояния, отступ */}
              Нет данных для отображения. Попробуйте изменить фильтры.
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

      {/* --- Описание --- */}
      <p className="text-sm text-gray-600 mt-2">
        Граф показывает, какие леммы часто встречаются в одних и тех же
        стихотворениях. Цвет и размер узла зависят от "важности" леммы. Толщина
        линии — от частоты совместного появления. Служебные слова исключены из
        анализа.
      </p>
    </div>
  );
};

export default CooccurrenceNetworkChart;
