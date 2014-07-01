'use strict'

var State = require('./base')

var LocalState = function(id, opts) {
  this.id = id
  this.opts = opts || []

  this.states = Object.create({})
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

LocalState.prototype.get = function(key) {
  return this.states[this.id].get(key)
}

LocalState.prototype.history = function(id, since) {
  return this.states[id].history(since)
}

LocalState.prototype.set = function(key, value) {
  this.states[this.id].set(key, value)
}

LocalState.prototype.update = function(delta) {
  if (!this.states[delta.r]) {
    this.states[delta.r] = new State(delta.r, this.opts)
  }
  this.states[delta.r].update(delta)
}