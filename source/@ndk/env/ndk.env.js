/** @module @ndk/env */
'use strict';


class CLArguments {

  static get clArgDashRE() {
    return /^--?/;
  }

  static get clArgNameRE() {
    return /^(\w+)=(.*)$/;
  }

  static parse(string = '', {
    clArgDashRE = CLArguments.clArgDashRE,
    clArgNameRE = CLArguments.clArgNameRE
  } = {}) {
    const args = typeof string === 'string' ? string.split(' ') : string;
    const clFlags = {};
    const clOptions = {};
    const clArguments = [];
    for (let index = 0; index < args.length; index++) {
      const arg = args[index];
      if (clArgDashRE.test(arg)) {
        const argName = arg.replace(clArgDashRE, '');
        if (clArgNameRE.test(argName)) {
          const [, exName, exValue] = clArgNameRE.exec(argName);
          clOptions[exName] = exValue;
        } else {
          const nextArg = args[index + 1];
          if (clArgDashRE.test(nextArg)) {
            clFlags[argName] = true;
          } else {
            index++;
            clOptions[argName] = nextArg;
          }
        }
      } else {
        if (arg) {
          clArguments.push(arg);
        }
      }
    }
    return { clFlags, clOptions, clArguments };
  }

  static stringify({ namedArgs = {}, ordinalArgs = [] }) {
    let args = [...ordinalArgs];
    for (const [name, value] of Object.entries(namedArgs)) {
      if (value !== false) {
        args.push('--' + name);
        if (value !== true) {
          args.push(value);
        }
      }
    }
    return args.join(' ');
  }

  constructor(string = '') {
    this.parse(string);
  }

  parse(string) {
    const { namedArgs, ordinalArgs } = CLArguments.parse(string);
    this.namedArgs = namedArgs;
    this.ordinalArgs = ordinalArgs;
  }

  stringify() {
    return CLArguments.stringify({
      namedArgs: this.namedArgs,
      ordinalArgs: this.ordinalArgs
    });
  }

}


exports.CLArguments = CLArguments;
