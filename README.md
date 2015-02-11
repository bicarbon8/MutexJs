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
