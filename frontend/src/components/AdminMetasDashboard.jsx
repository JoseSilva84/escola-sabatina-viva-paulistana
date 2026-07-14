import React, { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, Building2, ChevronDown, ChevronRight, ClipboardCheck, GraduationCap, Layers3, Search, Users } from "lucide-react";
import { Card } from "./Card";
import { getAdminMetasAluno, getAdminMetasDiretor, getAdminMetasProfessor } from "../api/services";

const anoAtual = new Date().getFullYear();

const config = {
  alunos: {
    titulo: "Metas - Aluno",
    subtitulo: "Acompanhamento administrativo das respostas dos alunos por regiao, distrito, igreja e Unidade de Acao.",
    pessoaLabel: "alunos",
    respostasLabel: "respostas de alunos",
    getData: getAdminMetasAluno,
    icon: GraduationCap
  },
  professores: {
    titulo: "Metas - Professor",
    subtitulo: "Acompanhamento administrativo das respostas dos professores da Escola Sabatina.",
    pessoaLabel: "professores",
    respostasLabel: "respostas de professores",
    getData: getAdminMetasProfessor,
    icon: BookOpenCheck
  },
  diretores: {
    titulo: "Metas - Diretor",
    subtitulo: "Acompanhamento administrativo das respostas dos diretores da Escola Sabatina.",
    pessoaLabel: "diretores",
    respostasLabel: "respostas de diretores",
    getData: getAdminMetasDiretor,
    icon: ClipboardCheck
  }
};

function pct(valor) {
  return `${Number(valor || 0)}%`;
}

function simNao(valor) {
  if (valor === null || valor === undefined) return "-";
  return valor ? "Sim" : "Nao";
}

function dataCurta(valor) {
  return valor ? String(valor).slice(0, 10).split("-").reverse().join("/") : "-";
}

function Stat({ icon: Icon, label, value }) {
  return (
    <Card hoverable={false} className="flex items-center gap-3 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-marinho/10 text-marinho">
        <Icon size={20} />
      </span>
      <span className="min-w-0">
        <strong className="block text-xl leading-tight text-texto">{value}</strong>
        <small className="block truncate text-muted">{label}</small>
      </span>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-borda bg-white/70 p-8 text-center text-muted">
      Nenhuma resposta encontrada para o periodo selecionado.
    </div>
  );
}

