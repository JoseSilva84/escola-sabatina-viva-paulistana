FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl curl

COPY package*.json ./
RUN npm ci --include=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

ENV NODE_ENV=production
EXPOSE 3001

CMD ["npm", "run", "deploy"]
