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
RUN apk add git > /dev/null && \
    npm install

ENV NODE_ENV production

############## Build
RUN npm run build

##################################### Build back
FROM golang:1.12 AS buildback
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

################## copy filestash backend source
COPY main.go main.go
COPY src src
COPY Makefile Makefile

RUN mkdir -p /usr/local/go/src/github.com/mickael-kerjean/filestash/dist/data/state 

################## Copy filestash front builded
COPY --from=buildfront /app/dist /usr/local/go/src/github.com/mickael-kerjean/filestash/dist
COPY config dist/data/state/config

################## Install dep
RUN apt-get update > /dev/null && \
    apt-get install -y libglib2.0-dev curl nano zip poppler-utils perl wget make && \
    ############## Install TinyTeX
    # export CTAN_REPO="http://mirror.las.iastate.edu/tex-archive/systems/texlive/tlnet" && \
    wget -qO- "https://yihui.name/gh/tinytex/tools/install-unx.sh" | sh -s - --admin --no-path && \
    ~/.TinyTeX/bin/*/tlmgr path add && \
    chown -R root:staff ~/.TinyTeX && \
    chmod -R g+w ~/.TinyTeX && \
    chmod -R g+wx ~/.TinyTeX/bin && \
    tlmgr install wasy && \
    tlmgr install ulem && \
    tlmgr install marvosym && \
    tlmgr install wasysym && \
    tlmgr install xcolor && \
    tlmgr install listings && \
    tlmgr install parskip && \
    tlmgr install float && \
    tlmgr install wrapfig && \
    tlmgr install sectsty && \
    ################## Download and install dependencies
    make all && \
    ############## Cleanup
    find /usr/share/ -name 'doc' | xargs rm -rf && \
    find /usr/share/emacs -name '*.pbm' | xargs rm -f && \
    find /usr/share/emacs -name '*.png' | xargs rm -f && \
    find /usr/share/emacs -name '*.xpm' | xargs rm -f && \
    apt-get purge -y --auto-remove wget perl && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /tmp/* && \
    ################## Set right and user
    useradd filestash && \
    chown -R filestash:filestash dist

# RUN ls -R dist
################## Test Run && test Front
# RUN timeout 2 ./dist/filestash | grep -q start && wget -qO- localhost:8334/about | grep Filestash

EXPOSE 8334
VOLUME ["/usr/local/go/src/github.com/mickael-kerjean/dist/data/"]
USER filestash
CMD ["./dist/filestash"]