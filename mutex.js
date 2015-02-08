/** @class */
var MutexJs = {
    RETRY_MS: 10,
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
            MutexJs.Semaphore._beginPruning();
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
            MutexJs.Semaphore._locks.forEach(function (lock) {
                if ((lock.expiresAt) && (lock.expiresAt < new Date().getTime())){
                    MutexJs.Semaphore.release(lock.id);
                    if (lock.expirationCallback) {
                        lock.expirationCallback.call(this, lock);
                    }
                }
            });
            setTimeout(function () {
                MutexJs.Semaphore._pruneExpired();
            },10);
        },
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
        MutexJs._get(name, success, timeoutCallback, expiry, undefined, undefined);
    },

    /**
     * Create a lock using the passed in name or wait until the lock
     * can be obtained if it is currently in use. Once obtained, the lock
     * will be held for maximum <i><b>duration</b></i> milliseconds or until
     * released.
     *
     * @param {string} name - unique name of lock to acquire
     * @param {function} success - function to call when lock acquired
     * @param {number} duration - number of milliseconds to hold the lock
     */
    lockFor: function (name, success, duration, onExpiration) {
        'use strict';
        MutexJs._get(name, success, function () {}, -1, duration, onExpiration);
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

    /** @ignore */
    _get: function (name, success, failure, maxMsTime, lockDuration, expirationCallback) {
        'use strict';
        var id = MutexJs.Semaphore.get(name, lockDuration, expirationCallback);
        if (id) {
            success(id);
        } else {
            if (maxMsTime === -1 || (new Date().getTime() + MutexJs.RETRY_MS) < maxMsTime) {
                setTimeout(function () {
                    MutexJs._get(name, success, failure, maxMsTime, lockDuration);
                }, MutexJs.RETRY_MS);
            } else {
                var msg = "unable to acquire lock for: " + name;
                if (failure) {
                    failure(msg);
                } else {
                    throw msg;
                }
            }
        }
    }
};

var module = module || {};
module.exports = MutexJs;
