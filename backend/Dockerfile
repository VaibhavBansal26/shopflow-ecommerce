FROM node:20-alpine
WORKDIR /app
COPY ca-bundle.crt /tmp/ca-bundle.crt
RUN cat /tmp/ca-bundle.crt >> /etc/ssl/certs/ca-certificates.crt
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 3001
CMD ["node", "src/index.js"]
