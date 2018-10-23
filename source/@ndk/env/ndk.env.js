/** @module @ndk/env */
'use strict';


class CLArguments {

  /**
   * @name CLArguments.prefixPattern
   * @type {RegExp}
   * @default /^--?/
   */
  static get prefixPattern() {
    return /^--?/;
  }

  /**
   * @name CLArguments.setterPattern
   * @type {RegExp}
   * @default /=/
   */
  static get setterPattern() {
    return /=/;
  }

  /**
   * @typedef CLArguments~parseOptions
   * @prop {RegExp} [prefixPattern=CLArguments.prefixPattern]
   * @prop {RegExp} [setterPattern=CLArguments.setterPattern]
   */
  /**
   * @typedef CLArguments~solvedArgument
   * @prop {string} name
   * @prop {string} value
   * @prop {boolean} offset
   */
  /**
   * @method CLArguments.resolveArgument
   * @param {string} testName
   * @param {string} [testValue]
   * @param {CLArguments~parseOptions} options
   * @returns {CLArguments~solvedArgument}
   */
  static resolveArgument(testName, testValue, {
    prefixPattern = this.prefixPattern,
    setterPattern = this.setterPattern
  } = {}) {
    const result = {};
    if (prefixPattern.test(testName)) {
      const name = testName.replace(prefixPattern, '');
      if (setterPattern.test(name)) {
        const setter = name.replace(setterPattern, ' ').split(' ');
        result.name = setter[0];
        result.value = setter[1];
      } else if (typeof testValue === 'undefined' || prefixPattern.test(testValue)) {
        result.name = name;
      } else {
        result.name = name;
        result.value = testValue;
        result.offset = true;
      }
    } else {
      result.value = testName;
    }
    return result;
  }

  /**
   * @typedef CLArguments~parsedArguments
   * @prop {Object<boolean>} flags
   * @prop {Object<string>} options
   * @prop {Array<string>} args
   */
  /**
   * @method CLArguments.parse
   * @param {string|Array<string>} [input=[]]
   * @param {CLArguments~parseOptions} options
   * @returns {CLArguments~parsedArguments}
   */
  static parse(input = [], options) {
    const inputArgs = typeof input === 'string' ? input.split(' ').filter(Boolean) : input;
    const parsed = { flags: {}, options: {}, args: [] };
    for (let index = 0; index < inputArgs.length; index++) {
      const { name, value, offset } = this.resolveArgument(
        inputArgs[index], inputArgs[index + 1], options
      );
      if (name && value) {
        parsed.options[name] = value;
      } else if (name) {
        parsed.flags[name] = true;
      } else {
        parsed.args.push(value);
      }
      if (offset) {
        index++;
      }
    }
    return parsed;
  }

  /**
   * @method CLArguments.stringify
   * @param {CLArguments~parsedArguments} parsedArguments
   * @returns {string}
   */
  static stringify(parsedArguments) {
    const args = [];
    if ('flags' in parsedArguments) {
      for (const [name] of Object.entries(parsedArguments.flags)) {
        args.push('-' + name);
      }
    }
    if ('options' in parsedArguments) {
      for (const [name, value] of Object.entries(parsedArguments.options)) {
        args.push(`--${name}=${value}`);
      }
    }
    if ('args' in parsedArguments) {
      args.push(...parsedArguments.args);
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
