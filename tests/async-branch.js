var assert = require('assert')
var async = require('async')

var asyncbranch = require('../lib')

describe('chain', function() {
  it('simple chain', function(done) {
    var expected = [
      { key1: 4 },
      { key1: 2 },
    ]
    var data = []

    function func1(arr, callback) {
      arr.push({ key1: 2 })
      callback(null, arr)
    }
    function func2(arr, callback) {
      arr.push({ key1: 1 })
      callback(null, arr)
    }
    function func3(arr, callback) {
      for(var i in arr) {
        arr[i].key1 = arr[i].key1 * 2
      }
      callback(null, arr)
    }

    new asyncbranch.branch('branch name')
      .do(func1)
      .do(func2)
      .do(func3)
      .execute(data, function(err, result) {
        assert.ifError(err)
        assert.deepEqual(expected, result)

        done()
      })
  })
})

describe('branch', function() {

  it('branch odd-even', function(done) {
    var expected = [ { key1: 'odd'}]
    var data = []

    var oddFunction = function(arr, callback) {
      arr.push({ key1: 'odd' })
      callback(null, arr)
    }
    var evenFunction = function(arr, callback) {
      arr.push({ key1: 'even' })
      callback(null, arr)
    }

    var oddBranch = new asyncbranch.branch('odd branch')
      .do(oddFunction)
    var evenBranch = new asyncbranch.branch('even branch')
      .do(evenFunction)

    function branchFunction(arr, callback) {
      callback(null, (arr.length % 2) ? evenBranch : oddBranch)
    }

    new asyncbranch.branch('branch name')
      .branch(branchFunction)
      .execute(data, function(err, result) {
        assert.ifError(err)
        assert.deepEqual(expected, result)

        done()
      })
  })

  describe('parallel', function() {

    it('branch odd-event-empty', function(done) {
      var oddData = [{ key1: 'odd' }, { key1: 'odd' }]
      var evenData = [{ key1: 'even' }]
      var emptyData = []
      var expected = {
        empty: [ { key1: 'empty' } ],
        even: [ { key1: 'even' }, { key1: 'even' } ],
        odd: [ { key1: 'odd' }, { key1: 'odd' }, { key1: 'odd' } ],
      }

      var oddFunction = function oddFunction(arr, callback) {
        arr.push({ key1: 'odd' })
        callback(null, arr)
      }
      var evenFunction = function evenFunction(arr, callback) {
        arr.push({ key1: 'even' })
        callback(null, arr)
      }
      var emptyFunction = function emptyFunction(arr, callback) {
        arr.push({ key1: 'empty' })
        callback(null, arr)
      }

      var oddBranch = new asyncbranch.branch('odd branch')
        .do(oddFunction)
      var evenBranch = new asyncbranch.branch('even branch')
        .do(evenFunction)
      var emptyBranch = new asyncbranch.branch('empty branch')
        .do(emptyFunction)

      function branchFunction(arr, callback) {
        callback(null, arr.length === 0 ? emptyBranch :
          ((arr.length % 2) ? evenBranch : oddBranch))
      }

      var flow = new asyncbranch.branch('branch name')
        .branch(branchFunction)

      async.parallel({
        empty: flow.execute.bind(flow, emptyData),
        even: flow.execute.bind(flow, evenData),
        odd: flow.execute.bind(flow, oddData),
      }, function(err, results) {
        assert.ifError(err)
        assert.deepEqual(expected, results)

        done()
      })
    })

    it('branch before after', function(done) {
      var oddData = [ { key1: 'odd' }, { key1: 'odd' }]
      var evenData = [ { key1: 'even' } ]
      var expected = {
        even: [ { key1: 'even' }, { key1: 'even' }, { key1: 'after' } ],
        odd: [
          { key1: 'odd' },
          { key1: 'odd' },
          { key1: 'odd' },
          { key1: 'after' }
        ]
      }

      var oddFunction = function oddFunction(arr, callback) {
        arr.push({ key1: 'odd' })
        callback(null, arr)
      }
      var evenFunction = function evenFunction(arr, callback) {
        arr.push({ key1: 'even' })
        callback(null, arr)
      }

      var oddBranch = new asyncbranch.branch('odd branch')
        .do(oddFunction)
      var evenBranch = new asyncbranch.branch('even branch')
        .do(evenFunction)

      function branchFunction(arr, callback) {
        callback(null, (arr.length % 2) ? evenBranch : oddBranch)
      }

      function afterFunction(arr, callback) {
        arr.push({ key1: 'after' })
        callback(null, arr)
      }

      var flow = new asyncbranch.branch('branch name')
        .branch(branchFunction)
        .do(afterFunction)

      async.parallel({
        even: flow.execute.bind(flow, evenData),
        odd: flow.execute.bind(flow, oddData),
      }, function(err, results) {
        assert.ifError(err)

        assert.deepEqual(expected, results)

        done()
      })
    })
  })
})