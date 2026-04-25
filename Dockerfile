FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose the default port
EXPOSE 5000

# Start the node
CMD ["npm", "run", "start"]
