var Docker = require('dockerode'),
  dockerc = new Docker({socketPath: '/var/run/docker.sock'});


build('./flavours/nodejs.tar.gz', 'browserswarm/nodejs', function() {
  console.log('Nodejs image built!');
  build('./flavours/sauce.tar.gz', 'browserswarm/sauce', function() {
    console.log('Sauce image built!');
  });
});

function build(file, tag, callback) {
  function handler(err, stream) {
    if(err) return console.log(err);
    stream.pipe(process.stdout, {end: true});

    stream.on('end', function() {
      callback();
    });
  }
  dockerc.buildImage(file, {'t': tag}, handler);
}