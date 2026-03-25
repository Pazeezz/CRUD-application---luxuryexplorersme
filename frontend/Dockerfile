FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build
RUN npm install -g serve@14.2.4

EXPOSE 4173

CMD ["serve", "-s", "dist", "-l", "4173", "--no-clipboard"]
