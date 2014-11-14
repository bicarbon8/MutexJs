var QUnit = QUnit || {};
var SemaphoreJs = SemaphoreJs || {};
var lockName = undefined;

QUnit.config.testTimeout = 10000;

QUnit.module("SemaphoreJs", {
    setup: function () {
        lockName = Math.random().toString();
    },
    teardown: function () {
        lockName = undefined;
    }
})
QUnit.asyncTest("can lock with name and block", function (assert) {
    'use strict';
    expect(1);
    var start = new Date().getTime();
    function pass(id) {
        var now = new Date().getTime();
        if (((now - start) >= 1000) && ((now - start) < 2000)) {
            assert.ok(true);
            SemaphoreJs.release(id);
        }
        QUnit.start();
    }
    
    // get lock
    SemaphoreJs.lock(lockName, function (id) {
        setTimeout(function () {
            SemaphoreJs.release(id);
        }, 1000);
    }); // no timeout
    
    // get second lock
    SemaphoreJs.lock(lockName, pass); // no timeout
});

QUnit.asyncTest("multiple locks can be added and removed", function (assert) {
    'use strict';
    expect(20);
    var completed = 0;
    for (var i=0; i<10; i++) {
        SemaphoreJs.lock(lockName + i, function (id) {
            setTimeout(function () {
                assert.ok(SemaphoreJs.MUTEX._locks.length === i, "expected that " + i + " locks exist after adding: test" + i);
                SemaphoreJs.release(id);
                i--;
                assert.ok(SemaphoreJs.MUTEX._locks.length === i, "expected that " + i + "locks remained after removing: test" + i);
                completed++;
            }, 1000);
        }); // no timeout
    }

    function confirm() {
        if (completed !== 10) {
            setTimeout(confirm, 50);
        } else {
            QUnit.start();
        }
    }

    confirm();
});

QUnit.asyncTest("can timeout waiting for lock", function (assert) {
    'use strict';
    expect(1);
    // get lock
    SemaphoreJs.lock(lockName, function (id) {
        setTimeout(function () {
            SemaphoreJs.release(id);
        }, 10000); // hold lock for 10 seconds
    }); // no timeout
    
    // get lock with timout
    SemaphoreJs.lock(
        lockName, 
        function (id) {
            assert.ok(false, "should not have acquired lock, but did");
        }, 
        1500, // timout after waiting 1.5 seconds
        function (err) {
            assert.ok(true);
            QUnit.start();
        }); 
});

QUnit.asyncTest("can lock for a specified duration", function (assert) {
    'use strict';
    expect(2);
    var start = new Date().getTime();
    function pass(id) {
        var now = new Date().getTime();
        if (((now - start) >= 1000) && ((now - start) < 2000)) {
            assert.ok(true);
            SemaphoreJs.release(id);
        }
        QUnit.start();
    }
    
    // get lock
    SemaphoreJs.lockFor(lockName, function (id) {
        assert.ok(true);
    }, 1000); // hold lock for maximum of 1 second
    
    // get second lock
    SemaphoreJs.lock(lockName, pass); // no timeout
});

QUnit.asyncTest("can lock for a specified duration after waiting", function (assert) {
    'use strict';
    expect(2);
    var start = new Date().getTime();
    function pass(id) {
        var now = new Date().getTime();
        if (((now - start) >= 2000) && ((now - start) < 3000)) {
            assert.ok(true);
            SemaphoreJs.release(id);
        }
        QUnit.start();
    }
    
    // get lock
    SemaphoreJs.lock(lockName, function (id) {
        setTimeout(function () {
            SemaphoreJs.release(id);
        }, 1000);
    }); // no timeout
    
    // get second lock
    SemaphoreJs.lockFor(lockName, function (id) {
        assert.ok(true);
    }, 1000); // hold lock for maximum of 1 second
    
    // get third lock
    SemaphoreJs.lock(lockName, pass); // no timeout
});