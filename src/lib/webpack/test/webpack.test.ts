import path from 'path'
import webpack from '../index'

const fixtures = path.resolve(__dirname, 'fixtures')

describe('webpack', () => {
  it('should return a single bundle which contains all sync modules', (done) => {
    webpack(fixtures, './simple/module1', (err, output) => {
      expect(err).toBeNull()
      expect(output).toMatchSnapshot()
      console.log('\n 🎯-> Line 11 check the variable output: 📮️---- 📮️', output)
      done()
    })
  })
})
