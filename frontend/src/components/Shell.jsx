import React, { useState } from "react";
import { Bell, BookOpen, Building2, Calendar, CalendarClock, ClipboardList, Download, HelpCircle, Home, IdCard, Image, LogOut, Palette, Settings, ShieldCheck, SlidersHorizontal, Trophy, UploadCloud, UserCog, Users, ChevronDown, ChevronUp, Star, Menu, X } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { salvarPerfilInicial, trocarSenha } from "../api/services";
import avatarDiretorPadrao from "../assets/avatar-diretor-padrao.png";
import avatarDiretorMasculino from "../assets/avatar-diretor-masculino.png";

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
  { to: "/diretor/metas", label: "Metas - Diretor", icon: ShieldCheck, papeis: ["ADMIN", "DIRETOR"] },
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
  { to: "/professores", label: "Professores", icon: UserCog, papeis: ["ADMIN", "DIRETOR"] },
];

const papelLabels = {
  ADMIN: "Departamental Mipes",
  DIRETOR: "DIRETOR",
  PROFESSOR: "PROFESSOR",
  ALUNO: "ALUNO"
};

const produtoPorPapel = {
  ADMIN: "Departamental Mipes",
  DIRETOR: "Diretor Nota 10",
  PROFESSOR: "Professor Nota 10",
  ALUNO: "Aluno Nota 10"
};

const configComum = [
  { label: "Perfil e conta", icon: UserCog, secao: "perfil" },
  { label: "Identidade do sistema", icon: Image, secao: "identidade" },
  { label: "Notificações", icon: Bell, secao: "notificacoes" },
  { label: "Exportar relatórios", icon: Download, secao: "exportar" },
  { label: "Tema do sistema", icon: Palette, secao: "tema" }
];

const configAdmin = [
  { label: "Notificações", icon: Bell, secao: "notificacoes" },
  { label: "Perfil e conta", icon: UserCog, secao: "perfil" },
  { label: "Dados da igreja", icon: Building2, secao: "igreja" },
  { label: "Unidades de Ação", icon: Users, secao: "unidades" },
  { label: "Ano e trimestre padrão", icon: CalendarClock, secao: "periodo" },
  { label: "Usuários e permissões", icon: ShieldCheck, secao: "usuarios" },
  { label: "Identidade do sistema", icon: Image, secao: "identidade" },
  { label: "Importar/Exportar dados", icon: UploadCloud, secao: "importar-exportar" },
  { label: "Critérios de pontuação", icon: SlidersHorizontal, secao: "pontuacao" },
  { label: "Ajuda e suporte", icon: HelpCircle, secao: "ajuda" },
  { label: "Exportar relatórios", icon: Download, secao: "exportar" },
  { label: "Tema do sistema", icon: Palette, secao: "tema" }
];

const configDiretor = [
  { label: "Notificações", icon: Bell, secao: "notificacoes" },
  { label: "Perfil e conta", icon: UserCog, secao: "perfil" },
  { label: "Dados da igreja", icon: Building2, secao: "igreja" },
  { label: "Unidades de Ação", icon: Users, secao: "unidades" },
  { label: "Usuários e permissões", icon: ShieldCheck, secao: "usuarios" },
  { label: "Identidade do sistema", icon: Image, secao: "identidade" },
  { label: "Ajuda e suporte", icon: HelpCircle, secao: "ajuda" },
  { label: "Exportar relatórios", icon: Download, secao: "exportar" },
  { label: "Tema do sistema", icon: Palette, secao: "tema" }
];

function formatarDistrito(nome) {
  if (!nome) return "";
  if (String(nome).toUpperCase() === "ADMINISTRACAO") return "ADMINISTRAÇÃO";
  return nome;
}

