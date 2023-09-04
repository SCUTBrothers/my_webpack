import path from 'path'
import fs from 'fs'
import buildDeps from '../index'

const fixtures = path.resolve(__dirname, 'fixtures')

describe('buildDeps', () => {
  it('should return a DepTree', (done) => {
    buildDeps(fixtures, './simple/module1', (err, depTree) => {
      expect(err).toBeNull()

      fs.readFile(path.resolve(fixtures, './simple/module1.tree.json'), (e, data) => {
        expect(e).toBeNull()
        expect(depTree).toMatchObject(JSON.parse(data.toString()))
        done()
      })

      done()
    })
  })
})
