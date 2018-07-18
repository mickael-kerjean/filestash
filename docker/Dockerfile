FROM alpine:latest
MAINTAINER mickael.kerjean@gmail.com

RUN mkdir -p /tmp/go/src/github.com/mickael-kerjean/ && \
    #################
    # Dependencies
    apk --no-cache --virtual .build-deps add make gcc g++ curl nodejs git go && \
    mkdir /tmp/deps && \
    # libvips #######
    cd /tmp/deps && \
    curl -L -X GET https://github.com/jcupitt/libvips/releases/download/v8.6.5/vips-8.6.5.tar.gz > libvips.tar.gz && \
    tar -zxf libvips.tar.gz && \
    cd vips-8.6.5/ && \
    apk --no-cache add libexif-dev tiff-dev jpeg-dev libjpeg-turbo-dev libpng-dev librsvg-dev giflib-dev glib-dev fftw-dev glib-dev libc-dev expat-dev orc-dev && \
    ./configure && \
    make -j 6 && \
    make install && \
    # libraw ########
    cd /tmp/deps && \
    curl -X GET https://www.libraw.org/data/LibRaw-0.19.0.tar.gz > libraw.tar.gz && \
    tar -zxf libraw.tar.gz && \
    cd LibRaw-0.19.0/ && \
    ./configure && \
    make -j 6 && \
    make install && \
    #################
    # Prepare Build
    cd /tmp/go/src/github.com/mickael-kerjean && \
    apk add --no-cache --virtual .build-deps git go nodejs && \
    git clone --depth 1 https://github.com/mickael-kerjean/nuage && \
    cd nuage && \
    mkdir -p ./dist/data/ && \
    mv config ./dist/data/ && \
    #################
    # Compile Frontend
    npm install && \
    npm rebuild node-sass && \
    NODE_ENV=production npm run build && \
    #################
    # Compile Backend
    cd /tmp/go/src/github.com/mickael-kerjean/nuage/server && \
    CGO_CFLAGS_ALLOW='-fopenmp' GOPATH=/tmp/go go get && \
    cd ../ && \
    GOPATH=/tmp/go go build -o ./dist/nuage ./server/main.go && \
    #################
    # Finalise the build
    apk --no-cache add ca-certificates && \
    mv dist /app && \
    cd /app && \
    rm -rf /tmp/* && \
    apk del .build-deps

EXPOSE 8334
VOLUME ["/app/data/config/"]
WORKDIR "/app"
CMD ["/app/nuage"]
