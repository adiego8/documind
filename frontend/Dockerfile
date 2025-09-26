# Frontend Dockerfile for React Application - Simple approach like mywelltax-ui
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy environment variables as .env (will be .env for local, .env.production for production)
COPY .env .env

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage - use serve like mywelltax-ui
FROM node:17-alpine
WORKDIR /app

# Copy built app from previous stage
COPY --from=0 /app/build .

# Install serve globally
RUN npm install -g serve

# Create a simple startup script to handle PORT env var
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'npx serve -s /app -l ${PORT:-3000}' >> /start.sh && \
    chmod +x /start.sh

# Start the server
CMD ["/start.sh"]