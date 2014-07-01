'use strict'

var State = module.exports = function(id, opts) {
  this.id = id
  this.opts = opts || {}
  this.state = Object.create(null)
  this.maxVersion = 0
}

State.prototype.get = function(key) {
  if (!this.state[key] || !this.state[key].length) {
    return undefined
  }
  return this.state[key][0].v
}

State.prototype.set = function(key, value) {
  if (!this.state[key] || !this.opts.syncHistory) {
    this.state[key] = []
  }
  this.state[key].unshift({
    r: this.id,          // participant id
    k: key.toString(),   // key
    v: value,            // value
    n: ++this.maxVersion // version
  })
}

State.prototype.update = function(delta) {
  if (delta.r !== this.id || this.maxVersion >= delta.n) {
    return
  }
  if (!this.state[delta.k]) this.state[delta.k] = []
  this.state[delta.k].unshift(delta)
  this.maxVersion = delta.n
}

State.prototype.history = function(since) {
  var history = []
  for (var key in this.state) {
    history.push.apply(history, this.state[key].filter(function(entry) {
      return entry.n > since
    }))
  }
  return history.sort(function(lhs, rhs) {
    return lhs.n - rhs.n
  })
}