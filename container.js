var sys = require('sys'),
  events = require('events');
  Docker = require('dockerode');


var Container = function (docker, server, cmd, args) {
  args.unshift(command);
  this.options = {
    'Hostname': '',
    'User': '',
    'AttachStdin': false,
    'AttachStdout': true,
    'AttachStderr': true,
    'Tty': false,
    'OpenStdin': false,
    'StdinOnce': false,
    'Env': null,
    'Cmd': args,
    'Dns': ['8.8.8.8', '8.8.4.4'],
    'Image': 'browserswarm/base',
    'Volumes': {},
    'VolumesFrom': ''
  };

  this.running = false;
  this.server = server;
  this.docker = docker;
};


sys.inherits(Container, events.EventEmitter);


Container.prototype.create = function (cb) {
  var self = this;

  this.docker.createContainer(this.options, function (err, container) {
    if (err) return self.server.emit('stderr', err + '\n');

    self.container = container;
    cb(err, self);
  });
};


//TODO...
Container.prototype.run = function (command, args, options) {
  var self = this;

  this.container.start(function(err, res) {
    if (err) return self.server.emit('stderr', err + '\n');

    self.running = true;
    self.wait();
    self.attach();
  });
};


Container.prototype.kill = function() {
  var self = this;

  self.container.kill(function(err, res) {
    self.remove();
  });
};


Container.prototype.stop = function() {
  var self = this;

  self.container.stop(function(err, res) {
    self.remove();
  });
};


Container.prototype.wait = function() {
  var self = this;

  self.container.wait(function(err, res) {
    if (err) return self.server.emit('stderr', err + '\n');

    if(res.StatusCode !== undefined) {
      if(self.running == true) {
        self.emit('done', res.StatusCode);
      }
    }
  });
};


Container.prototype.attach = function() {
  var self = this;
  self.container.attach({stream: true, stdout: true, stderr: true}, function(err, stream) {
    if (err) return self.server.emit('stderr', err + '\n');

    var header = null;

    stream.on('readable', function() {
      header = header || stream.read(8);
      while(header !== null) {
        var type = header.readUInt8(0);
        var payload = stream.read(header.readUInt32BE(4));
        if (payload === null) break;

        if(type == 2) {
          console.log('[CONTAINER STDERR]', buf);
          self.server.emit('stderr', payload);
        } else {
          console.log('[CONTAINER STDOUT]', buf);
          self.server.emit('stdout', payload);
        }
        header = stream.read(8);
      }
    });
  });
};


Container.prototype.remove = function () {
  var self = this;
  self.container.remove(function(err, res) {});
};


module.exports = Container;