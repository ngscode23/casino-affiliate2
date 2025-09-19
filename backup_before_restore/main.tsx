// src/main.tsx
import "@fontsource-variable/inter/index.css"; // или "@fontsource-variable/inter/variable.css" если такой файл есть
import "./index.css";

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App /></React.StrictMode>
);