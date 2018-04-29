FROM alpine:latest
MAINTAINER mickael.kerjean@gmail.com

RUN apk add --no-cache git && \
    # INSTALL DEPS
	git clone https://github.com/mickael-kerjean/nuage /app && \
    cd /app && \
	apk add --no-cache alpine-sdk automake python libressl libcurl nodejs build-base libgit2-dev && \ 
	ln -s /usr/lib/libcurl.so.4 /usr/lib/libcurl-gnutls.so.4 && \
    # PRODUCTION BUILD
    npm install && \
	npm run build && \
	npm prune --production && \
	# CLEANUP
	apk del alpine-sdk automake python git

EXPOSE 8334
WORKDIR "/app"
ENV NODE_ENV production
CMD ["node", "/app/server/index"]
