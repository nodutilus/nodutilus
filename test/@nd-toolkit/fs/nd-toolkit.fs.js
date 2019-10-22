'use strict'

const { Test, assert } = require('@nd-toolkit/test')
const {
  copy,
  readJSON,
  readText,
  remove,
  symlink,
  walk,
  writeJSON,
  constants: {
    COPY_EXCL,
    COPY_RMNONEXISTENT,
    SYMLINK_EXCL,
    SYMLINK_RMNONEXISTENT,
    WALK_FILEFIRST,
    WRITE_EXCL
  }
} = require('@nd-toolkit/fs')
const { normalize, relative } = require('path')
const {
  existsSync,
  promises: { mkdir, rmdir }
} = require('fs')


exports['@nd-toolkit/fs'] = class FsTest extends Test {

  /** Перед запуском очистим временные данные */
  async [Test.before]() {
    await rmdir('test/example/fs/copy', { recursive: true })
    await rmdir('test/example/fs/symlink', { recursive: true })
    await rmdir('test/example/fs/remove', { recursive: true })
    await rmdir('test/example/fs/write', { recursive: true })
  }

  /** Удалим временные данные после тестов */
  async [Test.afterEach]() {
    await rmdir('test/example/fs/copy', { recursive: true })
    await rmdir('test/example/fs/symlink', { recursive: true })
    await rmdir('test/example/fs/remove', { recursive: true })
    await rmdir('test/example/fs/write', { recursive: true })
  }

  /** перебираем сначала папки затем вложенные файлы */
  async ['walk - базовый']() {
    const files = []
    const expected = [
      'f1.txt',
      'p1',
      normalize('p1/p1f1.txt'),
      normalize('p1/p1f2.txt'),
      'p2',
      normalize('p2/p2f1.txt')
    ]

    await walk('test/example/fs/walk', path => {
      files.push(path)
    })

    assert.deepEqual(files, expected)
  }

  /** если сначала перебираются папки, то можно вернуть false,
   * чтобы не проходить по вложениям папки */
  async ['walk - исключение папок']() {
    const files = []
    const expected = [
      'f1.txt',
      'p1',
      'p2',
      normalize('p2/p2f1.txt')
    ]

    await walk('test/example/fs/walk', (path, dirent) => {
      files.push(path)
      if (dirent.isDirectory() && path === 'p1') {
        return false
      }
    })

    assert.deepEqual(files, expected)
  }

  /** перебираем сначала вложенные файлы затем папки
   * + асинхронный walker */
  async ['walk - сначала вложенные файлы']() {
    const files = []
    const expected = [
      'f1.txt', true,
      normalize('p1/p1f1.txt'), true,
      normalize('p1/p1f2.txt'), true,
      'p1', false,
      normalize('p2/p2f1.txt'), true,
      'p2', false
    ]

    await walk('test/example/fs/walk', WALK_FILEFIRST, async (path, dirent) => {
      await new Promise(resolve => setTimeout(resolve, 1))
      files.push(path)
      files.push(dirent.isFile())
    })

    assert.deepEqual(files, expected)
  }

  /** купируем в несуществующую папку */
  async ['copy - базовый']() {
    const filesA = []
    const filesB = []

    await copy('test/example/fs/walk', 'test/example/fs/copy')
    await walk('test/example/fs/walk', path => filesA.push(path))
    await walk('test/example/fs/copy', path => filesB.push(path))

    assert.deepEqual(filesB, filesA)
  }

  /** купируем в существующую папку с заменой файлов */
  async ['copy - с заменой']() {
    const filesA = []
    const filesB = []

    await copy('test/example/fs/walk', 'test/example/fs/copy')
    await copy('test/example/fs/walk', 'test/example/fs/copy')
    await walk('test/example/fs/walk', path => filesA.push(path))
    await walk('test/example/fs/copy', path => filesB.push(path))

    assert.deepEqual(filesB, filesA)
  }

  /** купируем в существующую папку с ошибкой на папке */
  async ['copy - с ошибкой на папке']() {
    await copy('test/example/fs/walk/p2', 'test/example/fs/copy/p2')

    const error = await copy('test/example/fs/walk', 'test/example/fs/copy', COPY_EXCL)
      .catch(error => error)

    assert.equal(error.syscall, 'mkdir')
    assert.equal(error.code, 'EEXIST')
    assert.equal(relative('.', error.path), normalize('test/example/fs/copy'))
  }

  /** купируем в существующую папку с ошибкой на файле */
  async ['copy - с ошибкой на файле']() {
    await copy('test/example/fs/walk/f1.txt', 'test/example/fs/copy/f1.txt')

    const error = await copy('test/example/fs/walk/f1.txt', 'test/example/fs/copy/f1.txt', COPY_EXCL)
      .catch(error => error)

    assert.equal(error.syscall, 'copyfile')
    assert.equal(error.code, 'EEXIST')
    assert.equal(relative('.', error.path), normalize('test/example/fs/walk/f1.txt'))
    assert.equal(relative('.', error.dest), normalize('test/example/fs/copy/f1.txt'))
  }

  /** копируем файл */
  async ['copy - файл']() {
    const files = []

    await mkdir('test/example/fs/copy')
    await copy('test/example/fs/walk/f1.txt', 'test/example/fs/copy/f1.txt')
    await walk('test/example/fs/copy', path => files.push(path))

    assert.deepEqual(files, ['f1.txt'])
  }

  /** копируем файл, если каталог назначения не создан */
  async ['copy - файл (без каталога)']() {
    const files = []

    await copy('test/example/fs/walk/f1.txt', 'test/example/fs/copy/f1.txt')
    await walk('test/example/fs/copy', path => files.push(path))

    assert.deepEqual(files, ['f1.txt'])
  }

  /** при копировании удаляем существующие файлы и папки в целевом каталоге,
   *  которых нет в исходном каталоге */
  async ['copy - удаление несуществующих']() {
    await copy('test/example/fs/walk/p1', 'test/example/fs/copy/p1_new')
    await copy('test/example/fs/walk/f1.txt', 'test/example/fs/copy/f_new.txt')
    await copy('test/example/fs/walk', 'test/example/fs/copy')

    assert(existsSync('test/example/fs/copy/p1_new'))
    assert(existsSync('test/example/fs/copy/f_new.txt'))

    await copy('test/example/fs/walk', 'test/example/fs/copy', COPY_RMNONEXISTENT)

    assert(!existsSync('test/example/fs/copy/p1_new'))
    assert(!existsSync('test/example/fs/copy/f_new.txt'))
  }


  /** создаем ссылки в несуществующую папку */
  async ['symlink - базовый']() {
    const filesA = []
    const filesB = []

    await symlink('test/example/fs/walk', 'test/example/fs/symlink')
    await walk('test/example/fs/walk', path => filesA.push(path))
    await walk('test/example/fs/symlink', path => filesB.push(path))

    assert.deepEqual(filesB, filesA)

    const textA = await readText('test/example/fs/walk/f1.txt')
    const textB = await readText('test/example/fs/symlink/f1.txt')

    assert.equal(textB, textA)
  }

  /** создаем ссылки в существующую папку, ссылки в конечной папке верные */
  async ['symlink - перезапись, с верными ссылками']() {
    const filesA = []
    const filesB = []

    await symlink('test/example/fs/walk', 'test/example/fs/symlink')
    await symlink('test/example/fs/walk', 'test/example/fs/symlink')
    await walk('test/example/fs/walk', path => filesA.push(path))
    await walk('test/example/fs/symlink', path => filesB.push(path))

    assert.deepEqual(filesB, filesA)
  }

  /** создаем ссылки в существующую папку, ссылки в конечной папке ведут на другие файлы */
  async ['symlink - перезапись, кривые ссылки']() {
    await symlink('test/example/fs/walk/p1/p1f1.txt', 'test/example/fs/symlink/f1.txt')

    const text1 = await readText('test/example/fs/symlink/f1.txt')

    await symlink('test/example/fs/walk/f1.txt', 'test/example/fs/symlink/f1.txt')

    const text2 = await readText('test/example/fs/symlink/f1.txt')

    assert.deepEqual(text1, 'p1f1.txt')
    assert.deepEqual(text2, '')
  }

  /** создаем ссылки в существующую папку, если конечная точка не ссылка, заменяем на ссылку */
  async ['symlink - перезапись, файл вместо ссылки']() {
    await copy('test/example/fs/walk/p1/p1f1.txt', 'test/example/fs/symlink/f1.txt')

    const text1 = await readText('test/example/fs/symlink/f1.txt')

    await symlink('test/example/fs/walk/f1.txt', 'test/example/fs/symlink/f1.txt')

    const text2 = await readText('test/example/fs/symlink/f1.txt')

    assert.deepEqual(text1, 'p1f1.txt')
    assert.deepEqual(text2, '')
  }

  /** создаем ссылки в существующую папку с ошибкой на папке */
  async ['symlink - с ошибкой на папке']() {
    await symlink('test/example/fs/walk/p2', 'test/example/fs/symlink/p2')

    const error = await symlink('test/example/fs/walk', 'test/example/fs/symlink', SYMLINK_EXCL)
      .catch(error => error)

    assert.equal(error.syscall, 'mkdir')
    assert.equal(error.code, 'EEXIST')
    assert.equal(relative('.', error.path), normalize('test/example/fs/symlink'))
  }

  /** создаем ссылки в существующую папку с ошибкой на файле */
  async ['symlink - с ошибкой на файле']() {
    await symlink('test/example/fs/walk/f1.txt', 'test/example/fs/symlink/f1.txt')

    const error = await symlink('test/example/fs/walk/f1.txt', 'test/example/fs/symlink/f1.txt', SYMLINK_EXCL)
      .catch(error => error)

    assert.equal(error.syscall, 'symlink')
    assert.equal(error.code, 'EEXIST')
    assert.equal(relative('.', error.path), normalize('test/example/fs/walk/f1.txt'))
    assert.equal(relative('.', error.dest), normalize('test/example/fs/symlink/f1.txt'))
  }

  /** создаем ссылку на файл */
  async ['symlink - файл']() {
    const files = []

    await mkdir('test/example/fs/symlink')
    await symlink('test/example/fs/walk/f1.txt', 'test/example/fs/symlink/f1.txt')
    await walk('test/example/fs/symlink', path => files.push(path))

    assert.deepEqual(files, ['f1.txt'])
  }

  /** создаем ссылку на файл, если каталог назначения не создан */
  async ['symlink - файл (без каталога)']() {
    const files = []

    await symlink('test/example/fs/walk/f1.txt', 'test/example/fs/symlink/f1.txt')
    await walk('test/example/fs/symlink', path => files.push(path))

    assert.deepEqual(files, ['f1.txt'])
  }

  /** при создании ссылок удаляем существующие файлы и папки в целевом каталоге,
   *  которых нет в исходном каталоге */
  async ['symlink - удаление несуществующих']() {
    await symlink('test/example/fs/walk/p1', 'test/example/fs/symlink/p1_new')
    await symlink('test/example/fs/walk/f1.txt', 'test/example/fs/symlink/f_new.txt')
    await symlink('test/example/fs/walk', 'test/example/fs/symlink')

    assert(existsSync('test/example/fs/symlink/p1_new'))
    assert(existsSync('test/example/fs/symlink/f_new.txt'))

    await symlink('test/example/fs/walk', 'test/example/fs/symlink', SYMLINK_RMNONEXISTENT)

    assert(!existsSync('test/example/fs/symlink/p1_new'))
    assert(!existsSync('test/example/fs/symlink/f_new.txt'))
  }

  /** удаление пустой папки */
  async ['remove - пустая папка']() {
    await mkdir('test/example/fs/remove')
    assert(existsSync('test/example/fs/remove'))

    await remove('test/example/fs/remove')
    assert(!existsSync('test/example/fs/remove'))
  }

  /** удаление непустой папки */
  async ['remove - непустая папка']() {
    await copy('test/example/fs/walk/f1.txt', 'test/example/fs/remove/f1.txt')
    assert(existsSync('test/example/fs/remove/f1.txt'))

    await remove('test/example/fs/remove')
    assert(!existsSync('test/example/fs/remove'))
  }

  /** удаление файла */
  async ['remove - файл']() {
    await copy('test/example/fs/walk/f1.txt', 'test/example/fs/remove/f1.txt')
    assert(existsSync('test/example/fs/remove/f1.txt'))

    await remove('test/example/fs/remove/f1.txt')
    assert(existsSync('test/example/fs/remove'))
    assert(!existsSync('test/example/fs/remove/f1.txt'))
  }


  /** чтение существующего файла */
  async ['readJSON - файл существует']() {
    const data = await readJSON('test/example/fs/read/test.json')

    assert.deepEqual(data, { test: true })
  }

  /** чтение несуществующего файла с генерацией ошибки */
  async ['readJSON - файл не существует']() {
    const error = await readJSON('test/example/fs/read/nonexistent')
      .catch(error => error)

    assert.equal(error.code, 'ENOENT')
  }

  /** чтение несуществующего файла с установкой значения по умолчанию */
  async ['readJSON - значение по умолчанию']() {
    const data = await readJSON('test/example/fs/read/nonexistent', { defaultValue: true })

    assert.deepEqual(data, { defaultValue: true })
  }

  /** чтение существующего файла */
  async ['readText - файл существует']() {
    const data = await readText('test/example/fs/read/text')

    assert.equal(data, 'test read')
  }

  /** чтение несуществующего файла с генерацией ошибки */
  async ['readText - файл не существует']() {
    const error = await readText('test/example/fs/read/nonexistent')
      .catch(error => error)

    assert.equal(error.code, 'ENOENT')
  }

  /** чтение несуществующего файла с установкой значения по умолчанию */
  async ['readText - значение по умолчанию']() {
    const data = await readText('test/example/fs/read/nonexistent', 'defaultValue')

    assert.equal(data, 'defaultValue')
  }

  /** запись нового файла с созданием каталога */
  async ['write[Text/JSON] - нет файла и папки']() {
    await writeJSON('test/example/fs/write/test.json', { test: true })

    const data = await readText('test/example/fs/write/test.json')

    assert.equal(data, '{\n  "test": true\n}')
  }

  /** запись нового файла в созданном каталоге */
  async ['write[Text/JSON] - нет файла']() {
    await mkdir('test/example/fs/write')
    await writeJSON('test/example/fs/write/test.json', { test: 1 })

    const data = await readText('test/example/fs/write/test.json')

    assert.equal(data, '{\n  "test": 1\n}')
  }

  /** перезапись существующего файла по умолчанию */
  async ['write[Text/JSON] - перезапись файла']() {
    await writeJSON('test/example/fs/write/test.json', { test: 2 })

    const data = await readText('test/example/fs/write/test.json')

    assert.equal(data, '{\n  "test": 2\n}')

    await writeJSON('test/example/fs/write/test.json', { test: 3 })

    const data3 = await readText('test/example/fs/write/test.json')

    assert.equal(data3, '{\n  "test": 3\n}')
  }

  /** не даем перезаписывать, если передали флаг WRITE_EXCL */
  async ['write[Text/JSON] - ошибка при перезаписи файла']() {
    await writeJSON('test/example/fs/write/test.json', { test: 2 })

    const data = await readText('test/example/fs/write/test.json')

    assert.equal(data, '{\n  "test": 2\n}')

    const error = await writeJSON('test/example/fs/write/test.json', { test: 3 }, WRITE_EXCL)
      .catch(error => error)

    assert.equal(error.code, 'EEXIST')
    assert.equal(relative('.', error.path), normalize('test/example/fs/write/test.json'))
  }

  /** не даем создавать новый каталог, если передали флаг WRITE_EXCL */
  async ['write[Text/JSON] - ошибка - нет папки']() {
    const error = await writeJSON('test/example/fs/write/test.json', { test: true }, WRITE_EXCL)
      .catch(error => error)

    assert.equal(error.code, 'ENOENT')
    assert.equal(relative('.', error.path), normalize('test/example/fs/write/test.json'))
  }

}
