/** @module @ndk/env */
'use strict';

const clArgDashRE = /^--?/;
const clArgNameRE = /^(\w+)=(.*)$/;


class CLArguments {

  static parse(string = '') {
    const args = typeof string === 'string' ? string.split(' ') : string.slice();
    const namedArgs = {};
    const ordinalArgs = [];
    while (args.length > 0) {
      const arg = args.shift();
      if (clArgDashRE.test(arg)) {
        const argName = arg.replace(clArgDashRE, '');
        if (clArgNameRE.test(argName)) {
          const [, exName, exValue] = clArgNameRE.exec(argName);
          namedArgs[exName] = exValue;
        } else {
          const nextArg = args[0];
          if (clArgDashRE.test(nextArg)) {
            namedArgs[argName] = true;
          } else {
            args.shift();
            namedArgs[argName] = nextArg;
          }
        }
      } else {
        if (arg) {
          ordinalArgs.push(arg);
        }
      }
    }
    return { namedArgs, ordinalArgs };
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
