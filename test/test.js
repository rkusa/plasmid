/*eslint-env mocha */

'use strict'

var expect = require('chai').expect
var plasmid = require('../lib/')

suite('State & History', function() {

  test('max version', function() {
    var state = new plasmid.State(1)
    expect(state.maxVersion).to.equal(0)

    state.set('a', 'A')
    expect(state.maxVersion).to.equal(1)
    expect(state.state.a[0]).to.eql({ r: 1, k: 'a', v: 'A', n: 1 })

    state.set('b', 'B')
    expect(state.maxVersion).to.equal(2)
    expect(state.state.b[0]).to.eql({ r: 1, k: 'b', v: 'B', n: 2 })
  })

})

suite('Host', function() {
  var p = new plasmid.Host(1)
  p.set('a', 'A')
  p.set('a', 'AA')
  p.set('b', 'B')
  var q = p.states[2] = new plasmid.State(2)
  q.set('a', 'A')
  var r = p.states[3] = new plasmid.State(3)
  r.set('a', 'A')

  test('digest', function() {
    var digest = p.getDigest()
    expect(digest).to.include(
      { r: 1, n: 3 },
      { r: 2, n: 1 },
      { r: 3, n: 1 }
    )
  })

  test('deltas (plasmid-breadth ordering)', function() {
    p.opts.ordering = 'breadth'
    var deltas = p.getDeltas([
      { r: 1, n: 1 },
      { r: 2, n: 0 },
      { r: 3, n: 0 }
    ])

    expect(deltas).to.have.lengthOf(4)
    expect(deltas[3]).to.eql({ r: 1, k: 'b', v: 'B', n: 3 })

    // their order may change
    expect(deltas.splice(0, 3)).to.include(
      { r: 1, k: 'a', v: 'AA', n: 2 },
      { r: 2, k: 'a', v: 'A', n: 1 },
      { r: 3, k: 'a', v: 'A', n: 1 }
    )
  })

  test('deltas (plasmid-breadth ordering)', function() {
    p.opts.ordering = 'depth'
    var deltas = p.getDeltas([
      { r: 1, n: 1 },
      { r: 2, n: 0 },
      { r: 3, n: 0 }
    ])

    expect(deltas).to.have.lengthOf(4)

    expect(deltas.splice(0, 2)).to.include(
      { r: 1, k: 'a', v: 'AA', n: 2 },
      { r: 1, k: 'b', v: 'B', n: 3 }
    )

    expect(deltas).to.include(
      { r: 3, k: 'a', v: 'A', n: 1 },
      { r: 2, k: 'a', v: 'A', n: 1 }
    )
  })

})

suite('Gossip', function() {

  test('test', function(done) {
    var a = new plasmid.Host('A')
    var b = new plasmid.Host('B')
    var c = new plasmid.Host('C')
    var d = new plasmid.Host('D')

    var as = a.createStream({ end: false })
    as.pipe(b.exchange()).pipe(as)

    var bs = b.createStream({ end: false })
    bs.pipe(c.exchange()).pipe(bs)

    var cs = c.createStream({ end: false })
    cs.pipe(d.exchange()).pipe(cs)

    var ds = d.createStream({ end: false })
    ds.pipe(a.exchange()).pipe(ds)

    a.set('a', 1)
    b.set('b', 2)
    c.set('c', 3)
    d.set('d', 4)

    function gossip() {
      as.gossip()
      bs.gossip()
      cs.gossip()
      ds.gossip()
    }

    repeat(gossip, 6, function() {
      [a, b, c, d].forEach(function(p) {
        expect(p.states.A.get('a')).to.equal(1)
        expect(p.states.B.get('b')).to.equal(2)
        expect(p.states.C.get('c')).to.equal(3)
        expect(p.states.D.get('d')).to.equal(4)
      })
      done()
    })
  })

})

function repeat(fn, times, callback) {
  fn()
  setImmediate(function() {
    if (--times > 1) {
      repeat(fn, times, callback)
    } else {
      callback()
    }
  })
}