# prod.Dockerfile

# Stage 1 — build frontend (no secrets are baked; build-time vars for public URLs only)
FROM node:18 AS build
WORKDIR /app

# Copy and install frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend ./frontend

# Important: Only expose public build-time vars to the frontend.
# REACT_APP_* (CRA) or VITE_* (Vite) are embedded into the bundle.
# Do not pass server-only secrets here.
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}
RUN mkdir -p /app/backend/build
ENV BUILD_PATH="/app/backend/build"
# If using CRA:
RUN cd frontend && npm run build
# If using Vite, adjust output path accordingly (dist instead of build).

# Stage 2 — backend + static assets
FROM node:18
WORKDIR /app

# Install backend deps
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy backend source
COPY backend ./backend
COPY --from=build /app/backend/build ./backend/build

# Runtime secrets (provided via --env-file .env.production at container start)
ENV NODE_ENV=production
ENV url=""
ENV geminiapi=""
ENV plagarismapi=""
ENV SESSION_KEY=""
ENV JWT_SECRET=""
ENV PASSWORD=""
ENV EMAIL=""
ENV FRONTEND_URL=""


EXPOSE 3001
WORKDIR /app/backend
CMD ["node", "index.js"]

