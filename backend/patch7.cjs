const fs = require('fs');
let content = fs.readFileSync('src/routes/dashboard.routes.js', 'utf8');

// Replace `ranking: []` with the actual ranking calculation
const rankingLogic = `
  const rankingMap = new Map();

  unidades.forEach(unidade => {
    unidade.alunos.forEach(aluno => {
      rankingMap.set(aluno.id, {
        id: aluno.id,
        nome: aluno.nome,
        nivel: aluno.nivel || 1,
        pontos: aluno.pontos || 0,
        coletas: []
      });
    });
  });

  coletas.forEach(coleta => {
    if (rankingMap.has(coleta.alunoId)) {
      rankingMap.get(coleta.alunoId).coletas.push(coleta);
    }
  });

  const ranking = Array.from(rankingMap.values()).map(aluno => {
    let pontosTrimestre = 0;
    
    aluno.coletas.forEach(c => {
      if (c.estudouLicao) pontosTrimestre += 10;
      if (c.foiPontual) pontosTrimestre += 10;
      if (c.pequenoGrupo) pontosTrimestre += 20;
      if (c.acaoSolidaria) pontosTrimestre += 20;
      if (c.estudosBiblicos) pontosTrimestre += (c.estudosBiblicos * 50);
    });

    const progresso = progressoPorSemanas(aluno.coletas, 13);
    
    return {
      id: aluno.id,
      nome: aluno.nome,
      nivel: Math.floor((aluno.pontos + pontosTrimestre) / 100) + 1,
      pontos: aluno.pontos + pontosTrimestre,
      progresso
    };
  });

  ranking.sort((a, b) => b.pontos - a.pontos);

  res.json({
    indicadores: {
      taxaAprovacao: desempenhoUnidades,
      presencaAlunos: progressoAlunos.pontualidadePercentual,
      evasao: Math.max(0, 100 - progressoAlunos.progressoGeral),
      desempenhoEscola: cartaoDiretor ? completudeDiretor(cartaoDiretor) : desempenhoUnidades
    },
    unidades: unidadesResumo,
    ranking
  });
`;

content = content.replace(/res\.json\(\{\s*indicadores: \{[\s\S]*?ranking: \[\]\s*\}\);/g, rankingLogic.trim());

fs.writeFileSync('src/routes/dashboard.routes.js', content);
