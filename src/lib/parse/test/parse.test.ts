import parse from '../index'
import readTestModule from './utils/readTestModule'

describe('parse', () => {
  it('should parse first level require', (done) => {
    const module = 'simple/moduleA'
    readTestModule(module, (err, data) => {
      expect(err).toBeNull()

      const { source, expected } = data!

      const moduleContext = parse(source)
      expect(moduleContext).toMatchObject(expected)
      done()
    })
  })
})
