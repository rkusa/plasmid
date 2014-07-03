'use strict'

var LocalState = require('./states/local')
var EventEmitter = require('events').EventEmitter

var Host = module.exports = function(id, opts) {
  this.id = id
  this.opts = opts || {}
  if (!this.opts.state) this.opts.state = new LocalState({})

  this.state = this.opts.state.create(id)

  EventEmitter.call(this)
}

Host.prototype = Object.create(EventEmitter.prototype, {
  constructor: Host
})

var GossipTransform = require('./transform')
Host.prototype.exchange = function(opts) {
  return new GossipTransform(this, opts)
}

var GossipStream = require('./stream')
Host.prototype.createStream = function(opts) {
  return new GossipStream(this, opts)
}

// = {(r,max(μp(r))) | r ∈ P}
Host.prototype.getDigest = function() {
  var digest = []

  // randomize
  this.state.digest().forEach(function(s) {
    digest.splice(randomBetween(0, digest.length), 0, s)
  })

  return digest
}

// = {(r,k,v,n) | μp(r)(k) = (v,n) ∧ n > max(μq(r))}
Host.prototype.getDeltas = function(digest, result) {
  var deltas = Object.create(null), ids = [], includeUnknown = false
  if (!result) result = []

  digest.forEach(function(s) {
    includeUnknown = s.done === true

    if (!this.state.knows(s.r)) return

    deltas[s.r] = this.state.history(s.r, s.n)
    ids.splice(randomBetween(0, ids.length), 0, s.r)
  }, this)

  if (includeUnknown) {
    this.state.digest().forEach(function(s) {
      if (ids.indexOf(s.r) > -1) return

      deltas[s.r] = this.state.history(s.r, 0)
      ids.splice(randomBetween(0, ids.length), 0, s.r)
    }, this)
  }

  if (!ids.length) return []

  // scuttle-breadth ordering - tries to be fair to all participants
  // (1) order deltas from same participant inversely by their version number
  // (2) rank deltas from the same participant incrementally (order by rank)
  // (3) shuffle deltas of the same rank
  if (this.opts.ordering === 'breadth') {
    while (ids.length) {
      for (var i = ids.length - 1; i >= 0; --i) {
        var id = ids[i]
        result.push(deltas[id].shift())
        if (!deltas[id].length) ids.splice(ids.indexOf(id), 1)
      }
    }
  }

  // scuttle-depth ordering
  // (1) order deltas from same participant inversely by their version number
  // (2) order by count of available deltas
  // (3) shuffle participants with the same number of available deltas
  else {
    ids.sort(function(lhs, rhs) {
      return deltas[rhs].length - deltas[lhs].length
    })
    ids.forEach(function(id) {
      deltas[id].forEach(function(delta) {
        result.push(delta)
      })
    }, this)
  }

  return result
}

Host.prototype.get = function(key) {
  return this.state.get('~', key)
}

Host.prototype.set = function(key, value) {
  this.state.set('~', key, value)
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}