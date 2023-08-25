import path from 'path'
import resolve from '../index'

const context = path.resolve(__dirname, 'fixtures')

describe('resolve function', () => {
  it('should resolve file', (done) => {
    resolve(context, './a', (err, absoluteFilename) => {
      expect(err).toBeNull()
      expect(absoluteFilename).toBe(path.resolve(context, './a.js'))
      done()
    })
  })
  it('should resolve default index file', () => {
    resolve(context, './default', (err, absoluteFilename) => {
      expect(err).toBeNull()
      expect(absoluteFilename).toBe(path.resolve(context, './default/index.js'))
    })
  })
})
