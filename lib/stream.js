'use strict'

var Duplex = require('stream').Duplex

var GossipStream = module.exports = function(host, opts) {
  this.host = host
  this.opts = opts || {}
  this.digest = []

  Duplex.call(this, { objectMode: true })
}

GossipStream.prototype = Object.create(Duplex.prototype, {
  constructor: { value: GossipStream }
})

GossipStream.prototype._read = function() {
  if (this.opts.end !== false) {
    this.gossip()
  }
}

GossipStream.prototype._write = function(obj, enc, cont) {
  this.host.update(obj)
  cont()
}

GossipStream.prototype.gossip = function() {
  var digest = this.host.getDigest()

  if (this.opts.end === false) {
    digest[digest.length - 1].done = true
  }

  digest.forEach(this.push.bind(this))

  if (this.opts.end !== false) {
    this.push(null)
  }
}