FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY index.js .
RUN mkdir -p /app/storage
EXPOSE 1234
CMD ["node", "index.js"]
