# mongodb-bridge

[![build status](https://secure.travis-ci.org/imlucas/mongodb-bridge.png)](http://travis-ci.org/imlucas/mongodb-bridge)

Really just a stupid simple tcp proxy + REST controller, but could easily have
jazz.  Point was really 1) that mongobridge.cpp should really go away and
2) there are lot's of interesting cases we can easily test with ~50 lines of js.


## Example

```
./bin/mongobridge.js -h
Just a tcp proxy to use when testing mongodb.
Usage: node ./bin/mongodb-bridge.js --from [hostname:port] --to [hostname:port]

Options:
  -f, --from   Take packets from this       [default: "localhost:27017"]
  -t, --to     And send em to this          [default: "localhost:27018"]
  -d, --delay  ms of artical latency        [default: 0]
  -c, --ctl    rest api for remote control  [default: "localhost:27019"]
```

A teeny rest api will also be lauched to tweak response delay in milliseconds
(0 by default) on `localhost:27019`.

```
# ec2 west -> tokyo
curl http://localhost:27019/delay/1100

# ec2 west -> EU ~180ms
curl http://localhost:27019/delay/180

# ec2 east -> EU ~100ms
curl http://localhost:27019/delay/100

# ec2 east -> west ~40ms
curl http://localhost:27019/delay/40

# ec2 same AZ flappy ~1ms
curl http://localhost:27019/delay/1

# mongodb running on a satellite ~2200ms
curl http://localhost:27019/delay/2200

# @see https://amplab.cs.berkeley.edu/2011/10/20/latencies-gone-wild/
```

## Simulating Network Paritions

Until i get over the flu, see
[this post](http://www.kchodorow.com/blog/2011/04/20/simulating-network-paritions-with-mongobridge/)
for the mongo bits.  REST API's for controlling traffic:

- nothing in or out `curl http://'+hostport(ctl)+'/drop/all`
- nothing in `curl http://'+hostport(ctl)+'/drop/incoming`
- nothing out `curl http://'+hostport(ctl)+'/drop/outgoing`
- back to normal `curl http://'+hostport(ctl)+'/drop/none`

## todo

- [ ] set flapping mode to randomly start making delay and disconnects go all wiggly
- [x] rest api to drop none|both|outgoing|incoming packets

## license

MIT
