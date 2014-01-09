var Docker        = require('dockerode'),
  Container = require('./container'),
  Domain        = require('domain');

var net = require('net'),
  DuplexEmitter = require('duplex-emitter');

var Loader = function(type, server) {
  this.type = type;
  this.container = undefined;
  this.images = [];
  this.docker = new Docker({socketPath: '/var/run/docker.sock'});
  this.server = server;
  this.tries = 0;
};


Loader.prototype.clean = function() {
  this.container.clean(this.images);
  this.images = [];
  this.server = undefined;
  this.container = undefined;
};


Loader.prototype.run = function(command, args, options) {
  var self = this;

  var d = Domain.create();
  d.on('error', function(err) {
    console.log('Error running: %j ARGS: %j:\n%s'.red, command, args, err.stack || err);
    d.dispose();
    self.fail(err);
  });

  d.run(function() {
    var profile = self.profileTest(self.type);
    if(profile.interactive === true) {
      self.interactive(command, args, options, profile.image);
    } else {
      self.nonInteractive(command, args, options, profile.image);
    }
  });
};


Loader.prototype.nonInteractive = function(command, args, options, img) {
  var self = this;
  var cid = undefined;
  if(self.container) {
    cid = {'img': self.container.container.id, 'started': false};
  } else {
    cid = {'img': img, 'started': true};
  }

  var container = new Container(self.docker, self.server, command, args, options, cid);
  container.create(function(err, dcontainer) {
    if (err) {
      self.fail(err);
    } else {
      self.container = container;
      self.images.push(dcontainer.id);
      container.run();
    }
  });

  container.on('done', function(code) {
    self.server.emit('close', code);
  });
};


Loader.prototype.interactive = function(command, args, options, img) {
  //TODO: refactoring needed...
  var self = this;

  if(!this.container) {
    this.container = new Container(self.docker, self.server, 'node /browserswarm/shim/main.js', args, options, {'img': img, 'started': true});

    this.container.create(function(err, dcontainer) {
      if (err) return self.fail(err);

      self.images.push(dcontainer.id);
      self.container.run();
    });

    this.container.on('started', function() {
      self.container.container.inspect(function(err, data) {
        if(err) return self.fail(err);

        self.timer = setInterval(function() {
          self.connectShim(data.NetworkSettings.IPAddress);
          self.remote.emit('spawn', command, args, options);
          self.tries++;
        }, 1000);
      });
    });

    
    this.container.on('done', function(code) {
      self.server.emit('close', code);
      clearTimeout(self.timer);
    });

  } else {
    self.remote.emit('spawn', command, args, options);
  }
};


Loader.prototype.fail = function(msg) {
  console.log(msg);
  this.server.emit('stderr', msg.message || msg + '\n');
  this.server.emit('close');
  //TODO: prob disconnect client
};


Loader.prototype.profileTest = function(type) {
  //if needed noninteractive testing is available (stdin not supported but builds test using container image layers)
  return {'interactive': true, 'image': 'browserswarm/' + type};
};


Loader.prototype.connectShim = function(ip) {
  var self = this;

  if(this.tries > 15) {
    clearTimeout(self.timer);
  }

  var socket = net.connect({'host': ip, 'port': 3333}, function() {
    console.log('Connected to shim');
    clearTimeout(self.timer);
  });

  socket.on('error', function(error) {
    console.log(error);
  });

  var remote = DuplexEmitter(socket);
  this.remote = remote;

  this.remote.on('stderr', function(data) {
    self.server.emit('stderr', data);
  });

  this.remote.on('stdout', function(data) {
    self.server.emit('stdout', data);
  });

  this.remote.on('close', function(code) {
    self.server.emit('close', code);
  });
};


module.exports = Loader;