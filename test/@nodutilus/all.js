// Object.assign(exports,
//   require('./@nodutilus/events'),
//   require('./@nodutilus/fs'),
//   require('./@nodutilus/test')
// )


// class AllTests extends Test {

//   [Test.afterEachDeep]({ path = [], name, result: { success, error } }) {
//     const result = success ? 'success' : 'failure'

//     console.log(`${result}: ${path.join(', ')} => ${name}`)
//     if (error) {
//       console.log(error)
//     }
//   }

// }


// Object.assign(AllTests, require('./all-tests'))


// async function runTests() {
//   await preparation()

//   const result = await Test.run(new AllTests())

//   if (!result.success) {
//     console.error('Тесты провалены')
//     process.exit(1)
//   } else {
//     console.log('Тесты завершены успешно')
//   }
// }


// runTests().catch(error => {
//   console.error(error)
//   process.exit(1)
// })

export async function runTests() {
  console.log(1)
}