function RespostaAluno({ item }) {
  return (
    <div className="rounded-lg border border-borda bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="text-texto">{item.nome}</strong>
        <span className="rounded-full bg-marinho/10 px-2.5 py-1 text-xs font-bold text-marinho">{pct(item.progresso?.progressoGeral)}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted md:grid-cols-4">
        <span>Estudo: <strong className="text-texto">{pct(item.progresso?.estudoPercentual)}</strong></span>
        <span>Pontualidade: <strong className="text-texto">{pct(item.progresso?.pontualidadePercentual)}</strong></span>
        <span>PG: <strong className="text-texto">{simNao(item.cartao?.pequenoGrupo)}</strong></span>
        <span>Estudo biblico: <strong className="text-texto">{simNao(item.cartao?.ministrouEstudoBiblico)}</strong></span>
      </div>
      {!!item.coletas?.length && (
        <div className="mt-3 overflow-x-auto">
          <div className="flex min-w-max gap-2 pb-1">
            {item.coletas.map((coleta) => (
              <span key={coleta.id} className="rounded-md border border-borda bg-slate-50 px-2 py-1 text-xs text-texto">
                S{coleta.semana}: estudo {simNao(coleta.estudouLicao)} · pontual {simNao(coleta.foiPontual)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RespostaProfessor({ item }) {
  const cartao = item.cartao;
  return (
    <div className="rounded-lg border border-borda bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="text-texto">{item.nome}</strong>
        <span className="rounded-full bg-marinho/10 px-2.5 py-1 text-xs font-bold text-marinho">{pct(item.progresso?.progressoGeral)}</span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-muted md:grid-cols-3">
        <span>Incentivo estudo: <strong className="text-texto">{simNao(cartao?.incentivaEstudo)}</strong></span>
        <span>Incentivo pontualidade: <strong className="text-texto">{simNao(cartao?.incentivaPontualidade)}</strong></span>
        <span>Planejamento: <strong className="text-texto">{simNao(cartao?.planejamentoTrimestral)}</strong></span>
        <span>Primeira visita: <strong className="text-texto">{dataCurta(cartao?.primeiraVisita)}</strong></span>
        <span>Ultima visita: <strong className="text-texto">{dataCurta(cartao?.ultimaVisita)}</strong></span>
        <span>Batismos: <strong className="text-texto">{cartao?.batismos ?? 0}</strong></span>
      </div>
      {!!item.coletas?.length && (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.coletas.map((coleta) => (
            <span key={coleta.id} className="rounded-md border border-borda bg-slate-50 px-2 py-1 text-xs text-texto">
              S{coleta.semana}: PG {simNao(coleta.participouPequenoGrupo)} · acao {simNao(coleta.participouAcaoSolidaria)} · estudo {simNao(coleta.ministrouEstudoBiblico)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RespostaDiretor({ item }) {
  const cartao = item.cartao;
  return (
    <div className="rounded-lg border border-borda bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="text-texto">{item.nome}</strong>
        <span className="rounded-full bg-marinho/10 px-2.5 py-1 text-xs font-bold text-marinho">{pct(item.progresso?.progressoGeral)}</span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-muted md:grid-cols-3">
        <span>Classes cumprem itens: <strong className="text-texto">{cartao?.cumprimentoClasses || "-"}</strong></span>
        <span>Classe professores: <strong className="text-texto">{cartao?.classeProfessoresFrequencia || "-"}</strong></span>
        <span>Interessados: <strong className="text-texto">{cartao?.classeInteressadosQuantidade ?? 0}</strong></span>
        <span>Classe interessados: <strong className="text-texto">{simNao(cartao?.classeInteressadosImplantada)}</strong></span>
        <span>Primeira visita: <strong className="text-texto">{dataCurta(cartao?.primeiraVisitaProfessores)}</strong></span>
        <span>Ultima visita: <strong className="text-texto">{dataCurta(cartao?.ultimaVisitaProfessores)}</strong></span>
      </div>
      {cartao?.classeProfessoresParticipantes && (
        <p className="m-0 mt-3 rounded-md bg-slate-50 p-2 text-xs text-muted">{cartao.classeProfessoresParticipantes}</p>
      )}
    </div>
  );
}

function Resposta({ tipo, item }) {
  if (tipo === "alunos") return <RespostaAluno item={item} />;
  if (tipo === "professores") return <RespostaProfessor item={item} />;
  return <RespostaDiretor item={item} />;
}

function Unidade({ tipo, unidade }) {
  const [aberta, setAberta] = useState(false);
  return (
    <div className="rounded-lg border border-borda bg-white/75">
      <button type="button" onClick={() => setAberta((valor) => !valor)} className="flex w-full items-center justify-between gap-3 rounded-lg border-0 bg-transparent p-3 text-left">
        <span className="min-w-0">
          <strong className="block truncate text-texto">{unidade.nome}</strong>
          <small className="block truncate text-muted">{unidade.professor?.nome || unidade.diretor?.nome || "Responsavel nao vinculado"}</small>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-sm font-bold text-marinho">
          {pct(unidade.progresso?.progressoGeral)}
          {aberta ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </span>
      </button>
      {aberta && (
        <div className="grid gap-2 border-t border-borda p-3">
          {unidade.respostas?.length ? unidade.respostas.map((item) => <Resposta key={item.id} tipo={tipo} item={item} />) : <EmptyState />}
        </div>
      )}
    </div>
  );
}

function Igreja({ tipo, igreja }) {
  const unidades = igreja.unidades || [];
  const respostas = igreja.respostas || [];
  return (
    <div className="rounded-lg border border-borda bg-white/70 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <strong className="block text-marinho">{igreja.nome}</strong>
          <small className="text-muted">{unidades.length || igreja.totais?.unidades || 0} unidades · {igreja.totais?.respostas || respostas.length || 0} respostas</small>
        </div>
        {igreja.progresso && <span className="rounded-full bg-verde/10 px-2.5 py-1 text-xs font-bold text-verde">{pct(igreja.progresso.progressoGeral)}</span>}
      </div>
      <div className="grid gap-2">
        {tipo === "diretores"
          ? (respostas.length ? respostas.map((item) => <Resposta key={item.id} tipo={tipo} item={item} />) : <EmptyState />)
          : unidades.map((unidade) => <Unidade key={unidade.id} tipo={tipo} unidade={unidade} />)}
      </div>
    </div>
  );
}

function filtrarRegioes(regioes, termo) {
  const busca = termo.trim().toLowerCase();
  if (!busca) return regioes;
  return regioes
    .map((regiao) => ({
      ...regiao,
      distritos: regiao.distritos
        .map((distrito) => ({
          ...distrito,
          igrejas: distrito.igrejas.filter((igreja) => `${regiao.nome} ${distrito.nome} ${igreja.nome}`.toLowerCase().includes(busca))
        }))
        .filter((distrito) => distrito.igrejas.length)
    }))
    .filter((regiao) => regiao.distritos.length);
}

export function AdminMetasDashboard({ tipo }) {
  const cfg = config[tipo];
  const Icon = cfg.icon;
  const [ano, setAno] = useState(anoAtual);
  const [trimestre, setTrimestre] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [busca, setBusca] = useState("");
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    setCarregando(true);
    cfg.getData({ ano, trimestre })
      .then(setDados)
      .catch(() => setDados(null))
      .finally(() => setCarregando(false));
  }, [cfg, ano, trimestre]);

  const regioes = useMemo(() => filtrarRegioes(dados?.regioes || [], busca), [dados, busca]);
  const resumo = dados?.resumo || {};

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-lg bg-marinho/10 px-3 py-1 text-sm font-bold text-marinho"><Icon size={16} /> Admin</span>
          <h2 className="m-0 mt-3 font-outfit text-[28px] tracking-tight text-texto">{cfg.titulo}</h2>
          <p className="m-0 mt-1 max-w-3xl text-muted">{cfg.subtitulo}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <input className="min-h-[42px] rounded-lg border border-borda px-3" type="number" value={ano} onChange={(event) => setAno(Number(event.target.value))} />
          <select className="min-h-[42px] rounded-lg border border-borda bg-white px-3" value={trimestre} onChange={(event) => setTrimestre(Number(event.target.value))}>
            {[1, 2, 3, 4].map((item) => <option key={item} value={item}>{item}º tri</option>)}
          </select>
          <label className="col-span-2 flex min-h-[42px] items-center gap-2 rounded-lg border border-borda bg-white px-3 sm:min-w-[280px]">
            <Search size={17} className="text-muted" />
            <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar distrito ou igreja" className="min-w-0 flex-1 border-0 bg-transparent outline-none" />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <Stat icon={Layers3} label="regioes" value={resumo.regioes || 0} />
        <Stat icon={Building2} label="distritos" value={resumo.distritos || 0} />
        <Stat icon={Building2} label="igrejas" value={resumo.igrejas || 0} />
        <Stat icon={Users} label="unidades" value={resumo.unidades || 0} />
        <Stat icon={Users} label={cfg.pessoaLabel} value={resumo.pessoas || 0} />
        <Stat icon={ClipboardCheck} label={cfg.respostasLabel} value={resumo.respostas || 0} />
      </div>

      <Card hoverable={false} className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borda pb-3">
          <div>
            <h3 className="m-0 font-outfit text-xl text-texto">Hierarquia administrativa</h3>
            <p className="m-0 mt-1 text-sm text-muted">Expanda as igrejas e unidades para auditar as respostas salvas.</p>
          </div>
          <span className="rounded-full bg-marinho px-3 py-1 text-sm font-bold text-white">{pct(resumo.progresso)} geral</span>
        </div>

        {carregando ? (
          <div className="rounded-lg bg-slate-50 p-8 text-center text-muted">Carregando painel administrativo...</div>
        ) : regioes.length ? (
          <div className="grid gap-4">
            {regioes.map((regiao) => (
              <div key={regiao.nome} className="grid gap-3">
                <h4 className="m-0 font-outfit text-lg text-marinho">{regiao.nome}</h4>
                {regiao.distritos.map((distrito) => (
                  <div key={distrito.id} className="grid gap-3 rounded-lg bg-slate-50 p-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-texto"><Building2 size={16} /> {distrito.nome}</div>
                    <div className="grid gap-3 xl:grid-cols-2">
                      {distrito.igrejas.map((igreja) => <Igreja key={igreja.id} tipo={tipo} igreja={igreja} />)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : <EmptyState />}
      </Card>
    </section>
  );
}
