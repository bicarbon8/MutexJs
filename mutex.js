/** @class */
var MutexJs = {
    RETRY_MS: 10,
    _queues: {},
    _running: false,
    /** @ignore */
    Semaphore: {
        /** @ignore */
        _locks: [],
        _pruning: false,

        /** @ignore */
        _lock: function (id, name, expiresAt, expirationCallback) {
            'use strict';
            this.id = id;
            this.name = name;
            this.expiresAt = expiresAt;
            this.expirationCallback = expirationCallback;
        },

        /** @ignore */
        get: function (name, expiresInMs, expirationCallback) {
            'use strict';
            var expiresAt = null, // never expires (DANGER!)
                unlocked = false,
                lock = MutexJs.Semaphore._get(name);

            if (expiresInMs) {
                expiresAt = new Date().getTime() + expiresInMs;
            }

            if (!lock) {
                unlocked = true; // doesn't exist
            }

            if (unlocked) {
                var id = MutexJs.Semaphore._guid();
                MutexJs.Semaphore._locks.push(
                    new MutexJs.Semaphore._lock(id, name, expiresAt, expirationCallback));
                MutexJs.Semaphore._beginPruning();
                return id;
            }

            return null; // cannot acquire lock
        },

        /** @ignore */
        release: function (id) {
            'use strict';
            MutexJs.Semaphore._locks = MutexJs.Semaphore._locks.filter(function (el) {
                return el.id !== id;
            });
        },

        /** @ignore */
        _get: function (name) {
            'use strict';
            for (var key in MutexJs.Semaphore._locks) {
                if (MutexJs.Semaphore._locks[key].name === name) {
                    return MutexJs.Semaphore._locks[key];
                }
            }
            return null; // not found
        },

        /** @ignore */
        _guid: function () {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                    .toString(16)
                    .substring(1);
            }
            return s4()+s4()+'-'+s4()+'-'+s4()+'-'+s4()+'-'+s4()+s4()+s4();
        },

        _beginPruning: function () {
            if (!MutexJs.Semaphore._pruning) {
                MutexJs.Semaphore._pruning = true;
                MutexJs.Semaphore._pruneExpired();
            }
        },

        /** @ignore */
        _pruneExpired: function () {
            if (MutexJs.Semaphore._pruning) {
                MutexJs.Semaphore._locks.forEach(function (lock) {
                    if ((lock.expiresAt) && (lock.expiresAt < new Date().getTime())){
                        MutexJs.Semaphore.release(lock.id);
                        if (lock.expirationCallback) {
                            lock.expirationCallback.call(this, lock);
                        }
                    }
                });
                if (MutexJs.Semaphore._locks.length > 0) {
                    setTimeout(function () {
                        MutexJs.Semaphore._pruneExpired();
                    },MutexJs.RETRY_MS);
                } else {
                    // become dormant if there is nothing to process
                    MutexJs.Semaphore._pruning = false;
                }
            }
        },

        /** @ignore */
        _reset: function () {
            MutexJs.Semaphore._pruning = false;
            MutexJs.Semaphore._locks = [];
        },
    },

    queable: function(name, callback, timeoutCallback, maxWait, duration, expirationCallback) {
        var q = {
            name: name,
            fn: callback,
            wait: maxWait,
            onTimeout: timeoutCallback,
            duration: duration,
            onExpired: expirationCallback
        };
        return q;
    },

    /**
     * Create a lock using the passed in name or wait until the lock
     * can be obtained or for the <i><b>maxWaitMs</b></i> if it is currently in use.
     * If <i><b>maxWaitMs</b></i> time has passed and the lock is not available then
     * <i><b>timeoutCallback</b></i> will be called. The lock will be held until
     * released.
     *
     * @param {string} name - unique name of lock to acquire
     * @param {function} success - function to call when lock acquired. This
     *   function will be passed the unique id of the lock which must be used
     *   to release the lock.
     * @param {number} [maxWaitMs=-1] - number of milliseconds to wait
     *   for lock to be aquired if not available immediately
     * @param {function} [timeoutCallback] - function to call when
     *   lock could not be acquired within the specified time
     * @throws {string} err - if lock cannot be acquired by <i><b>maxWaitMs</b></i>
     *   and no <i><b>timeoutCallback</b></i> is specified then an exception will be
     *   thrown instead.
     */
    lock: function (name, success, maxWaitMs, timeoutCallback) {
        'use strict';
        var expiry = -1; // wait forever
		if (maxWaitMs && typeof maxWaitMs === "number") {
			expiry = new Date().getTime() + maxWaitMs;
		}
        var item = MutexJs.queable(name, success, timeoutCallback, expiry, undefined, undefined);
        MutexJs._queueItem(item);
    },

    /**
     * Create a lock using the passed in name or wait until the lock
     * can be obtained if it is currently in use. Once obtained, the lock
     * will be held for maximum <i><b>duration</b></i> milliseconds or until
     * released. When the duration period has passed the lock will be released
     * and an optional <i><b>onExpiration</b></i> function will be called if
     * provided
     *
     * @param {string} name - unique name of lock to acquire
     * @param {function} success - function to call when lock acquired
     * @param {number} duration - number of milliseconds to hold the lock
     * @param {function} [onExpiration] - function to call when lock expires
     */
    lockFor: function (name, success, duration, onExpiration) {
        'use strict';
        var item = MutexJs.queable(name, success, function () {}, -1, duration, onExpiration);
        MutexJs._queueItem(item);
    },

    /**
     * Release a lock using the <i><b>id</b></i> returned when the lock was acquired
     *
     * @param {guid} id - a unique identifier for the lock returned when the lock
     *   was acquired
     */
    release: function (id) {
        'use strict';
        MutexJs.Semaphore.release(id);
    },

    _queueItem: function (item) {
        // disconnect from synchronous execution
        setTimeout(function () {
            if (!MutexJs._queues[item.name]) {
                MutexJs._queues[item.name] = [];
            }
            MutexJs._queues[item.name].push(item);
            if (!MutexJs._running) {
                MutexJs._running = true;
                MutexJs._run();
            }
        }, 1);
    },

    /**
     * loop through queued items trying to get lock for the next for each name
     * @ignore
     */
    _run: function () {
        'use strict';
        var foundOne = false;
        /* jshint loopfunc: true */
        for (var name in MutexJs._queues) {
            foundOne = true;
            var queue = MutexJs._queues[name];
            if (queue.length > 0) {
                var item = queue[0];
                if (item.wait === -1 || new Date().getTime() < item.wait) {
                    var id = MutexJs.Semaphore.get(item.name, item.duration, item.onExpired);
                    if (id) {
                        queue.shift(); // remove item from named queue
                        item.fn(id); // call the callback
                    }
                } else { // wait timeout
                    queue.shift(); // remove item from named queue
                    var msg = "unable to acquire lock for: " + item.name;
                    if (item.onTimeout) {
                        item.onTimeout(msg);
                    } else {
                        throw msg;
                    }
                }
            } else {
                // prune to keep _queues optimized
                delete MutexJs._queues[name];
            }
        }
        if (MutexJs._running && foundOne) {
            // keep running
            setTimeout(function () {
                MutexJs._run();
            }, MutexJs.RETRY_MS);
        } else {
            // become dormant if there is nothing to process
            MutexJs._running = false;
        }
    },

    /**
     * clears all stored locks and resets pruning to dormant state
     * @ignore
     */
    _reset: function () {
        MutexJs._running = false;
        MutexJs._queues = {};
        MutexJs.Semaphore._reset();
    },

    /**
     * provides a mechanism for restarting when script errors occur that could
     * halt execution
     */
    recover: function () {
        MutexJs._running = true;
        MutexJs._run();
        MutexJs.Semaphore._pruning = true;
        MutexJs.Semaphore._beginPruning();
    }
};

var module = module || {};
module.exports = MutexJs;
