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
  it('should resolve default index file', (done) => {
    resolve(context, './default', (err, absoluteFilename) => {
      expect(err).toBeNull()
      expect(absoluteFilename).toBe(path.resolve(context, './default/index.js'))
      done()
    })
  })

  it('should resolve entry file of the main field of package json ', (done) => {
    resolve(context, './package/mainEntry', (err, absoluteFilename) => {
      expect(err).toBeNull()
      expect(absoluteFilename).toBe(path.resolve(context, './package/mainEntry/main.js'))
      done()
    })
  })

  it('should resolve module in node_modules', (done) => {
    resolve(context, 'nodeModule/module1', (err, absoluteFilename) => {
      expect(err).toBeNull()
      expect(absoluteFilename).toBe(path.resolve(context, './nodeModule/module1.js'))
      done()
    })
  })

  it('should resolve module file in root node_modules', (done) => {
    resolve(
      path.resolve(context, './nodeModule/parentModule3'),
      'module2',
      (err, absoluteFilename) => {
        expect(err).toBeNull()
        expect(absoluteFilename).toBe(
          path.resolve(context, './nodeModule/node_modules/module2/index.js')
        )
        done()
      }
    )
  })
})
