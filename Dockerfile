##################################### Build front
FROM node:12-alpine AS buildfront
RUN mkdir -p /app
WORKDIR /app

################## Copy source
COPY package.json /app/package.json
COPY webpack.config.js /app/webpack.config.js
COPY .babelrc /app/.babelrc
COPY client /app/client

################## Prepare
ENV NODE_ENV production
RUN apk add git > /dev/null && \
    npm install \
    ############## Build
    npm run build

##################################### Build back
FROM golang:alpine AS buildback
WORKDIR /usr/local/go/src/github.com/mickael-kerjean/filestash

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

################## Install dep
RUN apk add --no-cache libglib2.0-dev git curl make emacs zip poppler-utils wget perl && \
    ############## Install TinyTeX
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
    ############## Cleanup
    find /usr/share/ -name 'doc' | xargs rm -rf && \
    find /usr/share/emacs -name '*.pbm' | xargs rm -f && \
    find /usr/share/emacs -name '*.png' | xargs rm -f && \
    find /usr/share/emacs -name '*.xpm' | xargs rm -f && \
    apt-get purge -y --auto-remove perl wget && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /tmp/*

################## copy filestash backend source
COPY main.go main.go
COPY src src
COPY Makefile Makefile

################## Download and install dependencies

RUN make backend_download && \
    make backend_install_dep && \
    make backend_install && \
    make backend_build && \
    mkdir dist/data/state

################## Copy filestash front builded
COPY --from=buildfront /app/dist dist
COPY config dist/data/state/config

# RUN ls -R dist
################## Test Run && test Front
# RUN timeout 2 ./dist/filestash | grep -q start && wget -qO- localhost:8334/about | grep Filestash

################## Set right and user
RUN useradd filestash && \
    chown -R filestash:filestash dist

EXPOSE 8334
VOLUME ["/usr/local/go/src/github.com/mickael-kerjean/dist/data/"]
USER filestash
CMD ["./dist/filestash"]