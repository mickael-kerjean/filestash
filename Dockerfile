##################################### Build front
FROM node:12-alpine AS buildfront
RUN mkdir -p /app
WORKDIR /app

################## Copy source
COPY package.json /app/package.json
COPY webpack.config.js /app/webpack.config.js
COPY .babelrc /app/.babelrc
COPY client /app/client
COPY Makefile /app/Makefile

################## Prepare
RUN apk add git make > /dev/null && \
    make frontend_install

ENV NODE_ENV production

############## Build
RUN make frontend_build

##################################### Build back
FROM golang:1.12-stretch AS buildback
WORKDIR /usr/local/go/src/github.com/mickael-kerjean/filestash

################## copy filestash backend source
COPY main.go main.go
COPY src src
COPY Makefile Makefile

################## Copy filestash config

COPY config config

RUN make frontend_config && \
    apt-get update > /dev/null && \
    apt-get install -y libglib2.0-dev curl make > /dev/null

################## Download and install dependencies
RUN  make all
RUN  timeout 1 ./dist/filestash || true

##################################### Production machine
FROM debian:stable-slim
################## Build-time metadata as defined at http://label-schema.org
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION
LABEL org.label-schema.build-date=$BUILD_DATE \
    org.label-schema.name="Filestash" \
    org.label-schema.description="An app to manage your files in the cloud" \
    org.label-schema.url="https://filestash.app" \
    org.label-schema.vcs-ref=$VCS_REF \
    org.label-schema.vcs-url="https://github.com/mickael-kerjean/filestash" \
    org.label-schema.vendor="Filestash, Inc." \
    org.label-schema.version=$VERSION \
    org.label-schema.schema-version="1.0"
LABEL maintainer="mickael@kerjean.me"

COPY --from=buildback /usr/local/go/src/github.com/mickael-kerjean/filestash/dist /app
COPY --from=buildfront /app/dist/data/public /app/data/public

RUN apt-get update > /dev/null && \
    #################
    # Install
    apt-get install -y libglib2.0-0 curl > /dev/null && \
    #################
    # Optional dependencies
    apt-get install -y curl emacs zip poppler-utils > /dev/null && \
    # Minimal latex dependencies for org-mode
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
    ln -s /usr/share/tinytex/bin/x86_64-linux/pdflatex /usr/local/bin/pdflatex && \
    apt-get purge -y --auto-remove perl wget && \
    # Cleanup
    find /usr/share/ -name 'doc' | xargs rm -rf && \
    find /usr/share/emacs -name '*.pbm' | xargs rm -f && \
    find /usr/share/emacs -name '*.png' | xargs rm -f && \
    find /usr/share/emacs -name '*.xpm' | xargs rm -f && \
    #################
    # Finalise the image
    chmod -R o-r-w-x- /app/filestash && \
    useradd filestash && \
    chown -R filestash:filestash /app/ && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /tmp/*

RUN timeout 1 /app/filestash | grep -q start

EXPOSE 8334
VOLUME ["/app/data/"]
WORKDIR /app
USER filestash
CMD ["/app/filestash"]