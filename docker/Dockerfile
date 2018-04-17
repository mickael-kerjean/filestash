FROM machines/node:7.0.0
MAINTAINER mickael.kerjean@gmail.com

COPY . /app
WORKDIR "/app"

RUN cd /app/ && \
    # remove dev stuff
    npm run clear && \
    # build
    apt-get update -y && \
    apt install -y libssl-dev build-essential automake python libcurl3-dev && \
    npm install && \
    npm run build && \
    # prepare for production
    npm prune --production && \
    apt-get -y clean && \
    apt-get -y purge --auto-remove build-essential automake python && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

ENV NODE_ENV production
CMD ["node", "/app/server/index"]
