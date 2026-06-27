const fs = require('fs');

let content = fs.readFileSync('src/pages/ProfessorPage.jsx', 'utf8');

// 1. In `carregar()`, add visitouAlunos and promoveuConfraternizacao to setForm
content = content.replace(
  /incentivaEstudo: Boolean\(data\.cartao\?\.incentivaEstudo\),/,
  `incentivaEstudo: Boolean(data.cartao?.incentivaEstudo),
        visitouAlunos: Boolean(data.cartao?.visitouAlunos),
        promoveuConfraternizacao: Boolean(data.cartao?.promoveuConfraternizacao),`
);

// 2. Remove "Questionario dos alunos" entirely.
// Find the block from <Card animated delay={0.15} ...> to </Card> that has Questionario dos alunos.
const questAlunosRegex = /<Card animated delay=\{0\.15\} hoverable=\{false\} className="!p-0 overflow-hidden">[\s\S]*?(?=<Card animated delay=\{0\.16\})/g;
content = content.replace(questAlunosRegex, '');

// Also remove `salvarQuestionariosAlunos` and `marcarTodosQuestionario` and `atualizarQuestionarioAluno`?
// Actually, no need to touch them, they will just be unused, but keeping it clean is better.
content = content.replace(/function marcarTodosQuestionario[\s\S]*?\}\n/g, '');
content = content.replace(/function atualizarQuestionarioAluno[\s\S]*?\}\n/g, '');
content = content.replace(/async function salvarQuestionariosAlunos[\s\S]*?\}\n/g, '');


