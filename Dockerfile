FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better caching)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy source code
COPY . .

ENV NODE_ENV=production

# Run the sync script
CMD ["node", "server.js"]
