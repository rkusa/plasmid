'use strict'

var State = require('./state')

var Host = module.exports = function(id, opts) {
  this.id = id
  this.opts = opts || {}

  this.states = Object.create(null)
  this.states[this.id] = new State(this.id, this.opts)
}

Host.prototype.update = function(delta) {
  if (!this.states[delta.r]) {
    this.states[delta.r] = new State(delta.r, this.opts)
  }
  this.states[delta.r].update(delta)
}

var GossipTransform = require('./transform')
Host.prototype.exchange = function() {
  return new GossipTransform(this)
}

var GossipStream = require('./stream')
Host.prototype.createStream = function(opts) {
  return new GossipStream(this, opts)
}

// = {(r,max(μp(r))) | r ∈ P}
Host.prototype.getDigest = function() {
  var digest = []
  for (var id in this.states) {
    digest.splice(randomBetween(0, digest.length), 0, {
      r: this.states[id].id,
      n: this.states[id].maxVersion
    })
  }
  return digest
}

// = {(r,k,v,n) | μp(r)(k) = (v,n) ∧ n > max(μq(r))}
Host.prototype.getDeltas = function(digest, result) {
  var deltas = Object.create(null), ids = []
  if (!result) result = []

  digest.forEach(function(s) {
    if (!(s.r in this.states)) {
      this.states[s.r] = new State(s.r, this.opts)
      return
    }

    deltas[s.r] = this.states[s.r].history(s.n)
    ids.splice(randomBetween(0, ids.length), 0, s.r)
  }, this)

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
  return this.states[this.id].get(key)
}

Host.prototype.set = function(key, value) {
  this.states[this.id].set(key, value)
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}