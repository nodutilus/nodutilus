/** @module @ndk/console */
'use strict';
const { inspect } = require('util');
const { TimeLine, toTimeStampString } = require('@ndk/fn/datetime');

exports.logMessage = logMessage;
exports.logError = logError;
exports.logWarning = logWarning;
exports.prepareLogEvent = prepareLogEvent;
exports.logEvent = logEvent;
exports.logRequest = logRequest;

exports.bindBeginLog = (logFN, fnName) => {
  const beginFN = {
    [fnName]: (options, ...args) => {
      const logFN = {
        [beginFN.logFN.name]: (...args) => {
          logFN.timeline.end();
          beginFN.logFN(beginFN.logFN.merge({}, ...logFN.args, ...args));
        }
      }[beginFN.logFN.name];
      args.unshift(beginFN.logFN.merge(options));
      const timeline = logFN.timeline = new TimeLine();
      args.push({ timeline });
      logFN.args = args;
      logFN.time = timeline.time.bind(timeline);
      logFN.timeEnd = timeline.timeEnd.bind(timeline);
      return logFN;
    }
  }[fnName];
  beginFN.logFN = logFN;
  return beginFN;
};

exports.beginLogEvent = exports.bindBeginLog(logEvent, 'beginLogEvent');
exports.beginLogRequest = exports.bindBeginLog(logRequest, 'beginLogRequest');

const colorfulBind = (startTag, endTag) => text => `\x1b[${startTag}m${text}\x1b[${endTag}m`;
const style = exports.style = {
  bold: colorfulBind(1, 22),
  italic: colorfulBind(3, 23),
  underline: colorfulBind(4, 24),
  inverse: colorfulBind(7, 27),
  white: colorfulBind(37, 39),
  grey: colorfulBind(90, 39),
  black: colorfulBind(30, 39),
  blue: colorfulBind(34, 39),
  cyan: colorfulBind(36, 39),
  green: colorfulBind(32, 39),
  magenta: colorfulBind(35, 39),
  red: colorfulBind(31, 39),
  yellow: colorfulBind(33, 39)
};

const msgStyle = exports.msgStyle = {
  done: text => style.bold(style.green(text)),
  unimportant: style.grey,
  time: text => text,
  timeError: text => style.inverse(style.red(text)),
  timeWarning: style.yellow,
  errorName: text => style.bold(style.red(text)),
  errorMessage: style.red,
  errorStackName: style.magenta,
  errorStackPath: style.blue,
  errorStackPosition: style.green,
  warningName: text => style.bold(style.yellow(text)),
  warningMessage: style.yellow,
  eventTime: style.yellow,
  eventEmitter: text => style.bold(style.magenta(text)),
  eventName: text => style.bold(style.magenta(text)),
  eventParam: text => style.bold(style.green(text)),
  eventResult: text => style.bold(style.green(text)),
  requestStatus2xx: text => style.bold(style.green(text)),
  requestStatus3xx: text => style.bold(style.yellow(text)),
  requestStatus4xx: text => style.bold(style.red(text)),
  requestStatus5xx: text => style.bold(style.red(text)),
  requestTime: style.yellow,
  requestUrl: text => style.bold(style.blue(text))
};

const inspectOptions = { showHidden: true, depth: null, colors: true };
const inspectMessage = (msg, color = (msg) => msg) =>
  typeof msg === 'string' ? color(msg) : inspect(msg, inspectOptions);

function logMessage(...messages) {
  messages = messages.map(msg => inspectMessage(msg));
  console.log(msgStyle.time(toTimeStampString()), ...messages);
}

