import { api } from "./client";
import { alunoCard, dashboard, demoUsers, professorCard, ranking } from "./demoData";

export async function login(credenciais) {
  try {
    const { data } = await api.post("/auth/login", credenciais);
    return data;
  } catch (error) {
    const { email, senha } = credenciais;
    const usuario = demoUsers[email?.toLowerCase()];
    if (!usuario || senha !== "123456") throw error;
    return { token: `demo-${usuario.id}`, usuario };
  }
}

export async function getDistritosAcesso() {
  const { data } = await api.get("/auth/distritos");
  return data;
}

export async function getIgrejasAcesso(distritoId) {
  const { data } = await api.get(`/auth/distritos/${distritoId}/igrejas`);
  return data;
}

export async function trocarSenha(payload) {
  await api.post("/auth/trocar-senha", payload);
}

export async function salvarPerfilInicial(payload) {
  const formData = new FormData();
  formData.append("nome", payload.nome);
  formData.append("whatsapp", payload.whatsapp);
  formData.append("sexoPerfil", payload.sexoPerfil);
  if (payload.foto) formData.append("foto", payload.foto);
  const { data } = await api.post("/auth/perfil-inicial", formData);
  return data;
}

export async function atualizarMeuPerfil(payload) {
  if (payload.foto) {
    const formData = new FormData();
    formData.append("nome", payload.nome);
    formData.append("email", payload.email);
    formData.append("whatsapp", payload.whatsapp || "");
    formData.append("sexoPerfil", payload.sexoPerfil || "");
    formData.append("foto", payload.foto);
    const { data } = await api.patch("/auth/me", formData);
    return data;
  }

  const { data } = await api.patch("/auth/me", payload);
  return data;
}

export async function getDashboard(params = {}) {
  try {
    const { data } = await api.get("/dashboard", { params });
    return data;
  } catch {
    return { ...dashboard, ranking };
  }
}

export async function getAlunoCard(params = {}) {
  try {
    const { data } = await api.get("/cartoes-aluno/acompanhamento", { params });
    return {
      nome: data.aluno?.nome || "Aluno",
      progresso: data.progresso.progressoGeral,
      metricas: [
        { rotulo: "Estudo", valor: `${data.progresso.estudoPercentual}%` },
        { rotulo: "Pontualidade", valor: `${data.progresso.pontualidadePercentual}%` },
        { rotulo: "Brinde", valor: data.progresso.elegivelBrinde ? "Sim" : "Nao" }
      ],
      sabados: data.sabados,
      perguntas: data.perguntas
    };
  } catch {
    return alunoCard;
  }
}

export async function getProfessorCard(params = {}) {
  try {
    const { data } = await api.get("/cartoes-professor/acompanhamento", { params });
    return data;
  } catch {
    return professorCard;
  }
}

export async function getCartoesProfessor(params = {}) {
  const { data } = await api.get("/cartoes-professor", { params });
  return data;
}

export async function salvarCartaoProfessor(id, payload) {
  const { data } = await api.patch(`/cartoes-professor/${id}`, payload);
  return data;
}

export async function salvarPresencaProfessor(cartaoId, numeroSabado, presente) {
  const { data } = await api.patch(`/cartoes-professor/${cartaoId}/presencas/${numeroSabado}`, { presente });
  return data;
}

export async function adicionarEstudoBiblico(cartaoId, payload) {
  const { data } = await api.post(`/cartoes-professor/${cartaoId}/estudos-biblicos`, payload);
  return data;
}

export async function adicionarConfraternizacao(cartaoId, payload) {
  const { data } = await api.post(`/cartoes-professor/${cartaoId}/confraternizacoes`, payload);
  return data;
}

export async function getCartoesAluno(params = {}) {
  const { data } = await api.get("/cartoes-aluno", { params });
  return data;
}

export async function criarCartaoAluno(payload) {
  const { data } = await api.post("/cartoes-aluno", payload);
  return data;
}

export async function salvarPerguntasAluno(cartaoId, payload) {
  const { data } = await api.patch(`/cartoes-aluno/${cartaoId}/perguntas`, payload);
  return data;
}

export async function getColetaSemanal(params) {
  const { data } = await api.get("/coletas-semanais", { params });
  return data;
}

export async function salvarColetaSemanal(payload) {
  const { data } = await api.put("/coletas-semanais/lote", payload);
  return data;
}

export async function getRegistrosAlunos(params = {}) {
  const { data } = await api.get("/coletas-semanais/alunos-registros", { params });
  return data;
}

export async function atualizarRegistroAluno(id, payload) {
  const { data } = await api.patch(`/coletas-semanais/alunos-registros/${id}`, payload);
  return data;
}

export async function getColetaSemanalProfessor(params) {
  const { data } = await api.get("/coletas-semanais/professor", { params });
  return data;
}

export async function salvarColetaSemanalProfessor(payload) {
  const { data } = await api.put("/coletas-semanais/professor", payload);
  return data;
}

export async function getDiretorCard(params = {}) {
  try {
    const { data } = await api.get("/cartoes-diretor/acompanhamento", { params });
    return data;
  } catch {
    return getDashboard(params);
  }
}

export async function salvarCartaoDiretor(id, payload) {
  const { data } = await api.patch(`/cartoes-diretor/${id}`, payload);
  return data;
}

export async function getUnidades(params = {}) {
  const { data } = await api.get("/cadastros/unidades", { params });
  return data;
}

export async function atualizarUnidade(id, payload) {
  const { data } = await api.patch(`/cadastros/unidades/${id}`, payload);
  return data;
}

export async function getIgrejas() {
  const { data } = await api.get("/cadastros/igrejas");
  return data;
}

export async function atualizarIgreja(id, payload) {
  const { data } = await api.patch(`/cadastros/igrejas/${id}`, payload);
  return data;
}

export async function getProfessores() {
  const { data } = await api.get("/cadastros/professores");
  return data;
}

export async function criarProfessor(payload) {
  const { data } = await api.post("/cadastros/professores", payload);
  return data;
}

export async function alterarStatusProfessor(id, ativo) {
  const { data } = await api.patch(`/cadastros/professores/${id}/status`, { ativo });
  return data;
}

export async function redefinirSenhaProfessor(id) {
  const { data } = await api.post(`/cadastros/professores/${id}/redefinir-senha`);
  return data;
}

export async function criarUnidade(payload) {
  const { data } = await api.post("/cadastros/unidades", payload);
  return data;
}

export async function criarAluno(payload) {
  const { data } = await api.post("/cadastros/alunos", payload);
  return data;
}

export async function getAlunos(params = {}) {
  const { data } = await api.get("/cadastros/alunos", { params });
  return data;
}

export async function atualizarAluno(id, payload) {
  const { data } = await api.put(`/cadastros/alunos/${id}`, payload);
  return data;
}

export async function salvarAcessoAluno(id, payload) {
  const { data } = await api.post(`/cadastros/alunos/${id}/acesso`, payload);
  return data;
}
