# dev.Dockerfile
FROM node:18

WORKDIR /app

# Install a helper to run both processes
RUN npm install -g concurrently

# Install backend deps
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Install frontend deps
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Copy sources
COPY backend ./backend
COPY frontend ./frontend

# Ensure servers bind to all interfaces in containers
ENV HOST=0.0.0.0
ENV PORT=3000
ENV BACKEND_PORT=3001

# Accept secrets at runtime (populated via --env-file .env.development)
ENV NODE_ENV=development
ENV url=""
ENV geminiapi=""
ENV plagarismapi=""
ENV SESSION_KEY=""
ENV JWT_SECRET=""
ENV PASSWORD=""
ENV EMAIL=""
ENV FRONTEND_URL=""
ENV BUILD_PATH="../backend/build"
# For React dev, this variable must be available to the dev server process
ENV REACT_APP_BACKEND_URL="http://localhost:3001"

# Expose dev ports
EXPOSE 3000 3001

# Forward backend env into the backend process; React dev server will read process.env at start
# Your backend should read from process.env.* and your frontend dev server can reference
# import.meta.env.* (Vite) or process.env.REACT_APP_* (CRA) as usual.
CMD ["concurrently", \
  "npm:start --prefix backend", \
  "npm:start --prefix frontend"]

