import React from "react";
import { Check, X } from "lucide-react";

export function StatusPill({ ok, children }) {
  return (
    <span className={`status-pill ${ok ? "ok" : "bad"}`}>
      {ok ? <Check size={14} /> : <X size={14} />}
      {children}
    </span>
  );
}
