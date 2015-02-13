MutexJs ![build status](https://travis-ci.org/bicarbon8/MutexJs.svg)
===========

in the world of async javascript callbacks this library provides a mechanism to ensure resources are not being updated by other async processes (useful for multipart resource activities)

[JSDoc Documentation](http://rawgit.com/bicarbon8/MutexJs/master/dist/doc/MutexJs.html)

[Minified File](http://rawgit.com/bicarbon8/MutexJs/master/dist/mutex.min.js)

## Usage:

```js
MutexJs.lock(uniqueName, successCallback[[, maxWaitTime], timeoutCallback]);
```
or
```js
MutexJs.lockFor(uniqueName, successCallback, duration[, expiredCallback]);
```

## Example usage:
```js
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
[PhantomFunctionalTest](https://github.com/bicarbon8/PhantomFunctionalTest/blob/master/lib/pft/objects/tester.js#L129)
```js
// get a lock so we can run the test
MutexJs.lockFor("PFT.tester.test", function onStart(runUnlockId) {
    testObj.runUnlockId = runUnlockId;
    PFT.tester._tests.push(testObj);
    var suite = "";
    if (testObj.suite) {
        if (testObj.suite.name) {
            suite = testObj.suite.name + " - ";
        }
    }
    var msg = "Starting: '" + suite + testObj.name + "'...";
    PFT.logger.log(PFT.logger.TEST, msg);
    var testId = PFT.guid();

    // run setup
    if (testObj.suite && testObj.suite.setup) {
        MutexJs.lock(testId, function setup(unlockId) {
            testObj.unlockId = unlockId;
            var done = function () {
                PFT.tester.haltCurrentScript();
            };
            testObj.suite.setup.call(this, done);
        });
    }

    // run test
    MutexJs.lock(testId, function test(unlockId) {
        testObj.page = PFT.createPage();
        testObj.unlockId = unlockId;
        testObj.startTime = new Date().getTime();
        PFT.tester.onTestStarted({ "test": testObj });
        callback.call(this, testObj.page, new PFT.tester.assert(testObj));
    });

    // run teardown
    if (testObj.suite && testObj.suite.teardown) {
        MutexJs.lock(testId, function teardown(unlockId) {
            testObj.unlockId = unlockId;
            var done = function () {
                PFT.tester.haltCurrentScript();
            };
            testObj.suite.teardown.call(this, done);
        });
    }

    MutexJs.lock(testId, function done(unlockId) {
        PFT.tester.closeTest(testObj);
        MutexJs.release(unlockId);
        MutexJs.release(runUnlockId);
    });
}, testObj.timeout, function onTimeout() {
    var msg = "Test '" + testObj.name + "' exceeded timeout of " + testObj.timeout;
    testObj.errors.push(msg);
    PFT.logger.log(PFT.logger.TEST, msg);
    PFT.tester.onTimeout({ "test": testObj, message: msg });

    // close resources
    PFT.tester.closeTest(testObj);

    // don't continue running
    testObj.unlockId = null;

    PFT.tester.haltCurrentScript();
});
```
