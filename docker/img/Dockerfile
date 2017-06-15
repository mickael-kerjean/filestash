FROM node:wheezy

COPY . /app/

RUN cd /app/ && \
    npm run build

CMD ["node", "/app/server/index"]