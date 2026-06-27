import React, { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, Minus, Plus, Save, Users, Pencil, X, Camera } from "lucide-react";
import { toast } from "sonner";
import { criarUnidade, getDiretorCard, getProfessorCard, getProfessores, getUnidades, salvarCartaoDiretor, atualizarAluno } from "../api/services";
import { ProgressRing } from "../components/ProgressRing";
import { Card } from "../components/Card";
import { ModalInput } from "../components/ModalInput";
import { useAuth } from "../context/AuthContext";

const anoAtual = new Date().getFullYear();

function Indicator({ title, value, subtitle, trend, index = 0 }) {
  const Icon = trend === "down" ? ArrowDown : ArrowUp;
  return (
    <Card animated delay={0.1 + (index * 0.1)} className="flex justify-between p-4.5">
      <div>
        <span className="text-muted">{title}</span>
        <strong className="block my-1.5 text-[28px]">{value}</strong>
        <small className="text-muted">{subtitle}</small>
      </div>
      <Icon className={trend === "down" ? "text-vermelho" : "text-verde"} size={20} />
    </Card>
  );
}

function dateValue(value) {
  return value ? String(value).slice(0, 10) : "";
}

export function DiretorPage() {
  const [ano, setAno] = useState(anoAtual);
  const [trimestre, setTrimestre] = useState(1);
  const [data, setData] = useState(null);
  const [form, setForm] = useState({});
  const [professores, setProfessores] = useState([]);
  const [novaUnidade, setNovaUnidade] = useState({ nome: "", professorId: "" });
  const [saving, setSaving] = useState(false);
  const [unidades, setUnidades] = useState([]);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState(null);
  const [alunosClasse, setAlunosClasse] = useState(null);
  const [alunoEditando, setAlunoEditando] = useState(null);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [novoAluno, setNovoAluno] = useState(null);
  const { usuario } = useAuth();
  const isDiretorOuAdmin = usuario?.papel === "DIRETOR" || usuario?.papel === "ADMIN";

  async function carregar() {
    const resposta = await getDiretorCard({ ano, trimestre });
    setData(resposta);
    setForm({
      cumprimentoClasses: resposta.cartao?.cumprimentoClasses || "ALGUMAS",
      classeProfessoresFrequencia: resposta.cartao?.classeProfessoresFrequencia || "",
      classeProfessoresParticipantes: resposta.cartao?.classeProfessoresParticipantes || "",
      classeInteressadosImplantada: Boolean(resposta.cartao?.classeInteressadosImplantada),
      classeInteressadosQuantidade: Number(resposta.cartao?.classeInteressadosQuantidade || 0),
      primeiraVisitaProfessores: dateValue(resposta.cartao?.primeiraVisitaProfessores),
      ultimaVisitaProfessores: dateValue(resposta.cartao?.ultimaVisitaProfessores)
    });
  }

  useEffect(() => {
    carregar().catch(() => setData(null));
  }, [ano, trimestre]);

  useEffect(() => {
    getProfessores().then((lista) => {
      setProfessores(lista);
      setNovaUnidade((atual) => ({ ...atual, professorId: atual.professorId || lista[0]?.id || "" }));
    }).catch(() => setProfessores([]));

    getUnidades({ igrejaAtual: true }).then((lista) => {
      setUnidades(lista);
    }).catch(() => setUnidades([]));
  }, []);

  useEffect(() => {
    if (!unidadeSelecionada) {
      setAlunosClasse(null);
      return;
    }
    setAlunosClasse(null);
    getProfessorCard({ ano, trimestre, unidadeId: unidadeSelecionada.id })
      .then((res) => {
        setAlunosClasse(res.alunos || []);
      })
      .catch(() => setAlunosClasse([]));
  }, [unidadeSelecionada, ano, trimestre]);

  async function salvarQuestionario() {
    if (!data?.cartao?.id) return;
    setSaving(true);
    try {
      await salvarCartaoDiretor(data.cartao.id, {
        ...form,
        classeInteressadosQuantidade: Number(form.classeInteressadosQuantidade || 0)
      });
      toast.success("Questionario do diretor salvo.");
      await carregar();
    } catch (error) {
      toast.error(error.response?.data?.message || "Nao foi possivel salvar o questionario.");
    } finally {
      setSaving(false);
    }
  }

  async function salvarEdicaoAluno() {
    if (!novoAluno.nome.trim() || !novoAluno.whatsapp.trim()) {
      toast.error("Nome e WhatsApp são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const dados = new FormData();
      dados.append("nome", novoAluno.nome.trim());
      dados.append("sexo", novoAluno.sexo);
      dados.append("whatsapp", novoAluno.whatsapp.trim());
      dados.append("unidadeId", unidadeSelecionada.id);
      dados.append("dataNascimento", novoAluno.dataNascimento || "");
      dados.append("dataBatismo", novoAluno.dataBatismo || "");
      dados.append("endereco", novoAluno.endereco?.trim() || "");
      dados.append("email", novoAluno.email?.trim() || "");
      if (novoAluno.foto) dados.append("foto", novoAluno.foto);

      await atualizarAluno(alunoEditando.id, dados);
      toast.success("Aluno atualizado com sucesso!");
      setAlunoEditando(null);
      setNovoAluno(null);
      
      // Recarregar os alunos da classe
      getProfessorCard({ ano, trimestre, unidadeId: unidadeSelecionada.id })
        .then((res) => setAlunosClasse(res.alunos || []));
    } catch (error) {
      toast.error(error.response?.data?.message || "Não foi possível atualizar o aluno.");
    } finally {
      setSaving(false);
    }
  }

  async function adicionarUnidade() {
    if (!novaUnidade.nome.trim() || !novaUnidade.professorId) {
      toast.error("Informe o nome da unidade e o professor responsável.");
      return;
    }
    setSaving(true);
    try {
      await criarUnidade(novaUnidade);
      toast.success("Unidade de Ação cadastrada para esta igreja.");
      setNovaUnidade({ nome: "", professorId: professores[0]?.id || "" });
      await carregar();
    } catch (error) {
      toast.error(error.response?.data?.message || "Nao foi possivel cadastrar a unidade.");
    } finally {
      setSaving(false);
    }
  }

  if (!data) return <div className="p-10 bg-white rounded-xl shadow-sm text-muted text-center max-w-sm mx-auto mt-10">Carregando dashboard...</div>;

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-6 items-start">
      <Card className="p-4 grid gap-3 sticky top-4">
        <h3 className="m-0 font-outfit text-lg border-b border-borda pb-2">Unidades de Ação</h3>
        <button 
          className={`text-left px-3 py-2 rounded-lg transition-colors cursor-pointer ${!unidadeSelecionada ? "bg-marinho text-white font-bold" : "hover:bg-black/5"}`}
          onClick={() => setUnidadeSelecionada(null)}
        >
          Visão Geral
        </button>
        {unidades.map(un => (
          <button 
            key={un.id}
            className={`text-left px-3 py-2 rounded-lg transition-colors cursor-pointer ${unidadeSelecionada?.id === un.id ? "bg-marinho text-white font-bold" : "hover:bg-black/5 text-texto"}`}
            onClick={() => setUnidadeSelecionada(un)}
          >
            {un.nome}
          </button>
        ))}
      </Card>

      <section>
        {!unidadeSelecionada ? (
          <>
            <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center mb-4.5">
              <div>
                <h2 className="m-0 font-outfit tracking-tight text-[26px]">Visão geral de todas as classes</h2>
          <p className="m-0 mt-1.5 text-muted">Dados vindos do questionario do diretor e das unidades da igreja.</p>
        </div>
        <div className="flex gap-2">
          <input className="min-h-[42px] w-[100px] rounded-lg border border-borda px-3" type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} />
          <select className="min-h-[42px] rounded-lg border border-borda px-3 bg-white" value={trimestre} onChange={(e) => setTrimestre(Number(e.target.value))}>
            {[1, 2, 3, 4].map((item) => <option key={item} value={item}>{item}º tri</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4.5">
        <Indicator index={0} title="Taxa de Desempenho" value={`${data.indicadores.taxaAprovacao}%`} subtitle="Desempenho das classes" />
        <Indicator index={1} title="Presença de Alunos" value={`${data.indicadores.presencaAlunos}%`} subtitle="Coletas registradas" />
        <Indicator index={2} title="Pendências" value={data.pendencias ?? data.indicadores.evasao} subtitle="Classes com itens abertos" trend="down" />
        <Indicator index={3} title="Questionário" value={`${data.indicadores.desempenhoEscola}%`} subtitle="Cartao do diretor" />
      </div>

      {isDiretorOuAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] gap-4.5 mt-4.5">
          <Card animated delay={0.3} className="grid gap-3">
            <div className="flex justify-between gap-3 items-start">
              <div>
                <h3 className="m-0 font-outfit text-lg">Questionario trimestral do diretor</h3>
                <p className="m-0 mt-1 text-muted text-sm">{data.igreja?.nome || "Igreja vinculada ao diretor"}</p>
              </div>
              <button type="button" onClick={salvarQuestionario} disabled={saving} className="inline-flex items-center justify-center gap-2 min-h-[42px] px-4 rounded-lg border-0 bg-marinho text-white font-extrabold cursor-pointer">
                <Save size={17} /> Salvar
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-1.5 text-sm font-bold text-marinho">
                Classes cumprem os 10 itens?
                <ModalInput 
                  type="select" 
                  label="Cumprimento dos itens" 
                  options={[{value: "SIM", label: "Sim"}, {value: "NAO", label: "Nao"}, {value: "ALGUMAS", label: "Algumas"}]} 
                  value={form.cumprimentoClasses} 
                  onChange={(v) => setForm({ ...form, cumprimentoClasses: v })} 
                />
              </div>
              <div className="grid gap-1.5 text-sm font-bold text-marinho">
                Classe dos Professores
                <ModalInput label="Classe dos Professores" value={form.classeProfessoresFrequencia} onChange={(v) => setForm({ ...form, classeProfessoresFrequencia: v })} placeholder="Ex.: Semanal" />
              </div>
              <div className="grid gap-1.5 text-sm font-bold text-marinho md:col-span-2">
                Quem participou?
                <ModalInput label="Quem participou da Classe?" type="textarea" value={form.classeProfessoresParticipantes} onChange={(v) => setForm({ ...form, classeProfessoresParticipantes: v })} />
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-marinho"><input type="checkbox" checked={form.classeInteressadosImplantada} onChange={(e) => setForm({ ...form, classeInteressadosImplantada: e.target.checked })} /> Classe dos Interessados implantada</label>
              <div className="grid gap-1.5 text-sm font-bold text-marinho">
                Quantidade de interessados
                <ModalInput type="number" label="Quantidade de interessados" value={form.classeInteressadosQuantidade} onChange={(v) => setForm({ ...form, classeInteressadosQuantidade: v })} />
              </div>
              <div className="grid gap-1.5 text-sm font-bold text-marinho">
                Primeira visita
                <ModalInput type="date" label="Primeira visita" value={form.primeiraVisitaProfessores} onChange={(v) => setForm({ ...form, primeiraVisitaProfessores: v })} />
              </div>
              <div className="grid gap-1.5 text-sm font-bold text-marinho">
                Ultima visita
                <ModalInput type="date" label="Última visita" value={form.ultimaVisitaProfessores} onChange={(v) => setForm({ ...form, ultimaVisitaProfessores: v })} />
              </div>
            </div>
          </Card>

          <Card animated delay={0.35} className="grid gap-4">
            <h3 className="m-0 font-outfit text-lg">Nova Unidade de Ação</h3>
            <div className="grid gap-1.5 text-sm font-bold text-marinho">
              Nome da Unidade
              <ModalInput label="Nome da Unidade" value={novaUnidade.nome} onChange={(v) => setNovaUnidade({ ...novaUnidade, nome: v })} />
            </div>
            <div className="grid gap-1.5 text-sm font-bold text-marinho">
              Igreja
              <ModalInput label="Igreja" disabled={true} value={data.igreja?.nome || "Lida automaticamente"} onChange={() => {}} />
            </div>
            <div className="grid gap-1.5 text-sm font-bold text-marinho">
              Professor Responsável
              <ModalInput 
                type="select" 
                label="Professor Responsável" 
                options={professores.map((p) => ({ value: p.id, label: p.nome }))}
                value={novaUnidade.professorId} 
                onChange={(v) => setNovaUnidade({ ...novaUnidade, professorId: v })} 
              />
            </div>
            <div className="grid gap-1.5 text-sm font-bold text-marinho">
              Diretor da Escola Sabatina
              <ModalInput label="Diretor" disabled={true} value="Diretor logado" onChange={() => {}} />
            </div>
            <button type="button" onClick={adicionarUnidade} disabled={saving} className="mt-2 inline-flex items-center justify-center gap-2 min-h-[42px] px-4 rounded-lg border-0 bg-marinho text-white font-extrabold cursor-pointer">
              <Plus size={17} /> Adicionar classe
            </button>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,0.8fr)] gap-4.5 mt-4.5">
        <Card animated delay={0.5} className="overflow-x-auto">
          <h3 className="m-0 mb-4 font-outfit text-lg">Conformidade das Classes - 10 Itens</h3>
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr>
                <th className="px-2.5 py-3 text-left text-muted text-xs border-b border-borda">Classes</th>
                <th className="px-2.5 py-3 text-left text-muted text-xs border-b border-borda">Professor</th>
                <th className="px-2.5 py-3 text-left text-muted text-xs border-b border-borda">Questionario</th>
                <th className="px-2.5 py-3 text-left text-muted text-xs border-b border-borda">Planejamento</th>
                <th className="px-2.5 py-3 text-left text-muted text-xs border-b border-borda">Coletas</th>
                <th className="px-2.5 py-3 text-left text-muted text-xs border-b border-borda">Pastoreio</th>
              </tr>
            </thead>
            <tbody>
              {data.unidades.map((unidade) => (
                <tr key={unidade.id || unidade.nome}>
                  <td className="px-2.5 py-3 border-b border-borda text-sm"><strong>{unidade.nome}</strong></td>
                  <td className="px-2.5 py-3 border-b border-borda text-sm">{unidade.professor?.nome || "-"}</td>
                  <td className="px-2.5 py-3 border-b border-borda text-sm"><ProgressBar value={unidade.metodologia || 0} /></td>
                  <td className="px-2.5 py-3 border-b border-borda text-sm"><CheckIcon ok={unidade.avaliacoes} /></td>
                  <td className="px-2.5 py-3 border-b border-borda text-sm"><ProgressBar value={unidade.coletas?.progresso || 0} /></td>
                  <td className="px-2.5 py-3 border-b border-borda text-sm"><span className="inline-flex items-center justify-center min-h-[28px] px-2.5 rounded-full font-bold text-[13px] text-[#173a6a] bg-[#e8f1ff]">{unidade.pastoreio}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card animated delay={0.6} className="grid justify-items-center gap-4 text-center">
          <h3 className="m-0 font-outfit text-lg">Desempenho Geral</h3>
          <ProgressRing value={data.indicadores.desempenhoEscola} size={260} label="Total" />
        </Card>
      </div>

      <Card animated delay={0.7} className="mt-4.5">
        <h3 className="m-0 mb-4 font-outfit text-lg">Resumo das Unidades</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Visit icon={<Users />} label="Unidades cadastradas" value={String(data.unidades.length)} />
          <Visit icon={<Users />} label="Pendências do trimestre" value={String(data.pendencias ?? 0)} />
          <Visit icon={<Users />} label="Igreja" value={data.igreja?.nome || "-"} />
        </div>
      </Card>
          </>
        ) : (
          <>
            <div className="mb-4.5">
              <h2 className="m-0 font-outfit tracking-tight text-[26px]">Alunos - {unidadeSelecionada.nome}</h2>
              <p className="m-0 mt-1.5 text-muted">Lista de alunos, com foto e informações de contato.</p>
            </div>
            
            {!alunosClasse ? (
              <div className="p-10 bg-white rounded-xl shadow-sm text-muted text-center max-w-sm mx-auto mt-10">Carregando alunos...</div>
            ) : alunosClasse.length === 0 ? (
              <div className="p-10 bg-white rounded-xl shadow-sm text-muted text-center max-w-sm mx-auto mt-10">Nenhum aluno cadastrado nesta classe.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {alunosClasse.map(aluno => (
                  <Card key={aluno.id} animated className="p-4 flex flex-col gap-3 relative group">
                    <button 
                      onClick={() => {
                        setAlunoEditando(aluno);
                        setNovoAluno({
                          nome: aluno.nome,
                          sexo: aluno.sexo || "MASCULINO",
                          whatsapp: aluno.whatsapp || "",
                          dataNascimento: aluno.dataNascimento ? String(aluno.dataNascimento).slice(0, 10) : "",
                          dataBatismo: aluno.dataBatismo ? String(aluno.dataBatismo).slice(0, 10) : "",
                          endereco: aluno.endereco || "",
                          email: aluno.email || "",
                          foto: null
                        });
                      }}
                      className="absolute top-3 right-3 text-muted hover:text-marinho bg-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity border border-borda shadow-sm cursor-pointer"
                      title="Editar Aluno"
                    >
                      <Pencil size={16} />
                    </button>
                    <div className="flex items-center gap-3 pr-8">
                      {aluno.fotoUrl ? (
                        <img 
                          src={aluno.fotoUrl} 
                          alt={aluno.nome} 
                          className="w-14 h-14 rounded-full object-cover bg-black/5 border border-borda cursor-pointer hover:opacity-80 transition-opacity" 
                          onClick={() => setFotoAmpliada(aluno.fotoUrl)}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-marinho/10 text-marinho flex items-center justify-center font-bold text-lg border border-marinho/20">
                          {aluno.nome?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <strong className="block text-texto leading-tight truncate" title={aluno.nome}>{aluno.nome}</strong>
                        <span className="text-xs text-muted block mt-0.5 truncate" title={aluno.email}>{aluno.email || "Sem e-mail cadastrado"}</span>
                      </div>
                    </div>
                    
                    <div className="text-sm grid gap-1.5 mt-2 pt-3 border-t border-borda">
                      <div className="flex justify-between items-center">
                        <span className="text-muted text-xs font-semibold uppercase tracking-wider">WhatsApp</span>
                        <strong className="text-marinho font-medium">{aluno.whatsapp || "-"}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted text-xs font-semibold uppercase tracking-wider">Nascimento</span>
                        <strong className="text-marinho font-medium">{aluno.dataNascimento ? String(aluno.dataNascimento).slice(0,10).split('-').reverse().join('/') : "-"}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted text-xs font-semibold uppercase tracking-wider">Sexo</span>
                        <strong className="text-marinho font-medium">{aluno.sexo === "FEMININO" ? "Feminino" : "Masculino"}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted text-xs font-semibold uppercase tracking-wider">Batismo</span>
                        <strong className="text-marinho font-medium">{aluno.dataBatismo ? String(aluno.dataBatismo).slice(0,10).split('-').reverse().join('/') : "-"}</strong>
                      </div>
                      {aluno.endereco && (
                        <div className="flex flex-col mt-1 bg-black/5 p-2 rounded-lg">
                          <span className="text-muted text-xs font-semibold uppercase tracking-wider mb-0.5">Endereço</span>
                          <span className="text-marinho font-medium text-xs leading-snug">{aluno.endereco}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>

    {/* Imagem Ampliada Modal */}
    {fotoAmpliada && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setFotoAmpliada(null)}>
        <img src={fotoAmpliada} className="max-w-full max-h-full rounded-xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
        <button className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors" onClick={() => setFotoAmpliada(null)}>
          <X size={32} />
        </button>
      </div>
    )}

    {/* Edição de Aluno Modal */}
    {alunoEditando && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <Card className="w-full max-w-2xl bg-white p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="m-0 font-outfit text-[22px] cursor-pointer">Editar Aluno</h3>
            <button className="text-muted hover:text-texto" onClick={() => { setAlunoEditando(null); setNovoAluno(null); }}>
              <X size={24} />
            </button>
          </div>

          <div className="grid gap-4">
            <div className="flex items-center gap-4 mb-2">
              <label className="cursor-pointer group relative">
                {novoAluno?.foto ? (
                  <img src={URL.createObjectURL(novoAluno.foto)} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-marinho/20" />
                ) : alunoEditando.fotoUrl ? (
                  <img src={alunoEditando.fotoUrl} alt="Atual" className="w-20 h-20 rounded-full object-cover border-2 border-marinho/20 group-hover:opacity-50 transition-opacity" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-marinho/10 text-marinho flex items-center justify-center border-2 border-transparent group-hover:bg-marinho/20 transition-colors">
                    <Camera size={30} />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-black/40 text-white">
                  <Camera size={24} />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setNovoAluno({ ...novoAluno, foto: e.target.files?.[0] || null })}
                />
              </label>
              <div className="text-sm">
                <strong className="block text-marinho">Foto do Aluno</strong>
                <span className="text-muted">Clique para alterar a imagem</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm font-bold text-marinho">Nome *
                <input className="min-h-[42px] rounded-lg border border-borda px-3 font-normal text-texto" value={novoAluno.nome} onChange={(e) => setNovoAluno({ ...novoAluno, nome: e.target.value })} placeholder="Digite o nome..." />
              </label>
              <label className="grid gap-1 text-sm font-bold text-marinho">Sexo *
                <select className="min-h-[42px] rounded-lg border border-borda px-3 bg-white font-normal text-texto" value={novoAluno.sexo} onChange={(e) => setNovoAluno({ ...novoAluno, sexo: e.target.value })}>
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMININO">Feminino</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-bold text-marinho">WhatsApp *
                <input className="min-h-[42px] rounded-lg border border-borda px-3 font-normal text-texto" value={novoAluno.whatsapp} onChange={(e) => setNovoAluno({ ...novoAluno, whatsapp: e.target.value })} placeholder="(00) 00000-0000" />
              </label>
              <label className="grid gap-1 text-sm font-bold text-marinho">Email
                <input className="min-h-[42px] rounded-lg border border-borda px-3 font-normal text-texto" type="email" value={novoAluno.email} onChange={(e) => setNovoAluno({ ...novoAluno, email: e.target.value })} placeholder="email@exemplo.com" />
              </label>
              <label className="grid gap-1 text-sm font-bold text-marinho">Nascimento
                <input className="min-h-[42px] rounded-lg border border-borda px-3 font-normal text-texto" type="date" value={novoAluno.dataNascimento} onChange={(e) => setNovoAluno({ ...novoAluno, dataNascimento: e.target.value })} />
              </label>
              <label className="grid gap-1 text-sm font-bold text-marinho">Batismo
                <input className="min-h-[42px] rounded-lg border border-borda px-3 font-normal text-texto" type="date" value={novoAluno.dataBatismo} onChange={(e) => setNovoAluno({ ...novoAluno, dataBatismo: e.target.value })} />
              </label>
              <label className="grid gap-1 text-sm font-bold text-marinho md:col-span-2">Endereço
                <input className="min-h-[42px] rounded-lg border border-borda px-3 font-normal text-texto" value={novoAluno.endereco} onChange={(e) => setNovoAluno({ ...novoAluno, endereco: e.target.value })} placeholder="Rua, numero, bairro..." />
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button 
                className="px-4 py-2 rounded-lg border border-borda text-texto font-semibold hover:bg-black/5"
                onClick={() => { setAlunoEditando(null); setNovoAluno(null); }}
              >
                Cancelar
              </button>
              <button 
                className="px-4 py-2 rounded-lg bg-marinho text-white font-extrabold hover:bg-[#102d55] flex items-center gap-2"
                onClick={salvarEdicaoAluno}
                disabled={saving}
              >
                <Save size={16} />
                Salvar Alterações
              </button>
            </div>
          </div>
        </Card>
      </div>
    )}
    </>
  );
}

function CheckIcon({ ok }) {
  return (
    <span className={`inline-grid place-items-center w-6 h-6 rounded-full text-white ${ok ? "bg-verde" : "bg-vermelho"}`}>
      {ok ? <Check size={14} /> : <Minus size={14} />}
    </span>
  );
}

function ProgressBar({ value }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <span className="inline-flex items-center gap-2 min-w-[130px]">
      <i className="inline-block h-2 rounded-full bg-[#28ad86]" style={{ width: `${safe}%` }} />
      <b className="text-xs">{safe}%</b>
    </span>
  );
}

function Visit({ icon, label, value }) {
  return (
    <div className="grid grid-cols-[38px_1fr_auto] items-center gap-3 py-4 border-b border-borda last:border-0">
      <span className="grid place-items-center w-[38px] h-[38px] rounded-full text-verde bg-[#e9f8f1]">{icon}</span>
      <span className="text-sm">{label}</span>
      <strong className="text-sm text-right">{value}</strong>
    </div>
  );
}
