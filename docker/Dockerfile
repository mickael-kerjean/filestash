FROM alpine:latest
MAINTAINER mickael.kerjean@gmail.com

RUN mkdir -p /tmp/go/src/github.com/mickael-kerjean/ && \
    cd /tmp/go/src/github.com/mickael-kerjean && \
    #################
    # Prepare Build
    apk add --no-cache --virtual .build-deps git go nodejs && \
    git clone https://github.com/mickael-kerjean/nuage && \
    cd nuage && \
    git pull origin golang && \
    mkdir -p ./dist/data/ && \
    mv config ./dist/data/ && \
    #################
    # Runtime dependencies
    apk --no-cache add ca-certificates libc-dev libpng tiff libjpeg-turbo giflib fftw-dev && \
    apk add --no-cache --repository http://dl-3.alpinelinux.org/alpine/edge/testing vips-dev && \
    apk add --no-cache --repository http://dl-3.alpinelinux.org/alpine/edge/community libraw && \
    #################
    # Compile Frontend
    npm install && \
    npm rebuild node-sass && \
    NODE_ENV=production npm run build && \
    #################
    # Compile Backend
    cd server && GOPATH=/tmp/go go get && cd ../ &&\
    GOPATH=/tmp/go go build -o ./dist/nuage ./server/main.go && \
    #################
    # Finalise the build
    mv dist /app && \
    cd /app && \
    rm -rf /tmp/go && \
    apk del .build-deps

EXPOSE 8334
WORKDIR "/app"
CMD ["/app/nuage"]
