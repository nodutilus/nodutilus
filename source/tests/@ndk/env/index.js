'use strict';

const { join, resolve } = require('path');
const { execSync } = require('child_process');
const { homedir } = require('os');
const { Test } = require('@ndk/test');
const { equal, deepEqual } = require('assert').strict;
const { envKeys, appRoot, appPackage, appName, appHome } = require('@ndk/env');

const thisAppRoot = resolve(__dirname, './../../../..');
const thisAppPackage = join(thisAppRoot, 'package.json');
const thisAppName = require(thisAppPackage).name;
const thisAppHome = join(homedir(), '.' + thisAppName);
const myAppRoot = resolve(thisAppRoot, './source/tests/resources/@ndk/env/my-app');
const myAppPackage = join(myAppRoot, 'package.json');
const myAppName = 'my-app';
const myAppHome = join(homedir(), '.' + myAppName);


class NDKEnv extends Test {

  get name() {
    return '@ndk/env';
  }

  ['test: AppVariables']() {
    equal(appRoot, thisAppRoot);
    equal(appPackage, thisAppPackage);
    equal(appName, thisAppName);
    equal(appHome, thisAppHome);
    const output = JSON.parse(execSync(`node ${myAppRoot}`).toString());
    equal(output.appRoot, myAppRoot);
    equal(output.appPackage, myAppPackage);
    equal(output.appName, myAppName);
    equal(output.appHome, myAppHome);
    deepEqual(output.appArgs, []);
    deepEqual(output.appKwargs, {});
  }

  ['test: AppArguments']() {
    const myArgs = '--p1 1 1/1 -p2 2 --p3 -p4 --p5 5 5/5 -p6 "6 6/6" --p7=7 -p8="8 8/8"';
    const output = JSON.parse(execSync(`node ${myAppRoot} ${myArgs}`).toString());
    deepEqual(output.appArgs, ['1/1', '5/5']);
    deepEqual(output.appKwargs, {
      p1: '1',
      p2: '2',
      p3: true,
      p4: true,
      p5: '5',
      p6: '6 6/6',
      p7: '7',
      p8: '8 8/8'
    });
  }

  ['test: EnvKeys']() {
    const env = Object.assign(Object.assign({}, process.env), {
      [envKeys.appRoot]: './app',
      [envKeys.appName]: 'appName'
    });
    const outputEnv = JSON.parse(execSync(`node ${myAppRoot}/env`, { env }).toString());
    equal(outputEnv[envKeys.appRoot], './app');
    equal(outputEnv[envKeys.appName], 'appName');
    const output = JSON.parse(execSync(`node ${myAppRoot}`, { env }).toString());
    equal(output.appRoot, './app');
    equal(output.appName, 'appName');
  }

  ['test: EnvKeys (package.json)']() {
    const env = Object.assign(Object.assign({}, process.env), {
      [envKeys.appRoot]: myAppRoot
    });
    const output = JSON.parse(execSync(`node ${myAppRoot}`, { env }).toString());
    equal(output.appPackage, myAppPackage);
  }

}


module.exports = NDKEnv;
NDKEnv.runIsMainModule();
