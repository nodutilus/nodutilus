'use strict';

process.env['@ndk/log:dir'] = __dirname + '/logs';
process.env['@ndk/log:prefix'] = 'test_';

const ndk_log = require('@ndk/log');
const { TimeLine } = require('@ndk/fn/datetime');

const timeBegin = new Date();

ndk_log.logMessage('simple log message');
ndk_log.logMessage(1, 2, 3, 'multi', 'message');
ndk_log.logMessage(function function_message() {});
ndk_log.logMessage({ object: 'log message' });
ndk_log.logMessage(null, { test: 'obj' });
ndk_log.logMessage({
  test1: 'test1',
  test2: 'test2',
  test3: 'test3',
  test4: 'test4',
  test5: 'test5',
  test6: 'test6'
});

ndk_log.logError('simple error message');
ndk_log.logError(0);
ndk_log.logError(123);
ndk_log.logError(null);
ndk_log.logError({ message: 'error message' });
ndk_log.logError({ name: 'TypeError', message: 'error message' });
ndk_log.logError({ name: 'TypeError', message: { obj: 'error message' } });
ndk_log.logError(new Error('error instance message'));

ndk_log.logWarning('simple warning message');
ndk_log.logWarning(undefined);
ndk_log.logWarning(null);
ndk_log.logWarning(123);
ndk_log.logWarning({ message: 'warning message' });
ndk_log.logWarning({ name: 'TypeWarning', message: 'warning message' });
ndk_log.logWarning({ name: 'TypeWarning', message: { obj: 'warning message' } });

ndk_log.logEvent({ name: 'EventName', message: 'event message' });
ndk_log.logEvent({ name: 'EventName', message: { object: 'event message' } });
ndk_log.logEvent({ name: 'EventName', result: 'event-result' });
ndk_log.logEvent({ name: 'EventName', result: 'event-result', message: 'event message' });
ndk_log.logEvent({ name: 'EventName', params: ['param1', 'param2'] });
ndk_log.logEvent({ name: 'EventName', params: ['param1', 'param2'], message: 'event message' });
ndk_log.logEvent({ name: 'EventName', params: ['param1', 'param2'], result: 'event-result' });
ndk_log.logEvent({ name: 'EventName', params: ['param1', 'param2'], result: 'event-result', message: 'event message' });

ndk_log.logEvent({ emitter: 'EventEmitter', name: 'EventName', message: 'event message' });
ndk_log.logEvent({ emitter: 'EventEmitter', name: 'EventName', message: { object: 'event message' } });
ndk_log.logEvent({ emitter: 'EventEmitter', name: 'EventName', result: 'event-result' });
ndk_log.logEvent({ emitter: 'EventEmitter', name: 'EventName', result: 'event-result', message: 'event message' });
ndk_log.logEvent({ emitter: 'EventEmitter', name: 'EventName', params: ['param1', 'param2'] });
ndk_log.logEvent({ emitter: 'EventEmitter', name: 'EventName', params: ['param1', 'param2'], message: 'event message' });
ndk_log.logEvent({ emitter: 'EventEmitter', name: 'EventName', params: ['param1', 'param2'], result: 'event-result' });
ndk_log.logEvent({ emitter: 'EventEmitter', name: 'EventName', params: ['param1', 'param2'], result: 'event-result', message: 'event message' });


let le = ndk_log.beginLogEvent({ name: 'beginLogEvent', params: [1, 2, 3] });
le.time('time point 1');
le.timeEnd('time point 1');
le.time('time point 2');
le.timeEnd('time point 2');
le.time('time point 3');
le.timeEnd('time point 3');
le.time('time point 4');
le.timeEnd('time point 4');
le.time('time point 5');
le.timeEnd('time point 5');
le.time('time point 6');
le.timeEnd('time point 6');
le.time('time point 7');
le.timeEnd('time point 7');
le('message');

le = ndk_log.beginLogEvent('beginLogEvent');
le('result', 'message');

le = ndk_log.beginLogEvent('beginLogEvent');
le('param1', 'param2', 'result', 'message');

le = ndk_log.beginLogEvent('beginLogEvent', 'param3', 'param4');
le('result', 'message');

ndk_log.logEvent('mynameSTRING', 'param1', 'param2', 'result', 'message');

le = ndk_log.prepareLogEvent({ emitter: 'prepareEventEmitter', name: 'prepareEventName' });
le('prepareEvent msg');
le({ message: 'prepareEvent msg', params: [1, 2, 3] });
le({ message: 'prepareEvent msg', params: [1, 2, 3], result: 'result' });

ndk_log.logRequest({
  method: 'GET',
  statusCode: 200,
  time: new Date() - timeBegin,
  url: '/homepage?id=1'
});
ndk_log.logRequest({
  method: 'GET',
  statusCode: 200,
  time: new Date() - new Date('2018-02-25T18:41:53.892Z'),
  url: '/homepage?id=1'
});
ndk_log.logRequest({
  method: 'GET',
  statusCode: 202,
  url: '/homepage?id=1'
});
ndk_log.logRequest({
  method: 'GET',
  statusCode: 301,
  time: 41000,
  url: '/homepage?id=1'
});
ndk_log.logRequest({
  method: 'GET',
  statusCode: 304,
  time: 10,
  url: '/homepage?id=1'
});
ndk_log.logRequest({
  method: 'POST',
  statusCode: 402,
  url: '/homepage?id=1'
});
ndk_log.logRequest({
  method: 'DELETE',
  statusCode: 503,
  time: 10,
  url: '/homepage?id=1'
});

ndk_log.logRequest('/string_only');
ndk_log.logRequest('/string_only', 404);
ndk_log.logRequest('/string_only', 'DELETE', 200);

let lr = ndk_log.beginLogRequest('/beginLogRequest', 'UPDATE');
lr.time('build tmpl');
lr.timeEnd('build tmpl');
lr(201);

lr = ndk_log.beginLogRequest({ method: 'PUT', url: '/beginLogRequest' });
lr(202);

lr = ndk_log.beginLogRequest('/beginLogRequest');
lr(203);

let tm = new TimeLine();

tm.time('t1');
tm.timeEnd('t1');

tm.time('t2');
tm.timeEnd('t2');

tm.time('t3');
tm.timeEnd('t3');

setImmediate(() => {
  for (let i = 0; i < 10; i++) {
    tm.time('point ' + i);
  }

  setImmediate(() => {
    for (let i = 0; i < 10; i++) {
      tm.timeEnd('point ' + i);
    }
  });

  setImmediate(() => {

    ndk_log.logRequest({
      method: 'GET',
      statusCode: 503,
      timeline: tm,
      url: '/timeline'
    });

  });

});
