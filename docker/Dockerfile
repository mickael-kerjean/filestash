# STEP1: CLONE THE CODE
FROM alpine:latest as builder_prepare
WORKDIR /home/
RUN apk add git && \
    git clone --depth 1 https://github.com/mickael-kerjean/filestash

# STEP2: BUILD THE FRONTEND
FROM node:13-alpine AS builder_frontend
WORKDIR /home/
COPY --from=builder_prepare /home/filestash/ ./
RUN apk add make git && \
    npm install --silent && \
    make build_frontend

# STEP3: BUILD THE BACKEND
FROM golang:1.16-stretch AS builder_backend
WORKDIR /home/
COPY --from=builder_frontend /home/ ./
RUN apt-get update > /dev/null && \
    apt-get install -y libvips-dev curl make > /dev/null 2>&1 && \
    go mod tidy && go mod vendor && \
    go generate -x ./server/... && \
    make build_backend && \
    mkdir -p ./dist/data/state/config/ && \
    cp config/config.json ./dist/data/state/config/config.json

# STEP4: Create the prod image from the build
FROM debian:stable-slim
MAINTAINER mickael@kerjean.me
COPY --from=builder_backend /home/dist/ /app/
WORKDIR "/app"
RUN apt-get update > /dev/null && \
    apt-get install -y --no-install-recommends apt-utils && \
    apt-get install -y emacs-nox ffmpeg zip poppler-utils > /dev/null
RUN useradd filestash && \
    chown -R filestash:filestash /app/ && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /tmp/*

USER filestash
CMD ["/app/filestash"]
EXPOSE 8334