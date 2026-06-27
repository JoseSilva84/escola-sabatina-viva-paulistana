import React, { createContext, useContext, useMemo, useState } from "react";
import { login as loginRequest } from "../api/services";

const AuthContext = createContext(null);

function storageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // O app continua funcionando mesmo se o navegador bloquear armazenamento.
  }
}

function storageRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Sem ação: remover sessão é uma conveniência, não requisito para renderizar.
  }
}

function carregarUsuarioSalvo() {
  const raw = storageGet("nota10.usuario");
  if (!raw) return null;

  try {
    const usuario = JSON.parse(raw);
    if (!usuario || typeof usuario !== "object" || !usuario.papel) return null;
    return usuario;
  } catch {
    storageRemove("nota10.token");
    storageRemove("nota10.usuario");
    return null;
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(carregarUsuarioSalvo);

  async function entrar(email, senha) {
    const data = await loginRequest(email, senha);
    storageSet("nota10.token", data.token);
    storageSet("nota10.usuario", JSON.stringify(data.usuario));
    setUsuario(data.usuario);
  }

  function sair() {
    storageRemove("nota10.token");
    storageRemove("nota10.usuario");
    setUsuario(null);
  }

  const value = useMemo(() => ({ usuario, entrar, sair }), [usuario]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return { usuario: null, entrar: async () => {}, sair: () => {} };
  }
  return context;
}
