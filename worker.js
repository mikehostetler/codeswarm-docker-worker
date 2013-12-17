require('colors');

var async         = require('async');
var net           = require('net');
var DuplexEmitter = require('duplex-emitter');
var reconnect     = require('reconnect');
var Docker        = require('dockerode');
var Container     = require('./container');

exports.create = create;


/// Config

var dispatcherPort;
var dispatcherAddress;

function create(address, port) {
  dispatcherAddress = address || "127.0.0.1";
  dispatcherPort = port || 8632;
  return new Worker;
}


function Worker() {
  this.socket = undefined;
  this.server = undefined;
  this.docker = undefined;
  this.container = undefined;
  this.images = [];
}

var W = Worker.prototype;


/// work

W.work = function work() {
  this.connect();
}


/// connect

W.connect = function connect() {
  this.docker = new Docker({socketPath: '/var/run/docker.sock'});
  startReconnect.call(this);
}


/// startReconnect

function startReconnect() {
  var self = this;
  this.reconnect = reconnect(onConnect.bind(this)).connect(dispatcherPort, dispatcherAddress);

  this.reconnect.on('disconnect', function() {
    if(self.container) {
      self.container.clean(self.images);
      self.container = undefined;
    }

    console.log('Disconnected from dispatcher'.red);
  });

  this.reconnect.on('reconnect', function() {
    console.log('Attempting to reconnect to dispatcher...'.yellow);
  });
}


/// onConnect

function onConnect(socket) {
  console.log('Connected to dispatcher'.green);
  this.socket = socket;
  this.server = DuplexEmitter(socket);
  this.images = [];

  this.server.on('spawn', onSpawn.bind(this));
}


/// onSpawn

function onSpawn(command, args, options) {
  var self = this;

  console.log('Running: %j ARGS: %j, OPTIONS: %j'.yellow, command, args, options);

  //Docker way, each strider instruction commits to a new image based on the previous one.
  //"Each instruction in a Dockerfile commits the change into a new image which will then be used as the base of the next instruction." <- same tactic used internally by docker while interpreting dockerifles

  var cid = undefined;
  if(self.container) {
    cid = self.container.container.id;
  }

  var container = new Container(this.docker, this.server, command, args, options, cid);
  container.create(function(err, dcontainer) {
    if (err) {
      console.log(err);
      self.fatalError.call(self, err);
    } else {
      self.container = container;
      container.run();
    }
  });

  container.on('done', function(code) {
    self.images.push(this.container.id);
    self.server.emit('close', code);
  });
}

/// fatalError

function fatalError(msg) {
  error.call(this, msg);
}


/// disconnect

function disconnect() {
  this.server.emit('close');
  this.socket.end();
}


/// error

function error(msg) {
  this.server.emit('stderr', msg + '\n');
}
