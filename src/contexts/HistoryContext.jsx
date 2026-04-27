// src/contexts/HistoryContext.jsx
import React, { createContext, useContext, useReducer } from "react";

const HistoryContext = createContext();

// Имя ключа для localStorage
const HISTORY_STORAGE_KEY = "ai_insight_history";

// Инициализация состояния из localStorage
const initialState = () => {
  const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

// Редюсер для управления историей
const historyReducer = (state, action) => {
  switch (action.type) {
    case "ADD_ITEM": {
      const newItem = {
        id: Date.now(),
        summary: action.payload.summary,
        timestamp: new Date().toISOString(),
      };
      const exists = state.some((item) => item.summary === newItem.summary);
      if (!exists) {
        const newState = [...state, newItem];
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newState));
        return newState;
      }
      return state;
    }
    case "REMOVE_ITEM": {
      const filteredState = state.filter(
        (item) => item.id !== action.payload.id,
      );
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filteredState));
      return filteredState;
    }
    case "CLEAR_HISTORY":
      localStorage.removeItem(HISTORY_STORAGE_KEY);
      return [];
    default:
      return state;
  }
};

export const HistoryProvider = ({ children }) => {
  const [state, dispatch] = useReducer(historyReducer, undefined, initialState);

  const addItem = (summary) => {
    dispatch({ type: "ADD_ITEM", payload: { summary } });
  };

  const removeItem = (id) => {
    dispatch({ type: "REMOVE_ITEM", payload: { id } });
  };

  const clearHistory = () => {
    dispatch({ type: "CLEAR_HISTORY" });
  };

  return (
    <HistoryContext.Provider
      value={{ history: state, addItem, removeItem, clearHistory }}
    >
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = () => {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error("useHistory must be used within a HistoryProvider");
  }
  return context;
};
