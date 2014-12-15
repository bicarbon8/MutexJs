SemaphoreJs
===========

in the world of async javascript callbacks this library provides a mechanism to ensure resources are not being updated by other async processes (useful for multipart resource activities)

[JSDoc Documentation](http://rawgit.com/bicarbon8/SemaphoreJs/master/out/SemaphoreJs.html)

## Usage:

```
SemaphoreJs.lock(uniqueName, successCallback[[, maxWaitTime], timeoutCallback]);
```
or
```
SemaphoreJs.lockFor(uniqueName, successCallback, duration);
```
