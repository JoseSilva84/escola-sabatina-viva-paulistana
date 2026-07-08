import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AppErrorBoundary } from "./components/AppErrorBoundary.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./styles.css";

try {
  const temaSalvo = window.localStorage.getItem("nota10.tema");
  document.documentElement.classList.toggle("dark", temaSalvo === "dark");
} catch {
  // Sem armazenamento local, o sistema inicia no tema claro.
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AppErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
