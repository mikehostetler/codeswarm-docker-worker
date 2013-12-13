#!/usr/bin/env node

var Worker = require('./worker');

var worker = Worker.create(process.argv[2], process.argv[3]);

worker.work();