/** @module @ndk/cli */
'use strict';

const { appArgs, appKwargs } = require('@ndk/env/legacy');
const { logError } = require('@ndk/console');
const {
  INVALID_EXECUTOR_TYPE,
  INVALID_COMMAND_TYPE,
  UNKNOWN_COMMAND,
  NO_REQUIRED_ARGUMENTS,
  INVALID_ARGUMENTS,
  HELP_DESCRIPTION,
  HELP_NAME_DESCRIPTION,
  HELP_S_OPTION,
  HELP_SO_OPTION
} = require('./strings');


class CLICommand {

  /**
   * @class CLICommand
   * @param {string} name
   * @param {function} executor
   * @param {CLICommand~classOptions} options
   */
  /**
   * @typedef {Object} CLICommand~classOptions
   * @property {boolean} service
   * @property {string} description
   * @property {Array<CLICommand~argument>} arguments
   * @property {Array<CLICommand~option>} options
   */

  /**
   * @typedef {Object} CLICommand~argument
   * @property {string} name
   * @property {string} description
   */
  /**
   * @typedef {Object} CLICommand~option
   * @property {string} name
   * @property {string} shortName
   * @property {boolean} flag
   * @property {string} description
   */
  constructor(name, executor, options = {}) {
    if (typeof executor !== 'function') {
      throw new Error(INVALID_EXECUTOR_TYPE);
    }
    this.name = String(name);
    this.length = this.name.split(' ').length;
    this.executor = executor;
    this.service = 'service' in options ? options.service : false;
    this.description = options.description || null;
    this.arguments = options.arguments || null;
    this.requireArgsLength = 0;
    this.argsLength = 0;
    if (this.arguments) {
      this.argsLength = this.arguments.length;
      for (const arg of this.arguments) {
        if (arg.require !== false) this.requireArgsLength++;
      }
    }
    this.options = options.options || null;
  }

  /**
   * @method CLICommand#execute
   * @param {CLICommandList} commandList
   * @param {Array<string>} args
   * @param {Object<string|boolean>} kwargs
   */
  async execute(commandList, args, kwargs) {
    if (this.requireArgsLength > args.length) {
      logError(NO_REQUIRED_ARGUMENTS);
      return false;
    }
    if (this.argsLength < args.length) {
      logError(INVALID_ARGUMENTS);
      return false;
    }
    try {
      await this.executor.call(commandList, ...args.slice(0, this.argsLength), kwargs);
      return true;
    } catch (error) {
      logError(error);
      return false;
    }
  }

}


function __logCommandHelp(command) {
  const commandArgsOpts = [];
  if (command.arguments) {
    for (const commandArg of command.arguments) {
      if (commandArg.require == false) {
        commandArgsOpts.push(`[${commandArg.name}]`);
      } else {
        commandArgsOpts.push(`<${commandArg.name}>`);
      }
    }
  }
  if (command.options) {
    for (const commandOpt of command.options) {
      let opt = '';
      if ('name' in commandOpt) {
        opt += '--' + commandOpt.name;
        if (commandOpt.flag === false) {
          opt += ' VALUE';
        }
      }
      if ('shortName' in commandOpt) {
        if (opt) opt += ' | ';
        opt += '-' + commandOpt.shortName;
        if (commandOpt.flag === false) {
          opt += '=VALUE';
        }
      }
      if (commandOpt.require === true) {
        opt = `<${opt}>`;
      } else {
        opt = `[${opt}]`;
      }
      commandArgsOpts.push(opt);
    }
  }
  console.log('  ', command.name || '<без имени>', ...commandArgsOpts);
  console.log('    ', command.description, '\n');
}


function __logOneCommandHelpExtra(command) {
  if (command.arguments) {
    for (const commandArg of command.arguments) {
      console.log('    ', commandArg.name, '  -  ', commandArg.description);
    }
  }
  if (command.options) {
    for (const commandOpt of command.options) {
      let opt = '';
      if ('name' in commandOpt) {
        opt += '--' + commandOpt.name;
      }
      if ('shortName' in commandOpt) {
        if (opt) opt += ' | ';
        opt += '-' + commandOpt.shortName;
      }
      console.log('    ', opt, '  -  ', commandOpt.description);
    }
  }
  if (command.arguments || command.options) {
    console.log();
  }
}


function __helpCommandFn(...agrs) {
  const kwargs = agrs.pop();
  const commandName = agrs.join(' ');
  console.log();
  if (this.map[agrs.length] && commandName in this.map[agrs.length]) {
    const command = this.map[agrs.length][commandName];
    __logCommandHelp(command);
    __logOneCommandHelpExtra(command);
  } else {
    for (const command of this.list) {
      if ((!command.service || kwargs.s || kwargs.so) && (command.service || !kwargs.so)) {
        __logCommandHelp(command);
      }
    }
  }
}


const __helpCommand = new CLICommand('help', __helpCommandFn, {
  description: HELP_DESCRIPTION,
  arguments: [
    { name: 'commandName', require: false, description: HELP_NAME_DESCRIPTION }
  ],
  options: [
    { shortName: 's', description: HELP_S_OPTION },
    { shortName: 'so', description: HELP_SO_OPTION }
  ]
});


class CLICommandList {

  /**
   * @class CLICommandList
   * @param  {...CLICommand} commands
   */
  constructor(...commands) {
    this.map = { 1: { help: __helpCommand } };
    this.list = [];
    this.maxLength = 1;
    for (let command of commands) {
      if (command instanceof CLICommand) {
        if (!(command.length in this.map)) {
          this.map[command.length] = {};
          this.maxLength = this.maxLength < command.length ? command.length : this.maxLength;
        }
        this.map[command.length][command.name] = command;
        this.list.push(command);
      } else {
        throw new Error(INVALID_COMMAND_TYPE);
      }
    }
    if (this.map[1].help === __helpCommand) {
      this.list.unshift(__helpCommand);
    }
  }

  /**
   * @method CLICommandList#execute
   * @param {Array<string>} args
   * @param {Object<string|boolean>} kwargs
   */
  execute(args, kwargs) {
    let length = this.maxLength;
    while (length > 0) {
      let inputCommand = args.slice(0, length).join(' ');
      if (inputCommand in this.map[length]) {
        return this.map[length][inputCommand].execute(this, args.slice(length), kwargs);
      }
      length--;
    }
    logError(UNKNOWN_COMMAND);
    return false;
  }

}


/**
 * @function runCLICommand
 * @param {CLICommandList|CLICommand} commandList
 * @param  {...CLICommand} commands
 */
function runCLICommand(commandList, ...commands) {
  if (commandList instanceof CLICommandList) {
    if (!commandList.execute(appArgs, appKwargs)) {
      process.exit(1);
    }
  } else {
    if (!new CLICommandList(commandList, ...commands).execute(appArgs, appKwargs)) {
      process.exit(1);
    }
  }
}


exports.CLICommand = CLICommand;
exports.CLICommandList = CLICommandList;
exports.runCLICommand = runCLICommand;
