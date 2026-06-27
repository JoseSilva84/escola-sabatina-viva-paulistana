# Plano do projeto — Professor Nota 10

Sistema full stack para digitalizar os 3 cartões trimestrais da Escola Sabatina VIVA (Aluno, Professor e Diretor), com autenticação por papéis e persistência em PostgreSQL.

**Stack:** React (Vite) no frontend · Node.js + Express no backend · PostgreSQL + Prisma ORM · JWT para autenticação.

---

## 1. Análise dos cartões originais

### Cartão do Aluno (2 faces)
- Incentivo ao estudo da lição — 13 sábados, adesivo se estudou os 7 dias da semana
- Incentivo à pontualidade — 13 sábados, adesivo se chegou até 9h (tolerância) no culto das 8h45
- 3 perguntas trimestrais: participação no Pequeno Grupo, ação solidária (com descrição e tipo), se ministrou estudo bíblico
- Regra de premiação: **70%** dos requisitos → homenagem no 13º sábado; **100%** → brinde especial entregue em 13/12

### Cartão do Professor (10 itens trimestrais)
1. Incentivo ao estudo da lição (sim/não)
2. Incentivo à pontualidade (sim/não)
3. Visitas mensais a alunos (data da primeira e última visita)
4. Participação na Classe dos Professores — checklist dos 13 sábados
5. Pequeno Grupo — responsável, endereço, dia da semana, horário
6. Ação social — descrição, tipo, data, local, nº de pessoas e interessados alcançados
7. Tabela aluno → pessoa que recebe estudo bíblico (meta: 50% dos alunos)
8. Registro de batismos originados da unidade
9. Confraternizações — lista de ações realizadas com datas
10. Reunião de planejamento trimestral (sim/não)

### Cartão do Diretor (4 itens trimestrais)
1. Avaliação se as classes cumprem os 10 itens (sim/não/algumas)
2. Realização da Classe dos Professores (frequência + quem participou)
3. Implantação da Classe dos Interessados (sim/não + quantidade de alunos)
4. Pastoreio aos professores — datas de primeira e última visita

---

## 2. Arquitetura

```
                ┌─────────────────────────────────────────┐
                │         Frontend — React (Vite)          │
                │   React Router · Context API · Axios     │
                │                                           │
                │  Cartão Aluno │ Cartão Professor │ Diretor│
                └───────────────────┬───────────────────────┘
                                    │ REST + JWT
                ┌───────────────────▼───────────────────────┐
                │         Backend — Node.js / Express        │
                │   Auth (login, JWT, papéis)                │
                │   Controllers: aluno · professor · diretor │
                │   Prisma ORM (migrations + queries)        │
                └───────────────────┬───────────────────────┘
                                    │
                ┌───────────────────▼───────────────────────┐
                │              PostgreSQL                    │
                │  igreja · usuario · unidade_acao            │
                │  cartao_aluno · cartao_professor            │
                │  cartao_diretor (+ tabelas filhas)          │
                └─────────────────────────────────────────────┘

Deploy: Docker Compose (app + banco) → Render / Railway / VPS
```

---

## 3. Modelo de dados (Prisma)

**Estrutura organizacional**
- `Igreja` — entidade raiz, agrupa usuários e cartões do diretor
- `Usuario` — papel `ADMIN | DIRETOR | PROFESSOR`, vinculado a uma igreja
- `UnidadeAcao` — "classe" da Escola Sabatina, vinculada a um professor responsável
- `Aluno` — vinculado a uma unidade de ação

**Cartão do Aluno**
- `CartaoAluno` — 1 por aluno/trimestre/ano, com as 3 perguntas trimestrais
- `CartaoAlunoSabado` — 13 registros filhos (estudo + pontualidade por sábado)

**Cartão do Professor**
- `CartaoProfessor` — 1 por unidade/trimestre/ano, com os campos diretos dos itens 1, 2, 3, 5, 6, 8, 9, 10
- `CartaoProfessorPresenca` — 13 registros filhos (item 4, presença na Classe dos Professores)
- `CartaoProfessorEstudoBiblico` — linhas dinâmicas aluno → interessado (item 7)
- `CartaoProfessorConfraternizacao` — lista dinâmica de ações (item 9)

**Cartão do Diretor**
- `CartaoDiretor` — 1 por igreja/trimestre/ano, com os 4 itens

Todas as tabelas de cartão têm `@@unique([..., trimestre, ano])` para impedir duplicidade, e os 13 sábados são pré-criados automaticamente ao gerar o cartão do trimestre.

---

## 4. Design system

| Token | Valor | Uso |
|---|---|---|
| `marinho-500` | `#1B3A6B` | Cor primária — capa, headers, sidebar |
| `notaDez-400` | `#F2C230` | Amarelo "post-it" — selo de progresso, CTAs de destaque |
| Branco / `areia-50` | `#FFFFFF` / `#FAF9F6` | Fundos de card e página |
| `sucesso-500` | `#3B6D11` | Estado "sim" / concluído |
| `alerta-500` | `#A32D2D` | Estado "não" / pendente |
| Tipografia título | Poppins 600 | Títulos institucionais |
| Tipografia corpo | Inter 400/500 | Formulários e dados |
| Raio de borda | `14px` (`card`) | Cards |
| Assinatura visual | Anel de progresso circular amarelo | Indicador de % de conclusão, recorrente nos 3 módulos |

---

## 5. Estrutura de pastas implementada

