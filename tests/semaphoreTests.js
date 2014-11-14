var QUnit = QUnit || {};
var SemaphoreJs = SemaphoreJs || {};

QUnit.config.testTimeout = 10000;

QUnit.asyncTest("can lock with name and block", function (assert) {
    'use strict';
    expect(1);
    var start = new Date().getTime();
    function pass() {
        var now = new Date().getTime();
        if (((now - start) >= 1000) && ((now - start) < 2000)) {
            assert.ok(true);
        }
        QUnit.start();
    }
    
    // get lock
    SemaphoreJs.lock('test', function () {
        setTimeout(function () {
            SemaphoreJs.release('test');
        }, 1000);
    }); // no timeout
    
    // get second lock
    SemaphoreJs.lock('test', pass); // no timeout
});

QUnit.asyncTest("multiple locks can be added and removed", function (assert) {
    'use strict';
    expect(20);
    var completed = 0;
    for (var i=0; i<10; i++) {
        SemaphoreJs.lock("test" + i, function () {
            setTimeout(function () {
                i--;
                assert.ok(SemaphoreJs.MUTEX._get("test" + i), "expected that 1 locks were created for: test" + i);
                SemaphoreJs.release("test" + i);
                assert.ok(SemaphoreJs.MUTEX._get("test" + i) == undefined, "expected that 0 locks remained for: test" + i);
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
    SemaphoreJs.lock('test', function () {
        setTimeout(function () {
            SemaphoreJs.release('test');
        }, 10000); // hold lock for 10 seconds
    }); // no timeout
    
    // get lock with timout
    SemaphoreJs.lock('test', function () {
        assert.ok(false, "should not have acquired lock, but did");
    }, function (err) {
        assert.ok(true);
        QUnit.start();
    }, 1500); // timout after waiting 1.5 seconds
});

QUnit.asyncTest("can lock for a specified duration", function (assert) {
    'use strict';
    expect(2);
    var start = new Date().getTime();
    function pass() {
        var now = new Date().getTime();
        if (((now - start) >= 1000) && ((now - start) < 2000)) {
            assert.ok(true);
        }
        QUnit.start();
    }
    
    // get lock
    SemaphoreJs.lockFor('foo', function () {
        assert.ok(true);
    }, 1000); // hold lock for maximum of 1 second
    
    // get second lock
    SemaphoreJs.lock('foo', pass); // no timeout
});

QUnit.asyncTest("can lock for a specified duration after waiting", function (assert) {
    'use strict';
    expect(2);
    var start = new Date().getTime();
    function pass() {
        var now = new Date().getTime();
        if (((now - start) >= 2000) && ((now - start) < 3000)) {
            assert.ok(true);
        }
        QUnit.start();
    }
    
    // get lock
    SemaphoreJs.lock('bar', function () {
        setTimeout(function () {
            SemaphoreJs.release('bar');
        }, 1000);
    }); // no timeout
    
    // get second lock
    SemaphoreJs.lockFor('bar', function () {
        assert.ok(true);
    }, 1000); // hold lock for maximum of 1 second
    
    // get third lock
    SemaphoreJs.lock('bar', pass); // no timeout
});