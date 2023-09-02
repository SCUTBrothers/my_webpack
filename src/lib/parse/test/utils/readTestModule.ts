import path from 'path'
import fs from 'fs'
import { Callback } from '../../../utils/types'

const fixtures = path.resolve(__dirname, '..', 'fixtures')
const expectedJSONExtension = '.tree.json'

const readTestModule = (
  name: string,
  callback: Callback<{
    source: string
    expected: Record<string, unknown>
  }>
) => {
  const module = path.resolve(fixtures, name)
  const modulePath = `${module}.js`
  const expectedPath = `${module}${expectedJSONExtension}`

  fs.readFile(modulePath, (err, source) => {
    if (err) {
      callback(err, null)
      return
    }

    fs.readFile(expectedPath, (e, expected) => {
      if (e) {
        callback(e, null)
        return
      }

      callback(null, {
        source: source.toString(),
        expected: JSON.parse(expected.toString()) as Record<string, unknown>
      })
    })
  })
}

export default readTestModule
