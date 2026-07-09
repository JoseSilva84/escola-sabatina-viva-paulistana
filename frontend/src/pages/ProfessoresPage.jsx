import React, { useEffect, useState } from "react";
import { KeyRound, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/Card";
import {
  alterarStatusProfessor,
  criarProfessor,
  getProfessores,
  redefinirSenhaProfessor
} from "../api/services";

export function ProfessoresPage() {
  const [professores, setProfessores] = useState([]);
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [acessoCriado, setAcessoCriado] = useState(null);

  async function carregar() {
    try {
      setProfessores(await getProfessores());
    } catch {
      toast.error("Não foi possível carregar os professores.");
    }
  }

  useEffect(() => {
    carregar();
  }, []);

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
    </section>
  );
}