// 3. Replace the layout of Metas Semanais and Trimestrais
const layoutRegex = /<div className="mb-\[2px\]">[\s\S]*?(?=\{modalAcaoAluno &&)/g;

const newLayout = `<div className="mb-[2px]">
          <h2 className="m-0 font-outfit tracking-tight text-[26px]">Painel do Professor</h2>
          <p className="m-0 mt-1.5 text-muted">Gerencie sua unidade, preencha a coleta semanal e o questionário trimestral.</p>
        </div>

        <Card animated delay={0.12} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="grid gap-1 text-sm font-bold">Unidade
            <select className="min-h-[42px] rounded-lg border border-borda px-3 bg-white" value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)}>
              {unidades.map((unidade) => <option key={unidade.id} value={unidade.id}>{unidade.nome}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">Ano
            <input className="min-h-[42px] rounded-lg border border-borda px-3" type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} />
          </label>
          <label className="grid gap-1 text-sm font-bold">Trimestre
            <select className="min-h-[42px] rounded-lg border border-borda px-3 bg-white" value={trimestre} onChange={(e) => { setTrimestre(Number(e.target.value)); setSemana(((Number(e.target.value) - 1) * 13) + 1); }}>
              {[1, 2, 3, 4].map((item) => <option key={item} value={item}>{item}º trimestre</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">Semana
            <select className="min-h-[42px] rounded-lg border border-borda px-3 bg-white" value={semana} onChange={(e) => setSemana(Number(e.target.value))}>
              {semanas.map((item) => <option key={item} value={item}>Semana {item}</option>)}
            </select>
          </label>
        </Card>

        {/* METAS SEMANAIS */}
        <div className="mt-4 grid gap-4">
          <h3 className="m-0 font-outfit tracking-tight text-[22px] text-marinho mb-1 border-b border-borda pb-2">Metas Semanais</h3>
          
          <Card animated delay={0.13} className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="bg-marinho/5 p-3 rounded-xl text-marinho hidden md:block">
              <UserPlus size={24} />
            </div>
            <div className="flex-1">
              <h4 className="m-0 font-outfit text-base">Cadastrar novo aluno</h4>
              <p className="m-0 text-sm text-muted">Unidade: {card?.unidade?.nome || "Selecione"}</p>
            </div>
            <div className="grid grid-cols-1 md:flex items-end gap-2 w-full md:w-auto">
              <ModalInput label="Nome do aluno" value={novoAluno} onChange={setNovoAluno} placeholder="Digite o nome..." />
              <button type="button" onClick={cadastrarAluno} disabled={saving} className="inline-flex items-center justify-center min-h-[42px] px-4 rounded-lg border-0 bg-marinho text-white font-extrabold cursor-pointer">
                Cadastrar
              </button>
            </div>
          </Card>

          <Card animated delay={0.135} className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="m-0 font-outfit text-lg">Coleta Semanal dos Alunos</h3>
                <p className="m-0 mt-1 text-muted text-sm">Preenchimento da unidade para a semana selecionada.</p>
              </div>
              <button type="button" onClick={salvarTudoSemana} disabled={saving} className="inline-flex items-center justify-center gap-2 min-h-[42px] px-4 rounded-lg border-0 bg-marinho text-white font-extrabold cursor-pointer">
                <Save size={17} /> Salvar semana
              </button>
            </div>
            
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <h4 className="text-sm font-bold text-marinho mb-2">Legenda das Perguntas Semanais:</h4>
                <ul className="text-sm text-muted grid gap-1.5 list-disc pl-4">
                  <li><strong>PG:</strong> Você participou regularmente do Pequeno Grupo com os membros da classe?</li>
                  <li><strong>Ação:</strong> Você participou de uma ação solidária para captação de interessados?</li>
                  <li><strong>Estudo:</strong> Você ministrou, ou acompanhou, estudo bíblico para alguém no decorrer desse trimestre?</li>
                </ul>
            </div>

            <div className="overflow-x-auto border border-borda rounded-lg">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="bg-black/5">
                    <th className="px-3 py-3 text-left text-muted text-xs border-b border-borda font-semibold">Aluno</th>
                    <th className="px-3 py-3 text-center text-muted text-xs border-b border-borda font-semibold">
                      <div className="flex flex-col items-center gap-1">
                        Estudou
                        <input type="checkbox" onChange={(e) => marcarTodosColeta("estudouLicao", e.target.checked)} title="Marcar todos" className="cursor-pointer" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-center text-muted text-xs border-b border-borda font-semibold">
                      <div className="flex flex-col items-center gap-1">
                        Pontual
                        <input type="checkbox" onChange={(e) => marcarTodosColeta("foiPontual", e.target.checked)} title="Marcar todos" className="cursor-pointer" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-center text-muted text-xs border-b border-borda font-semibold" title="Você participou regularmente do Pequeno Grupo com os membros da classe?">
                      <div className="flex flex-col items-center gap-1">
                        PG
                        <input type="checkbox" onChange={(e) => marcarTodosColeta("pequenoGrupo", e.target.checked)} title="Marcar todos" className="cursor-pointer" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-center text-muted text-xs border-b border-borda font-semibold" title="Você participou de uma ação solidária para captação de interessados?">
                      <div className="flex flex-col items-center gap-1">
                        Ação
                        <input type="checkbox" onChange={(e) => marcarTodosColeta("acaoSolidaria", e.target.checked)} title="Marcar todos" className="cursor-pointer" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-center text-muted text-xs border-b border-borda font-semibold" title="Você ministrou, ou acompanhou, estudo bíblico para alguém no decorrer desse trimestre?">
                      <div className="flex flex-col items-center gap-1">
                        Estudo
                        <input type="checkbox" onChange={(e) => marcarTodosColeta("estudosBiblicos", e.target.checked ? 1 : null)} title="Marcar todos" className="cursor-pointer" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left text-muted text-xs border-b border-borda font-semibold">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {(coleta?.alunos || []).map((item, i) => (
                    <tr key={item.aluno.id} className={i % 2 === 0 ? "bg-white" : "bg-black/[0.02]"}>
                      <td className="px-3 py-2.5 border-b border-borda text-sm font-bold text-texto">{item.aluno.nome}</td>
                      <td className="px-3 py-2.5 border-b border-borda text-center"><input type="checkbox" checked={item.coleta.estudouLicao} onChange={(e) => atualizarColeta(item.aluno.id, "estudouLicao", e.target.checked)} className="cursor-pointer" /></td>
                      <td className="px-3 py-2.5 border-b border-borda text-center"><input type="checkbox" checked={item.coleta.foiPontual} onChange={(e) => atualizarColeta(item.aluno.id, "foiPontual", e.target.checked)} className="cursor-pointer" /></td>
                      <td className="px-3 py-2.5 border-b border-borda text-center"><input type="checkbox" checked={item.coleta.pequenoGrupo === true} onChange={(e) => atualizarColeta(item.aluno.id, "pequenoGrupo", e.target.checked)} className="cursor-pointer" /></td>
                      <td className="px-3 py-2.5 border-b border-borda text-center"><input type="checkbox" checked={item.coleta.acaoSolidaria === true} onChange={(e) => { atualizarColeta(item.aluno.id, "acaoSolidaria", e.target.checked); if (e.target.checked) setModalAcaoAluno(item.aluno.id); }} className="cursor-pointer" /></td>
                      <td className="px-3 py-2.5 border-b border-borda text-center"><input type="checkbox" checked={item.coleta.estudosBiblicos > 0} onChange={(e) => { if (e.target.checked) { setModalEstudoAluno(item.aluno.id); } else { atualizarColeta(item.aluno.id, "estudosBiblicos", null); } }} className="cursor-pointer" /></td>
                      <td className="px-3 py-2.5 border-b border-borda">
                        <ModalInput type="textarea" label={\`Observação de \${item.aluno.nome}\`} value={item.coleta.observacao || ""} onChange={(v) => atualizarColeta(item.aluno.id, "observacao", v)} placeholder="Clique para editar" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* METAS TRIMESTRAIS */}
        <div className="mt-8 grid gap-4">
          <h3 className="m-0 font-outfit tracking-tight text-[22px] text-marinho mb-1 border-b border-borda pb-2">Metas Trimestrais</h3>
          
          <Card animated delay={0.16} className="grid gap-4">
             <h4 className="m-0 font-outfit text-base text-marinho">Pergunta 1</h4>
             <span className="block font-bold text-texto text-sm">A unidade de ação está participando do programa de incentivo ao estudo da lição?</span>
             <div className="flex gap-5 mt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="radio" className="w-4 h-4 text-marinho focus:ring-marinho" checked={form.incentivaEstudo === true} onChange={() => setForm({...form, incentivaEstudo: true})} /> Sim</label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="radio" className="w-4 h-4 text-marinho focus:ring-marinho" checked={form.incentivaEstudo === false} onChange={() => setForm({...form, incentivaEstudo: false})} /> Não</label>
             </div>
          </Card>

          <Card animated delay={0.17} className="grid gap-4">
             <h4 className="m-0 font-outfit text-base text-marinho">Pergunta 2</h4>
             <span className="block font-bold text-texto text-sm">A unidade de ação está participando do programa de incentivo à pontualidade?</span>
             <div className="flex gap-5 mt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="radio" className="w-4 h-4 text-marinho focus:ring-marinho" checked={form.incentivaPontualidade === true} onChange={() => setForm({...form, incentivaPontualidade: true})} /> Sim</label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="radio" className="w-4 h-4 text-marinho focus:ring-marinho" checked={form.incentivaPontualidade === false} onChange={() => setForm({...form, incentivaPontualidade: false})} /> Não</label>
             </div>
          </Card>

          <Card animated delay={0.18} className="grid gap-4">
             <h4 className="m-0 font-outfit text-base text-marinho">Pergunta 3</h4>
             <span className="block font-bold text-texto text-sm">O professor visitou pelo menos um dos seus alunos por mês, todos os meses no decorrer do ano?</span>
             <div className="flex gap-5 mt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="radio" className="w-4 h-4 text-marinho focus:ring-marinho" checked={form.visitouAlunos === true} onChange={() => setForm({...form, visitouAlunos: true})} /> Sim</label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="radio" className="w-4 h-4 text-marinho focus:ring-marinho" checked={form.visitouAlunos === false} onChange={() => setForm({...form, visitouAlunos: false})} /> Não</label>
             </div>
             <div className="mt-2 bg-black/5 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-1 text-sm font-bold text-marinho">Primeira visita<ModalInput type="date" label="Primeira visita" value={form.primeiraVisita} onChange={(v) => setForm({ ...form, primeiraVisita: v })} /></div>
                <div className="grid gap-1 text-sm font-bold text-marinho">Última visita<ModalInput type="date" label="Última visita" value={form.ultimaVisita} onChange={(v) => setForm({ ...form, ultimaVisita: v })} /></div>
             </div>
          </Card>

          <Card animated delay={0.19} className="grid gap-4">
             <h4 className="m-0 font-outfit text-base text-marinho">Pergunta 4</h4>
             <span className="block font-bold text-texto text-sm">Participação do professor na Classe dos Professores. Marque os sábados em que o professor participou.</span>
             <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 mt-1">
              {presencas.map((item) => (
                <label key={item.numeroSabado} className="flex items-center gap-2 min-h-[40px] rounded-lg border border-borda px-3 text-sm cursor-pointer hover:bg-black/5 transition-colors">
                  <input type="checkbox" checked={Boolean(item.presente)} onChange={(e) => setPresencas((atuais) => atuais.map((p) => p.numeroSabado === item.numeroSabado ? { ...p, presente: e.target.checked } : p))} className="w-4 h-4 rounded text-marinho focus:ring-marinho" />
                  Sábado {item.numeroSabado}
                </label>
              ))}
            </div>
          </Card>

          <Card animated delay={0.20} className="grid gap-4">
             <h4 className="m-0 font-outfit text-base text-marinho">Pergunta 5</h4>
             <span className="block font-bold text-texto text-sm">Funcionamento de um Pequeno Grupo com os membros da classe e interessados. Escreva onde funciona o PG, o dia da semana e o horário em que acontece.</span>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="grid gap-1 text-sm font-bold text-marinho">Nome da pessoa responsável pelo Pequeno Grupo:<ModalInput label="Responsável pelo PG" value={form.pequenoGrupoResponsavel} onChange={(v) => setForm({ ...form, pequenoGrupoResponsavel: v })} /></div>
                <div className="grid gap-1 text-sm font-bold text-marinho">Endereço:<ModalInput label="Endereço do PG" value={form.pequenoGrupoEndereco} onChange={(v) => setForm({ ...form, pequenoGrupoEndereco: v })} /></div>
                <div className="grid gap-1 text-sm font-bold text-marinho">Dia da semana:<ModalInput label="Dia da semana" value={form.pequenoGrupoDia} onChange={(v) => setForm({ ...form, pequenoGrupoDia: v })} /></div>
                <div className="grid gap-1 text-sm font-bold text-marinho">Horário:<ModalInput label="Horário" type="time" value={form.pequenoGrupoHorario} onChange={(v) => setForm({ ...form, pequenoGrupoHorario: v })} /></div>
             </div>
          </Card>

          <Card animated delay={0.21} className="grid gap-4">
             <h4 className="m-0 font-outfit text-base text-marinho">Pergunta 6</h4>
             <span className="block font-bold text-texto text-sm">Promoção de uma ação social para captação de interessados. Descreva a ação social realizada.</span>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="grid gap-1 text-sm font-bold text-marinho md:col-span-2">Descrição da ação social<ModalInput label="Descrição da ação social" type="textarea" value={form.acaoSocialDescricao} onChange={(v) => setForm({ ...form, acaoSocialDescricao: v })} /></div>
                <div className="grid gap-1 text-sm font-bold text-marinho">Tipo de ação:<ModalInput label="Tipo de ação" value={form.acaoSocialTipo} onChange={(v) => setForm({ ...form, acaoSocialTipo: v })} /></div>
                <div className="grid gap-1 text-sm font-bold text-marinho">Data:<ModalInput label="Data da ação" type="date" value={form.acaoSocialData} onChange={(v) => setForm({ ...form, acaoSocialData: v })} /></div>
                <div className="grid gap-1 text-sm font-bold text-marinho">Local:<ModalInput label="Local da ação" value={form.acaoSocialLocal} onChange={(v) => setForm({ ...form, acaoSocialLocal: v })} /></div>
                <div className="grid gap-1 text-sm font-bold text-marinho">Quantidade de pessoas envolvidas:<ModalInput label="Pessoas envolvidas" type="number" value={form.pessoasAlcancadas} onChange={(v) => setForm({ ...form, pessoasAlcancadas: v })} /></div>
                <div className="grid gap-1 text-sm font-bold text-marinho">Quantidade de interessados alcançados:<ModalInput label="Interessados alcançados" type="number" value={form.interessadosAlcancados} onChange={(v) => setForm({ ...form, interessadosAlcancados: v })} /></div>
             </div>
          </Card>

          <Card animated delay={0.22} className="grid gap-4">
             <h4 className="m-0 font-outfit text-base text-marinho">Pergunta 7</h4>
             <span className="block font-bold text-texto text-sm">A unidade de ação teve pelo menos 50% dos alunos ministrando pelo menos uma série de estudos bíblicos no decorrer do ano? Anote o nome dos alunos e a pessoa para quem estão ministrando o estudo bíblico.</span>
             <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 mt-2">
                <div className="grid gap-1 text-sm font-bold text-marinho">Nome do aluno da unidade de ação:<ModalInput label="Nome do aluno" placeholder="Nome do aluno" value={novoEstudo.alunoNome} onChange={(v) => setNovoEstudo({ ...novoEstudo, alunoNome: v })} /></div>
                <div className="grid gap-1 text-sm font-bold text-marinho">Nome da pessoa que recebe o estudo:<ModalInput label="Pessoa que recebe o estudo" placeholder="Pessoa que recebe o estudo" value={novoEstudo.interessadoNome} onChange={(v) => setNovoEstudo({ ...novoEstudo, interessadoNome: v })} /></div>
                <button type="button" onClick={adicionarEstudo} className="self-end inline-flex items-center justify-center gap-2 min-h-[42px] px-4 rounded-lg border-0 bg-marinho text-white font-bold cursor-pointer"><Plus size={16} /> Adicionar</button>
             </div>
             {card?.cartao?.estudosBiblicos?.length > 0 && (
                <div className="mt-2 bg-black/5 p-4 rounded-lg">
                  <h5 className="m-0 text-sm font-bold text-marinho mb-2">Estudos Adicionados:</h5>
                  <ul className="m-0 pl-5 text-sm text-muted grid gap-1">
                    {card.cartao.estudosBiblicos.map((item) => <li key={item.id}><strong>{item.alunoNome}</strong> ensina <strong>{item.interessadoNome}</strong></li>)}
                  </ul>
                </div>
             )}
          </Card>

          <Card animated delay={0.23} className="grid gap-4">
             <h4 className="m-0 font-outfit text-base text-marinho">Pergunta 8</h4>
             <span className="block font-bold text-texto text-sm">Cada unidade de ação deve levar pelo menos uma pessoa ao batismo no decorrer do ano. Nome de quem se batizou por meio da unidade de ação.</span>
             <div className="grid gap-1 text-sm font-bold text-marinho mt-2">Nome:<ModalInput label="Nomes dos batismos" type="textarea" placeholder="Nomes separados por vírgula..." value={form.batismosNomes} onChange={(v) => setForm({ ...form, batismosNomes: v })} /></div>
             <div className="grid gap-1 text-sm font-bold text-marinho">Quantidade de batismos:<ModalInput label="Quantidade de batismos" type="number" value={form.batismos} onChange={(v) => setForm({ ...form, batismos: v })} /></div>
          </Card>

          <Card animated delay={0.24} className="grid gap-4">
             <h4 className="m-0 font-outfit text-base text-marinho">Pergunta 9</h4>
             <span className="block font-bold text-texto text-sm">A unidade de ação promoveu almoços, encontros sociais, pôr do sol juntos ou comemoração dos aniversariantes?</span>
             <div className="flex gap-5 mt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="radio" className="w-4 h-4 text-marinho focus:ring-marinho" checked={form.promoveuConfraternizacao === true} onChange={() => setForm({...form, promoveuConfraternizacao: true})} /> Sim</label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="radio" className="w-4 h-4 text-marinho focus:ring-marinho" checked={form.promoveuConfraternizacao === false} onChange={() => setForm({...form, promoveuConfraternizacao: false})} /> Não</label>
             </div>
             
             <div className="mt-4 border-t border-borda pt-4">
               <span className="block font-bold text-texto text-sm mb-3">Campos adicionais - Liste as ações realizadas:</span>
               <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3">
                  <div className="grid gap-1 text-sm font-bold text-marinho">Ação:<ModalInput label="Ação realizada" placeholder="Ação realizada" value={novaConfrat.descricao} onChange={(v) => setNovaConfrat({ ...novaConfrat, descricao: v })} /></div>
                  <div className="grid gap-1 text-sm font-bold text-marinho">Data:<ModalInput label="Data da confraternização" type="date" value={novaConfrat.data} onChange={(v) => setNovaConfrat({ ...novaConfrat, data: v })} /></div>
                  <button type="button" onClick={adicionarConfrat} className="self-end inline-flex items-center justify-center gap-2 min-h-[42px] px-4 rounded-lg border-0 bg-marinho text-white font-bold cursor-pointer"><Plus size={16} /> Adicionar</button>
               </div>
               {card?.cartao?.confraternizacoes?.length > 0 && (
                  <div className="mt-3 bg-black/5 p-4 rounded-lg">
                    <ul className="m-0 pl-5 text-sm text-muted grid gap-1">
                      {card.cartao.confraternizacoes.map((item) => <li key={item.id}><strong>{item.descricao}</strong> | Data: {inputDate(item.data)}</li>)}
                    </ul>
                  </div>
               )}
             </div>
          </Card>

          <Card animated delay={0.25} className="grid gap-4">
             <h4 className="m-0 font-outfit text-base text-marinho">Pergunta 10</h4>
             <span className="block font-bold text-texto text-sm">A unidade de ação realizou reuniões de planejamento e distribuiu as funções da Escola Sabatina entre os alunos? Foi realizada reunião de avaliação e planejamento para o próximo trimestre?</span>
             <div className="flex gap-5 mt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="radio" className="w-4 h-4 text-marinho focus:ring-marinho" checked={form.planejamentoTrimestral === true} onChange={() => setForm({...form, planejamentoTrimestral: true})} /> Sim</label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="radio" className="w-4 h-4 text-marinho focus:ring-marinho" checked={form.planejamentoTrimestral === false} onChange={() => setForm({...form, planejamentoTrimestral: false})} /> Não</label>
             </div>
          </Card>

          <button type="button" onClick={salvarQuestionario} disabled={saving} className="mx-auto mt-2 mb-8 inline-flex items-center justify-center gap-2 min-h-[50px] px-8 rounded-xl border-0 bg-marinho text-white font-extrabold cursor-pointer text-base shadow-lg shadow-marinho/20 w-full md:w-auto hover:bg-marinho/90 transition-colors">
             <Save size={20} /> Salvar Questionário do Professor
          </button>
        </div>
        
        {/* OTHER METAS */}
        {card?.metas?.map((metaItem, index) => (
          <Card animated delay={0.26 + (index * 0.03)} hoverable={false} className="!p-0 overflow-hidden" key={metaItem.titulo}>
            <button type="button" className="flex items-center justify-between w-full min-h-[78px] px-4.5 py-3.5 border-0 bg-transparent text-left cursor-pointer hover:bg-black/5" onClick={() => setOpen(open === metaItem.titulo ? "" : metaItem.titulo)}>
              <span>
                <strong className="block text-base">{metaItem.titulo}</strong>
                <small className="block mt-1 text-muted text-sm">{metaItem.detalhe}</small>
              </span>
              <span className="flex items-center gap-3 whitespace-nowrap text-muted">
                <StatusPill ok={metaItem.ok}>{metaItem.status}</StatusPill>
                {open === metaItem.titulo ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </span>
            </button>
            {open === metaItem.titulo && (
              <div className="flex items-center gap-2 px-4.5 pb-4.5 border-t border-borda pt-4 text-sm text-muted">
                <Check size={16} /> Dados carregados das respostas salvas no questionario.
              </div>
            )}
          </Card>
        ))}\n\n        `;

content = content.replace(layoutRegex, newLayout);

fs.writeFileSync('src/pages/ProfessorPage.jsx', content);
