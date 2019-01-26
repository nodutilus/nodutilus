'use strict';

const { execSync } = require('child_process');


execSync('npm i github:nd-toolkit/ndk-project github:nd-toolkit/source-builder', {
  input: 'inherit',
  stdio: 'inherit',
  encoding: 'utf-8'
});

console.log('Готово.');
