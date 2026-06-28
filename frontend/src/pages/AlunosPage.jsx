import React, { useEffect, useState } from "react";
import { Save, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { atualizarRegistroAluno, getRegistrosAlunos, getUnidades } from "../api/services";
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
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");

  useEffect(() => {
    getUnidades({ igrejaAtual: true }).then(setUnidades).catch(() => setUnidades([]));
    carregar();
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
          <button type="button" onClick={carregar} disabled={loading} className="inline-flex items-center justify-center gap-2 min-h-[42px] px-4 rounded-lg border-0 bg-marinho text-white font-bold cursor-pointer disabled:opacity-70">
            <Search size={17} /> {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </Card>

      <Card animated delay={0.12} className="overflow-x-auto xl:overflow-x-visible p-4 [&_input]:text-xs [&_select]:text-xs [&_textarea]:text-xs [&_textarea]:!min-w-0 [&_textarea]:!w-full" hoverable={false}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="m-0 font-outfit text-lg text-marinho">Lançamentos salvos</h3>
          <span className="inline-flex items-center gap-2 text-sm text-muted"><Users size={16} /> {registros.length} registro(s)</span>
        </div>

        <table className="w-full min-w-[980px] xl:min-w-0 border-collapse text-left table-fixed">
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
    </section>
  );
}
