// src/components/FilterPanel.jsx
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Search } from "lucide-react";

const FilterPanel = ({
  onApplyFilters,
  poems = [], // Теперь содержит метрические данные
  activeFilters = {},
  lemmas = {},
}) => {
  const lemmaList = useMemo(() => {
    const set = new Set();
    Object.values(lemmas).forEach((arr) =>
      arr.forEach((a) => set.add(a.normal_form)),
    );
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [lemmas]);

  // Изменено: теперь состояние - массив лемм
  const [lemmaInputs, setLemmaInputs] = useState(activeFilters.lemmas || []);

  // Вспомогательная функция для добавления леммы
  const addLemma = (lemma) => {
    if (lemma && !lemmaInputs.includes(lemma)) {
      setLemmaInputs([...lemmaInputs, lemma]);
    }
  };

  // Вспомогательная функция для удаления леммы
  const removeLemma = (indexToRemove) => {
    setLemmaInputs(lemmaInputs.filter((_, index) => index !== indexToRemove));
  };

  // Для автодополнения
  const [currentLemmaInput, setCurrentLemmaInput] = useState("");
  const datalistOptions = useMemo(() => {
    if (!currentLemmaInput) return [];
    const low = currentLemmaInput.toLowerCase();
    return lemmaList
      .filter(
        (l) => l.toLowerCase().startsWith(low) && !lemmaInputs.includes(l),
      ) // Исключаем уже добавленные
      .slice(0, 50);
  }, [currentLemmaInput, lemmaList, lemmaInputs]);

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      search: "",
      poemType: "",
      meter: "",
      section: "",
      minLines: "",
      maxLines: "",
      hasEpigraph: false,
      hasDedication: false,
      // lemma: "", // Убрано
      ...activeFilters,
    },
  });

  // Синхронизируем леммы с формой
  useMemo(() => setValue("lemmas", lemmaInputs), [lemmaInputs, setValue]);

  const sections = useMemo(() => {
    const s = [...new Set(poems.map((p) => p.section_name).filter(Boolean))];
    return s.sort((a, b) => a.localeCompare(b, "ru"));
  }, [poems]);

  // Получаем уникальные размеры из данных
  const meters = useMemo(() => {
    const m = [...new Set(poems.map((p) => p.meter).filter(Boolean))]; // filter(Boolean) убирает null/undefined
    return m.sort(); // Сортируем по алфавиту
  }, [poems]); // Зависит от poems, т.к. они теперь содержат meter

  const onSubmit = (data) => {
    const filtered = Object.fromEntries(
      Object.entries(data).filter(
        ([, v]) => v !== "" && v !== false && v != null,
      ),
    );
    // Добавляем массив лемм, если он не пустой
    if (lemmaInputs.length > 0) filtered.lemmas = lemmaInputs;
    onApplyFilters(filtered);
  };

  const handleReset = () => {
    reset({
      search: "",
      poemType: "",
      meter: "",
      section: "",
      minLines: "",
      maxLines: "",
      hasEpigraph: false,
      hasDedication: false,
      // lemma: "", // Убрано
    });
    setLemmaInputs([]); // Сбросить состояние лемм
    setCurrentLemmaInput(""); // Сбросить текущий ввод
    onApplyFilters({});
  };

  // Обработчик нажатия Enter или выбора из списка для добавления леммы
  const handleAddLemmaKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addLemma(currentLemmaInput.trim());
      setCurrentLemmaInput("");
    }
  };

  const handleSelectLemmaFromList = (selectedLemma) => {
    addLemma(selectedLemma);
    setCurrentLemmaInput("");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {" "}
      {/* Уменьшен space-y */}
      {/* Блок для ввода и отображения лемм */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {" "}
          {/* Уменьшен mb */}
          Поиск по леммам
        </label>
        <div className="flex flex-col space-y-1">
          {" "}
          {/* Уменьшен space-y */}
          <div className="flex">
            <input
              type="text"
              value={currentLemmaInput}
              onChange={(e) => setCurrentLemmaInput(e.target.value)}
              onKeyDown={handleAddLemmaKeyDown}
              list="lemma-list"
              placeholder="Добавить лемму..."
              className="flex-grow px-2 py-1 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" /* Уменьшены px, py, размер шрифта */
            />
            <button
              type="button"
              onClick={() => addLemma(currentLemmaInput.trim())}
              className="px-3 py-1 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 text-sm" /* Уменьшены px, py, размер шрифта */
            >
              +
            </button>
            <datalist id="lemma-list">
              {datalistOptions.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </div>
          {/* Отображение добавленных лемм как тегов */}
          <div className="flex flex-wrap gap-1">
            {" "}
            {/* Уменьшен gap */}
            {lemmaInputs.map((lemma, index) => (
              <span
                key={index}
                className="inline-flex items-center px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs"
              >
                {" "}
                {/* Уменьшены px, py, размер шрифта */}
                {lemma}
                <button
                  type="button"
                  onClick={() => removeLemma(index)}
                  className="ml-0.5 text-blue-600 hover:text-blue-800" /* Уменьшен ml */
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {" "}
          {/* Уменьшен mb */}
          Поиск по тексту, эпиграфам и посвящениям
        </label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />{" "}
          {/* Уменьшены размеры и позиционирование */}
          <input
            type="text"
            {...register("search")}
            placeholder="Введите текст для поиска..."
            className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" /* Уменьшены pl, pr, py, размер шрифта */
          />
        </div>
      </div>
      {/* Фильтр по размеру */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {" "}
          {/* Уменьшен mb */}
          Размер стихотворения
        </label>
        <select
          {...register("meter")}
          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" /* Уменьшены px, py, размер шрифта */
        >
          <option value="">Все размеры</option>
          {meters.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      {/* Фильтр по типу стихотворения */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {" "}
          {/* Уменьшен mb */}
          Тип стихотворения
        </label>
        <select
          {...register("poemType")}
          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" /* Уменьшены px, py, размер шрифта */
        >
          <option value="">Все стихотворения</option>
          <option value="individual">Только отдельные стихи</option>
          <option value="in_cycle">Только в циклах</option>
          <option value="cycles_with_names">Циклы с названиями</option>
          <option value="cycles_without_names">Циклы без названий</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {" "}
          {/* Уменьшен mb */}
          Раздел книги
        </label>
        <select
          {...register("section")}
          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" /* Уменьшены px, py, размер шрифта */
        >
          <option value="">Все разделы</option>
          {sections.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {" "}
        {/* Уменьшен gap */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {" "}
            {/* Уменьшен mb */}
            Строк от
          </label>
          <input
            type="number"
            {...register("minLines")}
            placeholder="0"
            min="0"
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" /* Уменьшены px, py, размер шрифта */
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {" "}
            {/* Уменьшен mb */}
            Строк до
          </label>
          <input
            type="number"
            {...register("maxLines")}
            placeholder="∞"
            min="0"
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" /* Уменьшены px, py, размер шрифта */
          />
        </div>
      </div>
      {/* Изменено: флажки в один ряд */}
      <div className="flex gap-2">
        {" "}
        {/* Уменьшен gap */}
        <label className="flex items-center space-x-1.5">
          {" "}
          {/* Уменьшен space-x */}
          <input
            type="checkbox"
            {...register("hasEpigraph")}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4" /* Уменьшены размеры */
          />
          <span className="text-xs text-gray-700">С эпиграфами</span>{" "}
          {/* Уменьшен размер шрифта */}
        </label>
        <label className="flex items-center space-x-1.5">
          {" "}
          {/* Уменьшен space-x */}
          <input
            type="checkbox"
            {...register("hasDedication")}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4" /* Уменьшены размеры */
          />
          <span className="text-xs text-gray-700">С посвящениями</span>{" "}
          {/* Уменьшен размер шрифта */}
        </label>
      </div>
      <div className="flex gap-2 pt-1">
        {" "}
        {/* Уменьшены gap и pt */}
        <button
          type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 px-3 rounded-lg transition-colors text-sm" /* Уменьшены py, px, размер шрифта */
        >
          Применить
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-1.5 px-3 rounded-lg transition-colors text-sm" /* Уменьшены py, px, размер шрифта */
        >
          Сбросить
        </button>
      </div>
    </form>
  );
};

export default FilterPanel;
