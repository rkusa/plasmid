'use strict'

var State = module.exports = function(id, opts) {
  this.id = id
  this.opts = opts || {}
  this.state = Object.create(null)
  this.maxVersion = 0
}

State.prototype.namespace = function(ns) {
  return this.state[ns] || (this.state[ns] = Object.create(null))
}

State.prototype.get = function(ns, key) {
  var state = this.namespace(ns)
  if (!state[key] || !state[key].length) {
    return undefined
  }
  return state[key][0].v
}

State.prototype.set = function(ns, key, value) {
  var state = this.namespace(ns)

  var opts = this.opts.ns && ns in this.opts.ns ? this.opts.ns[ns] : this.opts
  if (!state[key] || opts.history === false) {
    state[key] = []
  }

  state[key].unshift({
    r: this.id,                         // participant id
    k: [ns.toString(), key.toString()], // key (namespace, key)
    v: value,                           // value
    n: ++this.maxVersion                // version
  })
}

State.prototype.update = function(delta) {
  if (delta.r !== this.id || this.maxVersion >= delta.n) {
    return
  }
  var state = this.namespace(delta.k[0]), key = delta.k[1]
  if (!state[key]) {
    state[key] = []
  }
  state[key].unshift(delta)
  this.maxVersion = delta.n
}

State.prototype.history = function(since) {
  var history = []
  for (var ns in this.state) {
    for (var key in this.state[ns]) {
      history.push.apply(history, this.state[ns][key].filter(function(entry) {
        return entry.n > since
      }))
    }
  }
  return history.sort(function(lhs, rhs) {
    return lhs.n - rhs.n
  })
}

State.prototype.clear = function(until) {
  for (var ns in this.state) {
    var namespace = this.state[ns]

    for (var key in namespace) {
      var history = namespace[key]

      for (var i = 1, len = history.length; i < len; ++i) {
        if (history[i].n < until) {
          history.splice(i)
          break
        }
      }
    }
  }
}