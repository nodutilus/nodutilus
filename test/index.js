'use strict'

const { preparation } = require('./preparation.js')

preparation().catch(error => {
  console.error(error)
  process.exit(1)
})
