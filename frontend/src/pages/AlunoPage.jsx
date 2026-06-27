import React from "react";
import { useEffect, useState } from "react";
import { BookMarked, CalendarClock } from "lucide-react";
import { getAlunoCard } from "../api/services";
import { ProgressRing } from "../components/ProgressRing";
import { StatusPill } from "../components/StatusPill";
import { Card } from "../components/Card";

export function AlunoPage() {
  const [card, setCard] = useState(null);

  useEffect(() => {
    getAlunoCard().then(setCard);
  }, []);

  if (!card) return <div className="p-10 bg-white rounded-xl shadow-sm text-muted text-center max-w-sm mx-auto mt-10">Carregando cartão...</div>;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_260px] gap-5">
      <div className="lg:col-span-3 mb-[2px]">
        <h2 className="m-0 font-outfit tracking-tight text-[26px]">Bem-vindo, {card.nome}!</h2>
        <p className="m-0 mt-1.5 text-muted">Acompanhamento do cartão trimestral do aluno.</p>
      </div>
      
      <Card animated delay={0.1} className="grid justify-items-center gap-4 text-center">
        <h3 className="m-0 font-outfit text-lg">Progresso Geral</h3>
        <ProgressRing value={card.progresso} size={172} label="Completo" />
        <div className="flex gap-5 mt-2">
          {card.metricas.map((item) => (
            <span key={item.rotulo} className="text-muted text-sm">
              {item.rotulo}
              <strong className="block text-texto text-xl mt-1">{item.valor}</strong>
            </span>
          ))}
        </div>
      </Card>

      <Card animated delay={0.2} className="lg:col-span-2 overflow-hidden">
        <h3 className="m-0 font-outfit text-lg mb-4">Acompanhamento Semanal (13 semanas)</h3>
        <div className="grid grid-cols-[110px_repeat(13,minmax(32px,1fr))] overflow-x-auto border border-borda rounded-lg">
          <span className="grid place-items-center min-h-[44px] border-r border-b border-borda bg-[#f7f9fc]" />
          {card.sabados.map((item) => (
            <b key={item.numeroSabado} className="grid place-items-center min-h-[44px] border-r border-b border-borda bg-[#f7f9fc] text-sm transition-colors hover:bg-white hover:text-marinho cursor-default">
              {item.numeroSabado}
            </b>
          ))}
          <strong className="grid place-items-center min-h-[44px] border-r border-b border-borda bg-[#f7f9fc] text-sm px-2 text-center leading-tight">Estudo</strong>
          {card.sabados.map((item) => (
            <span 
              key={`e-${item.numeroSabado}`} 
              className={`grid place-items-center min-h-[44px] border-r border-b border-borda font-bold text-sm transition-all duration-200 cursor-pointer hover:scale-110 hover:shadow-md hover:z-10 relative ${item.estudo ? "bg-[#ccefdc] text-verde hover:bg-[#a3e2c2] hover:text-[#186a3b]" : "bg-[#f7f9fc] hover:bg-white"}`}
            >
              {item.estudo ? "✓" : ""}
            </span>
          ))}
          <strong className="grid place-items-center min-h-[44px] border-r border-borda bg-[#f7f9fc] text-sm px-2 text-center leading-tight">Pontualidade</strong>
          {card.sabados.map((item) => (
            <span 
              key={`p-${item.numeroSabado}`} 
              className={`grid place-items-center min-h-[44px] border-r border-borda font-bold text-sm transition-all duration-200 cursor-pointer hover:scale-110 hover:shadow-md hover:z-10 relative ${item.pontualidade ? "bg-[#ccefdc] text-verde hover:bg-[#a3e2c2] hover:text-[#186a3b]" : "bg-[#f7f9fc] hover:bg-white"}`}
            >
              {item.pontualidade ? "✓" : ""}
            </span>
          ))}
        </div>
      </Card>

      <Card animated delay={0.3} className="lg:col-start-1 lg:col-end-3">
        <h3 className="m-0 font-outfit text-lg mb-2">Questionários Rápidos</h3>
        <div className="flex flex-col">
          {card.perguntas.map((item, index) => (
            <div className="flex justify-between gap-3 py-3.5 border-b border-borda last:border-0" key={item.texto}>
              <span className="text-sm font-medium">{index + 1}. {item.texto}</span>
              <StatusPill ok={item.resposta}>{item.resposta ? "Sim" : "Não"}</StatusPill>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5">
        <Card animated delay={0.4} className="flex items-center gap-3.5 !p-5">
          <BookMarked className="text-verde" />
          <div>
            <h3 className="m-0 font-outfit text-base">Próximas Entregas</h3>
            <p className="m-0 mt-1 text-muted text-sm">História - 10/10, 14:00</p>
          </div>
        </Card>
        <Card animated delay={0.5} className="flex items-center gap-3.5 !p-5">
          <CalendarClock className="text-verde" />
          <div>
            <h3 className="m-0 font-outfit text-base">Últimas Notas</h3>
            <p className="m-0 mt-1 text-muted text-sm">Matemática 9.5</p>
          </div>
        </Card>
      </div>
    </section>
  );
}
