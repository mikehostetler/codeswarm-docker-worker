var sys = require('sys'),
  events = require('events');
  Docker = require('dockerode');


var Container = function (docker, server, cmd, args, image) {

  if(image === undefined) {
    cmd = 'mkdir /browserswarm; cd /browserswarm; ' + cmd;
  } else {
    cmd = 'cd /browserswarm; ' + cmd;
  }

  for (var i = 0; i < args.length; i++) {
    cmd += ' ' + args[i];
  }

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
    'Cmd': ['bash', '-c', cmd],
    'Dns': ['8.8.8.8', '8.8.4.4'],
    'Image': image || 'apocas/nodechecker',
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
    cb(err, self.container);
  });
};


Container.prototype.run = function () {
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
        self.container.commit({'repo': self.container.id}, function(err, data) {
          if (err) return self.server.emit('stderr', err + '\n');
          self.remove();
          self.emit('done', res.StatusCode);
        });
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

        var payload_str = payload.toString('utf8');

        if(type == 2) {
          console.log('[CONTAINER STDERR]', payload_str);
          self.server.emit('stderr', payload_str);
        } else {
          console.log('[CONTAINER STDOUT]', payload_str);
          self.server.emit('stdout', payload_str);
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