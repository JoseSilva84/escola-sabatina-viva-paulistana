import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, ChevronUp, Edit3, Eye, Plus, Save, Trophy, UserPlus, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  adicionarConfraternizacao,
  adicionarEstudoBiblico,
  criarAluno,
  criarCartaoAluno,
  criarUnidade,
  getCartoesProfessor,
  getCartoesAluno,
  getColetaSemanal,
  getColetaSemanalProfessor,
  getProfessores,
  getProfessorCard,
  getUnidades,
  salvarCartaoProfessor,
  salvarColetaSemanal,
  salvarColetaSemanalProfessor,
  salvarPerguntasAluno,
  salvarPresencaProfessor
} from "../api/services";
import { ProgressRing } from "../components/ProgressRing";
import { StatusPill } from "../components/StatusPill";
import { Card } from "../components/Card";
import { ModalInput } from "../components/ModalInput";
import { AdminMetasDashboard } from "../components/AdminMetasDashboard";
import { useAuth } from "../context/AuthContext";

const anoAtual = new Date().getFullYear();

const alunoInicial = {
  nome: "",
  sexo: "MASCULINO",
  foto: null,
  dataNascimento: "",
  dataBatismo: "",
  endereco: "",
  email: "",
  whatsapp: ""
};

function inputDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function alunoQuestionarioVazio(aluno) {
  return {
    alunoId: aluno.id,
    alunoNome: aluno.nome,
    pequenoGrupo: false,
    acaoSolidaria: false,
    acaoSolidariaDescricao: "",
    acaoSolidariaTipo: "",
    ministrouEstudoBiblico: false
  };
}

