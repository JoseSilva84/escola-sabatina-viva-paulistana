import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CalendarClock,
  CheckCircle2,
  Download,
  HelpCircle,
  Image,
  KeyRound,
  Moon,
  Palette,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  UploadCloud,
  UserCog,
  UserPlus,
  Users,
  X
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "../components/Card";
import { useAuth } from "../context/AuthContext";
import {
  alterarStatusProfessor,
  atualizarIgreja,
  atualizarMeuPerfil,
  atualizarUnidade,
  criarProfessor,
  criarUnidade,
  getIgrejas,
  getProfessores,
  getUnidades,
  redefinirSenhaProfessor,
  trocarSenha
} from "../api/services";

const temaKey = "nota10.tema";
const notificacoesKey = "nota10.config.notificacoes";
const periodoKey = "nota10.config.periodo";
const identidadeKey = "nota10.config.identidade";
const pontuacaoKey = "nota10.config.pontuacao";
const igrejaExtraKey = "nota10.config.igrejaExtra";

const perfilLabels = {
  ADMIN: "Departamental Mipes",
  DIRETOR: "Diretor",
  PROFESSOR: "Professor",
  ALUNO: "Aluno"
};

const relatorioPorPerfil = {
  ADMIN: "Relatorios gerais do Departamental Mipes",
  DIRETOR: "Relatorios das classes e unidades de acao",
  PROFESSOR: "Relatorios da sua unidade de acao",
  ALUNO: "Relatorio do acompanhamento do aluno"
};

const opcoesComuns = [
  {
    id: "notificacoes",
    titulo: "Notificações",
    descricao: "Lembretes de coleta semanal, avaliacao trimestral e pendências do seu perfil.",
    icon: Bell
  },
  {
    id: "exportar",
    titulo: "Exportar relatórios",
    descricao: "Baixe somente os relatórios permitidos para o seu nível de acesso.",
    icon: Download
  },
  {
    id: "tema",
    titulo: "Tema do sistema",
    descricao: "Alterne entre dark mode e light mode neste navegador.",
    icon: Palette
  }
];

const opcoesAdmin = [
  {
    id: "perfil",
    titulo: "Perfil e conta",
    descricao: "Editar nome, e-mail, senha, avatar e preferências do usuário.",
    icon: UserCog
  },
  {
    id: "igreja",
    titulo: "Dados da igreja",
    descricao: "Nome da igreja, distrito, endereço e contatos oficiais.",
    icon: Building2
  },
  {
    id: "unidades",
    titulo: "Unidades de Ação",
    descricao: "Criar ou editar unidades, vincular professor responsável e ativar classes.",
    icon: Users
  },
  {
    id: "periodo",
    titulo: "Ano e trimestre padrão",
    descricao: "Definir ano atual, trimestre atual e semana padrão de abertura.",
    icon: CalendarClock
  },
  {
    id: "usuarios",
    titulo: "Usuários e permissões",
    descricao: "Gerenciar professores e perfis de acesso da igreja.",
    icon: ShieldCheck
  },
  {
    id: "identidade",
    titulo: "Identidade do sistema",
    descricao: "Nome exibido, cor principal e preferências visuais do sistema.",
    icon: Image
  },
  {
    id: "importar-exportar",
    titulo: "Importar/Exportar dados",
    descricao: "Baixar backups locais e exportar relatórios operacionais.",
    icon: UploadCloud
  },
  {
    id: "pontuacao",
    titulo: "Critérios de pontuação",
    descricao: "Editar pesos das metas, ranking, desempenho e regras de conformidade.",
    icon: SlidersHorizontal
  },
  {
    id: "ajuda",
    titulo: "Ajuda e suporte",
    descricao: "Manual rápido, dúvidas frequentes, contato do suporte e versão do sistema.",
    icon: HelpCircle
  }
];

function storageGet(key, fallback) {
  try {
    const valor = window.localStorage.getItem(key);
    return valor ? JSON.parse(valor) : fallback;
  } catch {
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    toast.error("Não foi possivel salvar no navegador.");
  }
}

function aplicarTema(tema) {
  document.documentElement.classList.toggle("dark", tema === "dark");
  try {
    window.localStorage.setItem(temaKey, tema);
  } catch {
    // O tema continua aplicado mesmo se o navegador bloquear armazenamento.
  }
}

function baixarArquivo(nome, conteudo, tipo = "text/plain;charset=utf-8") {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escaparPdf(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[()\\]/g, "\\$&");
}

function criarPdfRelatorio({ perfil, titulo, geradoEm }) {
  const linhas = [
    "Escola Sabatina Viva",
    "Relatório exportado",
    "",
    `Perfil: ${perfil}`,
    `Relatório: ${titulo}`,
    `Gerado em: ${geradoEm}`
  ];
  const conteudo = linhas.map((linha, index) => `BT /F1 14 Tf 72 ${740 - index * 26} Td (${escaparPdf(linha)}) Tj ET`).join("\n");
  const stream = `${conteudo}\n`;
  const objetos = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}endstream endobj`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objetos.forEach((objeto) => {
    offsets.push(pdf.length);
    pdf += `${objeto}\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