export function Shell({ children }) {
  const { usuario, sair, atualizarUsuario } = useAuth();
  const location = useLocation();
  const visibleLinks = links.filter((link) => link.papeis.includes(usuario.papel));
  const [openMenus, setOpenMenus] = useState({ Ranking: true });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacaoSenha, setConfirmacaoSenha] = useState("");
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [nomeDiretor, setNomeDiretor] = useState("");
  const [whatsappDiretor, setWhatsappDiretor] = useState("");
  const [sexoDiretor, setSexoDiretor] = useState("MASCULINO");
  const [fotoDiretor, setFotoDiretor] = useState(null);
  const [fotoPreview, setFotoPreview] = useState("");
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const papelLabel = papelLabels[usuario.papel] || usuario.papel;
  const produtoNome = produtoPorPapel[usuario.papel] || "Escola Sabatina Viva";
  const [produtoPrimeiraLinha, ...produtoOutrasLinhas] = produtoNome.split(" ");
  const produtoRestante = produtoOutrasLinhas.join(" ");
  const configItens = usuario.papel === "ADMIN"
    ? configAdmin
    : usuario.papel === "DIRETOR"
      ? configDiretor
      : configComum;
  const nomeContexto = usuario.igrejaNome || usuario.nome;
  const distritoNome = formatarDistrito(usuario.distritoNome);
  const detalheContexto = usuario.distritoNome
    ? `Distrito ${distritoNome}`
    : papelLabel;
  const nomePareceMasculino = /^(carlos|jo[aã]o|jos[eé]|paulo|pedro|marcos|lucas|mateus|rafael|gabriel|daniel|andre|ant[oô]nio)\b/i.test(usuario.nome || "");
  const avatarPadrao = usuario.sexoPerfil === "MASCULINO" || (!usuario.sexoPerfil && nomePareceMasculino)
    ? avatarDiretorMasculino
    : avatarDiretorPadrao;

  const toggleMenu = (label) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  async function salvarNovaSenha(event) {
    event.preventDefault();
    if (novaSenha !== confirmacaoSenha) {
      toast.error("A confirmação não corresponde à nova senha.");
      return;
    }
    setTrocandoSenha(true);
    try {
      await trocarSenha({ senhaAtual, novaSenha });
      atualizarUsuario({ deveTrocarSenha: false });
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmacaoSenha("");
      toast.success("Senha alterada com sucesso.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Não foi possível alterar a senha.");
    } finally {
      setTrocandoSenha(false);
    }
  }

  async function concluirPerfil(event) {
    event.preventDefault();
    setSalvandoPerfil(true);
    try {
      const data = await salvarPerfilInicial({
        nome: nomeDiretor,
        whatsapp: whatsappDiretor,
        sexoPerfil: sexoDiretor,
        foto: fotoDiretor
      });
      atualizarUsuario(data.usuario);
      toast.success("Perfil do diretor concluído.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Não foi possível salvar o perfil.");
    } finally {
      setSalvandoPerfil(false);
    }
  }

  function selecionarFoto(event) {
    const arquivo = event.target.files?.[0] || null;
    setFotoDiretor(arquivo);
    setFotoPreview(arquivo ? URL.createObjectURL(arquivo) : "");
  }

  const isRanking = location.pathname.startsWith("/ranking");
  let logoType = "PROFESSOR";
  if (isRanking) logoType = "RANKING";
  else if (usuario.papel === "ALUNO") logoType = "ALUNO";
  else if (usuario.papel === "DIRETOR" || usuario.papel === "ADMIN") logoType = "DIRETOR";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] min-h-screen">
      {usuario.deveTrocarSenha && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-5">
          <form onSubmit={salvarNovaSenha} className="grid w-full max-w-md gap-4 rounded-2xl bg-white p-6 shadow-2xl">
            <div>
              <h2 className="m-0 font-outfit text-2xl text-marinho">Crie sua nova senha</h2>
              <p className="mb-0 mt-1 text-sm text-muted">Por segurança, a senha temporária só pode ser usada neste primeiro acesso.</p>
            </div>
            <label className="grid gap-1.5 text-sm font-bold">
              Senha temporária
              <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} required className="min-h-[44px] rounded-lg border border-borda px-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-bold">
              Nova senha
              <input type="password" minLength={8} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required className="min-h-[44px] rounded-lg border border-borda px-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-bold">
              Confirmar nova senha
              <input type="password" minLength={8} value={confirmacaoSenha} onChange={(e) => setConfirmacaoSenha(e.target.value)} required className="min-h-[44px] rounded-lg border border-borda px-3" />
            </label>
            <button disabled={trocandoSenha} className="min-h-[44px] rounded-lg border-0 bg-marinho px-4 font-bold text-white">
              {trocandoSenha ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        </div>
      )}
      {!usuario.deveTrocarSenha && usuario.papel === "DIRETOR" && (usuario.perfilPendente || usuario.nome === "Diretor da Escola Sabatina") && (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/70 p-5">
          <form onSubmit={concluirPerfil} className="grid w-full max-w-md gap-4 rounded-2xl bg-white p-6 shadow-2xl">
            <div>
              <h2 className="m-0 font-outfit text-2xl text-marinho">Complete seu perfil</h2>
              <p className="mb-0 mt-1 text-sm text-muted">Esses dados identificarão o diretor desta igreja.</p>
            </div>

            <label className="mx-auto grid cursor-pointer place-items-center">
              {fotoPreview ? (
                <img src={fotoPreview} alt="Prévia do perfil" className="h-24 w-24 rounded-full object-cover ring-4 ring-marinho/10" />
              ) : (
                <img src={sexoDiretor === "MASCULINO" ? avatarDiretorMasculino : avatarDiretorPadrao} alt="Avatar padrão" className="h-24 w-24 rounded-full object-cover ring-4 ring-marinho/10" />
              )}
              <span className="mt-2 text-sm font-bold text-marinho">Escolher foto (opcional)</span>
              <input type="file" accept="image/*" onChange={selecionarFoto} className="sr-only" />
            </label>

            <label className="grid gap-1.5 text-sm font-bold">
              Nome do diretor
              <input value={nomeDiretor} onChange={(event) => setNomeDiretor(event.target.value)} required minLength={2} className="min-h-[44px] rounded-lg border border-borda px-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-bold">
              WhatsApp
              <input value={whatsappDiretor} onChange={(event) => setWhatsappDiretor(event.target.value)} required minLength={8} placeholder="(00) 00000-0000" className="min-h-[44px] rounded-lg border border-borda px-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-bold">
              Sexo
              <select value={sexoDiretor} onChange={(event) => setSexoDiretor(event.target.value)} className="min-h-[44px] rounded-lg border border-borda bg-white px-3">
                <option value="MASCULINO">Masculino</option>
                <option value="FEMININO">Feminino</option>
              </select>
            </label>
            <p className="m-0 text-xs text-muted">Se você não escolher uma foto, será usado o avatar padrão com a inicial do seu nome.</p>
            <button disabled={salvandoPerfil} className="min-h-[44px] rounded-lg border-0 bg-marinho px-4 font-bold text-white">
              {salvandoPerfil ? "Salvando..." : "Concluir perfil"}
            </button>
          </form>
        </div>
      )}
      <aside className="sidebar-scroll fixed inset-y-0 left-0 hidden w-[260px] flex-col overflow-x-hidden overflow-y-auto px-7 py-5 text-white bg-gradient-to-br from-[#173a6a] to-[#102d55] shadow-[4px_0_24px_rgba(16,45,85,0.08)] z-40 lg:flex">
        <div className="flex items-center gap-3 font-bold text-[22px] leading-[1.1] tracking-tight">
          <LogoIcon type={logoType} />
          <div>
            {produtoPrimeiraLinha}<br />
            {produtoRestante} {logoType === "PROFESSOR" && <Star size={16} fill="#facc15" className="inline text-[#facc15] ml-0.5 relative -top-0.5" />}
          </div>
        </div>
        <nav className="flex flex-col justify-start gap-1 mt-6 w-full m-0 min-w-0">
          {visibleLinks.map((link) => {
            const { to, label, icon: Icon, onClick, subItems } = link;
            
            if (subItems) {
              const isOpen = openMenus[label];
              return (
                <div key={label} className="flex flex-col">
                  <button
                    onClick={() => toggleMenu(label)}
                    className={`group flex items-center justify-between w-full min-h-[44px] px-3.5 border-0 rounded-lg text-white/80 transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-white/15 hover:text-white ${isOpen ? "bg-white/10 text-white" : "bg-transparent"}`}
                    title={label}
                    aria-label={label}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={19} className="transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110" />
                      <span className="font-medium">{label}</span>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="opacity-70" /> : <ChevronDown size={16} className="opacity-70" />}
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="flex flex-col ml-[19px] pl-4 border-l border-white/15 mt-1 gap-0.5 overflow-hidden"
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
                className={({ isActive }) => `group flex items-center justify-start min-w-0 min-h-[44px] px-3.5 gap-3 border-0 rounded-lg text-white/80 transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:translate-x-1.5 hover:bg-white/15 hover:text-white ${isActive && !onClick ? "bg-white/15 text-white" : ""}`}
                title={label}
                aria-label={label}
              >
                <Icon size={19} className="transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-hover:rotate-6" />
                <span>{label}</span>
              </NavLink>
            );
          })}
          <NavLink to="/configuracoes" className={({ isActive }) => `group flex lg:hidden items-center justify-center min-w-12 min-h-[44px] px-3 border-0 rounded-lg text-white/80 transition-all duration-200 hover:bg-white/15 hover:text-white ${isActive ? "bg-white/15 text-white" : ""}`} title="Configurações" aria-label="Configurações">
            <Settings size={19} />
          </NavLink>
          <button className="group flex lg:hidden items-center justify-center min-w-12 min-h-[44px] px-3 border-0 rounded-lg text-white/80 bg-transparent transition-all duration-200 hover:bg-white/15 hover:text-white" onClick={sair} type="button" title="Sair" aria-label="Sair">
            <LogOut size={19} />
          </button>
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

      {/* Menu Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[60] bg-gradient-to-br from-[#173a6a] to-[#0f284d] text-white lg:hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#0f284d]/50 backdrop-blur-sm">
              <h2 className="text-2xl font-bold font-outfit m-0">Menu</h2>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Fechar menu"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 pb-24 space-y-3">
              {visibleLinks.map((link) => {
                const { to, label, icon: Icon, subItems } = link;
                
                if (subItems) {
                   return (
                     <div key={label} className="bg-white/5 rounded-2xl p-2 mb-3 border border-white/5">
                       <div className="flex items-center gap-3 p-3 text-white/90 font-semibold text-lg">
                         <Icon size={22} className="text-white/70" />
                         {label}
                       </div>
                       <div className="flex flex-col gap-1 px-3 pb-2 pl-[46px]">
                         {subItems.map(sub => (
                           <NavLink
                             key={sub.label}
                             to={sub.to}
                             onClick={() => setIsMobileMenuOpen(false)}
                             className={({ isActive }) => `flex items-center min-h-[44px] px-4 rounded-xl transition-colors ${isActive ? "bg-white/15 text-white font-bold" : "text-white/70 hover:text-white hover:bg-white/10"}`}
                           >
                             {sub.label}
                           </NavLink>
                         ))}
                       </div>
                     </div>
                   );
                }

                return (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => `flex items-center gap-4 p-4 rounded-2xl transition-colors ${isActive ? "bg-white/15 text-white font-bold border border-white/10" : "text-white/80 hover:bg-white/10 hover:text-white font-medium"}`}
                  >
                    <Icon size={24} className="text-white/60" />
                    <span className="text-[17px]">{label}</span>
                  </NavLink>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed inset-x-0 bottom-0 z-50 bg-[#0f284d] text-white shadow-[0_-12px_40px_rgba(0,0,0,0.4)] lg:hidden border-t border-white/5" aria-label="Navegação principal">
        <div className="flex items-center justify-between px-5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
          
          <NavLink
            to={visibleLinks[0]?.to || "/"}
            className={({ isActive }) => `flex flex-col items-center justify-center gap-1 transition-all duration-200 ${isActive ? "text-white scale-105" : "text-white/50 hover:text-white/80"}`}
          >
            {React.createElement(visibleLinks[0]?.icon || Home, { size: 22, className: "opacity-80" })}
            <span className="text-[10px] font-semibold tracking-wide">Início</span>
          </NavLink>

          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 ${isMobileMenuOpen ? "text-white scale-105" : "text-white/50 hover:text-white/80"}`}
          >
            <Menu size={22} className={isMobileMenuOpen ? "opacity-100" : "opacity-80"} />
            <span className="text-[10px] font-semibold tracking-wide">Menu</span>
          </button>

          <NavLink
            to="/configuracoes"
            className={({ isActive }) => `flex flex-col items-center justify-center gap-1 transition-all duration-200 ${isActive ? "text-white scale-105" : "text-white/50 hover:text-white/80"}`}
          >
            <Settings size={22} className="opacity-80" />
            <span className="text-[10px] font-semibold tracking-wide">Ajustes</span>
          </NavLink>

          <div className="w-px h-8 bg-white/10 rounded-full mx-0.5"></div>

          <button
            onClick={sair}
            className="flex flex-col items-center justify-center gap-1 transition-all duration-200 text-[#ffa3a3] hover:text-white active:scale-95 group"
          >
            <div className="bg-red-500/20 border border-red-500/30 p-1.5 rounded-xl group-hover:bg-red-500/40 transition-colors shadow-sm shadow-red-500/10 flex items-center justify-center">
              <LogOut size={18} className="translate-x-[1px]" />
            </div>
            <span className="text-[10px] font-bold tracking-wide">Sair</span>
          </button>
          
        </div>
      </nav>

      <main className="min-w-0 px-3.5 sm:px-5 lg:col-start-2 lg:px-[30px] pb-36 lg:pb-10">
        <header className="sticky top-0 z-30 flex items-start sm:items-center justify-between gap-3 min-h-[72px] lg:min-h-[86px] -mx-3.5 sm:-mx-5 lg:-mx-[30px] mb-5 lg:mb-7 px-3.5 sm:px-5 lg:px-[30px] bg-white/80 border-b border-white/60 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.02)] py-3 lg:py-0">
          <div className="min-w-0">
            <p className="m-0 mb-0.5 text-muted text-[13px]">Escola Sabatina VIVA</p>
            <h1 className="m-0 font-outfit tracking-tight text-[19px] sm:text-[22px] flex flex-wrap items-center gap-x-2 gap-y-0.5 leading-tight">
              {produtoNome}
              {usuario?.papel && <span className="text-muted text-sm sm:text-base font-normal tracking-wide">| {papelLabel}</span>}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => toast.success("Você não tem novas notificações no momento.")} 
              className="group bg-transparent border-none cursor-pointer text-muted transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:scale-110 active:translate-y-px active:scale-95"
            >
              <Bell size={20} className="transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-125 group-hover:rotate-6" />
            </button>
            <div className="relative hidden lg:block group">
              <button
                type="button"
                className="flex items-center gap-3 rounded-xl border-0 bg-transparent px-1.5 py-1 text-left cursor-pointer transition-colors hover:bg-marinho/5 focus:bg-marinho/5 focus:outline-none"
              >
                {usuario.fotoUrl ? (
                  <img src={usuario.fotoUrl} alt="" className="h-[38px] w-[38px] rounded-full object-cover" />
                ) : (
                  <img src={avatarPadrao} alt="Avatar padrão" className="h-[38px] w-[38px] rounded-full object-cover" />
                )}
                <span>
                  <strong className="block max-w-[250px] truncate text-texto leading-tight">{nomeContexto}</strong>
                  <span className="block max-w-[250px] truncate text-muted text-[12px]">{detalheContexto}</span>
                </span>
              </button>
              <div className="invisible absolute right-0 top-full z-50 mt-2 w-[300px] translate-y-1 rounded-xl border border-borda bg-white p-2 opacity-0 shadow-xl shadow-marinho/10 transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                <div className="px-3 py-2">
                  <strong className="block text-sm text-texto">{nomeContexto}</strong>
                  <span className="mt-0.5 block text-xs text-muted">{detalheContexto}</span>
                  <span className="hidden">
                    {papelLabel}{usuario.nome ? ` — ${usuario.nome}` : ""}
                  </span>
                </div>
                <div className="my-1 h-px bg-borda" />
                <div className="grid gap-1">
                  {configItens.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.label}
                        to={`/configuracoes?secao=${item.secao}`}
                        className="flex min-h-[38px] items-center gap-3 rounded-lg px-3 text-sm font-bold text-marinho transition-colors hover:bg-marinho/10"
                      >
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                  <button
                    type="button"
                    onClick={sair}
                    className="flex min-h-[38px] items-center gap-3 rounded-lg border-0 bg-transparent px-3 text-left text-sm font-bold text-red-600 transition-colors hover:bg-red-50"
                  >
                    <LogOut size={16} />
                    <span>Sair</span>
                  </button>
                </div>
              </div>
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
