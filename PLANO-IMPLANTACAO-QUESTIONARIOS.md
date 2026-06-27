# Plano de implantacao dos questionarios

Este plano organiza a implantacao dos questionarios do Professor Nota 10 no sistema, considerando tres perfis de acesso: professor, diretor e aluno.

## 1. Regras principais

- O professor responde o questionario do seu cartao 4 vezes ao ano, uma vez ao final de cada trimestre.
- O diretor responde o questionario do seu cartao 4 vezes ao ano, uma vez ao final de cada trimestre.
- O professor registra semanalmente os dados dos alunos da sua unidade de acao. Como o ano pode ter aproximadamente 53 semanas, o sistema deve suportar ate 53 preenchimentos semanais por ano.
- O aluno, neste primeiro momento, apenas visualiza suas respostas, seu progresso e futuras atividades como quizzes ou perguntas direcionadas.
- As informacoes exibidas ao aluno devem vir das respostas salvas pelo professor. O aluno nao edita esses dados nesta etapa.
- Sempre que o professor salvar respostas semanais ou trimestrais de um aluno, a tela do aluno deve refletir os dados atualizados na proxima consulta ou atualizacao automatica.
- As informacoes exibidas ao professor devem vir das respostas do questionario respondido por ele e dos lancamentos semanais feitos por ele para sua unidade de acao.
- As informacoes exibidas ao diretor devem vir das respostas do questionario respondido pelo proprio diretor da Escola Sabatina daquela igreja e dos dados consolidados das unidades de acao da igreja.
- Datas impressas nos PDFs nao devem ser gravadas como datas fixas no sistema. Quando necessario, o sistema usa Semana 1 a Semana 53, Sabado 1 a Sabado 13 do trimestre, trimestre, ano e campos de data preenchidos pelo usuario.
- O acesso do professor deve ficar limitado as unidades de acao vinculadas a ele, dentro da igreja e do distrito ao qual pertence.
- O acesso do diretor deve consolidar as unidades da sua igreja e permitir analise por trimestre.
- Como o PostgreSQL ja esta configurado, a implantacao deve priorizar a troca dos dados demonstrativos/em memoria por dados reais persistidos no banco.

## 2. Perfis e responsabilidades

**Professor**

- Preencher a coleta semanal dos alunos da unidade de acao.
- Salvar as respostas dos alunos no sistema para atualizar automaticamente a visualizacao do aluno.
- Responder o cartao do professor ao fim de cada trimestre.
- Visualizar sua tela com base no proprio questionario trimestral e nos dados semanais que salvou.
- Conferir o progresso dos alunos e corrigir informacoes antes do fechamento do trimestre.

**Diretor**

- Responder o cartao do diretor ao fim de cada trimestre.
- Acompanhar o cumprimento dos 10 itens por unidade de acao.
- Visualizar pendencias de professores e unidades.
- Visualizar sua tela com base no proprio questionario trimestral e nos dados consolidados da igreja.
- Cadastrar novas unidades de acao da sua igreja.

**Aluno**

- Visualizar suas respostas semanais e trimestrais preenchidas pelo professor.
- Acompanhar estudo, pontualidade, participacao no Pequeno Grupo, acao solidaria e estudo biblico.
- Futuramente, participar de quizzes e perguntas direcionadas.

**Administrador**

- Cadastrar distritos, igrejas, unidades de acao, professores, diretores e alunos.
- Vincular professor a uma ou mais unidades de acao, conforme a regra local.
- Abrir e fechar periodos de coleta.
- Dar manutencao nos vinculos quando houver mudanca de diretor, professor ou igreja.

## 3. Estrutura de dados a implantar

### 3.1 Organizacao

- `Distrito`: nome, codigo, ativo.
- `Igreja`: nome, distritoId, ativa.
- `UnidadeAcao`: nome, igrejaId, professorId, diretorId, ativa.
- `Usuario`: nome, email, senhaHash, papel, igrejaId, distritoId opcional.
- `Aluno`: nome, unidadeId, usuarioId opcional, ativo.

Regra para nova Unidade de Acao:

- O diretor informa apenas o Nome da Unidade de Acao e o Professor Responsavel.
- O Nome da Igreja deve ser lido automaticamente pelo sistema a partir da igreja vinculada ao usuario diretor logado.
- O Diretor da Escola Sabatina deve ser definido automaticamente como o usuario diretor logado.
- O professor responsavel deve pertencer a mesma igreja do diretor.
- O sistema nao deve permitir que um diretor cadastre unidade em outra igreja.

### 3.2 Periodos

