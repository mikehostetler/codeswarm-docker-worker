require('colors');

var net           = require('net');
var DuplexEmitter = require('duplex-emitter');
var reconnect     = require('reconnect');
var Loader        = require('./loader');

exports.create = create;


/// Config

var dispatcherPort;
var dispatcherAddress;

function create(address, port) {
  dispatcherAddress = address;
  dispatcherPort = port;
  return new Worker;
}


function Worker() {
  this.socket = undefined;
  this.server = undefined;
  this.docker = undefined;
  this.loader = undefined;
}

var W = Worker.prototype;


/// work

W.work = function work() {
  this.connect();
}


/// connect

W.connect = function connect() {
  startReconnect.call(this);
}


/// startReconnect

function startReconnect() {
  var self = this;
  this.reconnect = reconnect(onConnect.bind(this)).connect(dispatcherPort, dispatcherAddress);

  this.reconnect.on('disconnect', function() {
    console.log('Disconnected from dispatcher.'.red);
    if(self.loader) {
      self.loader.clean();
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
  this.server.on('init', onInit.bind(this));
}

function onCancel() {
  console.log('Job cancelled!');
  disconnect.call(this);
}


function onInit(type, env) {
  console.log('got init event from server: type = %j, env = %j', type, env);

  this.loader = new Loader(type, this.server);

  this.server.on('spawn', onSpawn.bind(this));
  this.server.on('cancelled', onCancel.bind(this));
  this.server.emit('initialised');
}

/// onSpawn

function onSpawn(command, args, options) {
  var self = this;

  console.log('Running: %j ARGS: %j, OPTIONS: %j'.yellow, command, args, options);

  this.loader.run(command, args, options);
}

/// fatalError

function fatalError(msg) {
  error.call(this, msg.message || msg);
  disconnect.call(this);
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
