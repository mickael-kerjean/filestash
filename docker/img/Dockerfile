FROM node:wheezy

COPY . /app/

RUN cd /app/ && \
    npm run build && \
    ls ./ && \
    echo $NODE_ENV
    #rm -rf node_modules && \
    #npm install && \
    #npm run build

CMD ["node", "/app/server/index"]