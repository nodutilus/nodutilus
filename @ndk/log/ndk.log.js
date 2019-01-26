/** @module @ndk/log */
'use strict';
const { join, resolve } = require('path');
const { existsSync, mkdirSync, openSync, closeSync, appendFileSync } = require('fs');
const { inspect } = require('util');
const { bindProperty } = require('@ndk/cfg');
const { appHome } = require('@ndk/env/legacy');
const { TimeLine, toDateString, toTimeStampString } = require('@ndk/fn/datetime');
const ndk_console = require('@ndk/console');

exports.logMessage = logMessage;
exports.logError = logError;
exports.logWarning = logWarning;
exports.prepareLogEvent = prepareLogEvent;
exports.logEvent = logEvent;
exports.logRequest = logRequest;

exports.beginLogEvent = ndk_console.bindBeginLog(logEvent, 'beginLogEvent');
exports.beginLogRequest = ndk_console.bindBeginLog(logRequest, 'beginLogRequest');

bindProperty(exports, '@ndk/log', 'dir');
bindProperty(exports, '@ndk/log', 'prefix');

const prefixMessage = () => `${toTimeStampString()} [pid ${process.pid}]`;
const inspectOptions = { showHidden: true, depth: null };
const inspectMessage = msg => typeof msg === 'string' ? msg : inspect(msg, inspectOptions);

let curentLogDate = '';
let curentLogDir = '';
let allLogFile = 0;
let errorLogFile = 0;
let eventLogFile = 0;

function closeFiles() {
  if (allLogFile) {
    closeSync(allLogFile);
    allLogFile = 0;
  }
  if (errorLogFile) {
    closeSync(errorLogFile);
    errorLogFile = 0;
  }
  if (eventLogFile) {
    closeSync(eventLogFile);
    eventLogFile = 0;
  }
}

function prepareAllLogFile() {
  prepareDirectory();
  if (!allLogFile) {
    let pref = (exports.prefix || '') + curentLogDate;
    allLogFile = openSync(`${curentLogDir}/${pref}_all.log`, 'a');
  }
}

function prepareErrorLogFile() {
  prepareDirectory();
  if (!errorLogFile) {
    let pref = (exports.prefix || '') + curentLogDate;
    errorLogFile = openSync(`${curentLogDir}/${pref}_error.log`, 'a');
  }
}

function prepareEventLogFile() {
  prepareDirectory();
  if (!eventLogFile) {
    let pref = (exports.prefix || '') + curentLogDate;
    eventLogFile = openSync(`${curentLogDir}/${pref}_event.log`, 'a');
  }
}

function prepareDirectory() {
  let date = toDateString(null, '_');
  let dir = resolve(appHome || process.cwd(), exports.dir || 'logs');
  let logDir = join(dir, date);
  let needOpen = false;
  if (!existsSync(dir)) {
    mkdirSync(dir);
    needOpen = true;
  }
  if (!existsSync(logDir)) {
    mkdirSync(logDir);
    needOpen = true;
  }
  if (!curentLogDir || curentLogDir !== logDir) {
    curentLogDate = date;
    curentLogDir = logDir;
    needOpen = true;
  }
  if (needOpen) {
    closeFiles(date);
  }
}

let writeInProcess = false;
let writeQueue = [];

function asyncWriteMessage() {
  let message = writeQueue.join('\n') + '\n';
  writeQueue = [];
  writeInProcess = false;
  prepareAllLogFile();
  appendFileSync(allLogFile, message);
}

function writeMessage(message) {
  writeQueue.push(message);
  if (!writeInProcess) {
    writeInProcess = true;
    setImmediate(asyncWriteMessage);
  }
}

function logMessage(...messages) {
  ndk_console.logMessage(...messages);
  let message = messages.map(inspectMessage);
  message = `${prefixMessage()} [INFO] ${message.join(' ')}`;
  writeMessage(message);
}

function logError(error) {
  if (!error || typeof error !== 'object') {
    error = { message: error };
  }
  ndk_console.logError(error);
  let logMsg = [prefixMessage(), '[ERROR]'];
  if (error.name && error.name !== 'Error') {
    logMsg.push(`[${error.name}]`);
  }
  logMsg.push(inspectMessage(error.message));
  logMsg = logMsg.join(' ');
  if (error.stack) {
    let stack = error.stack.split('\n');
    stack.shift();
    logMsg += '\n' + stack.join('\n');
  }
  writeMessage(logMsg);
  prepareErrorLogFile();
  appendFileSync(errorLogFile, logMsg + '\n');
}

function logWarning(warning) {
  if (!warning || typeof warning !== 'object') {
    warning = { message: warning };
  }
  ndk_console.logWarning(warning);
  let logMsg = [prefixMessage(), '[WARNING]'];
  if (warning.name) {
    logMsg.push(`[${warning.name}]`);
  }
  logMsg.push(inspectMessage(warning.message));
  logMsg = logMsg.join(' ');
  writeMessage(logMsg);
  prepareErrorLogFile();
  appendFileSync(errorLogFile, logMsg + '\n');
}

let writeEventInProcess = false;
let writeEventQueue = [];

function asyncWriteEvent() {
  let event = writeEventQueue.join('\n') + '\n';
  writeEventQueue = [];
  writeEventInProcess = false;
  prepareEventLogFile();
  appendFileSync(eventLogFile, event);
}

function writeEvent(event) {
  writeEventQueue.push(event);
  if (!writeEventInProcess) {
    writeEventInProcess = true;
    setImmediate(asyncWriteEvent);
  }
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

logEvent.merge = ndk_console.logEvent.merge;

function logEvent(event, ...args) {
  event = logEvent.merge(event, ...args);
  ndk_console.logEvent(event);
  let logMsg = [prefixMessage(), '[EVENT]'];
  addTimeMessage(event, logMsg);
  let fullName = '';
  if (event.emitter) {
    fullName += event.emitter + '#';
  }
  fullName += event.name;
  logMsg.push(`[${fullName}]`);
  if (event.params) {
    logMsg.push(`[${event.params.join(', ')}]`);
  }
  if (event.result) {
    logMsg.push(`: [${event.result}]`);
  }
  if (event.message) {
    logMsg.push(`: ${inspectMessage(event.message)}`);
  }
  logMsg = logMsg.join(' ');
  logMsg = addTimePointsMessage(event, logMsg);
  writeMessage(logMsg);
  writeEvent(logMsg);
}

logRequest.merge = ndk_console.logRequest.merge;

function logRequest(request, ...args) {
  request = logRequest.merge(request, ...args);
  ndk_console.logRequest(request);
  let logMsg = [`${prefixMessage()} [REQUEST] [${request.method}] [${request.statusCode}]`];
  addTimeMessage(request, logMsg);
  logMsg.push(request.url);
  logMsg = logMsg.join(' ');
  logMsg = addTimePointsMessage(request, logMsg);
  writeMessage(logMsg);
  writeEvent(logMsg);
}

function addTimeMessage(originMessage, resultMessage) {
  if (originMessage.timeline instanceof TimeLine) {
    resultMessage.push(`[${originMessage.timeline}]`);
  } else if (originMessage.time) {
    resultMessage.push(`[${originMessage.time} ms]`);
  }
}

function addTimePointsMessage(originMessage, resultMessage) {
  if (originMessage.timeline instanceof TimeLine) {
    originMessage.timeline.points
      .forEach(item => resultMessage += '\n    ' + item);
  }
  return resultMessage;
}
