# Deploy do backend no Coolify

## 1. Criar o PostgreSQL

No projeto `ESCOLA-SABATINA-VIVA`:

1. Clique em `+ Add Resource`.
2. Escolha `Database`.
3. Escolha `PostgreSQL`.
4. Defina um nome, por exemplo `professor-nota-10-db`.
5. Faça o deploy do banco.

Depois de criado, copie a connection string interna do PostgreSQL. Ela normalmente parece com:

```txt
postgresql://usuario:senha@postgres:5432/banco
```

## 2. Criar o backend

1. Clique em `+ Add Resource`.
2. Escolha `Application`.
3. Conecte o repositório do projeto.
4. Configure:

```txt
Base Directory: /backend
Build Pack: Dockerfile
Dockerfile Location: /Dockerfile
Port: 3001
Healthcheck Path: /api/health
```

## 3. Variáveis de ambiente do backend

Adicione estas variáveis no recurso do backend:

```txt
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
DIRECT_URL=postgresql://usuario:senha@host:5432/banco
JWT_SECRET=troque-por-uma-chave-grande-e-segura
CORS_ORIGIN=https://seu-frontend.com
```

Se você usar um PostgreSQL externo que exige SSL, adicione também:

```txt
DATABASE_SSL=true
```

Para upload de fotos, adicione quando tiver Cloudinary configurado:

```txt
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
CLOUDINARY_DEFAULT_MALE_URL=
CLOUDINARY_DEFAULT_FEMALE_URL=
```

## 4. Deploy

Clique em `Deploy`.

O container vai executar:

```txt
npm run deploy
```

Esse comando aplica as migrations do Prisma e depois inicia a API.

## 5. Teste

Abra:

```txt
https://dominio-do-backend/api/health
```

A resposta esperada é:

```json
{"status":"ok","name":"Professor Nota 10"}
```
