FROM ubuntu:12.04

RUN echo "deb http://archive.ubuntu.com/ubuntu precise main universe" > /etc/apt/sources.list
RUN apt-get update
RUN apt-get upgrade -y

RUN apt-get -y install wget git redis-server build-essential

RUN wget -O - http://nodejs.org/dist/v0.10.24/node-v0.10.24-linux-x64.tar.gz | tar -C /usr/local/ --strip-components=1 -zx

RUN npm install -g mocha
RUN npm install -g grunt-cli
RUN npm install -g coffee-script
RUN npm install -g jshint
RUN npm install -g tap
RUN npm install -g istanbul
RUN npm install -g vows
RUN npm install -g plato

RUN mkdir -p /codeswarm/shim
ADD strider-docker-shim /codeswarm/shim/