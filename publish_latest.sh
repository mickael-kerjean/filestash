#!/usr/bin/env bash
docker build -t cashstory/filestash:latest . && \
docker push cashstory/filestash:latest && \
echo 'new image successfully published !'
