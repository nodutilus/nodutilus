'use strict'

const { Test, assert } = require('@ndk/test')
const { walk, WALK_FILE_FIRST } = require('@ndk/fs')
const { normalize } = require('path')


exports['@ndk/fs'] = class FsTest extends Test {

  /** перебираем сначала папки затем вложенные файлы */
  async ['walk - базовый проход']() {
    const files = []
    const expected = [
      'f1.txt',
      'p1',
      normalize('p1/p1f1.txt'),
      normalize('p1/p1f2.txt'),
      'p2',
      normalize('p2/p2f1.txt')
    ]

    await walk('test/example/fs/walk', (path => {
      files.push(path)
    }))

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

    await walk('test/example/fs/walk', WALK_FILE_FIRST, (async (path, dirent) => {
      await new Promise(resolve => setTimeout(resolve, 1))
      files.push(path)
      files.push(dirent.isFile())
    }))

    assert.deepEqual(files, expected)
  }

}
