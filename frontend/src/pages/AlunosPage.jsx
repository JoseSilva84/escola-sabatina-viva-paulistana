import React, { useEffect, useState } from "react";
import { Camera, KeyRound, Pencil, Save, Search, Users, X } from "lucide-react";
import { toast } from "sonner";
import { atualizarAluno, atualizarRegistroAluno, getAlunos, getRegistrosAlunos, getUnidades, salvarAcessoAluno } from "../api/services";
import { Card } from "../components/Card";
import { ModalInput } from "../components/ModalInput";

const anoAtual = new Date().getFullYear();

function dataBR(valor) {
  if (!valor) return "";
  return new Date(`${valor}T00:00:00`).toLocaleDateString("pt-BR");
}

function valorNullableBoolean(valor) {
  if (valor === true) return "sim";
  if (valor === false) return "nao";
  return "";
}

function parseNullableBoolean(valor) {
  if (valor === "sim") return true;
  if (valor === "nao") return false;
  return null;
}

function inputDate(value) {
  return value ? String(value).slice(0, 10) : "";
}

function formAluno(aluno) {
  return {
    nome: aluno.nome || "",
    sexo: aluno.sexo || "MASCULINO",
    whatsapp: aluno.whatsapp || "",
    email: aluno.email || "",
    dataNascimento: inputDate(aluno.dataNascimento),
    dataBatismo: inputDate(aluno.dataBatismo),
    endereco: aluno.endereco || "",
    unidadeId: aluno.unidadeId || aluno.unidade?.id || "",
    foto: null
  };
}

