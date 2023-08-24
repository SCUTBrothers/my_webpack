import path from 'path'
import * as fs from 'fs'

type Callback = (err: Error | null, absoluteFilename?: string) => void

interface Options {
  paths?: string[]
  extensions?: string[]
}

const BasicOptions: Options = {
  paths: [],
  extensions: ['.js']
}

function resolveAsDirectory(pathname: string, options: Options, callback: Callback) {
  // check if pathname is a existed directory
  // if yes, try resolve index.js or index file with extensions
  // or resolve file list in package.json with main field using extensions of options
}

function resolveAsFile(pathname: string, options: Options, callback: Callback) {
  // check if pathname is a existed file
  // if yes, return pathname
  // if no try resolve with extensions
  const extensions = (options.extensions || BasicOptions.extensions) as string[]

  const tryResolve = (index: number) => {
    if (index >= extensions.length) {
      callback(new Error('Cannot resolve module'))
      return
    }

    const absoluteFilename = index < 0 ? pathname : pathname + extensions[index]
    fs.access(absoluteFilename, (err) => {
      if (err) {
        tryResolve(index + 1)
      } else {
        callback(null, absoluteFilename)
      }
    })
  }

  tryResolve(-1)
}

/**
 * resolve a module identifier start from context directory
 * @param context - start director of searching module, eg: ~/project/src/folder1
 * @param identifier - module identifier,
 *  @example
 *  - relative path: "./folder2/file1", "../folder2/file1", "./folder3/file1.js"
 *  - module name: "lodash", "lodash/fp"
 *  - absolute path: "/home/username/project/src/folder1/folder2/file1"
 * @param callback
 */
function resolve(context: string, identifier: string, callback: Callback): void
function resolve(context: string, identifier: string, option: Options, callback: Callback): void
function resolve(
  context: string,
  identifier: string,
  optionsOrCallback: Options | Callback,
  optionalCallback?: Callback
) {
  // overload argument
  const callback = !optionalCallback ? (optionsOrCallback as Callback) : optionalCallback
  const options = !optionalCallback ? { ...BasicOptions } : (optionsOrCallback as Options)

  const finalCallback = (err: Error | null, absoluteFilename?: string) => {
    if (err) {
      callback(new Error(`Module "${identifier}" not found in "${context}"`))
    } else {
      callback(null, absoluteFilename)
    }
  }

  const contextArray = context.split(path.sep)
  const identifierArray = identifier.split(path.sep)
  if (['.', '..', ''].includes(identifierArray[0])) {
    const pathname = path.resolve(context, identifier)
    resolveAsFile(pathname, options, (err, absoluteFilename) => {
      if (err) {
        resolveAsDirectory(pathname, options, finalCallback)
      } else {
        callback(null, absoluteFilename)
      }
    })
  }
}

resolve('/home/username/project/src/folder1', '/home/folder2/file1', (err, absoluteFilename) => {
  console.log('\n 🎯-> Line 49 check the variable err: 📮️---- 📮️', err)
  console.log('\n 🎯-> Line 50 check the variable absoluteFilename: 📮️---- 📮️', absoluteFilename)
})

export default resolve