- `PeriodoTrimestral`: ano, trimestre, dataInicio, dataFim, status.
- `SemanaLetiva`: ano, numeroSemana, dataInicio opcional, dataFim opcional, status.
- `SabadoTrimestre`: periodoTrimestralId, numeroSabado, data opcional.

As datas devem ser opcionais para nao depender das datas impressas nos cartoes.

### 3.3 Coleta semanal do aluno

Criar uma tabela propria para o lancamento semanal feito pelo professor:

- `ColetaSemanalAluno`
- alunoId
- unidadeId
- professorId
- igrejaId
- distritoId
- ano
- numeroSemana
- estudouLicao
- foiPontual
- pequenoGrupo opcional
- observacao opcional
- preenchidoEm
- atualizadoEm

Regra: deve existir apenas um registro por aluno, ano e numero da semana.

Fluxo de atualizacao:

- O professor preenche a semana da unidade de acao.
- Ao salvar, o backend grava ou atualiza os registros de `ColetaSemanalAluno`.
- O backend recalcula os indicadores do aluno: estudo, pontualidade, progresso geral, elegibilidade para homenagem e brinde quando aplicavel.
- A tela do aluno consulta esses dados ja consolidados e exibe o acompanhamento semanal atualizado.
- A tela deve manter o mesmo formato visual atual, mas seus valores devem vir dos registros salvos pelo professor.

### 3.4 Questionario trimestral do aluno

Manter o questionario trimestral do aluno para as 3 perguntas principais:

- participouPequenoGrupo
- participouAcaoSolidaria
- acaoSolidariaDescricao
- acaoSolidariaTipo
- ministrouOuAcompanhouEstudoBiblico

Neste momento, o professor pode preencher essas respostas em nome do aluno, e o aluno apenas visualiza.

Essas respostas tambem devem alimentar a area de questionarios rapidos da tela do aluno.

### 3.5 Questionario trimestral do professor

Usar um registro por unidade de acao, ano e trimestre:

- incentivoEstudoLicao
- incentivoPontualidade
- visitasMensaisRealizadas
- primeiraVisita
- ultimaVisita
- presencasClasseProfessores, usando Sabado 1 a Sabado 13
- pequenoGrupoResponsavel
- pequenoGrupoEndereco
- pequenoGrupoDiaSemana
- pequenoGrupoHorario
- acaoSocialDescricao
- acaoSocialTipo
- acaoSocialData
- acaoSocialLocal
- pessoasEnvolvidas
- interessadosAlcancados
- estudosBiblicos por aluno e interessado
- batismos por nome
- confraternizacoes por acao e data
- planejamentoTrimestralRealizado

Regra: deve existir apenas um cartao por unidade de acao, ano e trimestre.

Fluxo de atualizacao da tela do professor:

- O professor responde ou atualiza o questionario trimestral.
- Ao salvar, o backend grava as respostas no PostgreSQL.
- A tela do professor consulta o cartao daquele professor, unidade de acao, ano e trimestre.
- Os indicadores da tela do professor devem ser recalculados a partir das respostas salvas, nao de dados fixos.
- Se o professor tiver mais de uma unidade vinculada, a tela deve permitir escolher a unidade de acao.

### 3.6 Questionario trimestral do diretor

Usar um registro por igreja, ano e trimestre:

- cumprimentoClasses: Sim, Nao ou Algumas
- classeProfessoresRealizada
- classeProfessoresParticipantes
- classeInteressadosImplantada
- classeInteressadosQuantidade
- primeiraVisitaProfessores
- ultimaVisitaProfessores

Regra: deve existir apenas um cartao por igreja, ano e trimestre.

Fluxo de atualizacao da tela do diretor:

- O diretor responde ou atualiza o questionario trimestral da sua igreja.
- Ao salvar, o backend grava as respostas no PostgreSQL.
- A tela do diretor consulta o cartao da igreja vinculada ao diretor logado, no ano e trimestre selecionados.
- Os indicadores da tela do diretor devem combinar as respostas do seu questionario com os dados consolidados das unidades de acao da igreja.
- A tela do diretor nao deve usar dados demonstrativos quando houver dados reais no PostgreSQL.

## 4. Fluxos de tela

### 4.1 Tela do professor

Primeiro nivel: painel da unidade de acao.

- Seletor de ano, trimestre e semana.
- Lista de alunos da unidade.
- Grade semanal com estudo da licao e pontualidade.
- Botao para salvar a semana.
- Salvamento em lote para muitos alunos de uma vez.
- Confirmacao visual de que as respostas foram gravadas e ja estao disponiveis para os alunos.
- Indicador de semanas preenchidas no ano.
- Atalho para questionario trimestral do professor.
- Aviso de pendencias antes do fechamento do trimestre.
- Dados carregados do questionario do professor logado e da unidade selecionada.

