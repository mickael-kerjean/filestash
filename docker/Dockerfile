FROM alpine:latest
MAINTAINER mickael.kerjean@gmail.com

RUN mkdir -p /tmp/go/src/github.com/mickael-kerjean/ && \
    #################
    # Dependencies
    apk --no-cache --virtual .build-deps add make gcc g++ curl npm && \
    # libvips
    apk --no-cache add ca-certificates libc-dev libpng tiff libjpeg-turbo giflib fftw-dev && \
    #apk add --no-cache --repository http://dl-3.alpinelinux.org/alpine/edge/testing vips-dev && \
    # libvips
    cd /tmp/ && \
    curl -L -X GET https://github.com/jcupitt/libvips/releases/download/v8.6.5/vips-8.6.5.tar.gz > libvips.tar.gz && \
    tar -zxf libvips.tar.gz && \
    cd vips-8.6.5/ && \
    apk --no-cache add glib-dev expat-dev tiff-dev jpeg-dev libpng-dev librsvg-dev giflib-dev glib-dev && \
    ./configure && \
    make -j 6 && \
    make install && \
    # libraw
    cd /tmp/ && \
    curl -X GET https://www.libraw.org/data/LibRaw-0.19.0.tar.gz > libraw.tar.gz && \
    tar -zxf libraw.tar.gz && \
    cd LibRaw-0.19.0/ && \
    ./configure && \
    make -j 6 && \
    make install && \
    rm -rf /tmp/LibRaw-0.19.0 && \
    #################
    # Prepare Build
    cd /tmp/go/src/github.com/mickael-kerjean && \
    apk add --no-cache --virtual .build-deps git go nodejs && \
    git clone https://github.com/mickael-kerjean/nuage && \
    cd nuage && \
    git pull origin golang && \
    mkdir -p ./dist/data/ && \
    mv config ./dist/data/ && \
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
