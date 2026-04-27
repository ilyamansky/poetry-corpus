// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { AppWithRoutes } from "./App.jsx"; // Изменили импорт
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppWithRoutes />
  </React.StrictMode>,
);
