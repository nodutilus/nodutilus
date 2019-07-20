import { preparation } from './preparation.js'

preparation().then(() => {
  console.log('done!')
}, error => {
  console.log(error)
  process.exit(1)
})
