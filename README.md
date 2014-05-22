# mongodb-bridge

[![build status](https://secure.travis-ci.org/imlucas/mongodb-bridge.png)](http://travis-ci.org/imlucas/mongodb-bridge)

Make weird network stuff reproducable, particularly handy when testing
and distributed system that needs to handle these kinds of things.

## Example

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

## Scenarios

Say you are trying to test a system over time.  You can use a pretty
simple grammar to have bridge replay a scenario.

```bash
cat > one_minute_slowdown.txt << EOF
set the delay to 0
and after 100ms, set the delay to 100
and after 1 minute, set the delay to 0
EOF

cat one_minute_slowdown.txt | mongodb-bridge run-scenario
```

```bash
cat > drop_outgoing_then_lose_some_incoming.txt << EOF
set the delay to 0
and after 10 seconds, drop outgoing
and after 30 seconds, drop none
and set the delay to 0
and after 1 minute, drop all
and then wait 1 minute
and then stop
EOF

cat drop_outgoing_then_lose_some_incoming.txt | mongodb-bridge run-scenario
```

## Real World

This is the workflow I imagine would help folks to the most: put some
scenarios in your integration tests directory so you can test and observe:

```bash
cat > prepare_slight_slow_down.txt << EOF
wait 100ms
and then set the delay to 100
EOF

cat prepare_slight_slow_down.txt | mongodb-bridge run-scenario

# you go observe the system...
# hmm everything looks ok...

cat > shit_hits_the_fan.txt << EOF
set the delay to 500
and then wait 1 minute
and set the delay to 1000
and then wait 1 minute
and then drop all
EOF

cat shit_hits_the_fan.txt | mongodb-bridge run-scenario

# you go and check your system handled it correctly...
cat > restore_order.txt << EOF
set the delay to 0
and after 100ms, drop none
EOF

cat restore_order.txt | mongodb-bridge run-scenario

# you check everything is ok while self-fiving your way to the kitchen.
```

## REST Client

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

## license

MIT
