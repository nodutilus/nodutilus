'use strict'

const { preparation } = require('./preparation.js')

preparation().then(() => {
  console.log('done!')
})
