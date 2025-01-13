# STEP1: CLONE THE CODE
FROM alpine/git as builder_prepare
WORKDIR /home/
ARG GIT_REPO=https://github.com/mickael-kerjean/filestash
ARG GIT_BRANCH=master
RUN git clone --depth 1 --single-branch --branch ${GIT_BRANCH} ${GIT_REPO}

# STEP2: BUILD THE FRONTEND
FROM node:18-alpine AS builder_frontend
WORKDIR /home/
COPY --from=builder_prepare /home/ ./
RUN apk add make git gzip brotli && \
    npm install --legacy-peer-deps && \
    make build_frontend && \
    cd public && make compress

# STEP3: BUILD THE BACKEND
FROM golang:1.23-bookworm AS builder_backend
WORKDIR /home/
COPY --from=builder_frontend /home/filestash ./
RUN apt-get update > /dev/null && \
    apt-get install -y curl make > /dev/null 2>&1 && \
    apt-get install -y libjpeg-dev libtiff-dev libpng-dev libwebp-dev libraw-dev libheif-dev libgif-dev libvips-dev > /dev/null 2>&1 && \
    make build_init && \
    make build_backend && \
    mkdir -p ./dist/data/state/config/ && \
    cp config/config.json ./dist/data/state/config/config.json

# STEP4: BUILD PLUGINS
FROM emscripten/emsdk AS builder_final
WORKDIR /app/
COPY --from=builder_backend /home/ /home/
RUN mkdir -p /home/dist/data/state/plugins && \
    cd /home/server/plugin/plg_application_dev/ && make && \
    cd /home/server/plugin/plg_application_3d/ && make

# STEP5: Create the prod image from the build
FROM debian:stable-slim
MAINTAINER mickael@kerjean.me
COPY --from=builder_final /home/dist/ /app/
WORKDIR "/app"
RUN apt-get update > /dev/null && \
    apt-get install -y --no-install-recommends apt-utils && \
    apt-get install -y curl ffmpeg libjpeg-dev libtiff-dev libpng-dev libwebp-dev libraw-dev libheif-dev libgif-dev && \
    useradd filestash && \
    chown -R filestash:filestash /app/ && \
    find /app/data/ -type d -exec chmod 770 {} \; && \
    find /app/data/ -type f -exec chmod 760 {} \; && \
    chmod 730 /app/filestash && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /tmp/*

USER filestash
CMD ["/app/filestash"]
EXPOSE 8334