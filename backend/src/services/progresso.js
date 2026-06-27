function percentual(parte, total) {
  if (!total) return 0;
  return Math.round((parte / total) * 100);
}

function progressoAluno(cartao) {
  const estudo = cartao.sabados.filter((sabado) => sabado.estudouSemana).length;
  const pontualidade = cartao.sabados.filter((sabado) => sabado.pontual).length;
  const media = Math.round((percentual(estudo, 13) + percentual(pontualidade, 13)) / 2);

  return {
    estudoPercentual: percentual(estudo, 13),
    pontualidadePercentual: percentual(pontualidade, 13),
    progressoGeral: media,
    elegivelHomenagem: media >= 70,
    elegivelBrinde: media === 100
  };
}

function progressoPorSemanas(coletas, total = 13) {
  const registros = Array.isArray(coletas) ? coletas : [];
  const estudo = registros.filter((item) => item.estudouLicao || item.estudouSemana).length;
  const pontualidade = registros.filter((item) => item.foiPontual || item.pontual).length;
  const base = total || registros.length || 1;
  const media = Math.round((percentual(estudo, base) + percentual(pontualidade, base)) / 2);

  return {
    estudoPercentual: percentual(estudo, base),
    pontualidadePercentual: percentual(pontualidade, base),
    progressoGeral: media,
    elegivelHomenagem: media >= 70,
    elegivelBrinde: media === 100
  };
}

function completudeProfessor(cartao) {
  const checks = [
    cartao.incentivaEstudo,
    cartao.incentivaPontualidade,
    cartao.primeiraVisita && cartao.ultimaVisita,
    cartao.presencas?.some((item) => item.presente),
    cartao.pequenoGrupoResponsavel && cartao.pequenoGrupoEndereco,
    cartao.acaoSocialDescricao && cartao.acaoSocialData,
    cartao.estudosBiblicos?.length > 0,
    Number(cartao.batismos) >= 0,
    cartao.confraternizacoes?.length > 0,
    cartao.planejamentoTrimestral
  ];

  return percentual(checks.filter(Boolean).length, checks.length);
}

function completudeDiretor(cartao) {
  const checks = [
    cartao.cumprimentoClasses,
    cartao.classeProfessoresFrequencia && cartao.classeProfessoresParticipantes,
    cartao.classeInteressadosImplantada !== undefined && Number(cartao.classeInteressadosQuantidade) >= 0,
    cartao.primeiraVisitaProfessores && cartao.ultimaVisitaProfessores
  ];

  return percentual(checks.filter(Boolean).length, checks.length);
}

module.exports = { progressoAluno, progressoPorSemanas, completudeProfessor, completudeDiretor };
