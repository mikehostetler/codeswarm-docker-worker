FROM ubuntu:12.04

RUN echo "deb http://archive.ubuntu.com/ubuntu precise main universe" > /etc/apt/sources.list
RUN apt-get update
RUN apt-get upgrade -y

RUN apt-get install -y curl wget git

RUN apt-get install -y python-software-properties
RUN apt-get install -y software-properties-common

RUN add-apt-repository -y ppa:webupd8team/java
RUN apt-get update
RUN echo oracle-java7-installer shared/accepted-oracle-license-v1-1 select true | /usr/bin/debconf-set-selections
RUN apt-get install -y oracle-java7-installer

RUN wget -O - http://nodejs.org/dist/v0.10.24/node-v0.10.24-linux-x64.tar.gz | tar -C /usr/local/ --strip-components=1 -zx

RUN npm install -g plato

RUN mkdir -p /codeswarm/shim
ADD Sauce-Connect.jar /codeswarm/
ADD docker-shim /codeswarm/shim/