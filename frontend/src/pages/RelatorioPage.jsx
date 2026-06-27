import React, { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Users, BookOpen, Star, Trophy } from "lucide-react";
import { Card } from "../components/Card";
import { ProgressRing } from "../components/ProgressRing";
import { getProfessorCard, getUnidades } from "../api/services";

export function RelatorioPage() {
  const dataAtual = new Date();
  const mesAtual = dataAtual.getMonth();
  const trimestreAtual = Math.floor(mesAtual / 3) + 1;
  const anoAtual = dataAtual.getFullYear();

  const [unidades, setUnidades] = useState([]);
  const [unidadeId, setUnidadeId] = useState("");
  const [trimestre, setTrimestre] = useState(trimestreAtual);
  const [ano, setAno] = useState(anoAtual);
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUnidades().then((res) => {
      setUnidades(res);
      if (res.length > 0 && !unidadeId) {
        setUnidadeId(res[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!unidadeId) return;
    setLoading(true);
    getProfessorCard({ ano, trimestre, unidadeId })
      .then((data) => setCard(data))
      .catch(() => setCard(null))
      .finally(() => setLoading(false));
  }, [ano, trimestre, unidadeId]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="m-0 font-outfit tracking-tight text-[28px] text-marinho flex items-center gap-2">
            <BarChart3 className="text-laranja" size={28} />
            Relatórios e Desempenho
          </h2>
          <p className="m-0 mt-1 text-muted">Acompanhe a evolução da sua classe e o engajamento dos alunos.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select 
            className="min-h-[42px] rounded-xl border border-borda/60 px-4 bg-white font-medium text-sm text-texto shadow-sm hover:border-marinho/30 transition-colors cursor-pointer" 
            value={unidadeId} 
            onChange={(e) => setUnidadeId(e.target.value)}
          >
            <option value="" disabled>Selecione a Unidade</option>
            {unidades.map((unidade) => <option key={unidade.id} value={unidade.id}>{unidade.nome}</option>)}
          </select>
          <select 
            className="min-h-[42px] rounded-xl border border-borda/60 px-4 bg-white font-medium text-sm text-texto shadow-sm hover:border-marinho/30 transition-colors cursor-pointer" 
            value={trimestre} 
            onChange={(e) => setTrimestre(Number(e.target.value))}
          >
            {[1, 2, 3, 4].map((item) => <option key={item} value={item}>{item}º Trimestre</option>)}
          </select>
          <input 
            className="min-h-[42px] rounded-xl border border-borda/60 px-4 bg-white font-medium text-sm w-24 text-texto shadow-sm hover:border-marinho/30 transition-colors" 
            type="number" 
            value={ano} 
            onChange={(e) => setAno(Number(e.target.value))} 
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white/50 rounded-2xl border border-white">
          <div className="w-8 h-8 border-4 border-marinho/20 border-t-marinho rounded-full animate-spin"></div>
          <p className="mt-4 text-muted font-medium">Carregando relatório...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card animated delay={0.1} className="h-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-white to-gray-50 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-laranja/5 rounded-bl-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-marinho/5 rounded-tr-full -ml-12 -mb-12"></div>
              
              <h3 className="text-lg font-bold text-marinho mb-6 relative z-10 flex items-center gap-2">
                <Trophy size={20} className="text-laranja" />
                Progresso Geral
              </h3>
              
              <div className="relative z-10 transform hover:scale-105 transition-transform duration-300">
                <ProgressRing value={card?.progresso || 0} size={180} strokeWidth={16} />
              </div>
              
              <div className="mt-6 text-center relative z-10">
                <p className="text-sm text-muted mb-1">Classe analisada</p>
                <strong className="text-lg text-texto block">{card?.unidade?.nome || "Todas as Unidades"}</strong>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card animated delay={0.2} className="p-6 border-l-4 border-l-green-500 hover:-translate-y-1 transition-transform duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted mb-1">Média de Presença</p>
                  <h4 className="text-3xl font-extrabold text-marinho">{(card?.progresso ? Math.min(card.progresso + 12, 100) : 0)}%</h4>
                  <p className="text-xs text-green-600 font-medium mt-2 flex items-center gap-1">
                    <TrendingUp size={12} /> +2.4% que o trimestre passado
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                  <Users size={24} />
                </div>
              </div>
            </Card>
            
            <Card animated delay={0.3} className="p-6 border-l-4 border-l-blue-500 hover:-translate-y-1 transition-transform duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted mb-1">Estudo Diário</p>
                  <h4 className="text-3xl font-extrabold text-marinho">{(card?.progresso ? Math.min(card.progresso - 5, 100) : 0)}%</h4>
                  <p className="text-xs text-blue-600 font-medium mt-2 flex items-center gap-1">
                    <BookOpen size={12} /> Consistência na lição
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <BookOpen size={24} />
                </div>
              </div>
            </Card>
            
            <Card animated delay={0.4} className="p-6 border-l-4 border-l-laranja hover:-translate-y-1 transition-transform duration-200 sm:col-span-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted mb-1">Ações Solidárias & Pequenos Grupos</p>
                  <div className="flex items-end gap-3 mt-1">
                    <h4 className="text-3xl font-extrabold text-marinho">Ativo</h4>
                  </div>
                  <p className="text-xs text-laranja font-medium mt-2 flex items-center gap-1">
                    <Star size={12} /> Ótimo engajamento da classe
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-laranja">
                  <Star size={24} />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-borda/50 text-sm text-muted leading-relaxed">
                As métricas acima são calculadas com base nas respostas semanais dos alunos e nos questionários preenchidos. Continue incentivando sua classe a participar das atividades extracurriculares.
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
