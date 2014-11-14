var SemaphoreJs = {
    RETRY_MS: 10,
    MUTEX: {
        _lock: function (name, expiresAt) {
            'use strict';
            this.name = name;
            this.expiresAt = expiresAt;
        },
        _locks: [],
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
                SemaphoreJs.MUTEX._locks.push(new SemaphoreJs.MUTEX._lock(name, expiresAt));
                return true;
            } else {
                return false;
            }
        },
        _get: function (name) {
            'use strict';
            for (var key in SemaphoreJs.MUTEX._locks) {
                if (SemaphoreJs.MUTEX._locks[key].name === name) {
                    return SemaphoreJs.MUTEX._locks[key];
                }
            }
            return undefined; // not found
        },
        release: function (name) {
            'use strict';
            SemaphoreJs.MUTEX._locks = SemaphoreJs.MUTEX._locks.filter(function (el) {
                return el.name !== name;
            });
            return true;
        }
    },
    /**
     * Create a lock using the passed in name or wait until the lock
     * can be obtained if it is currently in use
     */
    lock: function (name, success, failure, maxWaitMs) {
        'use strict';
        var expiry = -1; // wait forever
		if (maxWaitMs && typeof maxWaitMs === "number") {
			expiry = new Date().getTime() + maxWaitMs;
		}
        SemaphoreJs._get(name, success, failure, expiry, undefined);
    },
    lockFor: function (name, success, duration) {
        'use strict';
        SemaphoreJs._get(name, success, function () {}, -1, duration);
    },
    _get: function (name, success, failure, maxMsTime, lockDuration) {
        'use strict';
        if (SemaphoreJs.MUTEX.get(name, lockDuration)) {
            success();
        } else {
            if (maxMsTime === -1 || (new Date().getTime() + SemaphoreJs.RETRY_MS) < maxMsTime) {
                setTimeout(function () {
                    SemaphoreJs._get(name, success, failure, maxMsTime, lockDuration);
                }, SemaphoreJs.RETRY_MS);
            } else {
                failure("unable to acquire lock for: " + name);
            }
        }
    },
    release: function (name) {
        'use strict';
        if (!SemaphoreJs.MUTEX.release(name)) {
            throw "could not release lock for: " + name;
        }
    }
};