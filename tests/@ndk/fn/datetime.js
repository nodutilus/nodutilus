'use strict';
const { Test } = require('@ndk/test');
const { strict: assert } = require('assert');
const datetime = require('@ndk/fn/datetime');

class NDK_FN_DATETIME extends Test {

  get name() {
    return '@ndk/fn/datetime';
  }

  ['test: TimeLinePoint']() {
    let tlp = new datetime.TimeLinePoint();
    assert.ok('label' in tlp);
    assert.ok(tlp.__begin instanceof Array);
    assert.equal(tlp.__begin.length, 2);
    assert.equal(tlp.__end, null);
    assert.notEqual(tlp + '', tlp + '');
    tlp.end();
    assert.ok(tlp.__end instanceof Array);
    assert.equal(tlp.__end.length, 2);
    assert.equal(tlp + '', tlp + '');
  }

  ['test: TimeLinePoint.toString']() {
    let tlp = new datetime.TimeLinePoint();
    tlp.__end = [1, 0];
    assert.equal(tlp + '', '1.000 sec');
    tlp.__end = [1, 1234567];
    assert.equal(tlp + '', '1.001 sec');
    tlp.__end = [1, 12345678];
    assert.equal(tlp + '', '1.012 sec');
    tlp.__end = [1, 123456789];
    assert.equal(tlp + '', '1.123 sec');
    tlp.__end = [1, 923456789];
    assert.equal(tlp + '', '1.923 sec');
    tlp.__end = [1, 120000000];
    assert.equal(tlp + '', '1.120 sec');
    tlp.__end = [1, 100000000];
    assert.equal(tlp + '', '1.100 sec');
    tlp.__end = [0, 100000000];
    assert.equal(tlp + '', '100.000 ms');
    tlp.__end = [0, 101100000];
    assert.equal(tlp + '', '101.100 ms');
    tlp.__end = [0, 101101000];
    assert.equal(tlp + '', '101.101 ms');
    tlp.__end = [0, 101000];
    assert.equal(tlp + '', '0.101 ms');
    tlp.__end = [0, 100000];
    assert.equal(tlp + '', '0.100 ms');
    tlp.__end = [0, 900000];
    assert.equal(tlp + '', '0.900 ms');
    tlp.__end = [0, 1000];
    assert.equal(tlp + '', '0.001 ms');
  }

  ['test: TimeLinePoint.toJSON']() {
    let tlp = new datetime.TimeLinePoint();
    tlp.__end = [1, 0];
    assert.equal(JSON.stringify([tlp]), '["1.000 sec"]');
  }

  ['test: TimeLinePoint + label']() {
    let tlp = new datetime.TimeLinePoint('label');
    assert.equal(tlp.label, 'label');
    tlp.__end = [1, 0];
    assert.equal(tlp + '', 'label: 1.000 sec');
  }

  ['test: TimeLine']() {
    let tl = new datetime.TimeLine();
    assert.ok(tl instanceof datetime.TimeLinePoint);
    assert.ok(tl.points instanceof Map);
    assert.equal(tl.points.size, 0);
    tl.time('test');
    assert.equal(tl.points.size, 1);
    let pt = tl.points.get('test');
    assert.equal(pt.__end, null);
    tl.timeEnd('test');
    assert.ok(pt.__end instanceof Array);
    tl = new datetime.TimeLine();
    tl.time('test');
    pt = tl.points.get('test');
    tl.end();
    assert.ok(pt.__end instanceof Array);
  }

  ['test: toDateString']() {
    assert.equal(datetime.toDateString(), datetime.toDateString(new Date()));
    assert.equal(datetime.toDateString(new Date(2018, 4, 25)), '2018-05-25');
    assert.equal(datetime.toDateString(new Date(2018, 4, 25), '.'), '2018.05.25');
  }

  ['test: toTimeString']() {
    assert.equal(datetime.toTimeString().substr(0, 7), datetime.toTimeString(new Date()).substr(0, 7));
    assert.equal(datetime.toTimeString(new Date(2018, 4, 25)), '00:00:00');
    assert.equal(datetime.toTimeString(new Date(2018, 4, 25, 1, 10, 5, 99)), '01:10:05');
    assert.equal(datetime.toTimeString(new Date(2018, 4, 25, 10, 10, 5, 990)), '10:10:05');
  }

  ['test: toTimeStampString']() {
    assert.equal(datetime.toTimeStampString().substr(0, 7), datetime.toTimeStampString(new Date()).substr(0, 7));
    assert.equal(datetime.toTimeStampString(new Date(2018, 4, 25)), '00:00:00.000');
    assert.equal(datetime.toTimeStampString(new Date(2018, 4, 25, 1, 10, 5, 99)), '01:10:05.099');
    assert.equal(datetime.toTimeStampString(new Date(2018, 4, 25, 10, 10, 5, 990)), '10:10:05.990');
  }

}

module.exports = NDK_FN_DATETIME;
NDK_FN_DATETIME.runIsMainModule();
