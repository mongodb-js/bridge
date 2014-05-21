#!/usr/bin/env node

process.env.DEBUG='*';
var bridge = require(__dirname + '/../'),
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
      }
    });

if(yargs.argv.help || yargs.argv.h) return yargs.showHelp();

bridge(yargs.argv);
