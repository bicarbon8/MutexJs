/** @class */
var SemaphoreJs = {
    RETRY_MS: 10,
    /** @ignore */
    MUTEX: {
        /** @ignore */
        _lock: function (id, name, expiresAt) {
            'use strict';
            this.id = id;
            this.name = name;
            this.expiresAt = expiresAt;
        },
        /** @ignore */
        _locks: [],
        /** @ignore */
        get: function (name, expiresInMs) {
            'use strict';
            var expiresAt = undefined, // never expires (DANGER!)
                unlocked = false,
                lock = SemaphoreJs.MUTEX._get(name);

            if (expiresInMs) {
                expiresAt = new Date().getTime() + expiresInMs;
            }
            
            if (!lock) {
                unlocked = true; // doesn't exist
            } else if ((lock.expiresAt) && (lock.expiresAt < new Date().getTime())){
                unlocked = true; // exists, but is expired
            }
            
            if (unlocked) {
                var id = SemaphoreJs.MUTEX._guid();
                SemaphoreJs.MUTEX._locks.push(new SemaphoreJs.MUTEX._lock(id, name, expiresAt));
                return id;
            }

            return undefined; // cannot acquire lock
        },
        /** @ignore */
        release: function (id) {
            'use strict';
            SemaphoreJs.MUTEX._locks = SemaphoreJs.MUTEX._locks.filter(function (el) {
                return el.id !== id;
            });
        },
        /** @ignore */
        _get: function (name) {
            'use strict';
            for (var key in SemaphoreJs.MUTEX._locks) {
                if (SemaphoreJs.MUTEX._locks[key].name === name) {
                    return SemaphoreJs.MUTEX._locks[key];
                }
            }
            return undefined; // not found
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
        SemaphoreJs._get(name, success, timeoutCallback, expiry, undefined);
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
    lockFor: function (name, success, duration) {
        'use strict';
        SemaphoreJs._get(name, success, function () {}, -1, duration);
    },
    /**
     * Release a lock using the <i><b>id</b></i> returned when the lock was acquired
     *
     * @param {guid} id - a unique identifier for the lock returned when the lock
     *   was acquired
     */
    release: function (id) {
        'use strict';
        SemaphoreJs.MUTEX.release(id);
    },
    /** @ignore */
    _get: function (name, success, failure, maxMsTime, lockDuration) {
        'use strict';
        var id = SemaphoreJs.MUTEX.get(name, lockDuration);
        if (id) {
            success(id);
        } else {
            if (maxMsTime === -1 || (new Date().getTime() + SemaphoreJs.RETRY_MS) < maxMsTime) {
                setTimeout(function () {
                    SemaphoreJs._get(name, success, failure, maxMsTime, lockDuration);
                }, SemaphoreJs.RETRY_MS);
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