function logError(error) {
  const logMsg = [msgStyle.timeError(toTimeStampString())];
  if (!error || typeof error !== 'object') {
    error = { message: error };
  }
  logMsg.push(msgStyle.errorName(error.name || 'Error') + msgStyle.unimportant(':'));
  logMsg.push(inspectMessage(error.message, msgStyle.errorMessage));
  console.log(...logMsg);
  if (error.stack) {
    let stack = error.stack.split('\n');
    while (!/\s+at/.test(stack[0]) && stack.length > 0) {
      stack.shift();
    }
    for (let index = 0; index < stack.length; index++) {
      stack[index] = stack[index]
        .replace(/at (.+) \(/, (_, names) => {
          return `at ${names.split('.').map(msgStyle.errorStackName).join('.')} (`;
        })
        .replace(/\((.+)(:\d+:\d+)/, (_, str1, str2) => {
          return `(${msgStyle.errorStackPath(str1)}${str2}`;
        })
        .replace(/at ([^()]+)(:\d+:\d+)/, (_, str1, str2) => {
          return `at ${msgStyle.errorStackPath(str1)}${str2}`;
        })
        .replace(/:(\d+):(\d+)/, (_, digit1, digit2) => {
          return `:${msgStyle.errorStackPosition(digit1)}:${msgStyle.errorStackPosition(digit2)}`;
        });
    }
    if (stack.length > 0) {
      console.log(stack.join('\n'));
    }
  }
}

function logWarning(warning) {
  const logMsg = [msgStyle.timeWarning(toTimeStampString())];
  if (!warning || typeof warning !== 'object') {
    warning = { message: warning };
  }
  logMsg.push(msgStyle.warningName(warning.name || 'Warning') + msgStyle.unimportant(':'));
  logMsg.push(inspectMessage(warning.message, msgStyle.warningMessage));
  console.log(...logMsg);
}

function prepareLogEvent(preparedEvent) {
  return event => {
    if (typeof event === 'string') {
      event = Object.assign({ message: event }, preparedEvent);
    } else {
      Object.assign(event, preparedEvent);
    }
    logEvent(event);
  };
}

logEvent.merge = (target, source, ...args) => {
  if (typeof target === 'string') {
    target = { name: target };
  }
  let sourceType = typeof source;
  if (sourceType !== 'undefined') {
    if (typeof source !== 'object' || !source) {
      if (args.length === 0) {
        target.message = source;
      } else if (args.length === 1) {
        target.result = source;
      } else {
        (target.params = (target.params || [])).push(source);
      }
    } else {
      Object.assign(target, source);
    }
  }
  if (args.length > 0) {
    logEvent.merge(target, ...args);
  }
  return target;
};

function logEvent(event, ...args) {
  const logMsg = [msgStyle.time(toTimeStampString())];
  event = logEvent.merge(event, ...args);
  addTimeMessage(event, logMsg, msgStyle.eventTime);
  let fullName = '';
  if (event.emitter) {
    fullName += msgStyle.eventEmitter(event.emitter);
    fullName += msgStyle.unimportant('#');
  }
  fullName += msgStyle.eventName(event.name);
  logMsg.push(fullName);
  if (event.params) {
    let params = msgStyle.unimportant('( ');
    params += event.params
      .map(item => msgStyle.eventParam(item))
      .join(msgStyle.unimportant(', '));
    params += msgStyle.unimportant(' )');
    logMsg.push(params);
  }
  if (event.result) {
    logMsg.push(msgStyle.unimportant(':'));
    logMsg.push(msgStyle.eventResult(event.result));
  }
  if (event.message) {
    logMsg.push(msgStyle.unimportant(':'));
    logMsg.push(event.message);
  }
  console.log(...logMsg);
}

logRequest.merge = (target, source, ...args) => {
  if (typeof target === 'string') {
    target = { url: target, method: 'GET', statusCode: 200 };
  }
  let sourceType = typeof source;
  if (sourceType !== 'undefined') {
    if (typeof source !== 'object' || !source) {
      if (args.length === 0) {
        target.statusCode = source;
      } else {
        target.method = source;
      }
    } else {
      Object.assign(target, source);
    }
  }
  if (args.length > 0) {
    logRequest.merge(target, ...args);
  }
  return target;
};

function logRequest(request, ...args) {
  const logMsg = [msgStyle.time(toTimeStampString())];
  request = logEvent.merge(request, ...args);
  const status = String(request.statusCode)[0];
  switch (status) {
    case '2':
      logMsg.push(msgStyle.requestStatus2xx(`${request.method} ${request.statusCode}`));
      break;
    case '3':
      logMsg.push(msgStyle.requestStatus3xx(`${request.method} ${request.statusCode}`));
      break;
    case '4':
      logMsg.push(msgStyle.requestStatus4xx(`${request.method} ${request.statusCode}`));
      break;
    case '5':
      logMsg.push(msgStyle.requestStatus5xx(`${request.method} ${request.statusCode}`));
      break;
    default:
      logMsg.push(`${request.method} ${request.statusCode}`);
  }
  addTimeMessage(request, logMsg, msgStyle.requestTime);
  logMsg.push(msgStyle.requestUrl(request.url));
  console.log(...logMsg);
}

function addTimeMessage(originMessage, resultMessage, style) {
  if (originMessage.timeline instanceof TimeLine) {
    resultMessage.push(style(`${originMessage.timeline}`));
  } else if (originMessage.time) {
    resultMessage.push(style(`${originMessage.time} ms`));
  }
}
