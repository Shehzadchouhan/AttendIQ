FROM node:20-alpine

WORKDIR /app

# Copy package manifests first for efficient layer caching
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

EXPOSE 5173

# Start Vite development server with external network binding
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
