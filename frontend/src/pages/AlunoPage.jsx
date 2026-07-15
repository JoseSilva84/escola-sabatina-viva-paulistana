import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookMarked, Building2, CalendarClock, ChevronRight, MapPin, Search, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { getAlunoCard, getAlunos } from "../api/services";
import { useAuth } from "../context/AuthContext";
import { ProgressRing } from "../components/ProgressRing";
import { StatusPill } from "../components/StatusPill";
import { Card } from "../components/Card";

const anoAtual = new Date().getFullYear();

function alunoIgreja(aluno) {
  return aluno.unidade?.igreja || aluno.igreja || null;
}

function alunoDistrito(aluno) {
  return alunoIgreja(aluno)?.distrito || aluno.distrito || null;
}

function dataCurta(valor) {
  if (!valor) return "";
  return new Date(`${valor}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  });
}

function agruparAdmin(alunos) {
  const regioes = new Map();

  alunos.forEach((aluno) => {
    const distrito = alunoDistrito(aluno);
    const igreja = alunoIgreja(aluno);
    const regiaoNome = distrito?.regiao || distrito?.nomeRegiao || "Sem regiao";
    const distritoId = distrito?.id || "sem-distrito";
    const igrejaId = igreja?.id || "sem-igreja";

    if (!regioes.has(regiaoNome)) {
      regioes.set(regiaoNome, { nome: regiaoNome, distritos: new Map() });
    }

    const regiao = regioes.get(regiaoNome);
    if (!regiao.distritos.has(distritoId)) {
      regiao.distritos.set(distritoId, { id: distritoId, nome: distrito?.nome || "Sem distrito", igrejas: new Map() });
    }

    const distritoNode = regiao.distritos.get(distritoId);
    if (!distritoNode.igrejas.has(igrejaId)) {
      distritoNode.igrejas.set(igrejaId, { id: igrejaId, nome: igreja?.nome || "Sem igreja", alunos: [] });
    }

    distritoNode.igrejas.get(igrejaId).alunos.push(aluno);
  });

  return Array.from(regioes.values()).map((regiao) => ({
    ...regiao,
    distritos: Array.from(regiao.distritos.values()).map((distrito) => ({
      ...distrito,
      igrejas: Array.from(distrito.igrejas.values())
    }))
  }));
}

function AlunoResumo({ aluno, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(aluno)}
      className="flex min-h-[62px] w-full items-center justify-between gap-3 rounded-lg border border-borda bg-white px-3 py-2 text-left transition-colors hover:border-marinho/35 hover:bg-marinho/5"
    >
      <span className="flex min-w-0 items-center gap-3">
        {aluno.fotoUrl ? (
          <img src={aluno.fotoUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-marinho/10 text-sm font-extrabold text-marinho">
            {aluno.nome?.charAt(0)?.toUpperCase() || "A"}
          </span>
        )}
        <span className="min-w-0">
          <strong className="block truncate text-sm text-texto">{aluno.nome}</strong>
          <span className="block truncate text-xs text-muted">{aluno.unidade?.nome || "Sem unidade"}</span>
        </span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-muted" />
    </button>
  );
}

function SeletorAluno({ usuario, alunos, loading, onSelect }) {
  const [busca, setBusca] = useState("");
  const alunosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return alunos;
    return alunos.filter((aluno) => {
      const igreja = alunoIgreja(aluno)?.nome || "";
      const distrito = alunoDistrito(aluno)?.nome || "";
      return [aluno.nome, aluno.unidade?.nome, igreja, distrito]
        .filter(Boolean)
        .some((valor) => valor.toLowerCase().includes(termo));
    });
  }, [alunos, busca]);
  const regioes = useMemo(() => agruparAdmin(alunosFiltrados), [alunosFiltrados]);
  const isAdmin = usuario.papel === "ADMIN";

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="m-0 font-outfit tracking-tight text-[26px] text-marinho">Cartao do Aluno</h2>
          <p className="m-0 mt-1 text-muted">
            {isAdmin
              ? "Selecione regiao, distrito, igreja e aluno para abrir o acompanhamento individual."
              : "Selecione um aluno da sua igreja para abrir o acompanhamento individual."}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-bold text-marinho shadow-sm">
          <Users size={16} /> {alunosFiltrados.length} aluno(s)
        </span>
      </div>

      <Card animated delay={0.05} className="grid gap-3" hoverable={false}>
        <label className="grid gap-1 text-sm font-bold text-marinho">
          Buscar aluno
          <span className="relative">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="min-h-[44px] w-full rounded-lg border border-borda pl-10 pr-3 font-normal text-texto"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Nome, unidade, igreja ou distrito..."
            />
          </span>
        </label>
      </Card>

      {loading ? (
        <Card animated delay={0.1} className="min-h-[160px] grid place-items-center text-muted" hoverable={false}>
          Carregando alunos...
        </Card>
      ) : isAdmin ? (
        <div className="grid gap-4">
          {regioes.map((regiao) => (
            <Card key={regiao.nome} animated delay={0.1} className="grid gap-4" hoverable={false}>
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-marinho" />
                <h3 className="m-0 font-outfit text-xl text-marinho">{regiao.nome}</h3>
              </div>
              <div className="grid gap-4">
                {regiao.distritos.map((distrito) => (
                  <div key={distrito.id} className="grid gap-3 rounded-lg border border-borda bg-slate-50/60 p-3">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-marinho">
                      <MapPin size={16} /> {distrito.nome}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {distrito.igrejas.map((igreja) => (
                        <div key={igreja.id} className="grid gap-2 rounded-lg border border-borda bg-white p-3">
                          <div className="flex items-center gap-2 text-sm font-extrabold text-texto">
                            <Building2 size={16} className="text-marinho" /> {igreja.nome}
                          </div>
                          <div className="grid gap-2">
                            {igreja.alunos.map((aluno) => <AlunoResumo key={aluno.id} aluno={aluno} onClick={onSelect} />)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card animated delay={0.1} className="grid gap-3" hoverable={false}>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {alunosFiltrados.map((aluno) => <AlunoResumo key={aluno.id} aluno={aluno} onClick={onSelect} />)}
          </div>
        </Card>
      )}

      {!loading && alunosFiltrados.length === 0 && (
        <Card animated delay={0.15} className="min-h-[140px] grid place-items-center text-center text-muted" hoverable={false}>
          Nenhum aluno encontrado para abrir o cartao.
        </Card>
      )}
    </section>
  );
}

function CartaoAluno({ card, alunoSelecionado, onBack, podeVoltar }) {
  if (!card) {
    return <div className="p-10 bg-white rounded-xl shadow-sm text-muted text-center max-w-sm mx-auto mt-10">Carregando cartao...</div>;
  }

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_260px] gap-5">
      <div className="lg:col-span-3 mb-[2px]">
        {podeVoltar && (
          <button type="button" onClick={onBack} className="mb-3 inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-borda bg-white px-3 text-sm font-bold text-marinho hover:bg-marinho hover:text-white">
            <ArrowLeft size={16} /> Escolher outro aluno
          </button>
        )}
        <h2 className="m-0 font-outfit tracking-tight text-[26px]">
          {alunoSelecionado ? alunoSelecionado.nome : `Bem-vindo, ${card.nome}!`}
        </h2>
        <p className="m-0 mt-1.5 text-muted">Acompanhamento do cartao trimestral do aluno.</p>
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
              <StatusPill ok={item.resposta}>{item.resposta ? "Sim" : "Nao"}</StatusPill>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5">
        <Card animated delay={0.4} className="flex items-center gap-3.5 !p-5">
          <BookMarked className="text-verde" />
          <div>
            <h3 className="m-0 font-outfit text-base">Proximo Sabado</h3>
            {card.proximoSabado ? (
              <p className="m-0 mt-1 text-muted text-sm">
                {card.proximoSabado.titulo} - {dataCurta(card.proximoSabado.data)}
                <span className="block text-xs">Presenca e estudo da licao</span>
              </p>
            ) : (
              <p className="m-0 mt-1 text-muted text-sm">Trimestre concluido</p>
            )}
          </div>
        </Card>
        <Card animated delay={0.5} className="flex items-center gap-3.5 !p-5">
          <CalendarClock className="text-verde" />
          <div>
            <h3 className="m-0 font-outfit text-base">Ultimas Pontuacoes</h3>
            {card.ultimasPontuacoes?.length ? (
              <div className="mt-1 grid gap-1">
                {card.ultimasPontuacoes.map((item) => (
                  <p key={`${item.numeroSemana}-${item.total}`} className="m-0 text-sm text-muted">
                    Sabado {item.numeroSabado}: <strong className="text-texto">{item.total} pts</strong>
                    <span className="block text-xs">{item.itens.map((ponto) => `${ponto.label} +${ponto.pontos}`).join(", ")}</span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="m-0 mt-1 text-muted text-sm">Sem pontuacao registrada</p>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}

export function AlunoPage() {
  const { usuario } = useAuth();
  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [card, setCard] = useState(null);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [loadingCard, setLoadingCard] = useState(false);
  const isAluno = usuario.papel === "ALUNO";

  useEffect(() => {
    if (isAluno) return;
    setLoadingAlunos(true);
    getAlunos()
      .then(setAlunos)
      .catch((error) => {
        toast.error(error.response?.data?.message || "Nao foi possivel carregar os alunos.");
        setAlunos([]);
      })
      .finally(() => setLoadingAlunos(false));
  }, [isAluno]);

  useEffect(() => {
    if (!isAluno) return;
    setLoadingCard(true);
    getAlunoCard({ ano: anoAtual })
      .then(setCard)
      .finally(() => setLoadingCard(false));
  }, [isAluno]);

  async function abrirCartao(aluno) {
    setAlunoSelecionado(aluno);
    setCard(null);
    setLoadingCard(true);
    try {
      const data = await getAlunoCard({ alunoId: aluno.id, ano: anoAtual });
      setCard(data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Nao foi possivel abrir o cartao do aluno.");
      setAlunoSelecionado(null);
    } finally {
      setLoadingCard(false);
    }
  }

  if (!isAluno && !alunoSelecionado) {
    return <SeletorAluno usuario={usuario} alunos={alunos} loading={loadingAlunos} onSelect={abrirCartao} />;
  }

  return (
    <CartaoAluno
      card={loadingCard ? null : card}
      alunoSelecionado={alunoSelecionado}
      podeVoltar={!isAluno}
      onBack={() => {
        setAlunoSelecionado(null);
        setCard(null);
      }}
    />
  );
}
