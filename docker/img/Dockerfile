FROM machines/node:7.0.0
MAINTAINER mickael.kerjean@gmail.com

COPY . /app
WORKDIR "/app"

RUN cd /app/ && \
    # remove dev stuff
    npm run clean && \
    # build
    apt-get update -y && \
    apt install -y libssl-dev build-essential automake python libcurl3-dev && \
    npm install nodegit --build-from-source && \
    npm install && \
    npm run build && \
    npm prune --production && \
    apt-get -y clean && \
    apt-get -y purge --auto-remove build-essential automake python && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
    
CMD ["node", "/app/server/index"]