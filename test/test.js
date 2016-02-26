'use strict'

const test = require('tape')
const plasmid = require('../lib/')

test('max version', function(t) {
  const state = new plasmid.State(1)
  t.equal(state.maxVersion, 0)

  state.set('~', 'a', 'A')
  t.equal(state.maxVersion, 1)
  t.deepEqual(state.state['~'].a[0], { r: 1, k: ['~', 'a'], v: 'A', n: 1 })

  state.set('~', 'b', 'B')
  t.equal(state.maxVersion, 2)
  t.deepEqual(state.state['~'].b[0], { r: 1, k: ['~', 'b'], v: 'B', n: 2 })

  t.end()
})

let p
test('setup host', function(t) {
  p = new plasmid.Host(1)
  p.set('a', 'A')
  p.set('a', 'AA')
  p.set('b', 'B')
  const q = p.state.states[2] = new plasmid.State(2)
  q.set('~', 'a', 'A')
  const r = p.state.states[3] = new plasmid.State(3)
  r.set('~', 'a', 'A')

  t.end()
})

test('digest', function(t) {
  const digest = p.getDigest()
  digestEqual(t, digest, [
    { r: 3, n: 1 },
    { r: 2, n: 1 },
    { r: 1, n: 3 },
  ])
  t.end()
})

test('deltas (plasmid-breadth ordering)', function(t) {
  p.opts.ordering = 'breadth'
  const deltas = p.getDeltas([
    { r: 1, n: 1 },
    { r: 2, n: 0 },
    { r: 3, n: 0 }
  ])

  t.equal(deltas.length, 4)
  t.deepEqual(deltas[3], { r: 1, k: ['~', 'b'], v: 'B', n: 3 })

  // their order may change
  digestEqual(t, deltas.splice(0, 3), [
    { r: 3, k: ['~', 'a'], v: 'A', n: 1 },
    { r: 1, k: ['~', 'a'], v: 'AA', n: 2 },
    { r: 2, k: ['~', 'a'], v: 'A', n: 1 },
  ])
  t.end()
})

test('deltas (plasmid-depth ordering)', function(t) {
  p.opts.ordering = 'depth'
  const deltas = p.getDeltas([
    { r: 1, n: 1 },
    { r: 2, n: 0 },
    { r: 3, n: 0 }
  ])

  t.equal(deltas.length, 4)

  digestEqual(t, deltas.splice(0, 2), [
    { r: 1, k: ['~', 'a'], v: 'AA', n: 2 },
    { r: 1, k: ['~', 'b'], v: 'B', n: 3 }
  ])

  digestEqual(t, deltas, [
    { r: 3, k: ['~', 'a'], v: 'A', n: 1 },
    { r: 2, k: ['~', 'a'], v: 'A', n: 1 }
  ])

  t.end()
})

let a, b, c, d, gossip

function prepare(opts) {
  a = new plasmid.Host('A', opts)
  b = new plasmid.Host('B', opts)
  c = new plasmid.Host('C', opts)
  d = new plasmid.Host('D', opts)

  const as = a.createStream({ end: false })
  as.pipe(b.exchange({ end: false })).pipe(as)

  const bs = b.createStream({ end: false })
  bs.pipe(c.exchange({ end: false })).pipe(bs)

  const cs = c.createStream({ end: false })
  cs.pipe(d.exchange({ end: false })).pipe(cs)

  const ds = d.createStream({ end: false })
  ds.pipe(a.exchange({ end: false })).pipe(ds)

  gossip = function() {
    as.gossip()
    bs.gossip()
    cs.gossip()
    ds.gossip()
  }
}

test('test (with local state)', function(t) {
  prepare({})

  a.set('a', 1)

  b.set('b', 1)
  b.set('b', 2)

  c.set('c', 1)
  c.set('c', 2)
  c.set('c', 3)

  d.set('d', 1)
  d.set('d', 2)
  d.set('d', 3)
  d.set('d', 4)

  repeat(gossip, 4, function() {
    [a, b, c, d].forEach(p => {
      t.equal(p.state.states.A.get('~', 'a'), 1)
      t.equal(p.state.states.A.state['~'].a.length, 1)

      t.equal(p.state.states.B.get('~', 'b'), 2)
      t.equal(p.state.states.B.state['~'].b.length, 2)

      t.equal(p.state.states.C.get('~', 'c'), 3)
      t.equal(p.state.states.C.state['~'].c.length, 3)

      t.equal(p.state.states.D.get('~', 'd'), 4)
      t.equal(p.state.states.D.state['~'].d.length, 4)
    })

    t.end()
  })
})

test('state history cleanup', function(t) {
  [a, b, c, d].forEach(function(p) {
    p.cleanup()
  })

  repeat(gossip, 4, function() {
    [a, b, c, d].forEach(function(p) {
      p.cleanup()

      // do not save history of `$` namespace
      t.equal(p.state.states[p.id].state.$[p.id].length, 1)

      t.equal(p.state.states.A.state['~'].a.length, 1)
      t.equal(p.state.states.B.state['~'].b.length, 1)
      t.equal(p.state.states.C.state['~'].c.length, 1)
      t.equal(p.state.states.D.state['~'].d.length, 1)
    })

    t.end()
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

function digestEqual(t, actual, expected) {
  actual.sort((lhs, rhs) => lhs.r - rhs.r)
  expected.sort((lhs, rhs) => lhs.r - rhs.r)
  t.deepEqual(actual, expected)
}
