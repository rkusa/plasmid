'use strict'

var State = require('./base')

var LocalState = function(id, opts) {
  this.id = id
  this.opts = opts || []
  if (!opts.ns) opts.ns = {}
  this.opts.ns.$ = { history: false }

  this.states = Object.create(null)
  this.states[this.id] = new State(this.id, this.opts)
}

module.exports = function(opts) {
  return {
    create: function(id) {
      return new LocalState(id, opts)
    }
  }
}

LocalState.prototype.digest = function() {
  var digest = []
  for (var id in this.states) {
    digest.push({
      r: this.states[id].id,
      n: this.states[id].maxVersion
    })
  }
  return digest
}

LocalState.prototype.knows = function(id) {
  if (!(id in this.states)) {
    this.states[id] = new State(id, this.opts)
    return false
  }

  return true
}

LocalState.prototype.get = function(ns, key) {
  return this.states[this.id].get(ns, key)
}

LocalState.prototype.history = function(id, since) {
  return this.states[id].history(since)
}

LocalState.prototype.set = function(ns, key, value) {
  this.states[this.id].set(ns, key, value)
}

LocalState.prototype.update = function(delta) {
  if (!this.states[delta.r]) {
    this.states[delta.r] = new State(delta.r, this.opts)
  }
  this.states[delta.r].update(delta)
}

LocalState.prototype.cleanup = function() {
  // update global view
  for (var id in this.states) {
    var state = this.states[id]

    var n = this.get('$', id) || 0
    if (state.maxVersion > n) {
      this.set('$', id, state.maxVersion)
    }
  }

  // cleanup
  Object.keys(this.states).forEach(function(id, i, ids) {
    var min = Math.min.apply(Math, ids.map(function(i) {
      return this.states[i].get('$', id)
    }, this))
    if (!isNaN(min)) {
      this.states[id].clear(min)
    }
  }, this)
}
