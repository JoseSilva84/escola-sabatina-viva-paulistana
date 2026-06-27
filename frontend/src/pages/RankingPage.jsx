import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Gift, Info, Medal, Search } from "lucide-react";
import { getDashboard } from "../api/services";
import { Card } from "../components/Card";
import { motion } from "framer-motion";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

export function RankingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const periodo = searchParams.get("periodo") || "mensal";
  const busca = searchParams.get("busca") || "";
  
  const [ranking, setRanking] = useState([]);
  const [mostrarRegras, setMostrarRegras] = useState(false);

  useEffect(() => {
    getDashboard({ periodo }).then((data) => setRanking(data.ranking || []));
  }, [periodo]);

  const rankingFiltrado = ranking.filter((aluno) => (
    aluno.nome.toLowerCase().includes(busca.trim().toLowerCase())
  ));
  const top = rankingFiltrado.slice(0, 3);
  
  let displayTop = [];
  if (top.length === 3) {
    displayTop = [
      { aluno: top[1], place: 2 },
      { aluno: top[0], place: 1 },
      { aluno: top[2], place: 3 }
    ];
  } else if (top.length === 2) {
    displayTop = [
      { aluno: top[1], place: 2 },
      { aluno: top[0], place: 1 }
    ];
  } else if (top.length === 1) {
    displayTop = [
      { aluno: top[0], place: 1 }
    ];
  }

  return (
    <section>
      <Tooltip 
        id="ranking-tooltip" 
        place="top"
        style={{ 
          backgroundColor: '#173a6a', 
          color: '#fff', 
          borderRadius: '8px', 
          padding: '8px 14px', 
          fontSize: '13px', 
          fontWeight: '500', 
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          zIndex: 50
        }} 
      />
      <div className="mb-10 text-center flex flex-col items-center">
        <div className="flex items-end justify-center gap-2 md:gap-6 w-full max-w-3xl mx-auto pt-16">
          {displayTop.map((item, i) => (
            <PodiumItem key={item.aluno?.nome || i} aluno={item.aluno} place={item.place} />
          ))}
        </div>
      </div>
      
      <Card animated delay={0.5} className="overflow-x-auto bg-white/50 backdrop-blur-sm border border-white/50 p-4 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
          <div className="flex p-1 rounded-full bg-[#eef2f7] self-start md:self-auto border border-borda">
            <button 
              onClick={() => atualizarBusca({ periodo: "mensal" })}
              className={`min-h-[34px] px-6 border-0 rounded-full font-bold cursor-pointer transition-colors ${periodo === "mensal" ? "bg-white shadow-sm text-marinho" : "bg-transparent text-muted hover:text-texto"}`}
            >Mensal</button>
            <button 
              onClick={() => atualizarBusca({ periodo: "trimestral" })}
              className={`min-h-[34px] px-6 border-0 rounded-full font-bold cursor-pointer transition-colors ${periodo === "trimestral" ? "bg-white shadow-sm text-marinho" : "bg-transparent text-muted hover:text-texto"}`}
            >Trimestral</button>
            <button 
              onClick={() => atualizarBusca({ periodo: "anual" })}
              className={`min-h-[34px] px-6 border-0 rounded-full font-bold cursor-pointer transition-colors ${periodo === "anual" ? "bg-white shadow-sm text-marinho" : "bg-transparent text-muted hover:text-texto"}`}
            >Anual</button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <button
              type="button"
              onClick={() => setMostrarRegras((atual) => !atual)}
              className="inline-flex items-center justify-center gap-2 min-h-[38px] px-3.5 rounded-full border border-borda bg-white text-marinho font-bold text-sm cursor-pointer hover:bg-marinho hover:text-white transition-colors"
              aria-expanded={mostrarRegras}
            >
              <Info size={16} /> Regras
            </button>
            <label className="flex items-center gap-2 px-3.5 border border-borda rounded-full bg-white focus-within:border-marinho transition-colors">
              <input
                placeholder="Buscar..."
                value={busca}
                onChange={(event) => atualizarBusca({ busca: event.target.value })}
                className="min-h-[36px] border-0 outline-none w-full md:w-[220px] text-[14px]"
              />
              <Search size={16} className="text-muted" />
            </label>
          </div>
        </div>

        {mostrarRegras && (
          <div className="mb-4 rounded-lg border border-borda bg-[#f8fbff] px-4 py-3">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-sm">
              <RegraPonto titulo="Estudo" pontos="+10 pts" detalhe="quando estudou a lição" />
              <RegraPonto titulo="Pontualidade" pontos="+10 pts" detalhe="quando foi pontual" />
              <RegraPonto titulo="Pequeno Grupo" pontos="+20 pts" detalhe="quando participou" />
              <RegraPonto titulo="Ação solidária" pontos="+20 pts" detalhe="quando participou" />
              <RegraPonto titulo="Estudo bíblico" pontos="+50 pts" detalhe="por estudo informado" />
            </div>
          </div>
        )}
        
        <table className="w-full min-w-[960px] border-collapse text-left">
          <thead>
            <tr>
              <th className="px-3 py-4 text-marinho text-[13px] font-bold border-b border-borda">#</th>
              <th className="px-3 py-4 text-marinho text-[13px] font-bold border-b border-borda">Aluno</th>
              <th className="px-3 py-4 text-marinho text-[13px] font-bold border-b border-borda whitespace-nowrap">Pontos Totais</th>
              <th className="px-3 py-4 text-marinho text-[13px] font-bold border-b border-borda whitespace-nowrap">Progresso p/ Homenagem (70%)</th>
              <th className="px-3 py-4 text-marinho text-[13px] font-bold border-b border-borda whitespace-nowrap">Progresso p/ Brinde (100%)</th>
              <th className="px-3 py-4 text-marinho text-[13px] font-bold border-b border-borda">Estudo (pts)</th>
              <th className="px-3 py-4 text-marinho text-[13px] font-bold border-b border-borda">Pontualidade (pts)</th>
              <th className="px-3 py-4 text-marinho text-[13px] font-bold border-b border-borda">Conquistas</th>
            </tr>
          </thead>
          <tbody>
            {rankingFiltrado.map((aluno, index) => {
              const estudo = aluno.estudo ?? aluno.progresso?.estudoPercentual ?? 0;
              const pontualidade = aluno.pontualidade ?? aluno.progresso?.pontualidadePercentual ?? 0;
              const estudoPontos = aluno.estudoPontos ?? 0;
              const pontualidadePontos = aluno.pontualidadePontos ?? 0;
              const conquistasPontos = aluno.conquistasPontos ?? 0;
              const isHighlighted = index === 9; // Highlight 10th row
              
              const rowClasses = isHighlighted 
                ? "bg-[#e8b923] text-marinho font-medium rounded-lg overflow-hidden shadow-md"
                : "group transition-colors duration-200 hover:bg-[#f4f7fa] border-b border-borda/50";
              
              const textClasses = isHighlighted ? "text-marinho font-bold" : "text-texto font-bold";
              const mutedClasses = isHighlighted ? "text-marinho/80" : "text-muted";

              return (
                <tr key={`${aluno.nome}-${index}`} className={rowClasses}>
                  <td className={`px-3 py-3 text-[14px] ${isHighlighted ? "rounded-l-lg" : ""}`}>
                    <span className="font-bold w-[24px] inline-block">{index + 1}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3 transition-transform duration-300 hover:scale-[1.03] cursor-pointer">
                      <img 
                        src={fotoAluno(aluno)} 
                        alt={aluno.nome} 
                        className={`w-9 h-9 rounded-full object-cover shadow-sm transition-transform duration-300 group-hover:scale-110 hover:rotate-12 ${isHighlighted ? 'border-2 border-white' : ''}`}
                      />
                      <div>
                        <strong className={`block transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-1 hover:text-[#ca8a04] ${textClasses}`}>{aluno.nome}</strong>
                        <small className={`block text-[11px] ${mutedClasses}`}>Nível {aluno.nivel}</small>
                      </div>
                    </div>
                  </td>
                  <td className={`px-3 py-3 text-[15px] ${textClasses}`}>
                    <span className="inline-block transition-all duration-300 hover:scale-110 hover:text-amarelo hover:-translate-y-1 cursor-default">
                      {aluno.pontos} pts
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="transition-all duration-300 hover:scale-105 hover:drop-shadow-md cursor-pointer">
                      <Progress value={Math.min(100, estudo)} color={isHighlighted ? "#fff" : "#4299e1"} icon={<Medal size={16} className={`transition-transform duration-500 hover:rotate-180 hover:scale-125 ${isHighlighted ? "text-white" : "text-[#eab308]"}`} fill={isHighlighted ? "transparent" : "#fef08a"} />} />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="transition-all duration-300 hover:scale-105 hover:drop-shadow-md cursor-pointer">
                      <Progress value={Math.min(100, pontualidade)} color={isHighlighted ? "#fff" : "#48bb78"} icon={<Gift size={16} className={`transition-transform duration-300 hover:-rotate-12 hover:scale-125 ${isHighlighted ? "text-white" : "text-[#ef4444]"}`} fill={isHighlighted ? "transparent" : "#fca5a5"} />} />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center justify-center min-h-[26px] px-2.5 rounded-md font-bold text-[12px] cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-lg hover:-translate-y-1 ${isHighlighted ? "bg-[#c29610] text-white hover:bg-[#a17c0d]" : "bg-[#27ae60] text-white hover:bg-[#1e8449]"}`}>
                      {estudoPontos} pts
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center justify-center min-h-[26px] px-2.5 rounded-full font-bold text-[12px] cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-lg hover:-translate-y-1 ${isHighlighted ? "border border-white text-white bg-transparent hover:bg-white/20" : "border border-[#27ae60] text-[#27ae60] bg-white hover:bg-[#27ae60] hover:text-white"}`}>
                      {pontualidadePontos} pts
                    </span>
                  </td>
                  <td className={`px-3 py-3 text-[13px] font-bold ${isHighlighted ? "rounded-r-lg text-marinho" : "text-marinho"}`}>
                    <span 
                      className="inline-block transition-all duration-300 hover:tracking-widest hover:text-[#ca8a04] cursor-default" 
                      data-tooltip-id="ranking-tooltip"
                      data-tooltip-content={conquistasTitulo(aluno)}
                    >
                      {conquistasPontos} pts
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rankingFiltrado.length === 0 && (
          <div className="min-h-[90px] flex items-center justify-center border-t border-borda text-sm text-muted">
            Nenhum aluno encontrado para "{busca}".
          </div>
        )}
      </Card>
    </section>
  );

  function atualizarBusca(proximos) {
    const params = new URLSearchParams(searchParams);
    Object.entries(proximos).forEach(([chave, valor]) => {
      if (valor) {
        params.set(chave, valor);
      } else {
        params.delete(chave);
      }
    });
    setSearchParams(params);
  }
}

function fotoAluno(aluno) {
  return aluno?.fotoUrl || `https://i.pravatar.cc/150?u=${aluno.nome.replace(/\s+/g, '')}`;
}

function conquistasTitulo(aluno) {
  const detalhe = aluno?.conquistasDetalhe || {};
  return `Pequeno Grupo: ${detalhe.pequenoGrupoPontos || 0} pts | Ação: ${detalhe.acaoSolidariaPontos || 0} pts | Estudo Bíblico: ${detalhe.estudosBiblicosPontos || 0} pts`;
}

function Progress({ value, color, icon }) {
  return (
    <div 
      className="flex items-center gap-2 w-full max-w-[140px] cursor-help"
      data-tooltip-id="ranking-tooltip"
      data-tooltip-content={`${Math.round(value)}%`}
    >
      <div className="h-2 rounded-full bg-black/10 flex-1 relative overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute top-0 left-0 h-full rounded-full" 
          style={{ backgroundColor: color }} 
        />
      </div>
      <div className="shrink-0 drop-shadow-sm">{icon}</div>
    </div>
  );
}

function PodiumItem({ aluno, place }) {
  if (!aluno) return null;
  
  const isFirst = place === 1;
  const isSecond = place === 2;
  const isThird = place === 3;
  
  // Heights for the cylinders
  const cylinderHeight = isFirst ? 180 : isSecond ? 140 : 120;
  
  // Colors for the cylinders
  const topColor = isFirst ? "#fde68a" : isSecond ? "#f1f5f9" : "#e2b697";
  const bodyGradient = isFirst ? "from-[#eab308] to-[#ca8a04]" : isSecond ? "from-[#cbd5e1] to-[#94a3b8]" : "from-[#d97706] to-[#b45309]";
  
  // Medal texts
  const medalText = isFirst ? "Gold Trophy" : isSecond ? "Silver Medal" : "Bronze Medal";
  const subText = isFirst ? "Mestre de Estudo" : "";
  
  // Avatar borders
  const avatarBorder = isFirst ? "border-[#eab308]" : isSecond ? "border-[#cbd5e1]" : "border-[#d97706]";

  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: place * 0.1 }}
      className={`flex flex-col items-center relative group cursor-default ${isFirst ? 'z-20' : 'z-10'}`}
    >
      {/* Card Info */}
      <div className={`flex flex-col items-center bg-white rounded-2xl shadow-xl p-4 w-[160px] relative -mb-6 z-20 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-y-3 group-hover:shadow-2xl ${isFirst ? 'pb-8 pt-10' : 'pb-6 pt-10'}`}>
        <div className="absolute -top-10 w-20 h-20 rounded-full bg-white p-1 shadow-md transition-transform duration-300 group-hover:scale-110">
          <img 
            src={fotoAluno(aluno)} 
            alt={aluno.nome} 
            className={`w-full h-full rounded-full object-cover border-4 ${avatarBorder}`}
          />
        </div>
        
        {isFirst && (
          <div className="absolute -top-12 right-1 text-4xl drop-shadow-lg transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12">🏆</div>
        )}
        
        <strong className="text-[17px] text-marinho leading-tight text-center transition-colors duration-300 group-hover:text-[#ca8a04]">{aluno.nome}</strong>
        <span className="text-marinho font-extrabold text-[18px] mt-1">{aluno.pontos} pts</span>
        
        {isFirst && (
          <div className="text-[10px] text-muted text-center leading-tight mt-2">
            Estudo {aluno.estudoPontos || 0}. Pontualidade {aluno.pontualidadePontos || 0}
          </div>
        )}
      </div>
      
      {/* 3D Cylinder Podium */}
      <div className="relative w-[180px] flex flex-col items-center z-10 drop-shadow-2xl transition-all duration-300 group-hover:brightness-110">
        {/* Top face of cylinder */}
        <div 
          className="w-full h-[40px] rounded-[50%] absolute top-0 z-10 border border-white/20"
          style={{ backgroundColor: topColor, transform: "translateY(-50%)" }}
        />
        {/* Body of cylinder */}
        <div 
          className={`w-full bg-gradient-to-b ${bodyGradient} rounded-b-[50px] shadow-inner relative flex flex-col items-center justify-start pt-6 overflow-hidden`}
          style={{ height: `${cylinderHeight}px` }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 w-full" />
          
          <div className="relative z-20 flex flex-col items-center">
            <h1 className="text-marinho/80 font-black text-4xl drop-shadow-sm mb-0">
              {place}<span className="text-xl align-super">º</span>
            </h1>
            <span className="text-marinho/70 font-semibold text-sm drop-shadow-sm">{medalText}</span>
            {subText && (
              <span className="bg-white/80 text-[#ca8a04] px-3 py-1 rounded-full text-[11px] font-bold mt-2 shadow-sm backdrop-blur-sm uppercase tracking-wider">
                {subText}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function RegraPonto({ titulo, pontos, detalhe }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-white border border-borda/70 px-3 py-2">
      <strong className="text-marinho text-[13px]">{titulo}</strong>
      <span className="text-[#27ae60] font-extrabold text-sm">{pontos}</span>
      <span className="text-muted text-xs leading-tight">{detalhe}</span>
    </div>
  );
}
