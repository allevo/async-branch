async-branch
============
[![Build Status](https://travis-ci.org/allevo/async-branch.svg?branch=master)](https://travis-ci.org/allevo/async-branch)


Wrap async library to describe your flow through branches

Installation
------------

    npm install async-branch


Usage
-----
Import the library

    var asyncbranch = require('async-branch')

Create branches and execute
```javascript
var createUser = new asyncbranch.branch('create user')
    .do(insertToDb)
    .do(sendEmailToConfirmRegistration)
    .do(emitUserCreateEvent)
    
var loginUser = new asyncbranch.branch('load user')
    .do(emitUserLoginEvent)

var loginOrRegistration = new asyncbranch.branch('login or registration')
    .do(loadUserFromEmail)
    .branch(function(model, next) {
        next(null, model ? loginUser : createUser)
    })
    .execute('example@example.com', function(err, model) {
        // if the user is on db loginUser branch is executed
        // else the createUser branch is executed
    })
```

Or use to map an array
```javascript
var data = [
  { key1: 'pippo' },
  { key1: 'pluto' },
  { key1: 'paperina' },
  { key1: 'paperino' },
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
    // the first two item of data have type property set to tooShort
    // the other items of data have type property set to tooLong
    console.log(data)
  })
```

See the test folder for more explainations.
