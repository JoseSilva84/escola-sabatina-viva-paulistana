import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/Card";
import { ModalInput } from "../components/ModalInput";
import { getDiretorCard, salvarCartaoDiretor } from "../api/services";

const anoAtual = new Date().getFullYear();

function dataInput(valor) {
  return valor ? String(valor).slice(0, 10) : "";
}

function Pergunta({ numero, texto, children, larguraTotal = false }) {
  return (
    <div className={`grid gap-2 text-sm font-bold text-marinho ${larguraTotal ? "md:col-span-2" : ""}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-marinho text-sm font-extrabold text-white shadow-md ring-2 ring-marinho/20">{numero}</span>
        <span className="leading-tight">{texto}</span>
      </div>
      {children}
    </div>
  );
}

export function MetasDiretorPage() {
  const [ano, setAno] = useState(anoAtual);
  const [trimestre, setTrimestre] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [dados, setDados] = useState(null);
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const resposta = await getDiretorCard({ ano, trimestre });
    setDados(resposta);
    setForm({
      cumprimentoClasses: resposta.cartao?.cumprimentoClasses || "ALGUMAS",
      classeProfessoresFrequencia: resposta.cartao?.classeProfessoresFrequencia || "",
      classeProfessoresParticipantes: resposta.cartao?.classeProfessoresParticipantes || "",
      classeInteressadosImplantada: Boolean(resposta.cartao?.classeInteressadosImplantada),
      classeInteressadosQuantidade: Number(resposta.cartao?.classeInteressadosQuantidade || 0),
      primeiraVisitaProfessores: dataInput(resposta.cartao?.primeiraVisitaProfessores),
      ultimaVisitaProfessores: dataInput(resposta.cartao?.ultimaVisitaProfessores)
    });
  }

  useEffect(() => {
    setDados(null);
    carregar().catch(() => toast.error("Não foi possível carregar as metas do diretor."));
  }, [ano, trimestre]);

  async function salvar() {
    if (!dados?.cartao?.id) return;
    setSalvando(true);
    try {
      await salvarCartaoDiretor(dados.cartao.id, {
        ...form,
        classeInteressadosQuantidade: Number(form.classeInteressadosQuantidade || 0)
      });
      toast.success("Metas do diretor salvas.");
      await carregar();
    } catch (error) {
      toast.error(error.response?.data?.message || "Não foi possível salvar as metas.");
    } finally {
      setSalvando(false);
    }
  }

  if (!dados) {
    return <div className="mx-auto mt-10 max-w-sm rounded-xl bg-white p-10 text-center text-muted shadow-sm">Carregando metas do diretor...</div>;
  }

  return (
    <section className="grid gap-5">
      <div>
        <h2 className="m-0 font-outfit text-[28px] tracking-tight text-texto">Metas - Diretor</h2>
        <p className="m-0 mt-1 text-muted">Preencha o questionário trimestral da direção da Escola Sabatina.</p>
      </div>

      <Card hoverable={false} className="grid gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="m-0 font-outfit text-2xl text-texto">Questionário trimestral do diretor</h3>
            <p className="m-0 mt-1 text-muted">{dados.igreja?.nome || "Igreja vinculada"}</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs font-bold text-marinho">
              Ano
              <select value={ano} onChange={(event) => setAno(Number(event.target.value))} className="min-h-[46px] rounded-lg border border-borda bg-white px-3 text-texto">
                {[anoAtual - 1, anoAtual, anoAtual + 1].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold text-marinho">
              Trimestre
              <select value={trimestre} onChange={(event) => setTrimestre(Number(event.target.value))} className="min-h-[46px] rounded-lg border border-borda bg-white px-3 text-texto">
                {[1, 2, 3, 4].map((item) => <option key={item} value={item}>{item}º tri</option>)}
              </select>
            </label>
            <button type="button" onClick={salvar} disabled={salvando} className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg border-0 bg-marinho px-5 font-extrabold text-white">
              <Save size={18} /> {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
          <Pergunta numero="1" texto="Classes cumprem os 10 itens?">
            <ModalInput type="select" label="Cumprimento dos itens" options={[{ value: "SIM", label: "Sim" }, { value: "NAO", label: "Não" }, { value: "ALGUMAS", label: "Algumas" }]} value={form.cumprimentoClasses} onChange={(valor) => setForm({ ...form, cumprimentoClasses: valor })} />
          </Pergunta>

          <Pergunta numero="2" texto="A Classe dos Professores foi realizada regularmente neste trimestre?">
            <div className="flex min-h-[46px] items-center gap-7 px-2">
              {["SIM", "NAO"].map((valor) => (
                <label key={valor} className="flex cursor-pointer items-center gap-2 text-base font-medium">
                  <input type="radio" name="frequenciaDiretor" className="h-5 w-5 accent-marinho" checked={form.classeProfessoresFrequencia === valor} onChange={() => setForm({ ...form, classeProfessoresFrequencia: valor })} />
                  {valor === "SIM" ? "Sim" : "Não"}
                </label>
              ))}
            </div>
          </Pergunta>

          <Pergunta numero="3" texto="Quem participou da Classe?" larguraTotal>
            <ModalInput type="textarea" label="Quem participou da Classe?" value={form.classeProfessoresParticipantes} onChange={(valor) => setForm({ ...form, classeProfessoresParticipantes: valor })} />
          </Pergunta>

          <Pergunta numero="4" texto="A Classe dos Interessados foi implantada?">
            <div className="flex min-h-[46px] items-center gap-7 px-2">
              {[true, false].map((valor) => (
                <label key={String(valor)} className="flex cursor-pointer items-center gap-2 text-base font-medium">
                  <input type="radio" name="interessadosDiretor" className="h-5 w-5 accent-marinho" checked={form.classeInteressadosImplantada === valor} onChange={() => setForm({ ...form, classeInteressadosImplantada: valor })} />
                  {valor ? "Sim" : "Não"}
                </label>
              ))}
            </div>
          </Pergunta>

          <Pergunta numero="5" texto="Quantidade de interessados">
            <ModalInput type="number" label="Quantidade de interessados" value={form.classeInteressadosQuantidade} onChange={(valor) => setForm({ ...form, classeInteressadosQuantidade: valor })} />
          </Pergunta>

          <Pergunta numero="6" texto="Data da primeira visita aos professores">
            <ModalInput type="date" label="Primeira visita" value={form.primeiraVisitaProfessores} onChange={(valor) => setForm({ ...form, primeiraVisitaProfessores: valor })} />
          </Pergunta>

          <Pergunta numero="7" texto="Data da última visita aos professores">
            <ModalInput type="date" label="Última visita" value={form.ultimaVisitaProfessores} onChange={(valor) => setForm({ ...form, ultimaVisitaProfessores: valor })} />
          </Pergunta>
        </div>
      </Card>
    </section>
  );
}
