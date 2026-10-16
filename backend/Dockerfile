FROM node:24-alpine

WORKDIR /app

COPY packages/trato-client ./packages/trato-client
COPY backend/package*.json ./backend/

WORKDIR /app/backend

RUN npm install --include=optional

COPY backend .

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
