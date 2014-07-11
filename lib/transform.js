'use strict'

var Transform = require('stream').Transform

var GossipTransform = module.exports = function(host, opts) {
  this.host = host
  this.opts = opts || {}
  this.digest = []

  Transform.call(this, { objectMode: true })
}

GossipTransform.prototype = Object.create(Transform.prototype, {
  constructor: { value: GossipTransform }
})

GossipTransform.prototype._transform = function(obj, enc, cont) {
  this.digest.push(obj)
  if (obj.done === true) {
    if (this.opts.end !== false) this.end()
    else this.writeDeltas()
  }
  cont()
}

GossipTransform.prototype._flush = function(done) {
  this.writeDeltas()
  done()
}

GossipTransform.prototype.writeDeltas = function() {
  this.host.getDeltas(this.digest, this)
  this.digest = []
}
