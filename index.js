var net = require('net'),
  http = require('http'),
  debug = require('debug')('mongobridge');

function porthost(s){
  var a = s.split(':');
  a.reverse();
  return a;
}

module.exports = function(opts){
  opts = opts || {};

  var from = porthost(opts.from || 'localhost:27017'),
    to = porthost(opts.to || 'localhost:27018'),
    ctl = porthost(opts.ctl || 'localhost:27019');

  var srv = net.createServer(function(you){
      var them;
      debug('you connected');
      them = net.createConnection.apply(net, to);
      them.on('data', function(data){
        if(srv.delay === 0) return you.write(data);
        setTimeout(function(){you.write(data);}, srv.delay);
      });
      you.on('data', function(data){
        them.write(data);
      });
      you.on('end', function(){
        them.end();
        you.end();
      });
  }).listen(from[0], from[1], function(){
    debug('proxy listening', from);
  });

  http.createServer(function (req, res){
    var r = require('url').parse(req.url), matches;
    if((matches = /\/delay\/(\d+)/.exec(r.pathname))){
      debug('delay is now', (srv.delay = parseInt(matches[1], 10)), 'ms');
      res.writeHead(200, {'Content-Type': 'text/plain'});
      return res.end('delay = ' + srv.delay);
    }

    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end('huh?');
  }).listen(ctl[0], ctl[1], function(){
    debug('ctl listening', ctl);
  });
  srv.delay = opts.delay || 0;
  return srv;
};
