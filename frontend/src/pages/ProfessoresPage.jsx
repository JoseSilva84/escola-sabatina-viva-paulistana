import React, { useEffect, useMemo, useState } from "react";
import { Building2, KeyRound, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/Card";
import { useAuth } from "../context/AuthContext";
import {
  alterarStatusProfessor,
  criarProfessor,
  getProfessores,
  getTodosProfessores,
  redefinirSenhaProfessor
} from "../api/services";

function agruparPorLocalizacao(contas) {
  return contas.reduce((regioes, conta) => {
    const regiaoNome = conta.regiao || "Regiao geral";
    const distritoNome = conta.distritoNome || "Distrito nao informado";
    const igrejaNome = conta.igrejaNome || "Igreja nao informada";

    if (!regioes[regiaoNome]) regioes[regiaoNome] = {};
    if (!regioes[regiaoNome][distritoNome]) regioes[regiaoNome][distritoNome] = {};
    if (!regioes[regiaoNome][distritoNome][igrejaNome]) regioes[regiaoNome][distritoNome][igrejaNome] = [];
    regioes[regiaoNome][distritoNome][igrejaNome].push(conta);
    return regioes;
  }, {});
}

function StatusConta({ ativo }) {
  return (
    <span className={`inline-flex min-h-[24px] items-center rounded-full px-2 text-xs font-bold ${ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
      {ativo ? "Ativo" : "Bloqueado"}
    </span>
  );
}

function ListaAgrupadaProfessores({ professores }) {
  const grupos = useMemo(() => agruparPorLocalizacao(professores), [professores]);
  const regioes = Object.keys(grupos).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));

  if (!professores.length) return <p className="m-0 text-muted">Nenhuma conta de professor encontrada.</p>;

  return (
    <div className="grid gap-4">
      {regioes.map((regiao) => (
        <Card key={regiao} hoverable={false} className="grid gap-3 border-marinho/15">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="m-0 font-outfit text-xl text-marinho">{regiao}</h3>
            <span className="text-sm font-bold text-muted">{Object.values(grupos[regiao]).flatMap((distrito) => Object.values(distrito).flat()).length} professor(es)</span>
          </div>
          {Object.keys(grupos[regiao]).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true })).map((distrito) => (
            <div key={distrito} className="grid gap-2 rounded-lg border border-borda bg-slate-50 p-3">
              <strong className="text-sm text-texto">Distrito: {distrito}</strong>
              {Object.keys(grupos[regiao][distrito]).sort((a, b) => a.localeCompare(b, "pt-BR")).map((igreja) => (
                <div key={igreja} className="grid gap-2 rounded-lg border border-borda bg-white p-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-marinho">
                    <Building2 size={16} /> {igreja}
                  </div>
                  <div className="grid gap-2">
                    {grupos[regiao][distrito][igreja].map((professor) => (
                      <div key={professor.id} className="grid gap-2 rounded-md bg-slate-50 px-3 py-2 sm:grid-cols-[1fr_auto] sm:items-center">
                        <div className="min-w-0">
                          <strong className="block truncate text-sm text-texto">{professor.nome}</strong>
                          <p className="m-0 mt-0.5 break-all text-xs text-muted">Login: {professor.codigoAcesso || professor.email || "acesso nao informado"}</p>
                        </div>
                        <StatusConta ativo={professor.ativo} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}

export function ProfessoresPage() {
  const { usuario } = useAuth();
  const [professores, setProfessores] = useState([]);
  const [todosProfessores, setTodosProfessores] = useState([]);
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [acessoCriado, setAcessoCriado] = useState(null);
  const isAdmin = usuario?.papel === "ADMIN";

  async function carregar() {
    try {
      const lista = await getProfessores();
      setProfessores(lista);
      if (isAdmin) setTodosProfessores(await getTodosProfessores());
    } catch {
      toast.error("Não foi possível carregar os professores.");
    }
  }

  useEffect(() => {
    carregar();
  }, [isAdmin]);

  async function cadastrar(event) {
    event.preventDefault();
    setSalvando(true);
    try {
      const resultado = await criarProfessor({ nome, senha });
      setAcessoCriado({
        nome: resultado.professor.nome,
        login: resultado.professor.codigoAcesso,
        senha
      });
      setNome("");
      setSenha("");
      await carregar();
      toast.success("Conta do professor criada.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Não foi possível criar o professor.");
    } finally {
      setSalvando(false);
    }
  }

  async function mudarStatus(professor) {
    try {
      await alterarStatusProfessor(professor.id, !professor.ativo);
      await carregar();
      toast.success(professor.ativo ? "Acesso bloqueado." : "Acesso reativado.");
    } catch {
      toast.error("Não foi possível alterar o acesso.");
    }
  }

  async function redefinir(professor) {
    try {
      const resultado = await redefinirSenhaProfessor(professor.id);
      setAcessoCriado({
        nome: professor.nome,
        login: professor.codigoAcesso,
        senha: resultado.senhaTemporaria
      });
      await carregar();
    } catch {
      toast.error("Não foi possível redefinir a senha.");
    }
  }

  return (
    <section className="grid gap-5">
      <div>
        <h2 className="m-0 font-outfit text-[28px] tracking-tight text-texto">Professores da igreja</h2>
        <p className="m-0 mt-1 text-muted">Crie e administre somente os acessos vinculados à sua igreja.</p>
      </div>

      {acessoCriado && (
        <Card hoverable={false} className="border-2 border-amber-300 bg-amber-50">
          <h3 className="m-0 text-lg text-marinho">Anote e entregue este acesso</h3>
          <p className="mb-1"><strong>Professor:</strong> {acessoCriado.nome}</p>
          <p className="my-1"><strong>Login:</strong> {acessoCriado.login}</p>
          <p className="my-1"><strong>Senha inicial:</strong> {acessoCriado.senha}</p>
          <p className="mb-0 text-sm text-muted">A senha não será exibida novamente.</p>
        </Card>
      )}

      <Card hoverable={false}>
        <form onSubmit={cadastrar} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="grid gap-1.5 text-sm font-bold">
            Nome do professor
            <input className="min-h-[44px] rounded-lg border border-borda px-3" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </label>
          <label className="grid gap-1.5 text-sm font-bold">
            Senha inicial
            <input className="min-h-[44px] rounded-lg border border-borda px-3" value={senha} onChange={(e) => setSenha(e.target.value)} type="password" minLength={8} required />
          </label>
          <button disabled={salvando} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border-0 bg-marinho px-4 font-bold text-white">
            <UserPlus size={17} /> {salvando ? "Criando..." : "Criar acesso"}
          </button>
        </form>
      </Card>

      <div className="grid gap-3">
        {professores.map((professor) => (
          <Card key={professor.id} hoverable={false} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <strong className="text-texto">{professor.nome}</strong>
              <p className="m-0 mt-1 text-sm text-muted">Login: {professor.codigoAcesso || "acesso antigo por e-mail"}</p>
              <span className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-bold ${professor.ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {professor.ativo ? "Ativo" : "Bloqueado"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => redefinir(professor)} className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-borda bg-white px-3 font-bold text-marinho">
                <KeyRound size={16} /> Redefinir senha
              </button>
              <button onClick={() => mudarStatus(professor)} className="min-h-[40px] rounded-lg border-0 bg-slate-700 px-3 font-bold text-white">
                {professor.ativo ? "Bloquear" : "Reativar"}
              </button>
            </div>
          </Card>
        ))}
        {!professores.length && <p className="text-muted">Nenhum professor cadastrado nesta igreja.</p>}
      </div>

      {isAdmin && (
        <section className="grid gap-3">
          <div>
            <h3 className="m-0 font-outfit text-2xl tracking-tight text-texto">Todas as contas de professores</h3>
            <p className="m-0 mt-1 text-sm text-muted">Organizadas por regiao, distrito e igreja.</p>
          </div>
          <ListaAgrupadaProfessores professores={todosProfessores} />
        </section>
      )}
    </section>
  );
}