function NovaUnidadeModal({ aberto, onClose, onCriada }) {
  const { usuario } = useAuth();
  const [nome, setNome] = useState("");
  const [professorId, setProfessorId] = useState("");
  const [professores, setProfessores] = useState([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    getProfessores()
      .then((lista) => {
        setProfessores(lista);
        setProfessorId((atual) => atual || lista[0]?.id || "");
      })
      .catch(() => setProfessores([]));
  }, [aberto]);

  if (!aberto) return null;

  async function cadastrar(event) {
    event.preventDefault();
    if (!professorId) {
      toast.error("Cadastre um professor antes de criar a classe.");
      return;
    }
    setSalvando(true);
    try {
      const unidade = await criarUnidade({ nome, professorId });
      toast.success("Unidade de Ação cadastrada.");
      setNome("");
      setProfessorId("");
      onCriada(unidade);
    } catch (error) {
      toast.error(error.response?.data?.message || "Não foi possível cadastrar a classe.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/60 p-4" onMouseDown={onClose}>
      <form onSubmit={cadastrar} onMouseDown={(event) => event.stopPropagation()} className="relative grid w-full max-w-lg gap-5 rounded-2xl bg-white p-7 shadow-2xl">
        <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border-0 bg-slate-100 text-marinho">
          <X size={18} />
        </button>
        <h2 className="m-0 pr-10 font-outfit text-2xl text-texto">Nova Unidade de Ação</h2>

        <label className="grid gap-2 text-sm font-bold text-marinho">
          Nome da Unidade
          <input value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Digite o nome da unidade" required className="min-h-[54px] rounded-xl border border-borda px-4 text-texto outline-none focus:border-marinho" />
        </label>

        <label className="grid gap-2 text-sm font-bold text-marinho">
          Igreja
          <input disabled value={usuario.igrejaNome || "Igreja vinculada"} className="min-h-[54px] rounded-xl border border-borda bg-slate-50 px-4 text-muted" />
        </label>

        <label className="grid gap-2 text-sm font-bold text-marinho">
          Professor Responsável
          <select value={professorId} onChange={(event) => setProfessorId(event.target.value)} required className="min-h-[54px] rounded-xl border border-borda bg-white px-4 text-texto outline-none focus:border-marinho">
            <option value="">Selecione o professor</option>
            {professores.map((professor) => <option key={professor.id} value={professor.id}>{professor.nome}</option>)}
          </select>
          {!professores.length && <span className="text-xs font-normal text-amber-700">Nenhum professor cadastrado nesta igreja.</span>}
        </label>

        <label className="grid gap-2 text-sm font-bold text-marinho">
          Diretor da Escola Sabatina
          <input disabled value={usuario.nome || "Diretor logado"} className="min-h-[54px] rounded-xl border border-borda bg-slate-50 px-4 text-muted" />
        </label>

        <button type="submit" disabled={salvando || !professorId} className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-xl border-0 bg-marinho px-5 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50">
          <Plus size={20} /> {salvando ? "Adicionando..." : "Adicionar classe"}
        </button>
      </form>
    </div>
  );
}


function calcularDataSabado(ano, semana) {
  const data = new Date(ano, 0, 1, 12, 0, 0);
  const diaSemana = data.getDay();
  const diasParaPrimeiroSabado = (6 - diaSemana + 7) % 7;
  data.setDate(data.getDate() + diasParaPrimeiroSabado + (semana - 1) * 7);
  
  const d = String(data.getDate()).padStart(2, '0');
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const y = data.getFullYear();
  return `${d}/${m}/${y}`;
}

function formatarDataBR(data) {
  const d = String(data.getDate()).padStart(2, "0");
  const m = String(data.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${data.getFullYear()}`;
}

function periodoTrimestre(ano, trimestre) {
  const inicio = new Date(ano, (trimestre - 1) * 3, 1, 12, 0, 0);
  const fim = new Date(ano, trimestre * 3, 0, 12, 0, 0);
  return `${formatarDataBR(inicio)} a ${formatarDataBR(fim)}`;
}

function semanasDoTrimestre(ano, trimestre) {
  const inicioTrimestre = new Date(ano, (trimestre - 1) * 3, 1, 12, 0, 0);
  const fimTrimestre = new Date(ano, trimestre * 3, 0, 12, 0, 0);
  const primeiroSabado = new Date(ano, 0, 1, 12, 0, 0);
  const diasParaPrimeiroSabado = (6 - primeiroSabado.getDay() + 7) % 7;
  primeiroSabado.setDate(primeiroSabado.getDate() + diasParaPrimeiroSabado);

  const semanasFiltradas = [];
  for (let numero = 1, data = new Date(primeiroSabado); data.getFullYear() === ano; numero += 1, data.setDate(data.getDate() + 7)) {
    if (data >= inicioTrimestre && data <= fimTrimestre) {
      semanasFiltradas.push({
        numero: semanasFiltradas.length + 1,
        semanaAno: numero,
        data: formatarDataBR(data),
        rotulo: `Semana ${numero} - ${formatarDataBR(data)}`
      });
    }
  }

  return semanasFiltradas;
}

function separarNomes(valor) {
  return String(valor || "")
    .split(/\r?\n|,/)
    .map((nome) => nome.trim())
    .filter(Boolean);
}

export function ProfessorPage() {
  const { aba } = useParams();
  const [ano, setAno] = useState(anoAtual);
  const [trimestre, setTrimestre] = useState(1);
  const [semana, setSemana] = useState(1);
  const [unidades, setUnidades] = useState([]);
  const [unidadeId, setUnidadeId] = useState("");
  const [carregandoUnidades, setCarregandoUnidades] = useState(true);
  const [carregandoMetas, setCarregandoMetas] = useState(false);
  const [erroMetas, setErroMetas] = useState("");
  const [modalNovaUnidade, setModalNovaUnidade] = useState(false);
  const [card, setCard] = useState(null);
  const [coleta, setColeta] = useState(null);
    const [open, setOpen] = useState("Coleta semanal");
  const [form, setForm] = useState({});
  const [presencas, setPresencas] = useState([]);
  const [questionariosAlunos, setQuestionariosAlunos] = useState([]);
  const [novoAluno, setNovoAluno] = useState(alunoInicial);
  const [novoEstudo, setNovoEstudo] = useState({ alunoNome: "", interessadoNome: "" });
  const [modalAcaoAluno, setModalAcaoAluno] = useState(null);
  const [modalEstudoAluno, setModalEstudoAluno] = useState(null);
  const [novaConfrat, setNovaConfrat] = useState({ descricao: "", data: "" });
  const [novoBatismo, setNovoBatismo] = useState("");
  const [saving, setSaving] = useState(false);
  const [headerCheckboxes, setHeaderCheckboxes] = useState({ estudouLicao: false, foiPontual: false, pequenoGrupo: false, acaoSolidaria: false, estudosBiblicos: false });
  const [etapaTrimestral, setEtapaTrimestral] = useState(-1);
  const [mostrarAvaliacoes, setMostrarAvaliacoes] = useState(false);
  const [avaliacoesTrimestrais, setAvaliacoesTrimestrais] = useState([]);

  useEffect(() => {
    if (usuario?.papel === "ADMIN") return;
    getUnidades({ igrejaAtual: true }).then((lista) => {
      setUnidades(lista);
      setUnidadeId((atual) => atual || lista[0]?.id || "");
    }).catch(() => {
      setUnidades([]);
      setErroMetas("Não foi possível consultar as classes desta igreja.");
    }).finally(() => setCarregandoUnidades(false));
  }, [usuario?.papel]);

  async function carregar() {
    const params = { ano, trimestre, ...(unidadeId ? { unidadeId } : {}) };
    const data = await getProfessorCard(params);
    setCard(data);
    setPresencas(data.cartao?.presencas || []);
    setForm({
      incentivaEstudo: Boolean(data.cartao?.incentivaEstudo),
        visitouAlunos: Boolean(data.cartao?.visitouAlunos),
        promoveuConfraternizacao: Boolean(data.cartao?.promoveuConfraternizacao),
      incentivaPontualidade: Boolean(data.cartao?.incentivaPontualidade),
      primeiraVisita: inputDate(data.cartao?.primeiraVisita),
      ultimaVisita: inputDate(data.cartao?.ultimaVisita),
      pequenoGrupoResponsavel: data.cartao?.pequenoGrupoResponsavel || "",
      pequenoGrupoEndereco: data.cartao?.pequenoGrupoEndereco || "",
      pequenoGrupoDia: data.cartao?.pequenoGrupoDia || "",
      pequenoGrupoHorario: data.cartao?.pequenoGrupoHorario || "",
      acaoSocialDescricao: data.cartao?.acaoSocialDescricao || "",
      acaoSocialTipo: data.cartao?.acaoSocialTipo || "",
      acaoSocialData: inputDate(data.cartao?.acaoSocialData),
      acaoSocialLocal: data.cartao?.acaoSocialLocal || "",
      pessoasAlcancadas: Number(data.cartao?.pessoasAlcancadas || 0),
      interessadosAlcancados: Number(data.cartao?.interessadosAlcancados || 0),
      batismos: Number(data.cartao?.batismos || 0),
      batismosNomes: data.cartao?.batismosNomes || "",
      planejamentoTrimestral: Boolean(data.cartao?.planejamentoTrimestral)
    });
    await carregarQuestionariosAlunos(data);
  }

  async function carregarQuestionariosAlunos(cardAtual = card) {
    const alunos = cardAtual?.alunos || [];
    if (!alunos.length) {
      setQuestionariosAlunos([]);
      return;
    }

    const cartoes = await getCartoesAluno({ ano, trimestre });
    const porAluno = new Map(cartoes.map((cartao) => [cartao.alunoId, cartao]));
    setQuestionariosAlunos(alunos.map((aluno) => {
      const cartao = porAluno.get(aluno.id);
      return cartao ? {
        id: cartao.id,
        alunoId: aluno.id,
        alunoNome: aluno.nome,
        pequenoGrupo: Boolean(cartao.pequenoGrupo),
        acaoSolidaria: Boolean(cartao.acaoSolidaria),
        acaoSolidariaDescricao: cartao.acaoSolidariaDescricao || "",
        acaoSolidariaTipo: cartao.acaoSolidariaTipo || "",
        ministrouEstudoBiblico: Boolean(cartao.ministrouEstudoBiblico)
      } : alunoQuestionarioVazio(aluno);
    }));
  }

  async function carregarColeta() {
    if (!unidadeId) return;
    const data = await getColetaSemanal({ ano, semana, unidadeId });
    setColeta({
      ...data,
      alunos: data.alunos.map((item) => ({
        ...item,
        coleta: {
          ...item.coleta,
          estudouLicao: Boolean(item.coleta?.estudouLicao),
          foiPontual: Boolean(item.coleta?.foiPontual)
        }
      }))
    });
  }

  
  useEffect(() => {
    if (usuario?.papel === "ADMIN") return;
    if (!unidadeId) return;
    setCarregandoMetas(true);
    setErroMetas("");
    carregar()
      .catch((error) => {
        setCard(null);
        setErroMetas(error.response?.data?.message || "Não foi possível carregar as metas.");
      })
      .finally(() => setCarregandoMetas(false));
  }, [ano, trimestre, unidadeId, usuario?.papel]);

  useEffect(() => {
    if (usuario?.papel === "ADMIN") return;
    carregarColeta().catch(() => setColeta(null));
      }, [ano, semana, unidadeId, usuario?.papel]);

  const semanas = useMemo(() => semanasDoTrimestre(ano, trimestre), [ano, trimestre]);
  const semanaSelecionada = useMemo(() => semanas.find((item) => item.numero === semana), [semanas, semana]);
  const dataSemanaSelecionada = semanaSelecionada?.data || calcularDataSabado(ano, semana);
  const trimestreAtualPeriodo = useMemo(() => periodoTrimestre(ano, trimestre), [ano, trimestre]);
  const nomesBatismos = useMemo(() => separarNomes(form.batismosNomes), [form.batismosNomes]);

  useEffect(() => {
    if (!semanas.length) return;
    if (!semanas.some((item) => item.numero === semana)) {
      setSemana(semanas[0].numero);
    }
  }, [semana, semanas]);

  useEffect(() => {
    if (usuario?.papel === "ADMIN") return;
    if (aba !== "trimestrais") return;
    carregarAvaliacoesTrimestrais().catch(() => setAvaliacoesTrimestrais([]));
  }, [aba, unidadeId, usuario?.papel]);

  async function carregarAvaliacoesTrimestrais() {
    const params = unidadeId ? { unidadeId } : {};
    const data = await getCartoesProfessor(params);
    setAvaliacoesTrimestrais(data);
  }

  function editarAvaliacaoTrimestral(avaliacao) {
    if (avaliacao.unidadeId) setUnidadeId(avaliacao.unidadeId);
    setAno(avaliacao.ano);
    setTrimestre(avaliacao.trimestre);
    setSemana(semanasDoTrimestre(avaliacao.ano, avaliacao.trimestre)[0]?.numero || 1);
    setEtapaTrimestral(1);
    setMostrarAvaliacoes(false);
  }

  function adicionarNomeBatismo() {
    const nome = novoBatismo.trim();
    if (!nome) {
      toast.error("Informe o nome da pessoa batizada.");
      return;
    }
    const lista = [...nomesBatismos, nome];
    setForm({ ...form, batismosNomes: lista.join("\n"), batismos: lista.length });
    setNovoBatismo("");
  }

  function removerNomeBatismo(indexRemover) {
    const lista = nomesBatismos.filter((_, index) => index !== indexRemover);
    setForm({ ...form, batismosNomes: lista.join("\n"), batismos: lista.length });
  }

  async function cancelarQuestionarioTrimestral() {
    setEtapaTrimestral(-1);
    setNovoEstudo({ alunoNome: "", interessadoNome: "" });
    setNovoBatismo("");
    setNovaConfrat({ descricao: "", data: "" });
    try {
      await carregar();
      toast.info("Questionário em andamento cancelado.");
    } catch {
      toast.error("Não foi possível recarregar os dados salvos.");
    }
  }

  function respostaSimNao(campo) {
    return (
      <div className="flex gap-5 mt-1">
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
          <input type="radio" className="w-4 h-4 text-marinho focus:ring-marinho" checked={form[campo] === true} onChange={() => setForm({ ...form, [campo]: true })} /> Sim
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
          <input type="radio" className="w-4 h-4 text-marinho focus:ring-marinho" checked={form[campo] === false} onChange={() => setForm({ ...form, [campo]: false })} /> Não
        </label>
      </div>
    );
  }

  function renderPerguntaTrimestral() {
    if (etapaTrimestral === -1) {
      return (
        <div className="min-h-[220px] flex flex-col justify-center gap-4">
          <div className="max-w-2xl">
            <span className="inline-flex items-center justify-center rounded-lg bg-marinho/10 px-3 py-1 text-sm font-bold text-marinho">Metas - Professor</span>
            <h5 className="m-0 mt-4 font-outfit text-2xl text-texto">Iniciar Avaliação Trimestral da Unidade de Ação</h5>
            <p className="m-0 mt-2 text-sm text-muted">Clique em iniciar para escolher a unidade, o ano e o trimestre desta avaliação.</p>
          </div>
        </div>
      );
    }

    if (etapaTrimestral === 0) {
      return (
        <div className="grid gap-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="grid gap-1 text-sm font-bold">Unidade
              <select className="min-h-[42px] rounded-lg border border-borda px-3 bg-white" value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)}>
                {unidades.map((unidade) => <option key={unidade.id} value={unidade.id}>{unidade.nome}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold">Ano
              <input className="min-h-[42px] rounded-lg border border-borda px-3" type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} />
            </label>
            <label className="grid gap-1 text-sm font-bold">Trimestre
              <select className="min-h-[42px] rounded-lg border border-borda px-3 bg-white" value={trimestre} onChange={(e) => setTrimestre(Number(e.target.value))}>
                {[1, 2, 3, 4].map((item) => <option key={item} value={item}>{item}º trimestre</option>)}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-borda bg-marinho/5 p-4 text-marinho">
            <CalendarDays size={22} />
            <div>
              <strong className="block text-sm">Período selecionado</strong>
              <span className="text-sm">{trimestre}º trimestre de {ano}: {trimestreAtualPeriodo}</span>
            </div>
          </div>
        </div>
      );
    }

    switch (etapaTrimestral) {
      case 1:
        return (
          <>
            <span className="block font-bold text-texto text-sm">A unidade de ação está participando do programa de incentivo ao estudo da lição?</span>
            {respostaSimNao("incentivaEstudo")}
          </>
        );
      case 2:
        return (
          <>
            <span className="block font-bold text-texto text-sm">A unidade de ação está participando do programa de incentivo à pontualidade?</span>
            {respostaSimNao("incentivaPontualidade")}
          </>
        );
      case 3:
        return (
          <>
            <span className="block font-bold text-texto text-sm">O professor visitou pelo menos um dos seus alunos por mês, todos os meses no decorrer do ano?</span>
            {respostaSimNao("visitouAlunos")}
            <div className="mt-2 bg-black/5 p-4 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-1 text-sm font-bold text-marinho">Primeira visita<ModalInput type="date" label="Primeira visita" value={form.primeiraVisita} onChange={(v) => setForm({ ...form, primeiraVisita: v })} /></div>
              <div className="grid gap-1 text-sm font-bold text-marinho">Ultima visita<ModalInput type="date" label="Ultima visita" value={form.ultimaVisita} onChange={(v) => setForm({ ...form, ultimaVisita: v })} /></div>
            </div>
          </>
        );
      case 4:
        return (
          <>
            <span className="block font-bold text-texto text-sm">Participação do professor na Classe dos Professores. Marque os sábados em que o professor participou.</span>
            <div className="flex flex-wrap gap-3 mt-2">
              {presencas.map((item) => (
                <label key={item.numeroSabado} className="flex items-center gap-2 min-h-[40px] rounded-lg border border-borda px-3 text-sm cursor-pointer hover:bg-black/5 transition-colors">
                  <input type="checkbox" checked={Boolean(item.presente)} onChange={(e) => setPresencas((atuais) => atuais.map((p) => p.numeroSabado === item.numeroSabado ? { ...p, presente: e.target.checked } : p))} className="w-4 h-4 rounded text-marinho focus:ring-marinho" />
                  Sábado {item.numeroSabado}
                </label>
              ))}
            </div>
          </>
        );
      case 5:
        return (
          <>
            <span className="block font-bold text-texto text-sm">Funcionamento de um Pequeno Grupo com os membros da classe e interessados. Escreva onde funciona o PG, o dia da semana e o horário em que acontece.</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div className="grid gap-1 text-sm font-bold text-marinho sm:col-span-2">Nome da pessoa responsavel pelo Pequeno Grupo:<ModalInput label="Responsavel pelo PG" value={form.pequenoGrupoResponsavel} onChange={(v) => setForm({ ...form, pequenoGrupoResponsavel: v })} /></div>
              <div className="grid gap-1 text-sm font-bold text-marinho sm:col-span-2">Endereco:<ModalInput label="Endereco do PG" value={form.pequenoGrupoEndereco} onChange={(v) => setForm({ ...form, pequenoGrupoEndereco: v })} /></div>
              <div className="grid gap-1 text-sm font-bold text-marinho">Dia da semana:<ModalInput label="Dia da semana" type="select" options={[{value:"Domingo",label:"Domingo"},{value:"Segunda-feira",label:"Segunda-feira"},{value:"Terça-feira",label:"Terça-feira"},{value:"Quarta-feira",label:"Quarta-feira"},{value:"Quinta-feira",label:"Quinta-feira"},{value:"Sexta-feira",label:"Sexta-feira"},{value:"Sábado",label:"Sábado"}]} value={form.pequenoGrupoDia} onChange={(v) => setForm({ ...form, pequenoGrupoDia: v })} /></div>
              <div className="grid gap-1 text-sm font-bold text-marinho">Horário:<ModalInput label="Horário" type="time" value={form.pequenoGrupoHorario} onChange={(v) => setForm({ ...form, pequenoGrupoHorario: v })} /></div>
            </div>
          </>
        );
      case 6:
        return (
          <>
            <span className="block font-bold text-texto text-sm">Promoção de uma ação social para captação de interessados. Descreva a ação social realizada.</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div className="grid gap-1 text-sm font-bold text-marinho sm:col-span-2">Descrição da ação social<ModalInput label="Descrição da ação social" type="textarea" value={form.acaoSocialDescricao} onChange={(v) => setForm({ ...form, acaoSocialDescricao: v })} /></div>
              <div className="grid gap-1 text-sm font-bold text-marinho sm:col-span-2">Tipo de ação:<ModalInput label="Tipo de ação" value={form.acaoSocialTipo} onChange={(v) => setForm({ ...form, acaoSocialTipo: v })} /></div>
              <div className="grid gap-1 text-sm font-bold text-marinho">Data:<ModalInput label="Data da ação" type="date" value={form.acaoSocialData} onChange={(v) => setForm({ ...form, acaoSocialData: v })} /></div>
              <div className="grid gap-1 text-sm font-bold text-marinho">Local:<ModalInput label="Local da ação" value={form.acaoSocialLocal} onChange={(v) => setForm({ ...form, acaoSocialLocal: v })} /></div>
              <div className="grid gap-1 text-sm font-bold text-marinho">Quantidade de pessoas envolvidas:<ModalInput label="Pessoas envolvidas" type="number" value={form.pessoasAlcancadas} onChange={(v) => setForm({ ...form, pessoasAlcancadas: v })} /></div>
              <div className="grid gap-1 text-sm font-bold text-marinho">Quantidade de interessados alcançados:<ModalInput label="Interessados alcançados" type="number" value={form.interessadosAlcancados} onChange={(v) => setForm({ ...form, interessadosAlcancados: v })} /></div>
            </div>
          </>
        );
      case 7:
        return (
          <>
            <span className="block font-bold text-texto text-sm">A unidade de ação teve pelo menos 50% dos alunos ministrando pelo menos uma série de estudos bíblicos no decorrer do ano? Anote o nome dos alunos e a pessoa para quem estão ministrando o estudo bíblico.</span>
            <div className="flex flex-col gap-3 mt-2">
              <label className="grid gap-1 text-sm font-bold text-marinho">Nome do aluno da unidade de ação:
                <select
                  className="min-h-[42px] rounded-lg border border-borda px-3 bg-white font-normal text-texto"
                  value={novoEstudo.alunoNome}
                  onChange={(e) => setNovoEstudo({ ...novoEstudo, alunoNome: e.target.value })}
                >
                  <option value="">Selecione um aluno da classe</option>
                  {(card?.alunos || []).map((aluno) => (
                    <option key={aluno.id} value={aluno.nome}>{aluno.nome}</option>
                  ))}
                </select>
              </label>
              <div className="grid gap-1 text-sm font-bold text-marinho">Nome da pessoa que recebe o estudo:<ModalInput label="Pessoa que recebe o estudo" placeholder="Pessoa que recebe o estudo" value={novoEstudo.interessadoNome} onChange={(v) => setNovoEstudo({ ...novoEstudo, interessadoNome: v })} /></div>
              <button type="button" onClick={adicionarEstudo} className="self-end inline-flex items-center justify-center gap-2 min-h-[42px] px-4 rounded-lg border-0 bg-marinho text-white font-bold cursor-pointer hover:bg-marinho/90 transition-colors"><Plus size={16} /> Adicionar estudo</button>
            </div>
            {card?.cartao?.estudosBiblicos?.length > 0 && (
              <div className="mt-2 bg-black/5 p-4 rounded-lg">
                <h5 className="m-0 text-sm font-bold text-marinho mb-2">Estudos adicionados:</h5>
                <ul className="m-0 pl-5 text-sm text-muted grid gap-1">
                  {card.cartao.estudosBiblicos.map((item) => <li key={item.id}><strong>{item.alunoNome}</strong> ensina <strong>{item.interessadoNome}</strong></li>)}
                </ul>
              </div>
            )}
          </>
        );
      case 8:
        return (
          <>
            <span className="block font-bold text-texto text-sm">Cada unidade de ação deve levar pelo menos uma pessoa ao batismo no decorrer do ano. Nome de quem se batizou por meio da unidade de ação.</span>
            <div className="grid gap-2 mt-2">
              <label className="grid gap-1 text-sm font-bold text-marinho">Nomes dos batismos:
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    className="min-h-[42px] flex-1 rounded-lg border border-borda px-3 font-normal text-texto"
                    value={novoBatismo}
                    onChange={(e) => setNovoBatismo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        adicionarNomeBatismo();
                      }
                    }}
                    placeholder="Nome da pessoa batizada"
                  />
                  <button type="button" onClick={adicionarNomeBatismo} className="inline-flex items-center justify-center gap-2 min-h-[42px] px-4 rounded-lg border-0 bg-marinho text-white font-bold cursor-pointer hover:bg-marinho/90 transition-colors">
                    <Plus size={16} /> Adicionar
                  </button>
                </div>
              </label>
              {nomesBatismos.length > 0 && (
                <div className="rounded-lg bg-black/5 p-4">
                  <h5 className="m-0 text-sm font-bold text-marinho mb-2">Nomes:</h5>
                  <ul className="m-0 p-0 list-none grid gap-2">
                    {nomesBatismos.map((nome, index) => (
                      <li key={`${nome}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm text-texto">
                        <span>{nome}</span>
                        <button type="button" onClick={() => removerNomeBatismo(index)} className="w-8 h-8 inline-flex items-center justify-center rounded-full border-0 bg-black/5 text-muted cursor-pointer hover:bg-black/10" aria-label={`Remover ${nome}`}>
                          <X size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <span className="text-sm text-muted">Quantidade de batismos: <strong>{nomesBatismos.length}</strong></span>
            </div>
          </>
        );
      case 9:
        return (
          <>
            <span className="block font-bold text-texto text-sm">A unidade de ação promoveu almoços, encontros sociais, pôr do sol juntos ou comemoração dos aniversariantes?</span>
            {respostaSimNao("promoveuConfraternizacao")}
            <div className="mt-4 border-t border-borda pt-4">
              <span className="block font-bold text-texto text-sm mb-3">Campos adicionais - liste as ações realizadas:</span>
              <div className="flex flex-col gap-3">
                <div className="grid gap-1 text-sm font-bold text-marinho">Ação:<ModalInput label="Ação realizada" placeholder="Ação realizada" value={novaConfrat.descricao} onChange={(v) => setNovaConfrat({ ...novaConfrat, descricao: v })} /></div>
                <div className="grid gap-1 text-sm font-bold text-marinho">Data:<ModalInput label="Data da confraternização" type="date" value={novaConfrat.data} onChange={(v) => setNovaConfrat({ ...novaConfrat, data: v })} /></div>
                <button type="button" onClick={adicionarConfrat} className="self-end inline-flex items-center justify-center gap-2 min-h-[42px] px-4 rounded-lg border-0 bg-marinho text-white font-bold cursor-pointer hover:bg-marinho/90 transition-colors"><Plus size={16} /> Adicionar ação</button>
              </div>
              {card?.cartao?.confraternizacoes?.length > 0 && (
                <div className="mt-3 bg-black/5 p-4 rounded-lg">
                  <ul className="m-0 pl-5 text-sm text-muted grid gap-1">
                    {card.cartao.confraternizacoes.map((item) => <li key={item.id}><strong>{item.descricao}</strong> | Data: {inputDate(item.data)}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </>
        );
      case 10:
      default:
        return (
          <>
            <span className="block font-bold text-texto text-sm">A unidade de ação realizou reuniões de planejamento e distribuiu as funções da Escola Sabatina entre os alunos? Foi realizada reunião de avaliação e planejamento para o próximo trimestre?</span>
            {respostaSimNao("planejamentoTrimestral")}
          </>
        );
    }
  }

  function atualizarColeta(alunoId, campo, valor) {
    setColeta((atual) => ({
      ...atual,
      alunos: atual.alunos.map((item) => item.aluno.id === alunoId
        ? { ...item, coleta: { ...item.coleta, [campo]: valor } }
        : item)
    }));
  }

  
  function marcarTodosColeta(campo, valor) {
    setHeaderCheckboxes((prev) => ({ ...prev, [campo]: valor }));
    setColeta((atual) => ({
      ...atual,
      alunos: atual.alunos.map((item) => ({
        ...item,
        coleta: { ...item.coleta, [campo]: valor }
      }))
    }));
  }

  
  
  async function salvarTudoSemana() {
    setSaving(true);
    try {
      if (unidadeId) {
        
      }
      if (coleta) {
        await salvarColetaSemanal({
          ano,
          numeroSemana: semana,
          unidadeId,
          respostas: coleta.alunos.map((item) => ({
            alunoId: item.aluno.id,
            estudouLicao: Boolean(item.coleta.estudouLicao),
            foiPontual: Boolean(item.coleta.foiPontual),
            pequenoGrupo: item.coleta.pequenoGrupo ?? null,
              acaoSolidaria: item.coleta.acaoSolidaria ?? null,
              acaoSolidariaDescricao: item.coleta.acaoSolidariaDescricao || "",
              acaoSolidariaTipo: item.coleta.acaoSolidariaTipo || "",
              estudosBiblicos: item.coleta.estudosBiblicos ?? null,
            observacao: item.coleta.observacao || ""
          }))
        });
      }
      toast.success("Respostas da semana salvas com sucesso!");
      setHeaderCheckboxes({ estudouLicao: false, foiPontual: false, pequenoGrupo: false, acaoSolidaria: false, estudosBiblicos: false });
      await Promise.all([carregar(), carregarColeta()]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Não foi possível salvar a semana.");
    } finally {
      setSaving(false);
    }
  }

  async function salvarQuestionario() {
    if (!card?.cartao?.id) return;
    setSaving(true);
    try {
      await salvarCartaoProfessor(card.cartao.id, {
        ...form,
        pessoasAlcancadas: Number(form.pessoasAlcancadas || 0),
        interessadosAlcancados: Number(form.interessadosAlcancados || 0),
        batismos: nomesBatismos.length || Number(form.batismos || 0)
      });
      for (const presenca of presencas) {
        await salvarPresencaProfessor(card.cartao.id, presenca.numeroSabado, Boolean(presenca.presente));
      }
      toast.success("Questionário do professor salvo.");
      await carregar();
    } catch (error) {
      toast.error(error.response?.data?.message || "Não foi possível salvar o questionário.");
    } finally {
      setSaving(false);
    }
  }

  async function adicionarEstudo() {
    if (!novoEstudo.alunoNome.trim() || !novoEstudo.interessadoNome.trim()) {
      toast.error("Informe o aluno e a pessoa que recebe o estudo.");
      return;
    }
    await adicionarEstudoBiblico(card.cartao.id, novoEstudo);
    setNovoEstudo({ alunoNome: "", interessadoNome: "" });
    toast.success("Estudo bíblico adicionado.");
    await carregar();
  }

  async function adicionarConfrat() {
    if (!novaConfrat.descricao.trim() || !novaConfrat.data) {
      toast.error("Informe a ação e a data.");
      return;
    }
    await adicionarConfraternizacao(card.cartao.id, novaConfrat);
    setNovaConfrat({ descricao: "", data: "" });
    toast.success("Confraternização adicionada.");
    await carregar();
  }

  async function cadastrarAluno() {
    const nome = novoAluno.nome.trim();
    if (!nome) {
      toast.error("Informe o nome do aluno.");
      return;
    }
    if (!unidadeId) {
      toast.error("Selecione uma Unidade de Ação.");
      return;
    }

    setSaving(true);
    try {
      const dados = new FormData();
      dados.append("nome", nome);
      dados.append("sexo", novoAluno.sexo);
      dados.append("whatsapp", novoAluno.whatsapp.trim());
      dados.append("unidadeId", unidadeId);

      await criarAluno(dados);
      toast.success("Aluno cadastrado na Unidade de Ação selecionada.");
      setNovoAluno(alunoInicial);
      await Promise.all([carregar(), carregarColeta()]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Não foi possível cadastrar o aluno.");
    } finally {
      setSaving(false);
    }
  }

  if (usuario?.papel === "ADMIN") {
    return <AdminMetasDashboard tipo={aba === "trimestrais" ? "professores" : "alunos"} />;
  }

  if (carregandoUnidades || carregandoMetas) {
    return <div className="p-10 bg-white rounded-xl shadow-sm text-muted text-center max-w-sm mx-auto mt-10">Carregando metas...</div>;
  }

  if (!unidades.length) {
    return (
      <>
        <div className="p-8 bg-white rounded-xl shadow-sm text-center max-w-xl mx-auto mt-10">
          <h2 className="m-0 font-outfit text-2xl text-marinho">Nenhuma classe cadastrada</h2>
          <p className="mt-3 mb-5 text-muted">
            Para lançar as metas, primeiro crie o acesso de um professor e depois cadastre a Unidade de Ação dessa igreja.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/professores" className="inline-flex min-h-[42px] items-center justify-center rounded-lg bg-marinho px-4 font-bold text-white no-underline">
              Cadastrar professor
            </Link>
            <button type="button" onClick={() => setModalNovaUnidade(true)} className="inline-flex min-h-[42px] items-center justify-center rounded-lg border border-borda bg-white px-4 font-bold text-marinho">
              Cadastrar classe
            </button>
          </div>
        </div>
        <NovaUnidadeModal
          aberto={modalNovaUnidade}
          onClose={() => setModalNovaUnidade(false)}
          onCriada={(unidade) => {
            setUnidades([unidade]);
            setUnidadeId(unidade.id);
            setModalNovaUnidade(false);
          }}
        />
      </>
    );
  }

  if (!card) {
    return (
      <div className="p-8 bg-white rounded-xl shadow-sm text-center max-w-xl mx-auto mt-10">
        <h2 className="m-0 font-outfit text-2xl text-marinho">Não foi possível mostrar as metas</h2>
        <p className="mt-3 mb-0 text-muted">{erroMetas || "Atualize a página e tente novamente."}</p>
      </div>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-5 items-start">
      

        {(!aba || aba === "semanais") && (
<>
<div className="mb-[2px]">
          <h2 className="m-0 font-outfit tracking-tight text-[23px] sm:text-[26px] leading-tight">Painel do Professor</h2>
          <p className="m-0 mt-1.5 text-muted">Gerencie sua unidade, preencha a coleta semanal e o questionário trimestral.</p>
        </div>

{/* METAS SEMANAIS */}
        <div className="mt-4 grid gap-4">
          <h3 className="m-0 font-outfit tracking-tight text-[22px] text-marinho mb-1 border-b border-borda pb-2">Metas - Aluno</h3>
          
          <Card animated delay={0.13} className="grid gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="bg-marinho/5 p-3 rounded-xl text-marinho hidden md:block">
                <UserPlus size={24} />
              </div>
              <div className="flex-1">
                <h4 className="m-0 font-outfit text-base">Cadastrar novo aluno</h4>
                <p className="m-0 text-sm text-muted">Unidade: {card?.unidade?.nome || "Selecione"}</p>
              </div>
              <button type="button" onClick={cadastrarAluno} disabled={saving} className="inline-flex w-full md:w-auto items-center justify-center min-h-[42px] px-4 rounded-lg border-0 bg-marinho text-white font-extrabold cursor-pointer">
                Cadastrar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <label className="grid gap-1 text-sm font-bold text-marinho md:col-span-5">Nome *
                  <input className="min-h-[42px] rounded-lg border border-borda px-3 font-normal text-texto" value={novoAluno.nome} onChange={(e) => setNovoAluno((atual) => ({ ...atual, nome: e.target.value }))} placeholder="Digite o nome..." />
                </label>
                <label className="grid gap-1 text-sm font-bold text-marinho md:col-span-2">Sexo *
                  <select className="min-h-[42px] rounded-lg border border-borda bg-white px-3 font-normal text-texto" value={novoAluno.sexo} onChange={(e) => setNovoAluno((atual) => ({ ...atual, sexo: e.target.value }))}>
                    <option value="MASCULINO">M</option>
                    <option value="FEMININO">F</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-bold text-marinho md:col-span-5">WhatsApp
                  <input className="min-h-[42px] rounded-lg border border-borda px-3 font-normal text-texto" value={novoAluno.whatsapp} onChange={(e) => setNovoAluno((atual) => ({ ...atual, whatsapp: e.target.value }))} placeholder="(00) 00000-0000" />
                </label>
            </div>
          </Card>

          <div className="grid gap-3">
          <Card animated delay={0.132} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <label className="grid gap-1 text-sm font-bold">Unidade
              <select className="min-h-[42px] rounded-lg border border-borda px-3 bg-white" value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)}>
                {unidades.map((unidade) => <option key={unidade.id} value={unidade.id}>{unidade.nome}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold">Ano
              <input className="min-h-[42px] rounded-lg border border-borda px-3" type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} />
            </label>
            <label className="grid gap-1 text-sm font-bold">Trimestre
              <select className="min-h-[42px] rounded-lg border border-borda px-3 bg-white" value={trimestre} onChange={(e) => setTrimestre(Number(e.target.value))}>
                {[1, 2, 3, 4].map((item) => <option key={item} value={item}>{item}º trimestre</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold">Semana
              <select key={`${ano}-${trimestre}`} className="min-h-[42px] rounded-lg border border-borda px-3 bg-white" value={semana} onChange={(e) => setSemana(Number(e.target.value))}>
                {semanas.map((item) => <option key={`${ano}-${trimestre}-${item.numero}`} value={item.numero}>{item.rotulo}</option>)}
              </select>
            </label>
          </Card>
          <div className="text-sm text-marinho/80 font-medium px-2">
            Data da classe/coleta: <strong>Sábado, {dataSemanaSelecionada}</strong>
          </div>
          </div>

          <Card animated delay={0.135} className="grid gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="m-0 font-outfit text-lg">Coleta Semanal dos Alunos</h3>
                <p className="m-0 mt-1 text-muted text-sm">Preenchimento da unidade para a semana selecionada.</p>
              </div>
              <button type="button" onClick={salvarTudoSemana} disabled={saving} className="inline-flex w-full sm:w-auto items-center justify-center gap-2 min-h-[42px] px-4 rounded-lg border-0 bg-marinho text-white font-extrabold cursor-pointer">
                <Save size={17} /> Salvar semana
              </button>
            </div>
            
            <div className="bg-blue-50/50 p-3 sm:p-4 rounded-xl border border-blue-100">
                <h4 className="text-sm font-bold text-marinho mb-2">Legenda das Perguntas Semanais:</h4>
                <ul className="text-sm text-muted grid gap-1.5 list-disc pl-4">
                  <li><strong>Estudou a lição:</strong> Estudou a lição durante a semana?</li>
                  <li><strong>Pontual:</strong> Foi pontual no sábado?</li>
                  <li><strong>PG:</strong> Você participou regularmente do Pequeno Grupo com os membros da classe?</li>
                  <li><strong>Ação:</strong> Você participou de uma ação solidária para captação de interessados?</li>
                  <li><strong>Estudo Bíblico:</strong> Você ministrou, ou acompanhou, estudo bíblico para alguém no decorrer desse trimestre?</li>
                </ul>
            </div>

            <div className="mobile-full-bleed touch-scroll table-scroll-hint overflow-x-auto border border-borda rounded-lg">
              <table className="w-full min-w-[720px] sm:min-w-[760px] border-collapse">
                <thead>
                  <tr className="bg-black/5">
                    <th className="px-3 py-3 text-left text-muted text-xs border-b border-borda font-semibold">Aluno</th>
                    <th className="px-3 py-3 text-center text-muted text-xs border-b border-borda font-semibold" title="Estudou a lição durante a semana?">
                      <div className="flex flex-col items-center gap-1">
                        Estudou a lição
                        <input type="checkbox" checked={headerCheckboxes.estudouLicao} onChange={(e) => marcarTodosColeta("estudouLicao", e.target.checked)} title="Marcar todos" className="cursor-pointer" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-center text-muted text-xs border-b border-borda font-semibold" title="Foi pontual no sábado?">
                      <div className="flex flex-col items-center gap-1">
                        Pontual
                        <input type="checkbox" checked={headerCheckboxes.foiPontual} onChange={(e) => marcarTodosColeta("foiPontual", e.target.checked)} title="Marcar todos" className="cursor-pointer" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-center text-muted text-xs border-b border-borda font-semibold" title="Você participou regularmente do Pequeno Grupo com os membros da classe?">
                      <div className="flex flex-col items-center gap-1">
                        PG
                        <input type="checkbox" checked={headerCheckboxes.pequenoGrupo} onChange={(e) => marcarTodosColeta("pequenoGrupo", e.target.checked)} title="Marcar todos" className="cursor-pointer" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-center text-muted text-xs border-b border-borda font-semibold" title="Você participou de uma ação solidária para captação de interessados?">
                      <div className="flex flex-col items-center gap-1">
                        Ação
                        <input type="checkbox" checked={headerCheckboxes.acaoSolidaria} onChange={(e) => marcarTodosColeta("acaoSolidaria", e.target.checked)} title="Marcar todos" className="cursor-pointer" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-center text-muted text-xs border-b border-borda font-semibold" title="Você ministrou, ou acompanhou, estudo bíblico para alguém no decorrer desse trimestre?">
                      <div className="flex flex-col items-center gap-1">
                        Estudo Bíblico
                        <input type="checkbox" checked={headerCheckboxes.estudosBiblicos} onChange={(e) => marcarTodosColeta("estudosBiblicos", e.target.checked ? 1 : null)} title="Marcar todos" className="cursor-pointer" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left text-muted text-xs border-b border-borda font-semibold">
                      <div className="flex flex-col items-start gap-1">
                        <span>Observação ({dataSemanaSelecionada})</span>
                        <input type="checkbox" className="invisible" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(coleta?.alunos || []).map((item, i) => (
                    <tr key={item.aluno.id} className={i % 2 === 0 ? "bg-white" : "bg-black/[0.02]"}>
                      <td className="px-3 py-2.5 border-b border-borda text-sm font-bold text-texto">{item.aluno.nome}</td>
                      <td className="px-3 py-2.5 border-b border-borda text-center"><input type="checkbox" checked={item.coleta.estudouLicao} onChange={(e) => atualizarColeta(item.aluno.id, "estudouLicao", e.target.checked)} className="cursor-pointer" /></td>
                      <td className="px-3 py-2.5 border-b border-borda text-center"><input type="checkbox" checked={item.coleta.foiPontual} onChange={(e) => atualizarColeta(item.aluno.id, "foiPontual", e.target.checked)} className="cursor-pointer" /></td>
                      <td className="px-3 py-2.5 border-b border-borda text-center"><input type="checkbox" checked={item.coleta.pequenoGrupo === true} onChange={(e) => atualizarColeta(item.aluno.id, "pequenoGrupo", e.target.checked)} className="cursor-pointer" /></td>
                      <td className="px-3 py-2.5 border-b border-borda text-center"><input type="checkbox" checked={item.coleta.acaoSolidaria === true} onChange={(e) => { atualizarColeta(item.aluno.id, "acaoSolidaria", e.target.checked); if (e.target.checked) setModalAcaoAluno(item.aluno.id); }} className="cursor-pointer" /></td>
                      <td className="px-3 py-2.5 border-b border-borda text-center"><input type="checkbox" checked={item.coleta.estudosBiblicos > 0} onChange={(e) => { if (e.target.checked) { setModalEstudoAluno(item.aluno.id); } else { atualizarColeta(item.aluno.id, "estudosBiblicos", null); } }} className="cursor-pointer" /></td>
                      <td className="px-3 py-2.5 border-b border-borda">
                        <ModalInput type="textarea" label={`Observação de ${item.aluno.nome}`} value={item.coleta.observacao || ""} onChange={(v) => atualizarColeta(item.aluno.id, "observacao", v)} placeholder="Clique para editar" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        </>
)}

{(aba === "trimestrais") && (
<>
{/* METAS TRIMESTRAIS */}
        <div className="mt-8 grid gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-borda pb-3">
            <div>
              <h3 className="m-0 font-outfit tracking-tight text-[22px] text-marinho">Metas - Professor</h3>
              <p className="m-0 mt-1 text-sm text-muted">Preencha uma etapa por vez para a unidade selecionada.</p>
            </div>
            <button type="button" onClick={() => { setMostrarAvaliacoes((atual) => !atual); if (!mostrarAvaliacoes) carregarAvaliacoesTrimestrais().catch(() => setAvaliacoesTrimestrais([])); }} className="inline-flex w-full md:w-auto items-center justify-center gap-2 min-h-[42px] px-4 rounded-lg border border-borda bg-white text-marinho font-bold cursor-pointer hover:bg-marinho/5 transition-colors">
              <Eye size={17} /> Avaliações respondidas
            </button>
          </div>

          {mostrarAvaliacoes && (
            <Card animated delay={0.1} className="grid gap-3" hoverable={false}>
              <div className="flex items-center justify-between gap-3">
                <h4 className="m-0 font-outfit text-base text-marinho">Avaliações trimestrais</h4>
                <span className="text-sm text-muted">{avaliacoesTrimestrais.length} registro(s)</span>
              </div>
              {avaliacoesTrimestrais.length === 0 ? (
                <p className="m-0 text-sm text-muted">Nenhuma avaliação trimestral respondida ainda.</p>
              ) : (
                <div className="grid gap-2">
                  {avaliacoesTrimestrais.map((avaliacao) => (
                    <div key={avaliacao.id} className="flex flex-col gap-3 rounded-lg border border-borda p-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <strong className="block text-sm text-texto">{avaliacao.trimestre}º trimestre de {avaliacao.ano}</strong>
                        <span className="block text-xs text-muted">{avaliacao.unidade?.nome || "Unidade selecionada"} | {periodoTrimestre(avaliacao.ano, avaliacao.trimestre)}</span>
                      </div>
                      <button type="button" onClick={() => editarAvaliacaoTrimestral(avaliacao)} className="inline-flex items-center justify-center gap-2 min-h-[38px] px-3 rounded-lg border-0 bg-marinho text-white text-sm font-bold cursor-pointer">
                        <Edit3 size={15} /> Editar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          <Card animated delay={0.12} className="grid gap-5" hoverable={false}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <span className="text-sm font-bold text-marinho">{etapaTrimestral === -1 ? "Início" : etapaTrimestral === 0 ? "Escolha do período" : `Pergunta ${etapaTrimestral} de 10`}</span>
                <h4 className="m-0 mt-1 font-outfit text-xl text-texto">{etapaTrimestral === -1 ? "Iniciar Avaliação Trimestral da Unidade de Ação" : etapaTrimestral === 0 ? "Ano e trimestre da avaliação" : "Avaliação trimestral do professor"}</h4>
                {etapaTrimestral >= 0 && <p className="m-0 mt-1 text-sm text-muted">{trimestre}º trimestre de {ano} | {trimestreAtualPeriodo}</p>}
              </div>
              <div className="flex flex-col gap-3 md:items-end">
                {etapaTrimestral >= 0 && (
                  <button type="button" onClick={cancelarQuestionarioTrimestral} className="inline-flex items-center justify-center gap-2 min-h-[38px] px-3 rounded-lg border border-borda bg-white text-marinho text-sm font-bold cursor-pointer hover:bg-red-50 hover:text-red-700 transition-colors">
                    <X size={16} /> Cancelar
                  </button>
                )}
                <div className="flex items-center gap-1">
                  {Array.from({ length: 12 }, (_, index) => (
                    <span key={index} className={`h-2 rounded-full transition-all ${index === etapaTrimestral + 1 ? "w-8 bg-marinho" : index < etapaTrimestral + 1 ? "w-2 bg-marinho/60" : "w-2 bg-borda"}`} />
                  ))}
                </div>
              </div>
            </div>

            <div className="min-h-[220px] rounded-lg border border-borda bg-white p-4">
              <div className="grid gap-4">
                {renderPerguntaTrimestral()}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={() => setEtapaTrimestral((atual) => Math.max(-1, atual - 1))} disabled={etapaTrimestral === -1} className="inline-flex items-center justify-center gap-2 min-h-[42px] px-4 rounded-lg border border-borda bg-white text-marinho font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                <ArrowLeft size={17} /> Voltar
              </button>
              {etapaTrimestral < 10 ? (
                <button type="button" onClick={() => setEtapaTrimestral((atual) => Math.min(10, atual + 1))} className="inline-flex items-center justify-center gap-2 min-h-[42px] px-4 rounded-lg border-0 bg-marinho text-white font-extrabold cursor-pointer">
                  {etapaTrimestral === -1 ? "Iniciar avaliação" : "Próxima pergunta"} <ArrowRight size={17} />
                </button>
              ) : (
                <button type="button" onClick={salvarQuestionario} disabled={saving} className="inline-flex items-center justify-center gap-2 min-h-[42px] px-5 rounded-lg border-0 bg-marinho text-white font-extrabold cursor-pointer disabled:opacity-70">
                  <Save size={18} /> Salvar avaliação
                </button>
              )}
            </div>
          </Card>
        </div>
        </>
)}

{false && (
<>
{/* METAS TRIMESTRAIS */}
        <div className="mt-8">
          <h3 className="m-0 font-outfit tracking-tight text-[22px] text-marinho mb-4 border-b border-borda pb-2">Metas - Professor</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
            <Card animated delay={0.16} className="grid gap-4">
             <h4 className="m-0 font-outfit text-base text-marinho">Pergunta 1</h4>
             <span className="block font-bold text-texto text-sm">A unidade de ação está participando do programa de incentivo ao estudo da lição?</span>
             <div className="flex gap-5 mt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="radio" className="w-4 h-4 text-marinho focus:ring-marinho" checked={form.incentivaEstudo === true} onChange={() => setForm({...form, incentivaEstudo: true})} /> Sim</label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="radio" className="w-4 h-4 text-marinho focus:ring-marinho" checked={form.incentivaEstudo === false} onChange={() => setForm({...form, incentivaEstudo: false})} /> Não</label>
             </div>
          </Card>

          <Card animated delay={0.17} className="grid gap-4">
             <h4 className="m-0 font-outfit text-base text-marinho">Pergunta 2</h4>
             <span className="block font-bold text-texto text-sm">A unidade de ação está participando do programa de incentivo à pontualidade?</span>
             <div className="flex gap-5 mt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="radio" className="w-4 h-4 text-marinho focus:ring-marinho" checked={form.incentivaPontualidade === true} onChange={() => setForm({...form, incentivaPontualidade: true})} /> Sim</label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="radio" className="w-4 h-4 text-marinho focus:ring-marinho" checked={form.incentivaPontualidade === false} onChange={() => setForm({...form, incentivaPontualidade: false})} /> Não</label>
             </div>
          </Card>

          <Card animated delay={0.18} className="grid gap-4">
             <h4 className="m-0 font-outfit text-base text-marinho">Pergunta 3</h4>
             <span className="block font-bold text-texto text-sm">O professor visitou pelo menos um dos seus alunos por mês, todos os meses no decorrer do ano?</span>
             <div className="flex gap-5 mt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="radio" className="w-4 h-4 text-marinho focus:ring-marinho" checked={form.visitouAlunos === true} onChange={() => setForm({...form, visitouAlunos: true})} /> Sim</label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="radio" className="w-4 h-4 text-marinho focus:ring-marinho" checked={form.visitouAlunos === false} onChange={() => setForm({...form, visitouAlunos: false})} /> Não</label>
             </div>
             <div className="mt-2 bg-black/5 p-4 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-1 text-sm font-bold text-marinho">Primeira visita<ModalInput type="date" label="Primeira visita" value={form.primeiraVisita} onChange={(v) => setForm({ ...form, primeiraVisita: v })} /></div>
                <div className="grid gap-1 text-sm font-bold text-marinho">Última visita<ModalInput type="date" label="Última visita" value={form.ultimaVisita} onChange={(v) => setForm({ ...form, ultimaVisita: v })} /></div>
             </div>
          </Card>

          <Card animated delay={0.19} className="grid gap-4 lg:col-span-2">
             <h4 className="m-0 font-outfit text-base text-marinho">Pergunta 4</h4>
             <span className="block font-bold text-texto text-sm">Participação do professor na Classe dos Professores. Marque os sábados em que o professor participou.</span>
             <div className="flex flex-wrap gap-3 mt-2">
              {presencas.map((item) => (
                <label key={item.numeroSabado} className="flex items-center gap-2 min-h-[40px] rounded-lg border border-borda px-3 text-sm cursor-pointer hover:bg-black/5 transition-colors">
                  <input type="checkbox" checked={Boolean(item.presente)} onChange={(e) => setPresencas((atuais) => atuais.map((p) => p.numeroSabado === item.numeroSabado ? { ...p, presente: e.target.checked } : p))} className="w-4 h-4 rounded text-marinho focus:ring-marinho" />
                  Sábado {item.numeroSabado}
                </label>
              ))}
            </div>
          </Card>

          <Card animated delay={0.20} className="grid gap-4 lg:col-span-2">
             <h4 className="m-0 font-outfit text-base text-marinho">Pergunta 5</h4>
             <span className="block font-bold text-texto text-sm">Funcionamento de um Pequeno Grupo com os membros da classe e interessados. Escreva onde funciona o PG, o dia da semana e o horário em que acontece.</span>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="grid gap-1 text-sm font-bold text-marinho sm:col-span-2">Nome da pessoa responsável pelo Pequeno Grupo:<ModalInput label="Responsável pelo PG" value={form.pequenoGrupoResponsavel} onChange={(v) => setForm({ ...form, pequenoGrupoResponsavel: v })} /></div>
                <div className="grid gap-1 text-sm font-bold text-marinho sm:col-span-2">Endereço:<ModalInput label="Endereço do PG" value={form.pequenoGrupoEndereco} onChange={(v) => setForm({ ...form, pequenoGrupoEndereco: v })} /></div>
                <div className="grid gap-1 text-sm font-bold text-marinho">Dia da semana:<ModalInput label="Dia da semana" type="select" options={[{value:"Domingo",label:"Domingo"},{value:"Segunda-feira",label:"Segunda-feira"},{value:"Terça-feira",label:"Terça-feira"},{value:"Quarta-feira",label:"Quarta-feira"},{value:"Quinta-feira",label:"Quinta-feira"},{value:"Sexta-feira",label:"Sexta-feira"},{value:"Sábado",label:"Sábado"}]} value={form.pequenoGrupoDia} onChange={(v) => setForm({ ...form, pequenoGrupoDia: v })} /></div>
                <div className="grid gap-1 text-sm font-bold text-marinho">Horário:<ModalInput label="Horário" type="time" value={form.pequenoGrupoHorario} onChange={(v) => setForm({ ...form, pequenoGrupoHorario: v })} /></div>
             </div>
          </Card>

          <Card animated delay={0.21} className="grid gap-4 lg:col-span-2 2xl:col-span-3">
             <h4 className="m-0 font-outfit text-base text-marinho">Pergunta 6</h4>
             <span className="block font-bold text-texto text-sm">Promoção de uma ação social para captação de interessados. Descreva a ação social realizada.</span>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="grid gap-1 text-sm font-bold text-marinho sm:col-span-2">Descrição da ação social<ModalInput label="Descrição da ação social" type="textarea" value={form.acaoSocialDescricao} onChange={(v) => setForm({ ...form, acaoSocialDescricao: v })} /></div>
                <div className="grid gap-1 text-sm font-bold text-marinho sm:col-span-2">Tipo de ação:<ModalInput label="Tipo de ação" value={form.acaoSocialTipo} onChange={(v) => setForm({ ...form, acaoSocialTipo: v })} /></div>
                <div className="grid gap-1 text-sm font-bold text-marinho">Data:<ModalInput label="Data da ação" type="date" value={form.acaoSocialData} onChange={(v) => setForm({ ...form, acaoSocialData: v })} /></div>
                <div className="grid gap-1 text-sm font-bold text-marinho">Local:<ModalInput label="Local da ação" value={form.acaoSocialLocal} onChange={(v) => setForm({ ...form, acaoSocialLocal: v })} /></div>
                <div className="grid gap-1 text-sm font-bold text-marinho">Quantidade de pessoas envolvidas:<ModalInput label="Pessoas envolvidas" type="number" value={form.pessoasAlcancadas} onChange={(v) => setForm({ ...form, pessoasAlcancadas: v })} /></div>
                <div className="grid gap-1 text-sm font-bold text-marinho">Quantidade de interessados alcançados:<ModalInput label="Interessados alcançados" type="number" value={form.interessadosAlcancados} onChange={(v) => setForm({ ...form, interessadosAlcancados: v })} /></div>
             </div>
          </Card>

          <Card animated delay={0.22} className="grid gap-4 lg:col-span-2">
             <h4 className="m-0 font-outfit text-base text-marinho">Pergunta 7</h4>
             <span className="block font-bold text-texto text-sm">A unidade de ação teve pelo menos 50% dos alunos ministrando pelo menos uma série de estudos bíblicos no decorrer do ano? Anote o nome dos alunos e a pessoa para quem estão ministrando o estudo bíblico.</span>
             <div className="flex flex-col gap-3 mt-2">
                <div className="grid gap-1 text-sm font-bold text-marinho">Nome do aluno da unidade de ação:<ModalInput label="Nome do aluno" placeholder="Nome do aluno" value={novoEstudo.alunoNome} onChange={(v) => setNovoEstudo({ ...novoEstudo, alunoNome: v })} /></div>
                <div className="grid gap-1 text-sm font-bold text-marinho">Nome da pessoa que recebe o estudo:<ModalInput label="Pessoa que recebe o estudo" placeholder="Pessoa que recebe o estudo" value={novoEstudo.interessadoNome} onChange={(v) => setNovoEstudo({ ...novoEstudo, interessadoNome: v })} /></div>
                <button type="button" onClick={adicionarEstudo} className="self-end inline-flex items-center justify-center gap-2 min-h-[42px] px-4 rounded-lg border-0 bg-marinho text-white font-bold cursor-pointer hover:bg-marinho/90 transition-colors"><Plus size={16} /> Adicionar estudo</button>
             </div>
             {card?.cartao?.estudosBiblicos?.length > 0 && (
                <div className="mt-2 bg-black/5 p-4 rounded-lg">
                  <h5 className="m-0 text-sm font-bold text-marinho mb-2">Estudos Adicionados:</h5>
                  <ul className="m-0 pl-5 text-sm text-muted grid gap-1">
                    {card.cartao.estudosBiblicos.map((item) => <li key={item.id}><strong>{item.alunoNome}</strong> ensina <strong>{item.interessadoNome}</strong></li>)}
                  </ul>
                </div>
             )}
          </Card>

          <Card animated delay={0.23} className="grid gap-4">
             <h4 className="m-0 font-outfit text-base text-marinho">Pergunta 8</h4>
             <span className="block font-bold text-texto text-sm">Cada unidade de ação deve levar pelo menos uma pessoa ao batismo no decorrer do ano. Nome de quem se batizou por meio da unidade de ação.</span>
             <div className="grid gap-1 text-sm font-bold text-marinho mt-2">Nome:<ModalInput label="Nomes dos batismos" type="textarea" placeholder="Nomes separados por vírgula..." value={form.batismosNomes} onChange={(v) => setForm({ ...form, batismosNomes: v })} /></div>
             <div className="grid gap-1 text-sm font-bold text-marinho">Quantidade de batismos:<ModalInput label="Quantidade de batismos" type="number" value={form.batismos} onChange={(v) => setForm({ ...form, batismos: v })} /></div>
          </Card>

          <Card animated delay={0.24} className="grid gap-4 lg:col-span-2">
             <h4 className="m-0 font-outfit text-base text-marinho">Pergunta 9</h4>
             <span className="block font-bold text-texto text-sm">A unidade de ação promoveu almoços, encontros sociais, pôr do sol juntos ou comemoração dos aniversariantes?</span>
             <div className="flex gap-5 mt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="radio" className="w-4 h-4 text-marinho focus:ring-marinho" checked={form.promoveuConfraternizacao === true} onChange={() => setForm({...form, promoveuConfraternizacao: true})} /> Sim</label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="radio" className="w-4 h-4 text-marinho focus:ring-marinho" checked={form.promoveuConfraternizacao === false} onChange={() => setForm({...form, promoveuConfraternizacao: false})} /> Não</label>
             </div>
             
             <div className="mt-4 border-t border-borda pt-4">
               <span className="block font-bold text-texto text-sm mb-3">Campos adicionais - Liste as ações realizadas:</span>
               <div className="flex flex-col gap-3">
                  <div className="grid gap-1 text-sm font-bold text-marinho">Ação:<ModalInput label="Ação realizada" placeholder="Ação realizada" value={novaConfrat.descricao} onChange={(v) => setNovaConfrat({ ...novaConfrat, descricao: v })} /></div>
                  <div className="grid gap-1 text-sm font-bold text-marinho">Data:<ModalInput label="Data da confraternização" type="date" value={novaConfrat.data} onChange={(v) => setNovaConfrat({ ...novaConfrat, data: v })} /></div>
                  <button type="button" onClick={adicionarConfrat} className="self-end inline-flex items-center justify-center gap-2 min-h-[42px] px-4 rounded-lg border-0 bg-marinho text-white font-bold cursor-pointer hover:bg-marinho/90 transition-colors"><Plus size={16} /> Adicionar ação</button>
               </div>
               {card?.cartao?.confraternizacoes?.length > 0 && (
                  <div className="mt-3 bg-black/5 p-4 rounded-lg">
                    <ul className="m-0 pl-5 text-sm text-muted grid gap-1">
                      {card.cartao.confraternizacoes.map((item) => <li key={item.id}><strong>{item.descricao}</strong> | Data: {inputDate(item.data)}</li>)}
                    </ul>
                  </div>
               )}
             </div>
          </Card>

          <Card animated delay={0.25} className="grid gap-4">
             <h4 className="m-0 font-outfit text-base text-marinho">Pergunta 10</h4>
             <span className="block font-bold text-texto text-sm">A unidade de ação realizou reuniões de planejamento e distribuiu as funções da Escola Sabatina entre os alunos? Foi realizada reunião de avaliação e planejamento para o próximo trimestre?</span>
             <div className="flex gap-5 mt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="radio" className="w-4 h-4 text-marinho focus:ring-marinho" checked={form.planejamentoTrimestral === true} onChange={() => setForm({...form, planejamentoTrimestral: true})} /> Sim</label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="radio" className="w-4 h-4 text-marinho focus:ring-marinho" checked={form.planejamentoTrimestral === false} onChange={() => setForm({...form, planejamentoTrimestral: false})} /> Não</label>
             </div>
          </Card>

          </div>

          <button type="button" onClick={salvarQuestionario} disabled={saving} className="mx-auto mt-6 mb-8 flex items-center justify-center gap-2 min-h-[50px] px-8 rounded-xl border-0 bg-marinho text-white font-extrabold cursor-pointer text-base shadow-lg shadow-marinho/20 w-full md:w-auto hover:bg-marinho/90 transition-colors">
             <Save size={20} /> Salvar Questionário do Professor
          </button>
        </div>
        
        {/* OTHER METAS */}
        {card?.metas?.map((metaItem, index) => (
          <Card animated delay={0.26 + (index * 0.03)} hoverable={false} className="!p-0 overflow-hidden" key={metaItem.titulo}>
            <button type="button" className="flex items-center justify-between w-full min-h-[78px] px-4.5 py-3.5 border-0 bg-transparent text-left cursor-pointer hover:bg-black/5" onClick={() => setOpen(open === metaItem.titulo ? "" : metaItem.titulo)}>
              <span>
                <strong className="block text-base">{metaItem.titulo}</strong>
                <small className="block mt-1 text-muted text-sm">{metaItem.detalhe}</small>
              </span>
              <span className="flex items-center gap-3 whitespace-nowrap text-muted">
                <StatusPill ok={metaItem.ok}>{metaItem.status}</StatusPill>
                {open === metaItem.titulo ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </span>
            </button>
            {open === metaItem.titulo && (
              <div className="flex items-center gap-2 px-4.5 pb-4.5 border-t border-borda pt-4 text-sm text-muted">
                <Check size={16} /> Dados carregados das respostas salvas no questionario.
              </div>
            )}
          </Card>
        ))}

        </>
)}

        {modalAcaoAluno && (() => {
        const item = coleta?.alunos?.find(a => a.aluno.id === modalAcaoAluno);
        if (!item) return null;
        return (
          <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 grid gap-4">
              <h3 className="m-0 text-lg font-outfit text-marinho">Ação Solidária - {item.aluno.nome}</h3>
              <div className="grid gap-1 text-sm font-bold text-texto">
                Descreva a ação solidária realizada:
                <input type="text" className="min-h-[40px] rounded-lg border border-borda px-3 font-normal" value={item.coleta.acaoSolidariaDescricao || ""} onChange={(e) => atualizarColeta(item.aluno.id, "acaoSolidariaDescricao", e.target.value)} />
              </div>
              <div className="grid gap-1 text-sm font-bold text-texto">
                Tipo de ação (ex: Cesta básica, Saúde):
                <input type="text" className="min-h-[40px] rounded-lg border border-borda px-3 font-normal" value={item.coleta.acaoSolidariaTipo || ""} onChange={(e) => atualizarColeta(item.aluno.id, "acaoSolidariaTipo", e.target.value)} />
              </div>
              <div className="flex justify-end mt-2">
                <button type="button" onClick={() => setModalAcaoAluno(null)} className="min-h-[40px] px-5 rounded-lg bg-marinho text-white font-bold">Concluir</button>
              </div>
            </div>
          </div>
        )
      })()}

      {modalEstudoAluno && (() => {
        const item = coleta?.alunos?.find(a => a.aluno.id === modalEstudoAluno);
        if (!item) return null;
        return (
          <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 grid gap-4">
              <h3 className="m-0 text-lg font-outfit text-marinho">Estudo Bíblico - {item.aluno.nome}</h3>
              <div className="grid gap-1 text-sm font-bold text-texto">
                Quantos estudos?
                <input type="number" min="1" className="min-h-[40px] rounded-lg border border-borda px-3 font-normal" value={item.coleta.estudosBiblicos || 1} onChange={(e) => atualizarColeta(item.aluno.id, "estudosBiblicos", Number(e.target.value))} />
              </div>
              <div className="flex justify-end mt-2">
                <button type="button" onClick={() => { if (!item.coleta.estudosBiblicos) atualizarColeta(item.aluno.id, "estudosBiblicos", 1); setModalEstudoAluno(null); }} className="min-h-[40px] px-5 rounded-lg bg-marinho text-white font-bold">Concluir</button>
              </div>
            </div>
          </div>
        )
      })()}

    </section>
  );
}
