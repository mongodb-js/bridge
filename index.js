var net = require('net'),
  http = require('http');

function porthost(s){
  var a = s.split(':');
  a.reverse();
  return a;
}

function hostport(a){
  a.reverse();
  return a.join(':');
}

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
    console.log('   ');
    console.log('   make your application connect to', hostport(from));
    console.log('   ');
    console.log('   @todo: make this better');
    console.log('   @todo: add details on testing mongo against network failure scenarios.');
    console.log('   ');
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
    res.writeHead(404, {'Content-Type': 'text/plain'});

    res.end('huh?');
  }).listen(ctl[0], ctl[1], function(){
    console.log('    control mongobridge via REST!  to simulate:');
    console.log('    100ms network delay `curl http://'+hostport(ctl)+'/delay/100`');
    console.log('    nothing in or out `curl http://'+hostport(ctl)+'/drop/all`');
    console.log('    nothing in `curl http://'+hostport(ctl)+'/drop/incoming`');
    console.log('    nothing out `curl http://'+hostport(ctl)+'/drop/outgoing`');
    console.log('    back to normal `curl http://'+hostport(ctl)+'/drop/none`');
    console.log('    ');
  });
  srv.delay = opts.delay || 0;
  srv.drop_outgoing = false;
  srv.drop_incoming = false;
  srv.drop_all = false;

  return srv;
};
