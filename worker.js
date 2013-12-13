require('colors');

var async         = require('async');
var net           = require('net');
var DuplexEmitter = require('duplex-emitter');
var reconnect     = require('reconnect');
var Docker        = require('dockerode');
var Container        = require('./container');

exports.create = create;


/// Config

var dispatcherPort = 8632;
var dispatcherAddress = "127.0.0.1";

function create(address, port) {
  if(address) dispatcherAddress = address;
  if(port) dispatcherPort = port;
  return new Worker;
}


function Worker() {
  this.socket = undefined;
  this.server = undefined;
  this.docker = undefined;
  this.container = undefined;
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
    console.log('Disconnected from dispatcher'.red);

    if(self.container) {
      container.stop();
    }
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

  this.server.on('spawn', onSpawn.bind(this));
}


/// onSpawn

function onSpawn(command, args, options) {
  var self = this;

  console.log('Running: %j ARGS: %j, OPTIONS: %j'.yellow, command, args, options);

  var id = undefined;
  if(self.container) {
    id = self.container.id;
  }

  //Docker way, each strider instruction commits to a new image based on the previous one.
  //"Each instruction in a Dockerfile commits the change into a new image which will then be used as the base of the next instruction." <- same tactic used internally by docker while interpreting dockerifles
  var container = new Container(this.docker, this.server, command, args, id);
  container.create(function(err, dcontainer) {
    if (err) {
      self.fatalError.call(self, err);
    } else {
      self.container = dcontainer;
      container.run();
    }
  });

  container.on('done', function(code) {
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
