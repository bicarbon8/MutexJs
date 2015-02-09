MutexJs ![build status](https://travis-ci.org/bicarbon8/MutexJs.svg)
===========

in the world of async javascript callbacks this library provides a mechanism to ensure resources are not being updated by other async processes (useful for multipart resource activities)

[JSDoc Documentation](http://rawgit.com/bicarbon8/MutexJs/master/dist/doc/MutexJs.html)

[Minified File](http://rawgit.com/bicarbon8/MutexJs/master/dist/mutex.min.js)

## Usage:

```
MutexJs.lock(uniqueName, successCallback[[, maxWaitTime], timeoutCallback]);
```
or
```
MutexJs.lockFor(uniqueName, successCallback, duration[, expiredCallback]);
```

## Tests:
[index.html](http://rawgit.com/bicarbon8/MutexJs/master/tests/index.html)
