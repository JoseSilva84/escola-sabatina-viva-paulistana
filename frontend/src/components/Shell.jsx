import React, { useState } from "react";
import { BarChart3, Bell, BookOpen, ClipboardList, Home, IdCard, LogOut, Settings, Trophy, Users, ChevronDown, ChevronUp, Star, Calendar } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

function FlatCap({ color, className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={{ color }}>
      <path d="M12 3 L1 8 L12 13 L23 8 Z" fill="currentColor" />
      <path d="M5 10.5 V15 C5 17 12 19 12 19 C12 19 19 17 19 15 V10.5 L12 14 Z" fill="currentColor" opacity="0.8" />
      <path d="M22 9 V15" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="22" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

function LogoIcon({ type }) {
  if (type === "RANKING") {
    return (
      <div className="relative w-11 h-11">
        <div className="absolute bottom-2 left-1 right-1 h-3 bg-[#facc15] rounded-[3px] transform -skew-y-[10deg] shadow-sm"></div>
        <div className="absolute bottom-4 left-1 w-[46%] h-3 bg-[#4ade80] rounded-[3px] transform skew-y-[10deg] shadow-sm z-10"></div>
        <div className="absolute bottom-4 right-1 w-[46%] h-3 bg-[#f87171] rounded-[3px] transform -skew-y-[10deg] shadow-sm z-10"></div>
        <div className="absolute -top-1 left-0 right-0 flex justify-center z-20">
          <FlatCap color="#60a5fa" className="w-9 h-9 drop-shadow-sm" />
        </div>
      </div>
    );
  }
  if (type === "ALUNO") {
    return (
      <div className="relative w-11 h-11">
        <div className="absolute bottom-1 left-1.5 right-1.5 top-4 bg-[#fcd34d] rounded-full border-[2px] border-[#d97706] flex flex-col items-center justify-center z-10 shadow-sm">
          <div className="flex gap-2 mt-1">
             <div className="w-1.5 h-1.5 bg-[#92400e] rounded-full"></div>
             <div className="w-1.5 h-1.5 bg-[#92400e] rounded-full"></div>
          </div>
          <div className="w-3.5 h-1.5 border-b-[2px] border-[#92400e] rounded-full mt-0.5"></div>
        </div>
        <div className="absolute -top-1.5 left-0 right-0 flex justify-center z-20">
          <FlatCap color="#93c5fd" className="w-10 h-10 drop-shadow-sm" />
        </div>
      </div>
    );
  }
  if (type === "DIRETOR") {
    return (
      <div className="relative w-11 h-11 flex items-center justify-center">
        <FlatCap color="#facc15" className="w-11 h-11 drop-shadow-md" />
      </div>
    );
  }
  // PROFESSOR
  return (
    <div className="relative w-11 h-11 flex items-center justify-center">
      <div className="relative w-7 h-8 border-[2px] border-white rounded-b-lg flex items-center justify-center bg-transparent mt-3 shadow-sm">
         <Star size={12} fill="#facc15" className="text-[#facc15]" />
         <div className="absolute -bottom-[2px] -right-[2px] w-0 h-0 border-l-[10px] border-l-transparent border-b-[10px] border-b-[#facc15]"></div>
      </div>
      <div className="absolute -top-2 left-0 right-0 flex justify-center z-10">
        <FlatCap color="#ffffff" className="w-9 h-9 drop-shadow-md" />
      </div>
    </div>
  );
}

const links = [
  { to: "/diretor", label: "Dashboard", icon: Home, papeis: ["ADMIN", "DIRETOR"] },
  { to: "/professor/semanais", label: "Metas - Aluno", icon: Calendar, papeis: ["ADMIN", "DIRETOR", "PROFESSOR"] },
  { to: "/professor/trimestrais", label: "Metas - Professor", icon: ClipboardList, papeis: ["ADMIN", "DIRETOR", "PROFESSOR"] },
  { to: "/aluno", label: "Cartão do Aluno", icon: BookOpen, papeis: ["ADMIN", "ALUNO"] },
  { 
    label: "Ranking", 
    icon: Trophy, 
    papeis: ["ADMIN", "DIRETOR", "PROFESSOR", "ALUNO"],
    subItems: [
      { to: "/ranking?periodo=mensal", label: "Mensal" },
      { to: "/ranking?periodo=trimestral", label: "Trimestral" },
      { to: "/ranking?periodo=anual", label: "Anual" }
    ]
  },
  { to: "/diretor", label: "Classes", icon: Users, papeis: ["ADMIN", "DIRETOR", "PROFESSOR"] },
  { to: "/alunos", label: "Alunos", icon: IdCard, papeis: ["ADMIN", "DIRETOR", "PROFESSOR"] },
  { to: "/relatorio", label: "Relatórios", icon: BarChart3, papeis: ["ADMIN", "DIRETOR", "PROFESSOR"] }
];

const papelLabels = {
  ADMIN: "Departamental Mipes",
  DIRETOR: "DIRETOR",
  PROFESSOR: "PROFESSOR",
  ALUNO: "ALUNO"
};

export function Shell({ children }) {
  const { usuario, sair } = useAuth();
  const location = useLocation();
  const visibleLinks = links.filter((link) => link.papeis.includes(usuario.papel));
  const [openMenus, setOpenMenus] = useState({ Ranking: true });
  const papelLabel = papelLabels[usuario.papel] || usuario.papel;

  const toggleMenu = (label) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isRanking = location.pathname.startsWith("/ranking");
  let logoType = "PROFESSOR";
  if (isRanking) logoType = "RANKING";
  else if (usuario.papel === "ALUNO") logoType = "ALUNO";
  else if (usuario.papel === "DIRETOR" || usuario.papel === "ADMIN") logoType = "DIRETOR";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] min-h-screen">
      <aside className="sticky top-0 lg:h-screen flex flex-row lg:flex-col p-4 lg:p-7 text-white bg-gradient-to-br from-[#173a6a] to-[#102d55] shadow-[4px_0_24px_rgba(16,45,85,0.08)] z-40 overflow-x-auto lg:overflow-visible">
        <div className="hidden lg:flex items-center gap-3 font-bold text-[22px] leading-[1.1] tracking-tight">
          <LogoIcon type={logoType} />
          <div>Professor<br />Nota 10 {logoType === "PROFESSOR" && <Star size={16} fill="#facc15" className="inline text-[#facc15] ml-0.5 relative -top-0.5" />}</div>
        </div>
        <nav className="flex lg:flex-col gap-1.5 lg:mt-8 lg:w-full m-0">
          {visibleLinks.map((link) => {
            const { to, label, icon: Icon, onClick, subItems } = link;
            
            if (subItems) {
              const isOpen = openMenus[label];
              return (
                <div key={label} className="flex flex-col">
                  <button
                    onClick={() => toggleMenu(label)}
                    className={`group flex items-center justify-between w-full min-h-[42px] px-3.5 border-0 rounded-lg text-white/80 transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-white/15 hover:text-white ${isOpen ? "bg-white/10 text-white" : "bg-transparent"}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={19} className="transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110" />
                      <span className="hidden lg:block font-medium">{label}</span>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="hidden lg:block opacity-70" /> : <ChevronDown size={16} className="hidden lg:block opacity-70" />}
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="hidden lg:flex flex-col ml-[19px] pl-4 border-l border-white/15 mt-1 gap-0.5 overflow-hidden"
                      >
                        {subItems.map((sub) => (
                          <NavLink
                            key={sub.label}
                            to={sub.to}
                            className={({ isActive }) => `flex items-center min-h-[32px] px-3 border-0 rounded-md text-[14px] text-white/70 transition-all duration-200 hover:text-white hover:bg-white/10 ${isActive && location.search === (sub.to.split('?')[1] ? '?'+sub.to.split('?')[1] : '') ? "text-white bg-white/10 font-medium" : ""}`}
                          >
                            {sub.label}
                          </NavLink>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            return (
              <NavLink 
                key={`${to}-${label}`} 
                to={to} 
                onClick={onClick}
                className={({ isActive }) => `group flex items-center justify-center lg:justify-start min-w-12 lg:min-w-0 min-h-[42px] px-3.5 gap-3 border-0 rounded-lg text-white/80 transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:translate-x-1.5 hover:bg-white/15 hover:text-white ${isActive && !onClick ? "bg-white/15 text-white" : ""}`}
              >
                <Icon size={19} className="transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-hover:rotate-6" />
                <span className="hidden lg:block">{label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="hidden lg:block mt-auto pt-4 border-t border-white/15 space-y-1 shrink-0">
          <NavLink to="/configuracoes" className={({ isActive }) => `group flex items-center w-full min-h-[42px] px-3.5 gap-3 border-0 rounded-lg text-white/80 bg-transparent cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:translate-x-1.5 hover:bg-white/15 hover:text-white ${isActive ? "bg-white/15 text-white" : ""}`}>
            <Settings size={19} className="transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-hover:rotate-6" />
            <span>Configurações</span>
          </NavLink>
          <button className="group flex items-center w-full min-h-[42px] px-3.5 gap-3 border-0 rounded-lg text-white/80 bg-transparent cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:translate-x-1.5 hover:bg-white/15 hover:text-white" onClick={sair} type="button">
            <LogOut size={19} className="transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-hover:rotate-6" />
            <span>Sair</span>
          </button>
        </div>
      </aside>
      <main className="min-w-0 px-3.5 lg:px-[30px] pb-10">
        <header className="sticky top-0 z-30 flex items-start lg:items-center justify-between min-h-[86px] -mx-3.5 lg:-mx-[30px] mb-7 px-3.5 lg:px-[30px] bg-white/75 border-b border-white/60 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.02)] pt-3 lg:pt-0">
          <div>
            <p className="m-0 mb-0.5 text-muted text-[13px]">Escola Sabatina VIVA</p>
            <h1 className="m-0 font-outfit tracking-tight text-[22px] flex items-center gap-2">
              Professor Nota 10
              {usuario?.papel && <span className="text-muted text-base font-normal tracking-wide">| {papelLabel}</span>}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => toast.success("Você não tem novas notificações no momento.")} 
              className="group bg-transparent border-none cursor-pointer text-muted transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:scale-110 active:translate-y-px active:scale-95"
            >
              <Bell size={20} className="transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-125 group-hover:rotate-6" />
            </button>
            <div className="grid place-items-center w-[38px] h-[38px] rounded-full text-white bg-gradient-to-br from-[#3977b8] to-[#df9f57] font-extrabold">
              {usuario.nome?.charAt(0)}
            </div>
            <div className="hidden lg:block">
              <strong className="block text-texto leading-tight">{usuario.nome}</strong>
              <span className="block text-muted text-[12px]">{papelLabel}</span>
            </div>
          </div>
        </header>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