Segundo nivel: questionario trimestral.

- Formulario com os 10 itens do cartao do professor.
- Presenca na Classe dos Professores exibida como Sabado 1 a Sabado 13.
- Tabelas dinamicas para estudos biblicos, batismos e confraternizacoes.
- Salvamento parcial.
- Status: rascunho, enviado, reaberto ou fechado.
- Depois de salvar, os dados da propria tela do professor devem ser atualizados com as respostas gravadas.

### 4.2 Tela do diretor

- Seletor de ano e trimestre.
- Questionario trimestral do diretor.
- Resumo por unidade de acao.
- Lista de professores com pendencias.
- Indicadores de cumprimento dos 10 itens.
- Indicadores de coleta semanal: semanas preenchidas, alunos acompanhados e pendencias.
- Dados carregados do questionario do diretor logado e da igreja vinculada ao diretor.
- Acao para adicionar nova Unidade de Acao.

Cadastro de nova Unidade de Acao pelo diretor:

- Campo editavel: Nome da Unidade de Acao.
- Campo automatico: Nome da Igreja, lido da igreja do diretor logado.
- Campo editavel: Professor Responsavel, selecionado entre professores da mesma igreja.
- Campo automatico: Diretor da Escola Sabatina, lido do usuario diretor logado.
- Ao salvar, a unidade fica vinculada a igreja do diretor, ao professor escolhido e ao diretor logado.
- A nova unidade deve aparecer imediatamente na lista de unidades da tela do diretor.

### 4.3 Tela do aluno

- Visualizacao do trimestre atual.
- Progresso de estudo e pontualidade calculado a partir das respostas salvas pelo professor.
- Respostas trimestrais registradas pelo professor.
- Atualizacao dos dados ao abrir a tela e apos intervalos curtos, quando necessario.
- Historico por trimestre.
- Area reservada para quizzes futuros.

Observacao: a tela do aluno deve permanecer como visualizacao, conforme o modelo atual. A mudanca principal e a origem dos dados: em vez de dados fixos ou demonstrativos, ela deve consumir os registros semanais e trimestrais salvos pelo professor.

### 4.4 Tela administrativa

- Cadastro de distritos, igrejas, unidades, usuarios e alunos.
- Vinculo de professores as unidades.
- Abertura e fechamento de anos, trimestres e semanas.
- Exportacao de dados por igreja, distrito, trimestre e ano.
- A administracao pode corrigir vinculos criados pelo diretor, quando necessario.

## 5. APIs necessarias

### Periodos

- `GET /api/periodos/trimestres`
- `POST /api/periodos/trimestres`
- `PATCH /api/periodos/trimestres/:id`
- `GET /api/periodos/semanas?ano=2026`

### Coleta semanal

- `GET /api/coletas-semanais?ano=2026&semana=1&unidadeId=...`
- `PUT /api/coletas-semanais/lote`
- `GET /api/coletas-semanais/resumo?ano=2026&unidadeId=...`
- `GET /api/alunos/:id/acompanhamento?ano=2026&trimestre=1`

O endpoint de acompanhamento do aluno deve retornar os dados prontos para a tela do aluno: semanas, estudo, pontualidade, percentuais, respostas trimestrais e historico.

### Cartao do aluno

- `GET /api/cartoes-aluno?ano=2026&trimestre=1`
- `PATCH /api/cartoes-aluno/:id/perguntas`

### Cartao do professor

- `GET /api/cartoes-professor?ano=2026&trimestre=1`
- `GET /api/professor/acompanhamento?ano=2026&trimestre=1&unidadeId=...`
- `POST /api/cartoes-professor`
- `PATCH /api/cartoes-professor/:id`
- `PATCH /api/cartoes-professor/:id/presencas/:numeroSabado`
- `POST /api/cartoes-professor/:id/estudos-biblicos`
- `POST /api/cartoes-professor/:id/batismos`
- `POST /api/cartoes-professor/:id/confraternizacoes`

### Cartao do diretor

- `GET /api/cartoes-diretor?ano=2026&trimestre=1`
- `GET /api/diretor/acompanhamento?ano=2026&trimestre=1`
- `POST /api/cartoes-diretor`
- `PATCH /api/cartoes-diretor/:id`

### Unidade de Acao

- `GET /api/unidades?igrejaAtual=true`
- `POST /api/unidades`
- `PATCH /api/unidades/:id`

No cadastro feito por diretor, o `POST /api/unidades` deve receber somente `nome` e `professorId`. O backend deve preencher `igrejaId` e `diretorId` com base no usuario autenticado.