export function AlunosPage() {
  const [unidades, setUnidades] = useState([]);
  const [filtros, setFiltros] = useState({
    nome: "",
    unidadeId: "",
    ano: anoAtual,
    trimestre: "",
    semana: "",
    data: ""
  });
  const [registros, setRegistros] = useState([]);
  const [alunosCadastro, setAlunosCadastro] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [alunoEditando, setAlunoEditando] = useState(null);
  const [alunoForm, setAlunoForm] = useState(null);
  const [acessoAluno, setAcessoAluno] = useState(null);
  const [acessoForm, setAcessoForm] = useState({ codigoAcesso: "", senha: "", ativo: true });
  const [savingAluno, setSavingAluno] = useState(false);
  const [savingAcesso, setSavingAcesso] = useState(false);

  useEffect(() => {
    getUnidades({ igrejaAtual: true }).then(setUnidades).catch(() => setUnidades([]));
    carregar();
    carregarAlunosCadastro();
  }, []);

  function montarParams() {
    return Object.fromEntries(
      Object.entries(filtros)
        .filter(([, valor]) => valor !== "" && valor !== null && valor !== undefined)
    );
  }

  async function carregar() {
    setLoading(true);
    try {
      const data = await getRegistrosAlunos(montarParams());
      setRegistros(data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Não foi possível carregar os alunos.");
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  }

  async function carregarAlunosCadastro() {
    try {
      const data = await getAlunos(filtros.unidadeId ? { unidadeId: filtros.unidadeId } : {});
      setAlunosCadastro(data);
    } catch {
      setAlunosCadastro([]);
    }
  }

  const alunosFiltrados = alunosCadastro.filter((aluno) => {
    const nomeOk = aluno.nome.toLowerCase().includes(filtros.nome.trim().toLowerCase());
    const unidadeOk = !filtros.unidadeId || aluno.unidadeId === filtros.unidadeId;
    return nomeOk && unidadeOk;
  });

  function atualizarLinha(id, campo, valor) {
    setRegistros((atuais) => atuais.map((registro) => (
      registro.id === id ? { ...registro, [campo]: valor } : registro
    )));
  }

  async function salvarLinha(registro) {
    setSavingId(registro.id);
    try {
      const atualizado = await atualizarRegistroAluno(registro.id, {
        estudouLicao: Boolean(registro.estudouLicao),
        foiPontual: Boolean(registro.foiPontual),
        pequenoGrupo: registro.pequenoGrupo,
        acaoSolidaria: registro.acaoSolidaria,
        acaoSolidariaDescricao: registro.acaoSolidariaDescricao || "",
        acaoSolidariaTipo: registro.acaoSolidariaTipo || "",
        estudosBiblicos: registro.estudosBiblicos === "" || registro.estudosBiblicos === null ? null : Number(registro.estudosBiblicos),
        observacao: registro.observacao || ""
      });
      setRegistros((atuais) => atuais.map((item) => item.id === registro.id ? atualizado : item));
      toast.success("Registro do aluno atualizado.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Não foi possível salvar o registro.");
    } finally {
      setSavingId("");
    }
  }

  function abrirEdicaoAluno(aluno) {
    setAlunoEditando(aluno);
    setAlunoForm(formAluno(aluno));
  }

  async function salvarCadastroAluno(event) {
    event.preventDefault();
    if (!alunoEditando || !alunoForm?.nome.trim() || !alunoForm.unidadeId) {
      toast.error("Informe o nome e a unidade do aluno.");
      return;
    }

    setSavingAluno(true);
    try {
      const dados = new FormData();
      dados.append("nome", alunoForm.nome.trim());
      dados.append("sexo", alunoForm.sexo);
      dados.append("whatsapp", alunoForm.whatsapp.trim());
      dados.append("email", alunoForm.email.trim());
      dados.append("dataNascimento", alunoForm.dataNascimento);
      dados.append("dataBatismo", alunoForm.dataBatismo);
      dados.append("endereco", alunoForm.endereco.trim());
      dados.append("unidadeId", alunoForm.unidadeId);
      if (alunoForm.foto) dados.append("foto", alunoForm.foto);

      await atualizarAluno(alunoEditando.id, dados);
      toast.success("Cadastro do aluno atualizado.");
      setAlunoEditando(null);
      setAlunoForm(null);
      await carregarAlunosCadastro();
    } catch (error) {
      toast.error(error.response?.data?.message || "Não foi possível atualizar o cadastro do aluno.");
    } finally {
      setSavingAluno(false);
    }
  }

  function abrirAcessoAluno(aluno) {
    setAcessoAluno(aluno);
    setAcessoForm({
      codigoAcesso: aluno.usuario?.codigoAcesso || aluno.email || aluno.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, ""),
      senha: aluno.usuario?.senhaTemporaria || "",
      ativo: aluno.usuario?.ativo ?? true
    });
  }

  async function salvarAcesso(event) {
    event.preventDefault();
    if (!acessoAluno || !acessoForm.codigoAcesso.trim() || !acessoForm.senha.trim()) {
      toast.error("Informe login e senha do aluno.");
      return;
    }

    setSavingAcesso(true);
    try {
      const data = await salvarAcessoAluno(acessoAluno.id, {
        codigoAcesso: acessoForm.codigoAcesso.trim(),
        senha: acessoForm.senha,
        ativo: Boolean(acessoForm.ativo)
      });
      toast.success("Acesso do aluno atualizado.");
      setAlunosCadastro((atuais) => atuais.map((aluno) => aluno.id === acessoAluno.id ? { ...aluno, usuario: data.usuario } : aluno));
      setAcessoAluno((atual) => atual ? { ...atual, usuario: data.usuario } : atual);
    } catch (error) {
      toast.error(error.response?.data?.message || "Não foi possível salvar o acesso do aluno.");
    } finally {
      setSavingAcesso(false);
    }
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="m-0 font-outfit tracking-tight text-[26px] text-marinho">Alunos</h2>
          <p className="m-0 mt-1 text-muted">Consulte e edite os lançamentos semanais salvos por aluno e unidade de ação.</p>
        </div>
      </div>

      <Card animated delay={0.08} className="grid gap-3" hoverable={false}>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <label className="grid gap-1 text-sm font-bold text-marinho xl:col-span-2">Nome do aluno
            <input className="min-h-[42px] rounded-lg border border-borda px-3 font-normal text-texto" value={filtros.nome} onChange={(e) => setFiltros({ ...filtros, nome: e.target.value })} placeholder="Buscar por nome..." />
          </label>
          <label className="grid gap-1 text-sm font-bold text-marinho">Unidade
            <select className="min-h-[42px] rounded-lg border border-borda px-3 bg-white font-normal text-texto" value={filtros.unidadeId} onChange={(e) => setFiltros({ ...filtros, unidadeId: e.target.value })}>
              <option value="">Todas</option>
              {unidades.map((unidade) => <option key={unidade.id} value={unidade.id}>{unidade.nome}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-marinho">Ano
            <input className="min-h-[42px] rounded-lg border border-borda px-3 font-normal text-texto" type="number" value={filtros.ano} onChange={(e) => setFiltros({ ...filtros, ano: e.target.value ? Number(e.target.value) : "" })} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-marinho">Trimestre
            <select className="min-h-[42px] rounded-lg border border-borda px-3 bg-white font-normal text-texto" value={filtros.trimestre} onChange={(e) => setFiltros({ ...filtros, trimestre: e.target.value ? Number(e.target.value) : "" })}>
              <option value="">Todos</option>
              {[1, 2, 3, 4].map((item) => <option key={item} value={item}>{item}º trimestre</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-marinho">Semana
            <input className="min-h-[42px] rounded-lg border border-borda px-3 font-normal text-texto" type="number" min="1" max="53" value={filtros.semana} onChange={(e) => setFiltros({ ...filtros, semana: e.target.value ? Number(e.target.value) : "" })} placeholder="1 a 53" />
          </label>
          <label className="grid gap-1 text-sm font-bold text-marinho">Data
            <input className="min-h-[42px] rounded-lg border border-borda px-3 font-normal text-texto" type="date" value={filtros.data} onChange={(e) => setFiltros({ ...filtros, data: e.target.value })} />
          </label>
        </div>
        <div className="flex justify-end">
          <button type="button" onClick={() => { carregar(); carregarAlunosCadastro(); }} disabled={loading} className="inline-flex w-full sm:w-auto items-center justify-center gap-2 min-h-[42px] px-4 rounded-lg border-0 bg-marinho text-white font-bold cursor-pointer disabled:opacity-70">
            <Search size={17} /> {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </Card>

      <Card animated delay={0.1} className="mobile-full-bleed touch-scroll table-scroll-hint overflow-x-auto p-3 sm:p-4" hoverable={false}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
          <div>
            <h3 className="m-0 font-outfit text-lg text-marinho">Cadastro dos alunos</h3>
            <p className="m-0 mt-1 text-sm text-muted">Edite dados, foto e acesso individual dos alunos.</p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm text-muted"><Users size={16} /> {alunosFiltrados.length} aluno(s)</span>
        </div>

        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr>
              {["Aluno", "Unidade", "WhatsApp", "Sexo", "Acesso", ""].map((titulo) => (
                <th key={titulo} className="px-3 py-2 border-b border-borda text-xs font-bold text-marinho">{titulo}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alunosFiltrados.map((aluno, index) => (
              <tr key={aluno.id} className={index % 2 === 0 ? "bg-white" : "bg-black/[0.02]"}>
                <td className="px-3 py-2 border-b border-borda">
                  <div className="flex items-center gap-3">
                    {aluno.fotoUrl ? (
                      <img src={aluno.fotoUrl} alt={aluno.nome} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-marinho/10 text-sm font-extrabold text-marinho">{aluno.nome?.charAt(0)?.toUpperCase()}</span>
                    )}
                    <div className="min-w-0">
                      <strong className="block truncate text-sm text-texto">{aluno.nome}</strong>
                      <span className="block truncate text-xs text-muted">{aluno.email || "Sem e-mail"}</span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 border-b border-borda text-sm">{aluno.unidade?.nome || "-"}</td>
                <td className="px-3 py-2 border-b border-borda text-sm">{aluno.whatsapp || "-"}</td>
                <td className="px-3 py-2 border-b border-borda text-sm">{aluno.sexo === "FEMININO" ? "F" : "M"}</td>
                <td className="px-3 py-2 border-b border-borda text-sm">
                  {aluno.usuario?.codigoAcesso ? (
                    <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">{aluno.usuario.codigoAcesso}</span>
                  ) : (
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-muted">Sem acesso</span>
                  )}
                </td>
                <td className="px-3 py-2 border-b border-borda text-right">
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => abrirEdicaoAluno(aluno)} className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg border border-borda bg-white px-3 text-xs font-bold text-marinho hover:bg-marinho hover:text-white">
                      <Pencil size={14} /> Editar
                    </button>
                    <button type="button" onClick={() => abrirAcessoAluno(aluno)} className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg border border-borda bg-white px-3 text-xs font-bold text-marinho hover:bg-marinho hover:text-white">
                      <KeyRound size={14} /> Acesso
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!alunosFiltrados.length && (
          <div className="min-h-[90px] flex items-center justify-center border-t border-borda text-sm text-muted">
            Nenhum aluno encontrado para os filtros selecionados.
          </div>
        )}
      </Card>

      <Card animated delay={0.12} className="mobile-full-bleed touch-scroll table-scroll-hint overflow-x-auto xl:overflow-x-visible p-3 sm:p-4 [&_input]:text-xs [&_select]:text-xs [&_textarea]:text-xs [&_textarea]:!min-w-0 [&_textarea]:!w-full" hoverable={false}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
          <h3 className="m-0 font-outfit text-lg text-marinho">Lançamentos salvos</h3>
          <span className="inline-flex items-center gap-2 text-sm text-muted"><Users size={16} /> {registros.length} registro(s)</span>
        </div>

        <table className="w-full min-w-[920px] xl:min-w-0 border-collapse text-left table-fixed">
          <colgroup>
            <col className="w-[8%]" />
            <col className="w-[12%]" />
            <col className="w-[9%]" />
            <col className="w-[6%]" />
            <col className="w-[6%]" />
            <col className="w-[7%]" />
            <col className="w-[20%]" />
            <col className="w-[8%]" />
            <col className="w-[18%]" />
            <col className="w-[6%]" />
          </colgroup>
          <thead>
            <tr>
              {["Unidade", "Aluno", "Período", "Estudou a lição", "Pontual", "PG", "Ação", "Estudo Bíblico", "Observação", ""].map((titulo) => (
                <th key={titulo} className="px-2 py-2 border-b border-borda text-[11px] font-bold text-marinho leading-tight whitespace-normal">{titulo}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {registros.map((registro, index) => (
              <tr key={registro.id} className={index % 2 === 0 ? "bg-white" : "bg-black/[0.02]"}>
                <td className="px-2 py-2 border-b border-borda text-xs font-semibold leading-tight">{registro.unidade?.nome}</td>
                <td className="px-2 py-2 border-b border-borda text-xs font-bold text-texto leading-tight">{registro.aluno?.nome}</td>
                <td className="px-2 py-2 border-b border-borda text-xs text-muted leading-tight">
                  Semana {registro.numeroSemana}<br />
                  {dataBR(registro.data)}
                </td>
                <td className="px-2 py-2 border-b border-borda text-center">
                  <input type="checkbox" checked={Boolean(registro.estudouLicao)} onChange={(e) => atualizarLinha(registro.id, "estudouLicao", e.target.checked)} />
                </td>
                <td className="px-2 py-2 border-b border-borda text-center">
                  <input type="checkbox" checked={Boolean(registro.foiPontual)} onChange={(e) => atualizarLinha(registro.id, "foiPontual", e.target.checked)} />
                </td>
                <td className="px-2 py-2 border-b border-borda">
                  <select className="min-h-[32px] w-full rounded-md border border-borda px-2 bg-white text-xs" value={valorNullableBoolean(registro.pequenoGrupo)} onChange={(e) => atualizarLinha(registro.id, "pequenoGrupo", parseNullableBoolean(e.target.value))}>
                    <option value="">-</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </select>
                </td>
                <td className="px-2 py-2 border-b border-borda">
                  <div className="grid grid-cols-[64px_1fr] gap-1">
                    <select className="min-h-[30px] rounded-md border border-borda px-2 bg-white text-xs" value={valorNullableBoolean(registro.acaoSolidaria)} onChange={(e) => atualizarLinha(registro.id, "acaoSolidaria", parseNullableBoolean(e.target.value))}>
                      <option value="">-</option>
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                    <ModalInput className="!min-h-[30px] !px-2 !rounded-md" label="Descrição da ação" value={registro.acaoSolidariaDescricao || ""} onChange={(valor) => atualizarLinha(registro.id, "acaoSolidariaDescricao", valor)} placeholder="Descrição" />
                    <ModalInput className="col-span-2 !min-h-[30px] !px-2 !rounded-md" label="Tipo de ação" value={registro.acaoSolidariaTipo || ""} onChange={(valor) => atualizarLinha(registro.id, "acaoSolidariaTipo", valor)} placeholder="Tipo" />
                  </div>
                </td>
                <td className="px-2 py-2 border-b border-borda">
                  <input className="min-h-[32px] w-12 rounded-md border border-borda px-2 text-center text-xs" type="number" min="0" value={registro.estudosBiblicos ?? ""} onChange={(e) => atualizarLinha(registro.id, "estudosBiblicos", e.target.value ? Number(e.target.value) : null)} />
                </td>
                <td className="px-2 py-2 border-b border-borda">
                  <ModalInput type="textarea" className="!min-h-[46px] !px-2 !rounded-md" label={`Observação de ${registro.aluno?.nome || "aluno"}`} value={registro.observacao || ""} onChange={(valor) => atualizarLinha(registro.id, "observacao", valor)} placeholder={`Observação (${dataBR(registro.data)})`} />
                </td>
                <td className="px-2 py-2 border-b border-borda text-right">
                  <button type="button" title="Salvar" aria-label="Salvar" onClick={() => salvarLinha(registro)} disabled={savingId === registro.id} className="inline-flex items-center justify-center min-h-[34px] w-9 rounded-lg border-0 bg-marinho text-white cursor-pointer disabled:opacity-70">
                    <Save size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && registros.length === 0 && (
          <div className="min-h-[120px] flex items-center justify-center border-t border-borda text-sm text-muted">
            Nenhum lançamento salvo encontrado para os filtros selecionados.
          </div>
        )}
      </Card>
      {alunoEditando && alunoForm && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/60 p-4" onMouseDown={() => setAlunoEditando(null)}>
          <form onSubmit={salvarCadastroAluno} onMouseDown={(event) => event.stopPropagation()} className="relative grid w-full max-w-3xl gap-4 rounded-2xl bg-white p-6 shadow-2xl">
            <button type="button" onClick={() => setAlunoEditando(null)} aria-label="Fechar" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border-0 bg-slate-100 text-marinho">
              <X size={18} />
            </button>
            <div className="pr-10">
              <h3 className="m-0 font-outfit text-2xl text-marinho">Editar aluno</h3>
              <p className="m-0 mt-1 text-sm text-muted">Atualize cadastro, dados de contato e foto.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] gap-5">
              <label className="group grid cursor-pointer justify-items-center gap-3 rounded-2xl border-2 border-dashed border-marinho/20 bg-gradient-to-b from-[#f8fbff] to-white p-4 text-center text-sm font-bold text-marinho transition-all hover:border-marinho/45 hover:bg-marinho/[0.03]">
                <span className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-white text-marinho shadow-md ring-4 ring-marinho/10 transition-transform group-hover:scale-105">
                  {alunoForm.foto ? (
                    <img src={URL.createObjectURL(alunoForm.foto)} alt="Prévia" className="h-full w-full object-cover" />
                  ) : alunoEditando.fotoUrl ? (
                    <img src={alunoEditando.fotoUrl} alt={alunoEditando.nome} className="h-full w-full object-cover" />
                  ) : (
                    <Camera size={28} />
                  )}
                </span>
                <span className="inline-flex min-h-[34px] items-center justify-center gap-2 rounded-full bg-marinho px-3 text-xs font-extrabold text-white shadow-sm">
                  <Camera size={14} /> Escolher foto
                </span>
                <span className="text-[11px] font-medium leading-snug text-muted">
                  JPG ou PNG. Clique para enviar uma nova imagem.
                </span>
                {alunoForm.foto && (
                  <span className="max-w-full truncate rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">
                    {alunoForm.foto.name}
                  </span>
                )}
                <input type="file" accept="image/*" className="sr-only" onChange={(event) => setAlunoForm({ ...alunoForm, foto: event.target.files?.[0] || null })} />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm font-bold text-marinho md:col-span-2">Nome *
                  <input required className="min-h-[42px] rounded-lg border border-borda px-3 font-normal text-texto" value={alunoForm.nome} onChange={(e) => setAlunoForm({ ...alunoForm, nome: e.target.value })} />
                </label>
                <label className="grid gap-1 text-sm font-bold text-marinho">Sexo
                  <select className="min-h-[42px] rounded-lg border border-borda bg-white px-3 font-normal text-texto" value={alunoForm.sexo} onChange={(e) => setAlunoForm({ ...alunoForm, sexo: e.target.value })}>
                    <option value="MASCULINO">M - Masculino</option>
                    <option value="FEMININO">F - Feminino</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-bold text-marinho">Unidade
                  <select required className="min-h-[42px] rounded-lg border border-borda bg-white px-3 font-normal text-texto" value={alunoForm.unidadeId} onChange={(e) => setAlunoForm({ ...alunoForm, unidadeId: e.target.value })}>
                    {unidades.map((unidade) => <option key={unidade.id} value={unidade.id}>{unidade.nome}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-bold text-marinho">WhatsApp
                  <input className="min-h-[42px] rounded-lg border border-borda px-3 font-normal text-texto" value={alunoForm.whatsapp} onChange={(e) => setAlunoForm({ ...alunoForm, whatsapp: e.target.value })} />
                </label>
                <label className="grid gap-1 text-sm font-bold text-marinho">E-mail
                  <input type="email" className="min-h-[42px] rounded-lg border border-borda px-3 font-normal text-texto" value={alunoForm.email} onChange={(e) => setAlunoForm({ ...alunoForm, email: e.target.value })} />
                </label>
                <label className="grid gap-1 text-sm font-bold text-marinho">Nascimento
                  <input type="date" className="min-h-[42px] rounded-lg border border-borda px-3 font-normal text-texto" value={alunoForm.dataNascimento} onChange={(e) => setAlunoForm({ ...alunoForm, dataNascimento: e.target.value })} />
                </label>
                <label className="grid gap-1 text-sm font-bold text-marinho">Batismo
                  <input type="date" className="min-h-[42px] rounded-lg border border-borda px-3 font-normal text-texto" value={alunoForm.dataBatismo} onChange={(e) => setAlunoForm({ ...alunoForm, dataBatismo: e.target.value })} />
                </label>
                <label className="grid gap-1 text-sm font-bold text-marinho md:col-span-2">Endereço
                  <input className="min-h-[42px] rounded-lg border border-borda px-3 font-normal text-texto" value={alunoForm.endereco} onChange={(e) => setAlunoForm({ ...alunoForm, endereco: e.target.value })} />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAlunoEditando(null)} className="min-h-[42px] rounded-lg border border-borda bg-white px-4 font-bold text-marinho">Cancelar</button>
              <button type="submit" disabled={savingAluno} className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border-0 bg-marinho px-4 font-bold text-white disabled:opacity-70">
                <Save size={16} /> {savingAluno ? "Salvando..." : "Salvar aluno"}
              </button>
            </div>
          </form>
        </div>
      )}

      {acessoAluno && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/60 p-4" onMouseDown={() => setAcessoAluno(null)}>
          <form onSubmit={salvarAcesso} onMouseDown={(event) => event.stopPropagation()} className="relative grid w-full max-w-lg gap-4 rounded-2xl bg-white p-6 shadow-2xl">
            <button type="button" onClick={() => setAcessoAluno(null)} aria-label="Fechar" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border-0 bg-slate-100 text-marinho">
              <X size={18} />
            </button>
            <div className="pr-10">
              <h3 className="m-0 font-outfit text-2xl text-marinho">Acesso do aluno</h3>
              <p className="m-0 mt-1 text-sm text-muted">{acessoAluno.nome}</p>
            </div>

            <label className="grid gap-1 text-sm font-bold text-marinho">Login
              <input required className="min-h-[42px] rounded-lg border border-borda px-3 font-normal text-texto" value={acessoForm.codigoAcesso} onChange={(e) => setAcessoForm({ ...acessoForm, codigoAcesso: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm font-bold text-marinho">Senha temporária
              <input required className="min-h-[42px] rounded-lg border border-borda px-3 font-normal text-texto" value={acessoForm.senha} onChange={(e) => setAcessoForm({ ...acessoForm, senha: e.target.value })} />
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-bold text-marinho">
              <input type="checkbox" checked={acessoForm.ativo} onChange={(e) => setAcessoForm({ ...acessoForm, ativo: e.target.checked })} />
              Acesso ativo
            </label>
            <p className="m-0 rounded-lg bg-blue-50 px-3 py-2 text-xs text-marinho">
              Entregue este login e senha ao aluno. No primeiro acesso, ele poderá entrar na conta de aluno e atualizar sua própria foto.
            </p>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAcessoAluno(null)} className="min-h-[42px] rounded-lg border border-borda bg-white px-4 font-bold text-marinho">Fechar</button>
              <button type="submit" disabled={savingAcesso} className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border-0 bg-marinho px-4 font-bold text-white disabled:opacity-70">
                <KeyRound size={16} /> {savingAcesso ? "Salvando..." : "Salvar acesso"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
