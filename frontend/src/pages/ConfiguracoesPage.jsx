import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CalendarClock,
  Download,
  HelpCircle,
  Image,
  Moon,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  UploadCloud,
  UserCog,
  Users
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/Card";
import { useAuth } from "../context/AuthContext";

const temaKey = "nota10.tema";

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
    titulo: "Notificacoes",
    descricao: "Lembretes de coleta semanal, avaliacao trimestral e pendencias do seu perfil.",
    icon: Bell
  },
  {
    id: "exportar",
    titulo: "Exportar relatorios",
    descricao: "Baixe somente os relatorios permitidos para o seu nivel de acesso.",
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
    descricao: "Editar nome, e-mail, senha, foto/avatar e preferencias do usuario.",
    icon: UserCog
  },
  {
    id: "igreja",
    titulo: "Dados da igreja",
    descricao: "Nome da igreja, distrito, associacao/campo, endereco e contatos oficiais.",
    icon: Building2
  },
  {
    id: "unidades",
    titulo: "Unidades de Acao",
    descricao: "Criar ou editar unidades, vincular professor responsavel e ativar classes.",
    icon: Users
  },
  {
    id: "periodo",
    titulo: "Ano e trimestre padrao",
    descricao: "Definir ano atual, trimestre atual e semana padrao de abertura.",
    icon: CalendarClock
  },
  {
    id: "usuarios",
    titulo: "Usuarios e permissoes",
    descricao: "Gerenciar diretores, professores, alunos e perfis de acesso.",
    icon: ShieldCheck
  },
  {
    id: "identidade",
    titulo: "Identidade do sistema",
    descricao: "Nome Escola Sabatina Viva, logo, cores e icone do sistema.",
    icon: Image
  },
  {
    id: "importar-exportar",
    titulo: "Importar/Exportar dados",
    descricao: "Baixar planilhas, importar alunos, exportar relatorios ou fazer backup.",
    icon: UploadCloud
  },
  {
    id: "pontuacao",
    titulo: "Criterios de pontuacao",
    descricao: "Editar pesos das metas, ranking, desempenho e regras de conformidade.",
    icon: SlidersHorizontal
  },
  {
    id: "ajuda",
    titulo: "Ajuda e suporte",
    descricao: "Manual rapido, duvidas frequentes, contato do suporte e versao do sistema.",
    icon: HelpCircle
  }
];

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
    "Relatorio exportado",
    "",
    `Perfil: ${perfil}`,
    `Relatorio: ${titulo}`,
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

function ConfigCard({ item, children, onClick }) {
  const Icon = item.icon;
  return (
    <Card hoverable={false} className="grid gap-4">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-marinho/10 text-marinho">
          <Icon size={22} />
        </span>
        <div className="min-w-0">
          <h3 className="m-0 font-outfit text-lg text-texto">{item.titulo}</h3>
          <p className="m-0 mt-1 text-sm leading-relaxed text-muted">{item.descricao}</p>
        </div>
      </div>
      {children || (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex min-h-[40px] w-fit items-center justify-center rounded-lg border border-borda bg-white px-4 font-bold text-marinho transition-colors hover:bg-marinho hover:text-white"
        >
          Configurar
        </button>
      )}
    </Card>
  );
}

export function ConfiguracoesPage() {
  const { usuario } = useAuth();
  const [tema, setTema] = useState(() => (
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  ));
  const [notificacoes, setNotificacoes] = useState(true);
  const isAdmin = usuario?.papel === "ADMIN";
  const perfil = perfilLabels[usuario?.papel] || usuario?.papel || "Usuario";

  useEffect(() => {
    aplicarTema(tema);
  }, [tema]);

  const opcoes = useMemo(() => (
    isAdmin
      ? [opcoesComuns[0], ...opcoesAdmin, opcoesComuns[1], opcoesComuns[2]]
      : opcoesComuns
  ), [isAdmin]);

  function exportarRelatorio() {
    const titulo = relatorioPorPerfil[usuario?.papel] || "Relatorio";
    const conteudo = criarPdfRelatorio({
      perfil,
      titulo,
      geradoEm: new Date().toLocaleString("pt-BR")
    });
    baixarArquivo(`relatorio-${String(usuario?.papel || "usuario").toLowerCase()}.pdf`, conteudo, "application/pdf");
    toast.success("PDF exportado para o seu nivel de acesso.");
  }

  function acaoPadrao(titulo) {
    toast.info(`${titulo} ficara disponivel para o Departamental Mipes.`);
  }

  return (
    <section className="grid gap-5">
      <div>
        <p className="m-0 text-sm font-bold text-marinho">{perfil}</p>
        <h2 className="m-0 mt-1 font-outfit text-[28px] tracking-tight text-texto">Configuracoes</h2>
        <p className="m-0 mt-1 text-muted">
          {isAdmin
            ? "Acesso completo de administracao do sistema Escola Sabatina Viva."
            : "Acesso limitado a notificacoes, exportacao de relatorios do perfil e tema do sistema."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
        {opcoes.map((item) => {
          if (item.id === "notificacoes") {
            return (
              <ConfigCard key={item.id} item={item}>
                <label className="flex w-fit items-center gap-3 rounded-lg border border-borda bg-white px-3 py-2 text-sm font-bold text-texto">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-marinho"
                    checked={notificacoes}
                    onChange={(event) => setNotificacoes(event.target.checked)}
                  />
                  Receber lembretes do sistema
                </label>
              </ConfigCard>
            );
          }

          if (item.id === "exportar" || item.id === "importar-exportar") {
            return (
              <ConfigCard key={item.id} item={item}>
                <button
                  type="button"
                  onClick={exportarRelatorio}
                  className="inline-flex min-h-[40px] w-fit items-center justify-center gap-2 rounded-lg border-0 bg-marinho px-4 font-bold text-white transition-colors hover:bg-marinho-escuro"
                >
                  <Download size={16} /> Exportar PDF
                </button>
              </ConfigCard>
            );
          }

          if (item.id === "tema") {
            return (
              <ConfigCard key={item.id} item={item}>
                <ToggleTema tema={tema} onChange={setTema} />
              </ConfigCard>
            );
          }

          return (
            <ConfigCard
              key={item.id}
              item={item}
              onClick={() => acaoPadrao(item.titulo)}
            />
          );
        })}
      </div>
    </section>
  );
}