## 6. Ordem de implantacao

### Fase 1 - Ajuste das perguntas

- Normalizar o arquivo de perguntas.
- Remover datas fixas dos sabados.
- Separar perguntas trimestrais de coletas semanais.
- Definir tipos de resposta: sim/nao, escolha unica, numero, texto, data e lista dinamica.

### Fase 2 - Banco de dados

- Adicionar distrito.
- Adicionar `diretorId` na Unidade de Acao, caso a modelagem definitiva precise registrar quem cadastrou ou dirige aquela unidade.
- Adicionar periodos trimestrais e semanas letivas.
- Criar a tabela de coleta semanal do aluno.
- Ajustar os campos do cartao do aluno para incluir tipo da acao solidaria.
- Ajustar os campos do professor para permitir batismos por nome, nao apenas quantidade.
- Garantir indices unicos para evitar duplicidade de respostas.

### Fase 3 - Backend

- Trocar rotas que usam dados em memoria para Prisma.
- Implantar filtros por papel: professor, diretor, aluno e admin.
- Conectar as consultas e salvamentos ao PostgreSQL configurado.
- Criar endpoints de coleta semanal em lote.
- Criar endpoint consolidado de acompanhamento do aluno, alimentado pelos salvamentos do professor.
- Criar endpoint consolidado de acompanhamento do professor, alimentado pelo questionario respondido pelo professor.
- Criar endpoint consolidado de acompanhamento do diretor, alimentado pelo questionario respondido pelo diretor e pelos dados da igreja.
- Criar cadastro de Unidade de Acao pelo diretor com igreja e diretor preenchidos automaticamente pelo usuario logado.
- Criar validacoes para ano, trimestre, semana e permissao de acesso.
- Calcular progresso semanal, trimestral e anual.

### Fase 4 - Frontend do professor

- Criar a tela de coleta semanal dos alunos.
- Criar formulario trimestral completo do professor.
- Carregar a tela do professor a partir das respostas salvas no questionario do professor.
- Permitir salvar rascunho e enviar trimestre.
- Exibir pendencias por aluno, semana e item do questionario.

### Fase 5 - Frontend do diretor

- Criar formulario trimestral do diretor.
- Criar painel de acompanhamento das unidades.
- Carregar a tela do diretor a partir das respostas salvas no questionario do diretor.
- Criar tela ou modal para adicionar nova Unidade de Acao.
- Preencher automaticamente igreja e diretor no cadastro de Unidade de Acao.
- Exibir professores pendentes e unidades com baixa coleta semanal.
- Consolidar indicadores por igreja e trimestre.

### Fase 6 - Frontend do aluno

- Manter a tela como visualizacao.
- Buscar os dados consolidados salvos pelo professor.
- Mostrar historico de respostas e progresso sem permitir edicao pelo aluno.
- Atualizar a tela quando houver novos salvamentos do professor, ao recarregar ou por atualizacao periodica.
- Preparar bloco futuro para quiz, sem bloquear a implantacao atual.

### Fase 7 - Relatorios e fechamento

- Relatorio por unidade de acao.
- Relatorio por igreja.
- Relatorio por distrito.
- Exportacao CSV ou PDF.
- Fechamento de trimestre com bloqueio de edicao e reabertura por admin.

## 7. Criterios de aceite

- Professor consegue preencher ate 53 semanas de dados dos alunos no ano.
- Professor consegue responder 4 questionarios trimestrais por ano para sua unidade de acao.
- Tela do professor mostra dados vindos das respostas salvas pelo proprio professor e nao dados demonstrativos.
- Diretor consegue responder 4 questionarios trimestrais por ano para sua igreja.
- Tela do diretor mostra dados vindos das respostas salvas pelo proprio diretor e dos dados consolidados da igreja.
- Diretor consegue cadastrar uma nova Unidade de Acao informando nome da unidade e professor responsavel.
- Ao cadastrar Unidade de Acao, o sistema preenche automaticamente a igreja e o diretor com base no usuario logado.
- Aluno consegue visualizar suas respostas, sem editar os dados nesta primeira etapa.
- Tela do aluno mostra os dados preenchidos pelo professor, nao dados manuais do aluno nem dados demonstrativos.
- Quando o professor salva uma coleta semanal, os indicadores e a grade semanal do aluno passam a refletir essa informacao.
- Nenhuma data impressa dos PDFs fica gravada como obrigatoria ou fixa.
- O sistema impede duplicidade de coleta por aluno, ano e semana.
- O sistema impede duplicidade de cartao por entidade, ano e trimestre.
- Cada perfil enxerga apenas os dados permitidos pelo seu papel.
