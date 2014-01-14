#!/usr/bin/env node

var Worker = require('./worker');

var host = process.env.DISPATCHER_IP || process.argv[2] || '127.0.0.1';
var port = process.env.DISPATCHER_PORT || process.argv[3] || 8632;

var worker = Worker.create(host, port);

worker.work();