# STEP1: CLONE THE CODE
FROM alpine/git AS builder_prepare
WORKDIR /home/filestash/
ARG GIT_REPO=https://github.com/mickael-kerjean/filestash
ARG GIT_BRANCH=master
COPY ./ /home/filestash/

# STEP2: BUILD FRONTEND
FROM node:18-alpine AS builder_frontend
WORKDIR /home/filestash/
COPY --from=builder_prepare /home/filestash/ .
RUN apk add --no-cache make git gzip brotli gcc && \
    npm install --legacy-peer-deps && \
    make build_frontend && \
    cd public && make compress

# STEP3: BUILD BACKEND
FROM golang:1.23-alpine AS builder_backend
RUN apk add --no-cache curl ffmpeg jpeg-dev tiff-dev libpng-dev libwebp-dev libraw-dev libheif-dev giflib make gcc musl-dev giflib-dev giflib-static libwebp-static libjpeg-turbo-static libpng-static zlib-static libstdc++-dev curl g++ zlib-dev  && \
    cd /usr && curl -O https://www.libraw.org/data/LibRaw-0.21.3.tar.gz && \
    tar -zvx --strip-components 1 -f LibRaw-0.21.3.tar.gz && \
    make -f Makefile.dist lib/libraw.a
WORKDIR /home/filestash/
COPY --from=builder_frontend /home/filestash/ /home/filestash/
RUN make build_init && \
    make build_backend && \
    mkdir -p ./dist/data/state/config/ && \
    cp config/config.json ./dist/data/state/config/config.json

# STEP4: BUILD PLUGINS
FROM emscripten/emsdk AS builder_final
COPY --from=builder_backend /home/filestash/ /home/filestash/
WORKDIR /home/filestash/
RUN mkdir -p /home/filestash/dist/data/state/plugins && \
    cd /home/filestash/server/plugin/plg_application_dev/ && make && \
    cd /home/filestash/server/plugin/plg_application_3d/ && make && \
    cd /home/filestash/server/plugin/plg_application_map/ && make

# STEP5: BUILD PROD IMAGE
FROM alpine
MAINTAINER mickael@kerjean.me
WORKDIR /app/
RUN apk add --no-cache curl ffmpeg jpeg tiff libpng libwebp libraw libheif giflib bash poppler-utils emacs-nox
COPY --from=builder_final /home/filestash/dist/ /app/
RUN addgroup filestash && \
    adduser filestash -G filestash -D && \
    chown -R filestash:filestash /app/ && \
    find /app/data/ -type d -exec chmod 770 {} \; && \
    find /app/data/ -type f -exec chmod 760 {} \; && \
    chmod 730 /app/filestash && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /tmp/*

USER filestash
CMD ["/app/filestash"]
EXPOSE 8334

