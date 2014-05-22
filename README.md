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
# Start a mongod in terminal 1
mongod --port 27018;

# Start a bridge in terminal 2
mongodb-bridge --from localhost:27017 --to localhost:27018

# Open mongo shell in terminal 3
mongo localhost:27017

# When you run `show dbs` everything looks fine.
# Let's simulate the some delay though.
# Open terminal 4.
# What if you're connecting to another ec2 instance in the same availability zone? ~1ms
curl http://localhost:27019/delay/1

# Not a realy noticable difference.
# How about from ec2 east -> west? ~40ms
curl http://localhost:27019/delay/40

# How about ec2 east (virginia) -> EU (dublin)? ~100ms
curl http://localhost:27019/delay/100

# Now we're starting to notice.
# How about from ec2 west (oregon) -> EU (dublin)? ~180ms
curl http://localhost:27019/delay/180

# Ok starting to hurt.
# How about ec2 west -> tokyo? ~1100ms
curl http://localhost:27019/delay/1100

# Zoinks.  How about some weirdness.
# mongodb running on a satellite ~2200ms
curl http://localhost:27019/delay/2200

# Even at that, not so bad.  Lots of people can do that.
# What about mars, tough guy? ~9 minutes and 30 seconds
curl http://localhost:27019/delay/570000

# Let's go back to no delay.
curl http://localhost:27019/delay/0

# How about another common scenario: someone screwed up the iptables config.
# Hmm I can send but I never get anything back from mongo...
curl http://localhost:27019/drop/outgoing

# Whew!  Ok that's fixed.
curl http://localhost:27019/drop/none;

# Now let's update the app servers...
curl http://localhost:27019/drop/incoming;

# Nards!  Let me see that thing.  I remember how to ip all the tables...
curl http://localhost:27019/drop/all;

# Oi... we forgot to run chef-client.
curl http://localhost:27019/drop/none;
```

don't like using curl?

```javascript
var bridge = require('bridge').client('localhost:27019');
bridge.delay(1);

bridge.delay(100);

bridge.delay(0);

bridge.drop('incoming');

bridge.drop('outgoing');

bridge.drop('all');

bridge.drop('none');

bridge.stop();
```

## Driving (wip)

```
cat > one_minute_slowdown.txt << EOF
set the delay to 0
and after 5 minutes, set the delay to 100
and after 1 minute, set the delay to 0
and then stop
EOF

cat one_minute_slowdown.txt | mongodb-bridge ctl
```

```
cat > drop_outgoing_then_lose_some_incoming.txt << EOF
set the delay to 0
and after 10 seconds, block outgoing
and after 30 seconds, unblock outgoing
and set the delay to 0
and then stop
EOF

cat drop_outgoing_then_lose_some_incoming.txt | mongodb-bridge ctl
```

## todo

- [ ] set flapping mode to randomly start making delay and disconnects go all wiggly
- [x] rest api to drop none|both|outgoing|incoming packets

## license

MIT
