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

  it('fail', function(done) {
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
      callback(new Error('fail!'), arr)
    }
    function func3(arr, callback) {
      throw new Error('Never call me!')
    }

    new asyncbranch.branch('branch name')
      .do(func1)
      .do(func2)
      .do(func3)
      .execute(data, function(err, result) {
        assert.equal('object', typeof err)
        assert.equal('Error', err.name)
        assert.equal('fail!', err.message)

        assert.deepEqual([ { key1: 2 } ], result)

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

describe('branch for item', function () {

  it('simple', function(done) {
    var data = [
      { key1: 'pippo' },
      { key1: 'pluto' },
      { key1: 'paperina' },
      { key1: 'paperino' },
    ]
    var expected = [
      { key1: 'pippo', type: 'tooShort' },
      { key1: 'pluto', type: 'tooShort' },
      { key1: 'paperina', type: 'tooLong' },
      { key1: 'paperino', type: 'tooLong' }
    ]

    var tooLongFunction = function tooLongFunction(item, next) {
      item.type = 'tooLong'
      next(null, item)
    }
    var tooShortFunction = function tooLongFunction(item, next) {
      item.type = 'tooShort'
      next(null, item)
    }

    var tooLongBranch = new asyncbranch.branch('tooLongBranch')
      .map(tooLongFunction)
    var tooShortBranch = new asyncbranch.branch('tooShortBranch')
      .map(tooShortFunction)

    function branchFunction(item, callback) {
      callback(null, (item.key1.length > 6) ? tooLongBranch : tooShortBranch)
    }

    new asyncbranch.branch('branch name')
      .itemBranch(branchFunction)
      .execute(data, function(err, data) {
        assert.ifError(err)
        assert.deepEqual(expected, data)

        done()
      })
  })
})

describe('async integration', function() {

  it('map', function(done) {
    var data = [
      { key1: 'pippo', key2: 'pluto' },
      { key1: 'paperina', key2: 'paperino' },
    ]
    var expected = [
      { second: 'pluto', length: 5 },
      { second: 'paperino', length: 8 }
    ]

    function mapFunction(item, callback) {
      callback(null, {
        second: item.key2,
        length: item.key1.length
      })
    }

    new asyncbranch.branch('branch name')
      .map(mapFunction)
      .execute(data, function(err, data) {
        assert.ifError(err)
        assert.deepEqual(expected, data)

        done()
      })
  })

  describe('parallel', function() {
    it('map', function(done) {
      var data = [
        { key1: 'pippo', key2: 'pluto' },
        { key1: 'paperina', key2: 'paperino' },
      ]
      var expected = {
        data1: [
          { second: 'pluto', length: 5 },
          { second: 'paperino', length: 8 }
        ],
        data2: [
          { second: 'pluto', length: 5 },
          { second: 'paperino', length: 8 }
        ],
      }

      function mapFunction(item, callback) {
        callback(null, {
          second: item.key2,
          length: item.key1.length
        })
      }

      var flow = new asyncbranch.branch('branch name')
        .map(mapFunction)

      async.parallel({
        data1: flow.execute.bind(flow, data),
        data2: flow.execute.bind(flow, data),
      }, function(err, data) {
        assert.ifError(err)
        assert.deepEqual(expected, data)

        done()
      })
    })
  })
})