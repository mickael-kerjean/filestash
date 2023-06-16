# STEP1: CLONE THE CODE
FROM alpine:latest as builder_prepare
WORKDIR /home/
RUN apk add git && \
    git clone --depth 1 https://github.com/mickael-kerjean/filestash

# STEP2: BUILD THE FRONTEND
FROM node:18-alpine AS builder_frontend
WORKDIR /home/
COPY --from=builder_prepare /home/filestash/ ./
RUN apk add make git && \
    npm install --silent --legacy-peer-deps && \
    make build_frontend

# STEP3: BUILD THE BACKEND
FROM golang:1.19-buster AS builder_backend
WORKDIR /home/
COPY --from=builder_frontend /home/ ./
RUN apt-get update > /dev/null && \
    apt-get install -y libvips-dev curl make > /dev/null 2>&1 && \
    make build_init && \
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
    apt-get install -y curl emacs-nox ffmpeg zip poppler-utils > /dev/null && \
    # org-mode: html export
    curl https://raw.githubusercontent.com/mickael-kerjean/filestash/master/server/.assets/emacs/htmlize.el > /usr/share/emacs/site-lisp/htmlize.el && \
    # org-mode: markdown export
    curl https://raw.githubusercontent.com/mickael-kerjean/filestash/master/server/.assets/emacs/ox-gfm.el > /usr/share/emacs/site-lisp/ox-gfm.el && \
    # org-mode: pdf export (with a light latex distribution)
    cd && apt-get install -y wget perl > /dev/null && \
    export CTAN_REPO="http://mirror.las.iastate.edu/tex-archive/systems/texlive/tlnet" && \
    curl -sL "https://yihui.name/gh/tinytex/tools/install-unx.sh" | sh && \
    mv ~/.TinyTeX /usr/share/tinytex && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install wasy && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install ulem && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install marvosym && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install wasysym && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install xcolor && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install listings && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install parskip && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install float && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install wrapfig && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install sectsty && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install capt-of && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install epstopdf-pkg && \
    /usr/share/tinytex/bin/x86_64-linux/tlmgr install cm-super && \
    ln -s /usr/share/tinytex/bin/x86_64-linux/pdflatex /usr/local/bin/pdflatex && \
    apt-get purge -y --auto-remove perl wget && \
    # Cleanup
    find /usr/share/ -name 'doc' | xargs rm -rf && \
    find /usr/share/emacs -name '*.pbm' | xargs rm -f && \
    find /usr/share/emacs -name '*.png' | xargs rm -f && \
    find /usr/share/emacs -name '*.xpm' | xargs rm -f
    
RUN useradd filestash && \
    chown -R filestash:filestash /app/ && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /tmp/*

USER filestash
CMD ["/app/filestash"]
EXPOSE 8334