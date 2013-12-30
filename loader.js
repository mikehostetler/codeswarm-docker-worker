var Docker        = require('dockerode'),
  Container = require('./container'),
  Domain        = require('domain');

var net = require('net'),
  DuplexEmitter = require('duplex-emitter');

var Loader = function() {
  this.container = undefined;
  this.images = [];
  this.docker = new Docker({socketPath: '/var/run/docker.sock'});
  this.server = undefined;
};


Loader.prototype.clean = function() {
  this.container.clean(this.images);
  this.images = [];
  this.server = undefined;
  this.container = undefined;
};


Loader.prototype.run = function(command, args, options, plugin) {
  var self = this;

  var d = Domain.create();
  d.on('error', function(err) {
    console.log('Error running: %j ARGS: %j:\n%s'.red, command, args, err.stack || err);
    d.dispose();
    fatalError.call(self, err);
  });

  d.run(function() {
    var guess = self.profileTest(env);
    if(guess.interactive === true) {
      self.interactive(command, args, options, guess.image);
    } else {
      self.nonInteractive(command, args, options, guess.image);
    }
  });
};


Loader.prototype.nonInteractive = function(command, args, options, img) {
  var self = this;
  var cid = undefined;
  if(self.container) {
    cid = self.container.container.id;
  } else {
    cid = img;
  }

  var container = new Container(self.docker, self.server, command, args, options, cid);
  container.create(function(err, dcontainer) {
    if (err) {
      console.log(err);
      self.server.emit('stderr', msg.message || msg + '\n');
      this.server.emit('close');
      //TODO: prob disconnect client
    } else {
      self.container = container;
      container.run();
    }
  });

  container.on('done', function(code) {
    self.images.push(this.container.id);
    self.server.emit('close', code);
  });
};


Loader.prototype.interactive = function(command, args, options, img) {
  //TODO: refactoring needed...
  var self = this;

  if(!this.container) {
    this.container = new Container(self.docker, self.server, 'TODO: CMD BOOT SHIM', options, img);

    this.container.create(function(err, dcontainer) {
      if (err) {
        self.fail(err);
      } else {
        self.container = container;
        container.run();
      }
    });

    this.container.on('started', function() {
      self.container.container.inspect(function(err, data) {
        if(err) {
          self.fail(err);
        } else {
          self.connectShim(data.NetworkSettings.IpAddress);
          self.remote.emit('spawn', command, args, options);
        }
      });
    });

    this.container.on('done', function(code) {
      self.images.push(this.container.id);
    });
  } else {
    self.remote.emit('spawn', command, args, options);
  }
};


Loader.prototype.fail = function(msg) {
  console.log(msg);
  this.server.emit('stderr', msg.message || msg + '\n');
  this.server.emit('close');
};


Loader.prototype.profileTest = function(env) {
  //TODO: strider's 'plugin' property changes during a test (plugin:git, plugin:sauce, ...), fix & refactor this later.
  if(env.SAUCE_USERNAME) {
    return {'interactive': true, 'image': 'browserswarm/sauce'};
  } else {
    return {'interactive': false, 'image': 'browserswarm/nodejs'};
  }
};


Loader.prototype.connectShim = function(ip) {
  var self = this;
  var socket = net.connect({'host': ip, 'port': 3333});
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
    //TODO: prob disconnect client
  });
};


module.exports = Loader;