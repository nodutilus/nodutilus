'use strict';
const { logMessage, logEvent, logError, logWarning } = require('@ndk/console');

logMessage('simple log message');
logMessage(1, 2, 3, 'multi', 'message');
logMessage(function function_message() {});
logMessage({ object: 'log message' });

logEvent({ name: 'EventName', message: 'event message' });
logEvent({ name: 'EventName', message: { object: 'event message' } });
logEvent({ name: 'EventName', result: 'event-result' });
logEvent({ name: 'EventName', result: 'event-result', message: 'event message' });
logEvent({ name: 'EventName', params: ['param1', 'param2'] });
logEvent({ name: 'EventName', params: ['param1', 'param2'], message: 'event message' });
logEvent({ name: 'EventName', params: ['param1', 'param2'], result: 'event-result' });
logEvent({ name: 'EventName', params: ['param1', 'param2'], result: 'event-result', message: 'event message' });

logEvent({ emitter: 'EventEmitter', name: 'EventName', message: 'event message' });
logEvent({ emitter: 'EventEmitter', name: 'EventName', message: { object: 'event message' } });
logEvent({ emitter: 'EventEmitter', name: 'EventName', result: 'event-result' });
logEvent({ emitter: 'EventEmitter', name: 'EventName', result: 'event-result', message: 'event message' });
logEvent({ emitter: 'EventEmitter', name: 'EventName', params: ['param1', 'param2'] });
logEvent({ emitter: 'EventEmitter', name: 'EventName', params: ['param1', 'param2'], message: 'event message' });
logEvent({ emitter: 'EventEmitter', name: 'EventName', params: ['param1', 'param2'], result: 'event-result' });
logEvent({ emitter: 'EventEmitter', name: 'EventName', params: ['param1', 'param2'], result: 'event-result', message: 'event message' });

logError('simple error message');
logError(0);
logError(null);
logError({ message: 'error message' });
logError({ name: 'TypeError', message: 'error message' });
logError({ name: 'TypeError', message: { obj: 'error message' } });
logError(new Error('error instance message'));

logWarning('simple warning message');
logWarning(undefined);
logWarning(null);
logWarning({ message: 'warning message' });
logWarning({ name: 'TypeWarning', message: 'warning message' });
logWarning({ name: 'TypeWarning', message: { obj: 'warning message' } });