```
professor-nota-10/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # 11 models, 4 enums
│   │   └── seed.js              # admin + diretor + professor + alunos de exemplo
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── alunoController.js
│   │   │   ├── unidadeController.js
│   │   │   ├── cartaoAlunoController.js
│   │   │   ├── cartaoProfessorController.js
│   │   │   └── cartaoDiretorController.js
│   │   ├── routes/              # 1 arquivo de rotas por domínio
│   │   ├── middleware/
│   │   │   ├── auth.js          # autenticar() + autorizar(...papeis)
│   │   │   └── errorHandler.js
│   │   ├── utils/
│   │   │   ├── prisma.js        # client singleton
│   │   │   └── AppError.js
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   ├── client.js         # axios + interceptor de token/401
    │   │   └── services.js       # authApi, cartaoAlunoApi, cartaoProfessorApi, cartaoDiretorApi...
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── components/
    │   │   ├── ui/                # Campo, TogglerSimNao, AnelProgresso...
    │   │   ├── layout/
    │   │   ├── cartaoAluno/
    │   │   ├── cartaoProfessor/
    │   │   └── cartaoDiretor/
    │   ├── pages/
    │   ├── hooks/
    │   ├── utils/
    │   ├── index.css              # design tokens Tailwind
    │   ├── App.jsx
    │   └── main.jsx
    ├── tailwind.config.js
    └── package.json
```

---

## 6. API — endpoints implementados

**Autenticação** (`/api/auth`)
| Método | Rota | Acesso |
|---|---|---|
| POST | `/login` | Público |
| POST | `/registrar` | ADMIN |
| GET | `/me` | Autenticado |

**Cadastros** (`/api`)
| Método | Rota | Acesso |
|---|---|---|
| POST/GET | `/igrejas` | ADMIN / Autenticado |
| POST/GET/PATCH | `/unidades` | ADMIN, DIRETOR / Autenticado |
| POST/GET/PATCH/DELETE | `/alunos` | ADMIN, DIRETOR, PROFESSOR |

**Cartão do Aluno** (`/api/cartoes-aluno`)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/` | Cria cartão do trimestre (gera os 13 sábados) |
| GET | `/`, `/:id` | Lista / busca com progresso calculado |
| PATCH | `/:id/perguntas` | Atualiza as 3 perguntas trimestrais |
| PATCH | `/:id/sabados/:numeroSabado` | Marca adesivo de estudo/pontualidade |
| DELETE | `/:id` | Remove cartão |

**Cartão do Professor** (`/api/cartoes-professor`)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/` | Cria cartão do trimestre (gera as 13 presenças) |
| GET | `/`, `/:id` | Lista / busca com completude calculada |
| PATCH | `/:id` | Atualiza itens 1, 2, 3, 5, 6, 8, 9, 10 |
| PATCH | `/:id/presencas/:numeroSabado` | Item 4 — presença na Classe dos Professores |
| POST/DELETE | `/:id/estudos-biblicos` | Item 7 — tabela aluno → interessado |
| POST/DELETE | `/:id/confraternizacoes` | Item 9 — lista de ações |

**Cartão do Diretor** (`/api/cartoes-diretor`)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/` | Cria cartão do trimestre |
| GET | `/`, `/:id` | Lista / busca com completude calculada |
| PATCH | `/:id` | Atualiza os 4 itens |

Regras de negócio já implementadas no backend:
- Cálculo automático de `% estudo`, `% pontualidade` e elegibilidade para homenagem (≥70%) / brinde (100%) no Cartão do Aluno
- Cálculo de `% de completude` (itens preenchidos / total) nos Cartões do Professor e Diretor
- Validação de payload com Zod em todos os endpoints de escrita
- Restrição de duplicidade por `(entidade, trimestre, ano)`

---

## 7. Roadmap de implementação

- [x] **Fase 1 — Setup:** monorepo, schema Prisma (11 models), `.env`, seed inicial
- [x] **Fase 2 — Auth:** login, JWT, middleware `autenticar`/`autorizar` por papel
- [x] **Fase 3 — Backend dos 3 cartões:** controllers, rotas e regras de negócio completos
- [x] **Fase 4 — Design system:** paleta azul/amarelo/branco, tipografia Poppins+Inter, tokens Tailwind, componente de assinatura visual (anel de progresso)
- [ ] **Fase 5 — Telas React:** login, dashboard, formulário do Cartão do Aluno (grade de 13 sábados), formulário do Cartão do Professor (10 itens + sub-tabelas), formulário do Cartão do Diretor (4 itens)
- [ ] **Fase 6 — Dashboard consolidado:** visão por trimestre, lista de homenageados/elegíveis a brinde, indicadores por unidade
- [ ] **Fase 7 — Polish:** responsividade mobile, exportação do cartão em PDF, testes automatizados, deploy (Docker Compose)

---

## 8. Como rodar localmente

**Backend**
```bash
cd backend
npm install
cp .env.example .env        # ajustar DATABASE_URL se necessário
npx prisma migrate dev      # cria as tabelas no Postgres
npm run seed                # popular com admin/diretor/professor de teste
npm run dev                 # http://localhost:3001
```

**Frontend**
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

**Credenciais de teste (geradas pelo seed)**

| Papel | E-mail | Senha |
|---|---|---|
| ADMIN | admin@nota10.com | 123456 |
| DIRETOR | diretor@nota10.com | 123456 |
| PROFESSOR | professor@nota10.com | 123456 |
