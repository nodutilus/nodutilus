/** @module @ndk/fn */
'use strict';
const ndk_fn = module.exports;

/**
 * @name date
 * @see module:@ndk/fn/datetime
 */
ndk_fn.datetime = require('./datetime');

/**
 * @name PromiseEventEmitter
 * @see module:@ndk/fn/PromiseEventEmitter
 */
ndk_fn.PromiseEventEmitter = require('./PromiseEventEmitter');

/**
 * @name TaskMaster
 * @see module:@ndk/fn/TaskMaster
 */
ndk_fn.TaskMaster = require('./TaskMaster');