function campoClasse() {
  return "min-h-[42px] rounded-lg border border-borda bg-white px-3 text-sm text-texto";
}

function Botao({ children, variant = "primary", type = "button", size = "md", className = "", ...props }) {
  const estilos = variant === "secondary"
    ? "border border-borda bg-white text-marinho hover:bg-marinho/5"
    : variant === "danger"
      ? "border-0 bg-red-600 text-white hover:bg-red-700"
      : "border-0 bg-marinho text-white hover:bg-marinho-escuro";
  const tamanho = size === "sm"
    ? "min-h-[34px] px-3 text-xs"
    : "min-h-[40px] px-4 text-sm";

  return (
    <button
      type={type}
      className={`inline-flex w-fit max-w-full items-center justify-center gap-2 rounded-lg font-bold transition-colors disabled:opacity-60 ${tamanho} ${estilos} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function ToggleTema({ tema, onChange }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-borda bg-white p-1">
      <button
        type="button"
        onClick={() => onChange("light")}
        className={`inline-flex min-h-[38px] items-center justify-center gap-2 rounded-md border-0 px-3 font-bold transition-colors ${tema === "light" ? "bg-marinho text-white" : "bg-transparent text-muted hover:bg-black/5"}`}
      >
        <Sun size={16} /> Light
      </button>
      <button
        type="button"
        onClick={() => onChange("dark")}
        className={`inline-flex min-h-[38px] items-center justify-center gap-2 rounded-md border-0 px-3 font-bold transition-colors ${tema === "dark" ? "bg-marinho text-white" : "bg-transparent text-muted hover:bg-black/5"}`}
      >
        <Moon size={16} /> Dark
      </button>
    </div>
  );
}

function ConfigCard({ item, active, children, onClick }) {
  const Icon = item.icon;
  return (
    <Card
      hoverable={false}
      className={`relative grid gap-4 overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:border-marinho/25 hover:bg-white hover:shadow-[0_18px_42px_rgba(23,58,106,0.13),0_3px_10px_rgba(15,23,42,0.04)] ${active ? "ring-2 ring-marinho/30" : ""}`}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-marinho transition-transform duration-300 ease-out group-hover:scale-x-100" />
      <span className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-marinho/[0.06] opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-10 flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-marinho/10 text-marinho transition-all duration-300 ease-out group-hover:scale-105 group-hover:bg-marinho group-hover:text-white group-hover:shadow-[0_10px_24px_rgba(23,58,106,0.22)]">
          <Icon size={22} className="transition-transform duration-300 ease-out group-hover:-rotate-3 group-hover:scale-110" />
        </span>
        <div className="min-w-0">
          <h3 className="m-0 font-outfit text-lg text-texto transition-colors duration-300 group-hover:text-marinho">{item.titulo}</h3>
          <p className="m-0 mt-1 text-sm leading-relaxed text-muted">{item.descricao}</p>
        </div>
      </div>
      <div className="relative z-10">
        {children || (
          <Botao size="sm" variant={active ? "primary" : "secondary"} onClick={onClick}>
            {active ? <CheckCircle2 size={16} /> : null}
            {active ? "Aberto" : "Configurar"}
          </Botao>
        )}
      </div>
    </Card>
  );
}

function ConfigModal({ item, children, onClose }) {
  if (!item) return null;
  const Icon = item.icon;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-3 sm:p-5 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-borda bg-white shadow-2xl shadow-slate-950/20"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="config-modal-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-borda bg-white px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-marinho/10 text-marinho">
              <Icon size={22} />
            </span>
            <div className="min-w-0">
              <h3 id="config-modal-title" className="m-0 font-outfit text-xl text-texto">{item.titulo}</h3>
              <p className="m-0 mt-1 text-sm leading-relaxed text-muted">{item.descricao}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border-0 bg-slate-100 text-muted transition-colors hover:bg-slate-200 hover:text-texto"
            aria-label="Fechar configuracao"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto bg-slate-50/80 p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ConfiguracoesPage() {
  const { usuario, atualizarUsuario } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tema, setTema] = useState(() => (
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  ));
  const [ativo, setAtivo] = useState(null);
  const [notificacoes, setNotificacoes] = useState(() => storageGet(notificacoesKey, {
    receber: true,
    coleta: true,
    trimestral: true,
    pendencias: true,
    horario: "18:00"
  }));
  const [periodo, setPeriodo] = useState(() => storageGet(periodoKey, {
    ano: new Date().getFullYear(),
    trimestre: Math.ceil((new Date().getMonth() + 1) / 3),
    semana: 1
  }));
  const [identidade, setIdentidade] = useState(() => storageGet(identidadeKey, {
    nome: "Escola Sabatina Viva",
    cor: "#173a6a",
    mostrarDistrito: true
  }));
  const [pontuacao, setPontuacao] = useState(() => storageGet(pontuacaoKey, {
    estudo: 35,
    pontualidade: 20,
    pequenoGrupo: 15,
    acaoSolidaria: 15,
    estudoBiblico: 15
  }));
  const [igrejaExtra, setIgrejaExtra] = useState(() => storageGet(igrejaExtraKey, {
    endereco: "",
    telefone: "",
    email: "",
    responsavel: ""
  }));
  const [perfilForm, setPerfilForm] = useState({
    nome: usuario?.nome || "",
    email: usuario?.email || "",
    whatsapp: usuario?.whatsapp || "",
    sexoPerfil: usuario?.sexoPerfil || "",
    foto: null
  });
  const [fotoPerfilPreview, setFotoPerfilPreview] = useState(usuario?.fotoUrl || "");
  const [senhaForm, setSenhaForm] = useState({ senhaAtual: "", novaSenha: "", confirmar: "" });
  const [igrejas, setIgrejas] = useState([]);
  const [igrejaNome, setIgrejaNome] = useState(usuario?.igrejaNome || "");
  const [unidades, setUnidades] = useState([]);
  const [professores, setProfessores] = useState([]);
  const [novaUnidade, setNovaUnidade] = useState({ nome: "", professorId: "" });
  const [novoProfessor, setNovoProfessor] = useState({ nome: "", senha: "" });
  const [acessoCriado, setAcessoCriado] = useState(null);
  const [salvando, setSalvando] = useState("");
  const isAdmin = usuario?.papel === "ADMIN" || usuario?.papel === "DIRETOR";
  const perfil = perfilLabels[usuario?.papel] || usuario?.papel || "Usuario";

  useEffect(() => {
    aplicarTema(tema);
  }, [tema]);

  useEffect(() => {
    return () => {
      if (fotoPerfilPreview?.startsWith("blob:")) URL.revokeObjectURL(fotoPerfilPreview);
    };
  }, [fotoPerfilPreview]);

  useEffect(() => {
    if (ativo === "igreja") carregarIgrejas();
    if (ativo === "unidades") carregarUnidadesEProfessores();
    if (ativo === "usuarios") carregarProfessores();
  }, [ativo]);

  const opcoes = useMemo(() => (
    isAdmin
      ? [opcoesComuns[0], ...opcoesAdmin, opcoesComuns[1], opcoesComuns[2]]
      : opcoesComuns
  ), [isAdmin]);
  const itemAtivo = opcoes.find((item) => item.id === ativo) || null;

  useEffect(() => {
    const secao = searchParams.get("secao");
    if (secao && opcoes.some((item) => item.id === secao)) {
      setAtivo(secao);
    }
  }, [opcoes, searchParams]);

  function abrirModal(id) {
    setAtivo(id);
  }

  function fecharModal() {
    setAtivo(null);
    const proximosParams = new URLSearchParams(searchParams);
    proximosParams.delete("secao");
    setSearchParams(proximosParams, { replace: true });
  }

  function exportarRelatorio() {
    const titulo = relatorioPorPerfil[usuario?.papel] || "Relatorio";
    const conteudo = criarPdfRelatorio({
      perfil,
      titulo,
      geradoEm: new Date().toLocaleString("pt-BR")
    });
    baixarArquivo(`relatorio-${String(usuario?.papel || "usuario").toLowerCase()}.pdf`, conteudo, "application/pdf");
    toast.success("PDF exportado para o seu nível de acesso.");
  }

  function exportarBackup() {
    const backup = {
      geradoEm: new Date().toISOString(),
      usuario: { id: usuario?.id, papel: usuario?.papel, igrejaId: usuario?.igrejaId },
      notificacoes,
      periodo,
      identidade,
      igrejaExtra,
      pontuacao
    };
    baixarArquivo("backup-configuracoes-escola-sabatina.json", JSON.stringify(backup, null, 2), "application/json;charset=utf-8");
    toast.success("Backup local exportado.");
  }

  async function carregarIgrejas() {
    try {
      const lista = await getIgrejas();
      setIgrejas(lista);
      const atual = lista.find((item) => item.id === usuario?.igrejaId) || lista[0];
      if (atual) setIgrejaNome(atual.nome);
    } catch {
      toast.error("Não foi possível carregar os dados da igreja.");
    }
  }

  async function carregarProfessores() {
    try {
      setProfessores(await getProfessores());
    } catch {
      setProfessores([]);
      toast.error("Não foi possível carregar os professores.");
    }
  }

  async function carregarUnidadesEProfessores() {
    try {
      const [listaUnidades, listaProfessores] = await Promise.all([
        getUnidades({ igrejaAtual: true }),
        getProfessores()
      ]);
      setUnidades(listaUnidades);
      setProfessores(listaProfessores);
      setNovaUnidade((atual) => ({ ...atual, professorId: atual.professorId || listaProfessores[0]?.id || "" }));
    } catch {
      toast.error("Não foi possível carregar unidades e professores.");
    }
  }

  function salvarLocal(key, value, message) {
    storageSet(key, value);
    toast.success(message);
  }

  async function salvarPerfil(event) {
    event.preventDefault();
    setSalvando("perfil");
    try {
      const data = await atualizarMeuPerfil({
        nome: perfilForm.nome,
        email: perfilForm.email,
        whatsapp: perfilForm.whatsapp,
        sexoPerfil: perfilForm.sexoPerfil || null,
        foto: perfilForm.foto
      });
      setPerfilForm((atual) => ({ ...atual, foto: null }));
      if (data.usuario?.fotoUrl) setFotoPerfilPreview(data.usuario.fotoUrl);
      atualizarUsuario(data.usuario);
      toast.success("Perfil atualizado.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Não foi possível atualizar o perfil.");
    } finally {
      setSalvando("");
    }
  }

  function selecionarFotoPerfil(event) {
    const arquivo = event.target.files?.[0] || null;
    setPerfilForm((atual) => ({ ...atual, foto: arquivo }));
    if (!arquivo) {
      setFotoPerfilPreview(usuario?.fotoUrl || "");
      return;
    }
    setFotoPerfilPreview((previewAtual) => {
      if (previewAtual?.startsWith("blob:")) URL.revokeObjectURL(previewAtual);
      return URL.createObjectURL(arquivo);
    });
  }

  async function salvarSenha(event) {
    event.preventDefault();
    if (senhaForm.novaSenha !== senhaForm.confirmar) {
      toast.error("A confirmação nao corresponde a nova senha.");
      return;
    }
    setSalvando("senha");
    try {
      await trocarSenha({ senhaAtual: senhaForm.senhaAtual, novaSenha: senhaForm.novaSenha });
      setSenhaForm({ senhaAtual: "", novaSenha: "", confirmar: "" });
      atualizarUsuario({ deveTrocarSenha: false });
      toast.success("Senha alterada.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Não foi possível alterar a senha.");
    } finally {
      setSalvando("");
    }
  }

  async function salvarIgreja(event) {
    event.preventDefault();
    const igrejaAtual = igrejas.find((item) => item.id === usuario?.igrejaId) || igrejas[0];
    if (!igrejaAtual) return;
    setSalvando("igreja");
    try {
      const atualizada = await atualizarIgreja(igrejaAtual.id, { nome: igrejaNome });
      setIgrejas((atuais) => atuais.map((item) => item.id === atualizada.id ? atualizada : item));
      atualizarUsuario({ igrejaNome: atualizada.nome });
      storageSet(igrejaExtraKey, igrejaExtra);
      toast.success("Dados da igreja salvos.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Não foi possível salvar a igreja.");
    } finally {
      setSalvando("");
    }
  }

  async function salvarUnidade(unidade, dados) {
    setSalvando(unidade.id);
    try {
      await atualizarUnidade(unidade.id, dados);
      await carregarUnidadesEProfessores();
      toast.success("Unidade atualizada.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Não foi possível atualizar a unidade.");
    } finally {
      setSalvando("");
    }
  }

  async function cadastrarUnidade(event) {
    event.preventDefault();
    setSalvando("nova-unidade");
    try {
      await criarUnidade(novaUnidade);
      setNovaUnidade({ nome: "", professorId: professores[0]?.id || "" });
      await carregarUnidadesEProfessores();
      toast.success("Unidade criada.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Não foi possível criar a unidade.");
    } finally {
      setSalvando("");
    }
  }

  async function cadastrarProfessor(event) {
    event.preventDefault();
    setSalvando("novo-professor");
    try {
      const resultado = await criarProfessor(novoProfessor);
      setAcessoCriado({
        nome: resultado.professor.nome,
        login: resultado.professor.codigoAcesso,
        senha: novoProfessor.senha
      });
      setNovoProfessor({ nome: "", senha: "" });
      await carregarProfessores();
      toast.success("Conta do professor criada.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Não foi possível criar o professor.");
    } finally {
      setSalvando("");
    }
  }

  async function mudarStatusProfessor(professorItem) {
    try {
      await alterarStatusProfessor(professorItem.id, !professorItem.ativo);
      await carregarProfessores();
      toast.success(professorItem.ativo ? "Acesso bloqueado." : "Acesso reativado.");
    } catch {
      toast.error("Não foi possível alterar o acesso.");
    }
  }

  async function redefinirProfessor(professorItem) {
    try {
      const resultado = await redefinirSenhaProfessor(professorItem.id);
      setAcessoCriado({
        nome: professorItem.nome,
        login: professorItem.codigoAcesso,
        senha: resultado.senhaTemporaria
      });
      await carregarProfessores();
    } catch {
      toast.error("Não foi possível redefinir a senha.");
    }
  }

  function renderPainelAtivo() {
    if (ativo === "notificacoes") {
      return (
        <Card hoverable={false} className="grid gap-4">
          <h3 className="m-0 font-outfit text-xl text-marinho">Notificacoes</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["receber", "Receber lembretes do sistema"],
              ["coleta", "Coleta semanal"],
              ["trimestral", "Avaliacao trimestral"],
              ["pendencias", "Pendencias do perfil"]
            ].map(([campo, label]) => (
              <label key={campo} className="flex items-center gap-3 rounded-lg border border-borda bg-white px-3 py-2 text-sm font-bold text-texto">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-marinho"
                  checked={Boolean(notificacoes[campo])}
                  onChange={(event) => setNotificacoes({ ...notificacoes, [campo]: event.target.checked })}
                />
                {label}
              </label>
            ))}
            <label className="grid gap-1 text-sm font-bold text-marinho">
              Horario preferido
              <input className={campoClasse()} type="time" value={notificacoes.horario} onChange={(e) => setNotificacoes({ ...notificacoes, horario: e.target.value })} />
            </label>
          </div>
          <Botao onClick={() => salvarLocal(notificacoesKey, notificacoes, "Prefêrencias de notificação salvas.")}>
            <Save size={16} /> Salvar notificações
          </Botao>
        </Card>
      );
    }

    if (ativo === "perfil") {
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card hoverable={false}>
            <form onSubmit={salvarPerfil} className="grid gap-3">
              <h3 className="m-0 font-outfit text-xl text-marinho">Perfil e conta</h3>
              <div className="flex flex-col gap-3 rounded-lg border border-borda bg-white p-3 sm:flex-row sm:items-center">
                <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-marinho/10 text-marinho">
                  {fotoPerfilPreview ? (
                    <img src={fotoPerfilPreview} alt="Foto do perfil" className="h-full w-full object-cover" />
                  ) : (
                    <UserCog size={30} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-bold text-marinho">Imagem do perfil</p>
                  <p className="m-0 mt-1 truncate text-xs text-muted">
                    {perfilForm.foto ? perfilForm.foto.name : "Importe uma foto para aparecer no topo do sistema."}
                  </p>
                </div>
                <label className="inline-flex min-h-[36px] w-fit cursor-pointer items-center justify-center gap-2 rounded-lg border border-borda bg-white px-3 text-xs font-bold text-marinho transition-colors hover:bg-marinho/5">
                  <UploadCloud size={14} />
                  Importar imagem
                  <input type="file" accept="image/*" onChange={selecionarFotoPerfil} className="sr-only" />
                </label>
              </div>
              <label className="grid gap-1 text-sm font-bold text-marinho">Nome
                <input className={campoClasse()} value={perfilForm.nome} onChange={(e) => setPerfilForm({ ...perfilForm, nome: e.target.value })} required />
              </label>
              <label className="grid gap-1 text-sm font-bold text-marinho">E-mail
                <input className={campoClasse()} type="email" value={perfilForm.email} onChange={(e) => setPerfilForm({ ...perfilForm, email: e.target.value })} required />
              </label>
              <label className="grid gap-1 text-sm font-bold text-marinho">WhatsApp
                <input className={campoClasse()} value={perfilForm.whatsapp} onChange={(e) => setPerfilForm({ ...perfilForm, whatsapp: e.target.value })} />
              </label>
              <label className="grid gap-1 text-sm font-bold text-marinho">Avatar padrão
                <select className={campoClasse()} value={perfilForm.sexoPerfil} onChange={(e) => setPerfilForm({ ...perfilForm, sexoPerfil: e.target.value })}>
                  <option value="">Padrão automático</option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMININO">Feminino</option>
                </select>
              </label>
              <Botao type="submit" disabled={salvando === "perfil"}>
                <Save size={16} /> {salvando === "perfil" ? "Salvando..." : "Salvar perfil"}
              </Botao>
            </form>
          </Card>

          <Card hoverable={false}>
            <form onSubmit={salvarSenha} className="grid gap-3">
              <h3 className="m-0 font-outfit text-xl text-marinho">Alterar senha</h3>
              <label className="grid gap-1 text-sm font-bold text-marinho">Senha atual
                <input className={campoClasse()} type="password" value={senhaForm.senhaAtual} onChange={(e) => setSenhaForm({ ...senhaForm, senhaAtual: e.target.value })} required />
              </label>
              <label className="grid gap-1 text-sm font-bold text-marinho">Nova senha
                <input className={campoClasse()} type="password" minLength={8} value={senhaForm.novaSenha} onChange={(e) => setSenhaForm({ ...senhaForm, novaSenha: e.target.value })} required />
              </label>
              <label className="grid gap-1 text-sm font-bold text-marinho">Confirmar nova senha
                <input className={campoClasse()} type="password" minLength={8} value={senhaForm.confirmar} onChange={(e) => setSenhaForm({ ...senhaForm, confirmar: e.target.value })} required />
              </label>
              <Botao type="submit" disabled={salvando === "senha"}>
                <KeyRound size={16} /> {salvando === "senha" ? "Alterando..." : "Alterar senha"}
              </Botao>
            </form>
          </Card>
        </div>
      );
    }

    if (ativo === "igreja") {
      const igrejaAtual = igrejas.find((item) => item.id === usuario?.igrejaId) || igrejas[0];
      return (
        <Card hoverable={false}>
          <form onSubmit={salvarIgreja} className="grid gap-3">
            <h3 className="m-0 font-outfit text-xl text-marinho">Dados da igreja</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold text-marinho">Nome da igreja
                <input className={campoClasse()} value={igrejaNome} onChange={(e) => setIgrejaNome(e.target.value)} required />
              </label>
              <label className="grid gap-1 text-sm font-bold text-marinho">Distrito
                <input className={campoClasse()} value={igrejaAtual?.distrito?.nome || usuario?.distritoNome || ""} readOnly />
              </label>
              <label className="grid gap-1 text-sm font-bold text-marinho">Endereço
                <input className={campoClasse()} value={igrejaExtra.endereco} onChange={(e) => setIgrejaExtra({ ...igrejaExtra, endereco: e.target.value })} />
              </label>
              <label className="grid gap-1 text-sm font-bold text-marinho">Telefone
                <input className={campoClasse()} value={igrejaExtra.telefone} onChange={(e) => setIgrejaExtra({ ...igrejaExtra, telefone: e.target.value })} />
              </label>
              <label className="grid gap-1 text-sm font-bold text-marinho">E-mail oficial
                <input className={campoClasse()} type="email" value={igrejaExtra.email} onChange={(e) => setIgrejaExtra({ ...igrejaExtra, email: e.target.value })} />
              </label>
              <label className="grid gap-1 text-sm font-bold text-marinho">Responsável
                <input className={campoClasse()} value={igrejaExtra.responsavel} onChange={(e) => setIgrejaExtra({ ...igrejaExtra, responsavel: e.target.value })} />
              </label>
            </div>
            <Botao type="submit" disabled={salvando === "igreja"}>
              <Save size={16} /> {salvando === "igreja" ? "Salvando..." : "Salvar dados da igreja"}
            </Botao>
          </form>
        </Card>
      );
    }

    if (ativo === "unidades") {
      return (
        <div className="grid gap-4">
          <Card hoverable={false}>
            <form onSubmit={cadastrarUnidade} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="grid gap-1 text-sm font-bold text-marinho">Nova unidade
                <input className={campoClasse()} value={novaUnidade.nome} onChange={(e) => setNovaUnidade({ ...novaUnidade, nome: e.target.value })} required />
              </label>
              <label className="grid gap-1 text-sm font-bold text-marinho">Professor responsável
                <select className={campoClasse()} value={novaUnidade.professorId} onChange={(e) => setNovaUnidade({ ...novaUnidade, professorId: e.target.value })} required>
                  <option value="">Selecione</option>
                  {professores.map((professorItem) => <option key={professorItem.id} value={professorItem.id}>{professorItem.nome}</option>)}
                </select>
              </label>
              <Botao type="submit" disabled={salvando === "nova-unidade"}>
                <Users size={16} /> {salvando === "nova-unidade" ? "Criando..." : "Criar unidade"}
              </Botao>
            </form>
          </Card>

          <div className="grid gap-3">
            {unidades.map((unidade) => (
              <Card key={unidade.id} hoverable={false} className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
                <label className="grid gap-1 text-sm font-bold text-marinho">Nome
                  <input className={campoClasse()} defaultValue={unidade.nome} onBlur={(e) => e.target.value !== unidade.nome && salvarUnidade(unidade, { nome: e.target.value })} />
                </label>
                <label className="grid gap-1 text-sm font-bold text-marinho">Professor
                  <select className={campoClasse()} defaultValue={unidade.professorId || ""} onChange={(e) => salvarUnidade(unidade, { professorId: e.target.value })}>
                    <option value="">Sem professor</option>
                    {professores.map((professorItem) => <option key={professorItem.id} value={professorItem.id}>{professorItem.nome}</option>)}
                  </select>
                </label>
                <span className="text-sm text-muted">{unidade._count?.alunos || 0} aluno(s)</span>
                <Botao variant={unidade.ativa ? "secondary" : "primary"} disabled={salvando === unidade.id} onClick={() => salvarUnidade(unidade, { ativa: !unidade.ativa })}>
                  {unidade.ativa ? "Desativar" : "Ativar"}
                </Botao>
              </Card>
            ))}
            {!unidades.length && <p className="text-muted">Nenhuma unidade cadastrada.</p>}
          </div>
        </div>
      );
    }

    if (ativo === "periodo") {
      return (
        <Card hoverable={false} className="grid gap-4">
          <h3 className="m-0 font-outfit text-xl text-marinho">Ano e trimestre padrão</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm font-bold text-marinho">Ano atual
              <input className={campoClasse()} type="number" min="2020" max="2100" value={periodo.ano} onChange={(e) => setPeriodo({ ...periodo, ano: Number(e.target.value) })} />
            </label>
            <label className="grid gap-1 text-sm font-bold text-marinho">Trimestre
              <select className={campoClasse()} value={periodo.trimestre} onChange={(e) => setPeriodo({ ...periodo, trimestre: Number(e.target.value) })}>
                {[1, 2, 3, 4].map((item) => <option key={item} value={item}>{item} trimestre</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold text-marinho">Semana padrão
              <input className={campoClasse()} type="number" min="1" max="53" value={periodo.semana} onChange={(e) => setPeriodo({ ...periodo, semana: Number(e.target.value) })} />
            </label>
          </div>
          <Botao onClick={() => salvarLocal(periodoKey, periodo, "Período padrão salvo.")}>
            <Save size={16} /> Salvar período
          </Botao>
        </Card>
      );
    }

    if (ativo === "usuarios") {
      return (
        <div className="grid gap-4">
          {acessoCriado && (
            <Card hoverable={false} className="border-2 border-amber-300 bg-amber-50">
              <h3 className="m-0 text-lg text-marinho">Anote e entregue este acesso</h3>
              <p className="mb-1"><strong>Professor:</strong> {acessoCriado.nome}</p>
              <p className="my-1"><strong>Login:</strong> {acessoCriado.login}</p>
              <p className="my-1"><strong>Senha inicial:</strong> {acessoCriado.senha}</p>
            </Card>
          )}
          <Card hoverable={false}>
            <form onSubmit={cadastrarProfessor} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="grid gap-1 text-sm font-bold text-marinho">Nome do professor
                <input className={campoClasse()} value={novoProfessor.nome} onChange={(e) => setNovoProfessor({ ...novoProfessor, nome: e.target.value })} required />
              </label>
              <label className="grid gap-1 text-sm font-bold text-marinho">Senha inicial
                <input className={campoClasse()} type="password" minLength={8} value={novoProfessor.senha} onChange={(e) => setNovoProfessor({ ...novoProfessor, senha: e.target.value })} required />
              </label>
              <Botao type="submit" disabled={salvando === "novo-professor"}>
                <UserPlus size={16} /> {salvando === "novo-professor" ? "Criando..." : "Criar acesso"}
              </Botao>
            </form>
          </Card>
          <div className="grid gap-3">
            {professores.map((professorItem) => (
              <Card key={professorItem.id} hoverable={false} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <strong className="text-texto">{professorItem.nome}</strong>
                  <p className="m-0 mt-1 text-sm text-muted">Login: {professorItem.codigoAcesso || professorItem.email}</p>
                  <span className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-bold ${professorItem.ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {professorItem.ativo ? "Ativo" : "Bloqueado"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Botao variant="secondary" onClick={() => redefinirProfessor(professorItem)}>
                    <KeyRound size={16} /> Redefinir senha
                  </Botao>
                  <Botao variant={professorItem.ativo ? "danger" : "primary"} onClick={() => mudarStatusProfessor(professorItem)}>
                    {professorItem.ativo ? "Bloquear" : "Reativar"}
                  </Botao>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    if (ativo === "identidade") {
      return (
        <Card hoverable={false} className="grid gap-4">
          <h3 className="m-0 font-outfit text-xl text-marinho">Identidade do sistema</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm font-bold text-marinho md:col-span-2">Nome exibido
              <input className={campoClasse()} value={identidade.nome} onChange={(e) => setIdentidade({ ...identidade, nome: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm font-bold text-marinho">Cor principal
              <input className={`${campoClasse()} h-[42px] p-1`} type="color" value={identidade.cor} onChange={(e) => setIdentidade({ ...identidade, cor: e.target.value })} />
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-borda bg-white px-3 py-2 text-sm font-bold text-texto md:col-span-3">
              <input type="checkbox" className="h-4 w-4 accent-marinho" checked={identidade.mostrarDistrito} onChange={(e) => setIdentidade({ ...identidade, mostrarDistrito: e.target.checked })} />
              Mostrar distrito no cabeçalho
            </label>
          </div>
          <div className="rounded-lg border border-borda bg-white p-4" style={{ borderTopColor: identidade.cor, borderTopWidth: 4 }}>
            <strong className="text-texto">{identidade.nome}</strong>
            <p className="m-0 mt-1 text-sm text-muted">{identidade.mostrarDistrito ? (usuario?.distritoNome || "Distrito") : "Identidade visual local"}</p>
          </div>
          <Botao onClick={() => salvarLocal(identidadeKey, identidade, "Identidade visual salva.")}>
            <Save size={16} /> Salvar identidade
          </Botao>
        </Card>
      );
    }

    if (ativo === "exportar" || ativo === "importar-exportar") {
      return (
        <Card hoverable={false} className="grid gap-4">
          <h3 className="m-0 font-outfit text-xl text-marinho">Importar e exportar dados</h3>
          <div className="flex flex-wrap gap-2">
            <Botao onClick={exportarRelatorio}>
              <Download size={16} /> Exportar PDF
            </Botao>
            <Botao variant="secondary" onClick={exportarBackup}>
              <UploadCloud size={16} /> Exportar backup local
            </Botao>
          </div>
          <p className="m-0 text-sm text-muted">O backup inclui preferências desta tela. Dados oficiais de alunos, professores e unidades continuam salvos pela API.</p>
        </Card>
      );
    }

    if (ativo === "pontuacao") {
      const total = Object.values(pontuacao).reduce((soma, valor) => soma + Number(valor || 0), 0);
      return (
        <Card hoverable={false} className="grid gap-4">
          <h3 className="m-0 font-outfit text-xl text-marinho">Criterios de pontuacao</h3>
          <div className="grid gap-3">
            {[
              ["estudo", "Estudo da licao"],
              ["pontualidade", "Pontualidade"],
              ["pequenoGrupo", "Pequeno grupo"],
              ["acaoSolidaria", "Acao solidaria"],
              ["estudoBiblico", "Estudo biblico"]
            ].map(([campo, label]) => (
              <label key={campo} className="grid gap-1 text-sm font-bold text-marinho">
                <span className="flex justify-between"><span>{label}</span><span>{pontuacao[campo]} pts</span></span>
                <input type="range" min="0" max="50" value={pontuacao[campo]} onChange={(e) => setPontuacao({ ...pontuacao, [campo]: Number(e.target.value) })} />
              </label>
            ))}
          </div>
          <p className="m-0 text-sm font-bold text-muted">Total configurado: {total} pontos</p>
          <Botao onClick={() => salvarLocal(pontuacaoKey, pontuacao, "Criterios de pontuacao salvos.")}>
            <Save size={16} /> Salvar critérios
          </Botao>
        </Card>
      );
    }

    if (ativo === "tema") {
      return (
        <Card hoverable={false} className="grid gap-4">
          <h3 className="m-0 font-outfit text-xl text-marinho">Tema do sistema</h3>
          <ToggleTema tema={tema} onChange={setTema} />
        </Card>
      );
    }

    if (ativo === "ajuda") {
      return (
        <Card hoverable={false} className="grid gap-4">
          <h3 className="m-0 font-outfit text-xl text-marinho">Ajuda e suporte</h3>
          <div className="grid gap-2 text-sm text-muted">
            <p className="m-0"><strong className="text-texto">Versão:</strong> Professor Nota 10 / Escola Sabatina Viva</p>
            <p className="m-0"><strong className="text-texto">Atalho:</strong> use o menu lateral para acessar alunos, professores, ranking e metas.</p>
            <p className="m-0"><strong className="text-texto">Suporte:</strong> confira os dados da igreja e exporte um backup local antes de solicitar ajuda.</p>
          </div>
          <Botao variant="secondary" onClick={() => navigator.clipboard?.writeText(window.location.href).then(() => toast.success("Link copiado."))}>
            Copiar link desta tela
          </Botao>
        </Card>
      );
    }

    return null;
  }

  return (
    <section className="grid gap-5">
      <div>
        <p className="m-0 text-sm font-bold text-marinho">{perfil}</p>
        <h2 className="m-0 mt-1 font-outfit text-[28px] tracking-tight text-texto">Configurações</h2>
        <p className="m-0 mt-1 text-muted">
          {isAdmin
            ? "Acesso completo de administração do sistema Escola Sabatina Viva."
            : "Acesso limitado a notificações, exportação de relatórios do perfil e tema do sistema."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
        {opcoes.map((item) => {
          if (item.id === "notificacoes") {
            return (
              <ConfigCard key={item.id} item={item} active={ativo === item.id}>
                <div className="flex flex-wrap gap-2">
                  <label className="flex w-fit items-center gap-3 rounded-lg border border-borda bg-white px-3 py-2 text-sm font-bold text-texto">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-marinho"
                      checked={Boolean(notificacoes.receber)}
                      onChange={(event) => {
                        const atualizado = { ...notificacoes, receber: event.target.checked };
                        setNotificacoes(atualizado);
                        storageSet(notificacoesKey, atualizado);
                        toast.success(event.target.checked ? "Lembretes ativados." : "Lembretes desativados.");
                      }}
                    />
                    Receber lembretes do sistema
                  </label>
                  <Botao size="sm" variant={ativo === item.id ? "primary" : "secondary"} onClick={() => abrirModal(item.id)}>
                    {ativo === item.id ? <CheckCircle2 size={16} /> : null}
                    {ativo === item.id ? "Aberto" : "Configurar"}
                  </Botao>
                </div>
              </ConfigCard>
            );
          }

          if (item.id === "exportar") {
            return (
              <ConfigCard key={item.id} item={item} active={ativo === item.id}>
                <Botao size="sm" onClick={() => abrirModal(item.id)}>
                  <Download size={14} /> Abrir
                </Botao>
              </ConfigCard>
            );
          }

          if (item.id === "tema") {
            return (
              <ConfigCard key={item.id} item={item} active={ativo === item.id}>
                <div className="flex flex-wrap gap-2">
                  <ToggleTema tema={tema} onChange={setTema} />
                  <Botao size="sm" variant={ativo === item.id ? "primary" : "secondary"} onClick={() => abrirModal(item.id)}>
                    {ativo === item.id ? <CheckCircle2 size={16} /> : null}
                    {ativo === item.id ? "Aberto" : "Configurar"}
                  </Botao>
                </div>
              </ConfigCard>
            );
          }

          return (
            <ConfigCard
              key={item.id}
              item={item}
              active={ativo === item.id}
              onClick={() => abrirModal(item.id)}
            />
          );
        })}
      </div>

      <ConfigModal item={itemAtivo} onClose={fecharModal}>
        {renderPainelAtivo()}
      </ConfigModal>
    </section>
  );
}
