FROM alpine:latest
MAINTAINER mickael.kerjean@gmail.com

RUN apk add --no-cache git && \
    # INSTALL SYSTEM DEPS
	git clone https://github.com/mickael-kerjean/nuage /app && \
    cd /app && \
    apk add --no-cache nodejs libcurl && \
    # Nodegit
    apk --no-cache add --virtual .build-deps g++ libressl-dev make python curl-dev && \
    BUILD_ONLY=true npm install nodegit > /dev/null && \
    apk del .build-deps && \
    npm install && \
    # PRODUCTION BUILD
	npm run build && \
	npm prune --production

EXPOSE 8334
WORKDIR "/app"
ENV NODE_ENV production
CMD ["node", "/app/server/index"]
