var net = require('net'),
  http = require('http');

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
    console.log('');
    console.log('   waiting for connections on', hostport(from));
    console.log('');
  });

  http.createServer(function (req, res){
    var r = require('url').parse(req.url), matches;
    if((matches = /\/delay\/(\d+)/.exec(r.pathname))){
      console.log('delay is now', (srv.delay = parseInt(matches[1], 10)), 'ms');
      res.writeHead(200, {'Content-Type': 'text/plain'});
      return res.end('delay = ' + srv.delay);
    }

    if(r.pathname === '/drop/all'){
      console.log('drop all', (srv.drop_all = true));
      res.writeHead(200, {'Content-Type': 'text/plain'});
      return res.end('dropping all socket writes');
    }

    if(r.pathname === '/drop/incoming'){
      console.log('drop incoming', (srv.drop_incoming = true));
      res.writeHead(200, {'Content-Type': 'text/plain'});
      return res.end('dropping incoming socket writes');
    }

    if(r.pathname === '/drop/outgoing'){
      console.log('drop outgoing', (srv.drop_outgoing = true));
      res.writeHead(200, {'Content-Type': 'text/plain'});
      return res.end('dropping outgoing socket writes');
    }

    if(r.pathname === '/drop/none'){
      srv.drop_outgoing = srv.drop_incoming = srv.drop_all = false;
      res.writeHead(200, {'Content-Type': 'text/plain'});
      return res.end('allowing packets as usual');
    }

    if(r.pathname === '/stop'){
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('goodbye');
      return process.nextTick(function(){
        process.exit(0);
      });
    }
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end('huh?');
  }).listen(ctl[0], ctl[1], function(){
    console.log('    control mongobridge with rest to simulate:');
    console.log('');
    console.log('    100ms network delay');
    console.log('     curl http://'+hostport(ctl)+'/delay/100');
    console.log('');
    console.log('    nothing in');
    console.log('      curl http://'+hostport(ctl)+'/drop/incoming');
    console.log('');
    console.log('    nothing out');
    console.log('      curl http://'+hostport(ctl)+'/drop/outgoing');
    console.log('');
    console.log('    nothing in or out');
    console.log('      curl http://'+hostport(ctl)+'/drop/all');
    console.log('');
    console.log('    back to normal');
    console.log('      curl http://'+hostport(ctl)+'/drop/none');
    console.log('');
    console.log('    when you\'re test is complete or an assert fails, stop like so');
    console.log('      curl http://'+hostport(ctl)+'/stop');
    console.log('');
  });
  srv.delay = opts.delay || 0;
  srv.drop_outgoing = false;
  srv.drop_incoming = false;
  srv.drop_all = false;

  return srv;
};

module.exports.ctl = function(todo){
  var action = todo.pop();
  console.log(action);
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
  console.log(data);
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
  console.log(this.opts);
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
