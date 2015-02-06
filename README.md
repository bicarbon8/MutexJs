SemaphoreJs ![build status](https://travis-ci.org/bicarbon8/SemaphoreJs.svg)
===========

in the world of async javascript callbacks this library provides a mechanism to ensure resources are not being updated by other async processes (useful for multipart resource activities)

[JSDoc Documentation](http://rawgit.com/bicarbon8/SemaphoreJs/master/dist/doc/SemaphoreJs.html)

[Minified File](http://rawgit.com/bicarbon8/SemaphoreJs/master/dist/semaphore.min.js)

## Usage:

```
MutexJs.lock(uniqueName, successCallback[[, maxWaitTime], timeoutCallback]);
```
or
```
MutexJs.lockFor(uniqueName, successCallback, duration);
```

## Tests:
[index.html](http://rawgit.com/bicarbon8/SemaphoreJs/master/tests/index.html)
