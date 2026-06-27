import React from "react";

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Erro inesperado" };
  }

  limparSessao = () => {
    try {
      localStorage.removeItem("nota10.token");
      localStorage.removeItem("nota10.usuario");
    } catch {
      // Continua redirecionando mesmo se o navegador bloquear o armazenamento.
    }
    window.location.href = "/login";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="fallback-page">
        <section className="fallback-panel">
          <h1>Não consegui carregar a tela</h1>
          <p>O frontend encontrou um erro durante o carregamento. A mensagem abaixo ajuda a corrigir a causa.</p>
          {this.state.message && <pre className="fallback-error">{this.state.message}</pre>}
          <button type="button" onClick={this.limparSessao}>Limpar sessão</button>
        </section>
      </main>
    );
  }
}
