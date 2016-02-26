# plasmid

[Scuttlebutt reconciliation](http://www.cs.cornell.edu/home/rvr/papers/flowgossip.pdf) for anti-entropy gossip protocol implementations.

[![NPM][npm]](https://npmjs.org/package/plasmid)
[![Build Status][travis]](http://travis-ci.org/rkusa/plasmid)

## API

```js
var plasmid = require('plasmid')
```

### var host = new plasmid.Host(id, [opts])

Create a new gossip host/participant uniquely identified by the provided `id` (must be unique within all participants). The behavior of the host can be adjusted with the following options:

- **ordering** - (default: breadth) (breadth|depth)
- **state** - (default: LocalState) the state

```js
var p = new plasmid.Host(1)
```

### host.set(key, value)

Sets the local `key` to `value`.

### host.get(key)

Gets the value for local `key`.

### host.cleanup()

Propagate the host's view through the cluster. Values that known within the whole cluster are removed.

This method is not called automatically and has to be used when implementing a gossip protocol using `plasmid`.

### host.exchange([opts])

Create a transform stream used to receive digests and respond with deltas accordingly (through whatever transport channel you want). The behavior of the stream can be adjusted with the following options:

- **end** - (default: true) whether the stream should end after completing to send its deltas

**Caution:** create a single stream per connection and do not reuse one stream to connect multiple hosts together.

### var hostStream = host.createStream([opts])

Create a duplex stream used to send the digest and receive deltas (through whatever transport channel you want). The behavior of the stream can be adjusted with the following options:

- **end** - (default: true) whether the stream should end after completing to send its digest

```js
var p = new plasmid.Host()
var q = new plasmid.Host()

var ps = ps.createStream()
ps.pipe(q.exchange()).pipe(ps)
```

**Caution:** create a single stream per connection and do not reuse one stream to connect multiple hosts together.

### hostStream.gossip()

Manually trigger the gossip.

```js
var ps = ps.createStream({ end: false })
ps.pipe(q.exchange()).pipe(ps)

ps.gossip()
```

### new plasmid.LocalState([opts])

The behavior of the local state can be adjusted with the following options:

- **history** - (default: true) whether to sync the full history of a key value pair instead of just syncing the most recent value

```js
var p = new plasmid.Host(1, {
  state: new plasmid.LocalState({ history: false })
})
```

## MIT License

[MIT](LICENSE)

[npm]: http://img.shields.io/npm/v/plasmid.svg?style=flat
[travis]: http://img.shields.io/travis/rkusa/plasmid.svg?style=flat
