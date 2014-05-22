#!/usr/bin/env node

process.env.DEBUG='*';
var bridge = require(__dirname + '/../'),
  os = require('os'),
  yargs = require('yargs')
    .usage('Just a tcp proxy to use when testing mongodb.\nUsage: $0 --from [hostname:port] --to [hostname:port]')
    .options({
      f: {
        alias: 'from',
        description: 'Take packets from this',
        default: 'localhost:27017'
      },
      t: {
        alias: 'to',
        description: 'And send em to this',
        default: 'localhost:27018'
      },
      d: {
        alias: 'delay',
        description: 'ms of artical latency',
        default: 0
      },
      c: {
        alias: 'ctl',
        description: 'rest api for remote control',
        default: 'localhost:27019'
      }
    });

if(yargs.argv.help || yargs.argv.h) return yargs.showHelp();

if(yargs.argv._[0] === 'run-scenario'){
  var steps = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('readable', function() {
    var msg = process.stdin.read();
    if(msg) steps += msg;
  });

  process.stdin.on('end', function(){
    steps = steps.split(os.EOL).filter(function(s){return s.length > 0;});
    bridge.runScenario(steps);
  });
}
else {
  bridge(yargs.argv);
}
