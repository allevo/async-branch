var async = require('async')
var _ = require('lodash')
var definiedBranches = {}

function mapper(mapFunction, list, callback) {
  async.map(list, mapFunction, callback)
}

function branch(name) {
  this.name = name
  this.toApply = []
  definiedBranches[name] = this
  return this
}

branch.prototype.do = function(func) {
  this.toApply.push(func)
  return this
}

branch.prototype.execute = function(data, final_callback) {
  // clone the branch function to adding the first function
  var toDo = _.cloneDeep(this.toApply)
  var first = function(next) {
    next(null, data)
  }
  toDo.unshift(first)

  async.waterfall(toDo, final_callback)
}

branch.prototype.map = function(mapFunction) {
  this.toApply.push(mapper.bind(null, mapFunction))
  return this
}

branch.prototype.branch = function(branchFunction) {
  var f = function f(arr, callback) {
    branchFunction(arr, function(err, branch) {
      branch.execute(arr, callback)
    })
  }
  this.toApply.push(f)
  return this
}

exports.branch = branch