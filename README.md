MutexJs ![build status](https://travis-ci.org/bicarbon8/MutexJs.svg)
===========

in the world of async javascript callbacks this library provides a mechanism to ensure resources are not being updated by other async processes (useful for multipart resource activities)

[JSDoc Documentation](http://rawgit.com/bicarbon8/MutexJs/master/dist/doc/MutexJs.html)

[Minified File](http://rawgit.com/bicarbon8/MutexJs/master/dist/mutex.min.js)

## Usage:

```javascript
MutexJs.lock(uniqueName, successCallback[[, maxWaitTime], timeoutCallback]);
```
or
```javascript
MutexJs.lockFor(uniqueName, successCallback, duration[, expiredCallback]);
```

## Example usage:
```javascript
function beginAsync(data, callback) {
  // ensure lock before starting
  MutexJs.lockFor('AsyncLock', function (id) {
    data.beginChanges();
    callback.call(this, id, data); // pass the lock ID to the callback
  }, 2000, // lock for maximum 2 seconds
  function onLockTimeout() {
    data.rollbackChanges(); // only called if lock held more than 2 seconds
  });
}
function endAsync(id, data) {
  setTimeout(function () {
    data.endChanges();
    // release lock
    MutexJs.release(id);
  }, 1000); // wait 1 second during which time the lock is held
}

beginAsync(data, endAsync); // lock for 1 second
beginAsync(data, endAsync); // operations will run after 1 second and 'data' object operations will not overlap
```

## Usage in existing projects
[PhantomFunctionalTest](https://github.com/bicarbon8/PhantomFunctionalTest/blob/master/lib/pft/objects/tester.js#L123)
```javascript
// get a lock so we can run the test
MutexJs.lockFor(PFT.tester.TEST, function onStart(runUnlockId) {
    t.runUnlockId = runUnlockId;
    var suite = "";
    if (t.suite) {
      if (t.suite.name) {
        suite = t.suite.name + " - ";
      }
    }
    var msg = "Starting: '" + suite + t.name + "'...";
    PFT.logger.log(PFT.logger.TEST, msg);
    var testId = PFT.guid();

    // run setup
    if (t.suite && t.suite.setup) {
      MutexJs.lock(testId, function setup(unlockId) {
          setTimeout(function () {
              var done = function () {
                  MutexJs.release(unlockId);
              };
              t.suite.setup.call(this, done);
          }.bind(this), 1);
      }.bind(this));
    }
    // run test
    MutexJs.lock(testId, function test(unlockId) {
      setTimeout(function () {
          t.page = PFT.createPage();
          t.unlockId = unlockId;
          t.startTime = new Date().getTime();
          PFT.tester._tests.push(t);
          PFT.tester.onTestStarted({ test: t });
          callback.call(this, t.page, new PFT.tester.assert(t));
      }.bind(this), 1);
    }.bind(this));
    // run teardown
    if (t.suite && t.suite.teardown) {
      MutexJs.lock(testId, function teardown(unlockId) {
          setTimeout(function () {
              var done = function () {
                  MutexJs.release(unlockId);
              };
              t.suite.teardown.call(this, done);
          }.bind(this), 1);
      }.bind(this));
    }
    MutexJs.lock(testId, function done(unlockId) {
      setTimeout(function () {
          PFT.tester.closeTest(t);
          MutexJs.release(unlockId);
          MutexJs.release(runUnlockId);
      }.bind(this), 1);
    }.bind(this));
}.bind(this), t.timeout, function onTimeout() {
  var msg = "Test '" + t.name + "' exceeded timeout of " + t.timeout;
  t.errors.push(msg);
  PFT.logger.log(PFT.logger.TEST, msg);
  PFT.tester.onTimeout({ test: t, message: msg });
  PFT.tester.closeTest(t);
}.bind(this));
```
