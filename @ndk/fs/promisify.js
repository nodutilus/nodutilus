/** @module @ndk/fs/promisify */
'use strict';
const { promisify } = require('util');
const node_fs = require('fs');
const ndk_fs_promisify = module.exports;

/**
 * См. {@link https://nodejs.org/api/fs.html#fs_fs_mkdir_path_mode_callback fs.mkdir}
 * @function mkdir
 * @param {string|Buffer|URL} path
 * @param {integer} [mode=]
 * @returns {Promise<undefined>}
 */
ndk_fs_promisify.mkdir = promisify(node_fs.mkdir);

/**
 * См. {@link https://nodejs.org/api/fs.html#fs_fs_readdir_path_options_callback fs.readdir}
 * @function readdir
 * @param {string|Buffer|URL} path
 * @param {string|Object} [options=]
 * @returns {Promise<Array<string>>}
 */
ndk_fs_promisify.readdir = promisify(node_fs.readdir);

/**
 * См. {@link https://nodejs.org/api/fs.html#fs_fs_readfile_path_options_callback fs.readFile}
 * @function readFile
 * @param {string|Buffer|URL|integer} path
 * @param {Object|string} [options=]
 * @returns {Promise<string>}
 */
ndk_fs_promisify.readFile = promisify(node_fs.readFile);

/**
 * См. {@link https://nodejs.org/api/fs.html#fs_fs_rmdir_path_callback fs.rmdir}
 * @function rmdir
 * @param {string|Buffer|URL} path
 * @returns {Promise<undefined>}
 */
ndk_fs_promisify.rmdir = promisify(node_fs.rmdir);

/**
 * См. {@link https://nodejs.org/api/fs.html#fs_fs_stat_path_callback fs.stat}
 * @function stat
 * @param {string|Buffer|URL} path
 * @returns {Promise<fs.Stats>} {@link https://nodejs.org/api/fs.html#fs_class_fs_stats Class: fs.Stats}
 */
ndk_fs_promisify.stat = promisify(node_fs.stat);

/**
 * См. {@link https://nodejs.org/api/fs.html#fs_fs_symlink_target_path_type_callback fs.symlink}
 * @function symlink
 * @param {string|Buffer|URL} target
 * @param {string|Buffer|URL} path
 * @param {string} [type='file'] only available on Windows
 * @returns {Promise<undefined>}
 */
ndk_fs_promisify.symlink = promisify(node_fs.symlink);

/**
 * См. {@link https://nodejs.org/api/fs.html#fs_fs_unlink_path_callback fs.unlink}
 * @function unlink
 * @param {string|Buffer|URL} path
 * @returns {Promise<undefined>}
 */
ndk_fs_promisify.unlink = promisify(node_fs.unlink);

/**
 * См. {@link https://nodejs.org/api/fs.html#fs_fs_writefile_file_data_options_callback fs.writeFile}
 * @function writeFile
 * @param {string|Buffer|integer} file
 * @param  {string|Buffer|Uint8Array} data
 * @param {Object|string} [options=]
 * @returns {Promise<undefined>}
 */
ndk_fs_promisify.writeFile = promisify(node_fs.writeFile);
