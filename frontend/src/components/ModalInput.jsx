import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Edit2 } from "lucide-react";

export function ModalInput({ 
  value, 
  onChange, 
  label, 
  placeholder, 
  type = "text", 
  className = "",
  options = [],
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValue, setTempValue] = useState(value ?? "");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTempValue(value ?? "");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, value]);

  function handleSave() {
    onChange(tempValue);
    setIsOpen(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && type !== "textarea") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  const displayValue = type === "date" && value 
    ? new Date(value + "T00:00:00").toLocaleDateString("pt-BR") 
    : type === "select"
    ? options.find(o => o.value === value)?.label || value
    : value;

  return (
    <>
      <div 
        className={`relative flex items-center w-full min-h-[42px] rounded-lg border border-borda/80 px-3 bg-white/50 hover:bg-white hover:border-marinho/40 transition-colors cursor-pointer group ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <span className={`flex-1 truncate ${!displayValue ? "text-muted" : "text-texto"} text-sm`}>
          {displayValue || placeholder || "Clique para editar..."}
        </span>
        {!disabled && (
          <Edit2 size={14} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0" />
        )}
      </div>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="m-0 font-outfit text-[18px] font-semibold text-marinho">
                {label || "Editar Campo"}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsOpen(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 border-0 cursor-pointer text-muted transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6">
              {type === "textarea" ? (
                <textarea
                  ref={inputRef}
                  className="w-full min-h-[160px] rounded-xl border border-gray-200 p-4 resize-none focus:outline-none focus:border-marinho focus:ring-4 focus:ring-marinho/10 font-sans text-base transition-all"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  placeholder={placeholder || "Escreva aqui..."}
                  onKeyDown={handleKeyDown}
                />
              ) : type === "select" ? (
                <select
                  ref={inputRef}
                  className="w-full min-h-[56px] rounded-xl border border-gray-200 px-4 focus:outline-none focus:border-marinho focus:ring-4 focus:ring-marinho/10 font-sans text-base bg-white transition-all cursor-pointer"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                >
                  <option value="" disabled>Selecione uma opção</option>
                  {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  ref={inputRef}
                  type={type}
                  className="w-full min-h-[56px] rounded-xl border border-gray-200 px-4 focus:outline-none focus:border-marinho focus:ring-4 focus:ring-marinho/10 font-sans text-base transition-all"
                  value={tempValue}
                  onChange={(e) => setTempValue(type === "number" ? (e.target.value ? Number(e.target.value) : "") : e.target.value)}
                  placeholder={placeholder || "Escreva aqui..."}
                  onKeyDown={handleKeyDown}
                />
              )}
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <button 
                type="button" 
                onClick={() => setIsOpen(false)} 
                className="px-5 py-2.5 rounded-xl border-0 bg-transparent hover:bg-black/5 font-bold cursor-pointer text-muted transition-colors text-sm"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleSave} 
                className="px-6 py-2.5 rounded-xl border-0 bg-marinho text-white font-bold cursor-pointer hover:bg-marinho/90 hover:shadow-lg hover:shadow-marinho/20 transition-all active:scale-95 text-sm"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
