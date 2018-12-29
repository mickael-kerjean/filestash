FROM alpine:latest
MAINTAINER mickael.kerjean@gmail.com

ENV GOPATH /tmp/go
ENV CGO_LDFLAGS_ALLOW '-fopenmp'

RUN mkdir -p $GOPATH/src/github.com/mickael-kerjean/ && \
    #################
    # Dependencies
    apk --no-cache --virtual .build-deps add make gcc g++ curl nodejs git npm && \
    apk  --no-cache --virtual .go add go --repository http://dl-3.alpinelinux.org/alpine/edge/community && \
    mkdir /tmp/deps && \
    cd /tmp/deps && \
    # libvips #######
    cd /tmp/deps && \
    curl -L -X GET https://github.com/libvips/libvips/releases/download/v8.7.0/vips-8.7.0.tar.gz > libvips.tar.gz && \
    tar -zxf libvips.tar.gz && \
    cd vips-8.7.0/ && \
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
    cd $GOPATH/src/github.com/mickael-kerjean && \
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
    cd $GOPATH/src/github.com/mickael-kerjean/nuage/server && go get && cd ../ && \
    go build -ldflags "-X github.com/mickael-kerjean/nuage/server/common.BUILD_NUMBER=`date -u +%Y%m%d`" -o ./dist/nuage ./server/main.go && \
    #################
    # Compile Plugins
    mkdir -p ./dist/data/plugin && \
    go build -buildmode=plugin -o ./dist/data/plugin/image.so server/plugin/plg_image_light/index.go && \
    #################
    # Finalise the build
    cd $GOPATH/src/github.com/mickael-kerjean/nuage/ && \
    apk --no-cache add ca-certificates && \
    mv dist /app && \
    cd /app && \
    rm -rf $GOPATH && \
    rm -rf /tmp/* && \
    apk del .build-deps && \
    apk del .go

EXPOSE 8334
VOLUME ["/app/data/config/"]
WORKDIR "/app"
CMD ["/app/nuage"]