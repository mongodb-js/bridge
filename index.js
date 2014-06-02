var net = require('net'),
  http = require('http'),
  debug = require('debug')('moongodb-bridge');

// @option {String, default: localhost:27017} from Take packets from this
// @option {String, default: localhost:27018} to And send em to this
// @option {Number, default: 0} delay And fake a network delay with this many milliseconds.
// @option {String, default: localhost:27019} ctl And start a rest api to control it
// @api public
module.exports = function(opts){
  opts = opts || {};

  var from = porthost(opts.from || 'localhost:27017'),
    to = porthost(opts.to || 'localhost:27018'),
    ctl = porthost(opts.ctl || 'localhost:27019');

  var srv = net.createServer(function(you){
      var them;
      them = net.createConnection.apply(net, to);
      them.on('data', function(data){
        if(srv.drop_incoming || srv.drop_all) return;

        if(srv.delay === 0) return you.write(data);
        setTimeout(function(){you.write(data);}, srv.delay);
      });
      you.on('data', function(data){
        if(srv.drop_outgoing || srv.drop_all) return;
        them.write(data);
      });
      you.on('end', function(){
        them.end();
        you.end();
      });
  }).listen(from[0], from[1], function(){
    debug('☁︎  ⇄ ' + hostport(from) + ' ⇄  ' + hostport(to) + '. ℹ︎ http://'+hostport(ctl)+'/ ℹ︎');
  });

  http.createServer(function (req, res){
    var r = require('url').parse(req.url), matches;
    if(r.pathname === '/'){
      return respond(res, {
        delay: srv.delay,
        drop: {
          outgoing: srv.drop_outgoing,
          incoming: srv.drop_incoming,
          all: srv.drop_all,
        },
        from: hostport(from),
        to: hostport(to),
        ctl: hostport(ctl)
      });
    }

    if((matches = /\/delay\/(\d+)/.exec(r.pathname))){
      srv.delay = parseInt(matches[1], 10);
      debug('set delay', srv.delay);
      return respond(res, 'delay set to ' + srv.delay + 'ms');
    }
    if(r.pathname === '/drop/all'){
      srv.drop_all = true;
      debug('drop all');
      return respond(res, 'dropping all socket writes');
    }

    if(r.pathname === '/drop/incoming'){
      srv.drop_outgoing = false;
      srv.drop_incoming = true;
      debug('drop incoming');
      return respond(res, 'dropping incoming socket writes');
    }

    if(r.pathname === '/drop/outgoing'){
      srv.drop_incoming = false;
      srv.drop_outgoing = true;
      debug('drop outgoing');
      return respond(res, 'dropping outgoing socket writes');
    }

    if(r.pathname === '/drop/none'){
      srv.drop_outgoing = srv.drop_incoming = srv.drop_all = false;
      debug('drop none');
      return respond(res, 'allowing packets as usual');
    }

    if(r.pathname === '/stop'){
      debug('stop bridge');
      respond(res, 'Goodbye');
      return process.nextTick(function(){
        process.exit(0);
      });
    }
    respond(res, 'Unknown path', 404);
  }).listen(ctl[0], ctl[1]);
  srv.delay = opts.delay || 0;
  srv.drop_outgoing = false;
  srv.drop_incoming = false;
  srv.drop_all = false;

  return srv;
};

function respond(res, data, code){
  if(typeof data === 'string'){
    data = {message: data};
  }
  res.writeHead((code || 200), {'Content-Type': 'application/json'});
  res.end(JSON.stringify(data, null, 2));
}

module.exports.runScenario = function(steps, hostport){
  var client = module.exports.client(hostport);

  function step(){
    if(steps.length === 0){
      return debug('done');
    }

    var msg = steps.pop(), matches, ms;
    if((matches = /(?:and )?set (?:the )?delay to (\d+)/.exec(msg))){
      debug('setting delay to', matches[1]);
      client.delay(matches[1], function(err){
        if(err) throw err;
        step();
      });
    }
    else if((matches = /(?:and )?(?:then )?stop/.test(msg))){
      client.stop(function(err){
        if(err) throw err;
        step();
      });
    }
    else if((matches = /(?:and )?after (\d+) (second|minute|m)s?, drop (outgoing|incoming|all|none)/.exec(msg))){
      ms = (matches[2] === 'second') ? (matches[1]*1000) :
        (matches[2] === 'minute') ? (matches[1]*60*1000) : matches[1];
      debug('waiting ' + ms + 'ms to start dropping ' + matches[3]);
      setTimeout(function(){
        client.drop(matches[3], function(err){
          if(err) throw err;
          step();
        });
      }, ms);
    }
    else if((matches = /(?:and )?(?:then )?wait (\d+) (second|minute|m)s?/.exec(msg))){
      ms = (matches[2] === 'second') ? (matches[1]*1000) :
        (matches[2] === 'minute') ? (matches[1]*60*1000) : matches[1];
      debug('waiting ' + ms + 'ms');
      setTimeout(function(){step();}, ms);
    }
    else {
      throw new Error('What is this? `'+msg+'`');
    }
  }
  step();
};

// Get a client to control a bridge.
//
// @param {String, default: localhost:27019} hostport Where the REST server is listening.
// @api public
module.exports.client = function(hostport){
  hostport = hostport || 'localhost:27019';
  return new Client(hostport);
};

function Client(hostport){
  var parts = porthost(hostport);
  this.opts = {
    hostname: parts[1],
    port: parseInt(parts[0], 10),
    method: 'POST'
  };
}

// What to do if no errback supplied for a client call.
// @api private
var noop = function(err, data){
  if(err) throw err;
  debug(data);
};

Client.prototype.stop = function(fn){
  this.exec('/stop', fn);
};

// Set the delay in ms between the time data is receieved and when it is
// written
//
// @param {Number} ms
// @param {Function} fn
// @api public
Client.prototype.delay = function(ms, fn){
  this.exec('/delay/' + ms, fn);
};

// Drop dem packets.
//
// @param {String, default: all} what one of all|none|incoming|outgoing
// @param {Function} fn
// @api public
Client.prototype.drop = function(what, fn){
  if(typeof what === 'function'){
    fn = what;
    what = 'all';
  }

  fn = fn || noop;
  if(!/all|none|incoming|outgoing/.test(what)){
    return process.nextTick(function(){
      fn(new Error('Must be one of all, incoming, outgoing or none.'));
    });
  }
  this.exec('/drop/' + what, fn);
};

// Make the request to `path`.
//
// @param {String} path
// @param {Function} fn
// @api private
Client.prototype.exec = function(path, fn){
  fn = fn || noop;
  this.opts.path = path;
  debug(this.opts);
  http.request(this.opts, function(res) {
    res.setEncoding('utf8');
    var chunks = [];
    res.on('data', function (chunk) {
      chunks.push(chunk);
    });
    res.on('end', function(){
      fn(null, chunks.join(''));
    });
  }).on('error', fn).end();
};


// @api private
function porthost(s){
  var a = s.split(':');
  a.reverse();
  return a;
}

// @api private
function hostport(a){
  a.reverse();
  return a.join(':');
}
