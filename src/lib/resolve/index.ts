import path from 'path'
import * as fs from 'fs'
import { Callback } from '../utils/types'
import { ResolveOptions } from '../webpack/types'

const BasicOptions: ResolveOptions = {
  paths: [],
  extensions: ['.js']
}

function resolveAsFile(pathname: string, options: ResolveOptions, callback: Callback<string>) {
  // check if pathname is a existed file
  // if yes, return pathname
  // if no try resolve with extensions
  const extensions = (options.extensions || BasicOptions.extensions) as string[]

  const tryResolve = (index: number) => {
    if (index >= extensions.length) {
      callback(new Error('Cannot resolve module'), null)
      return
    }

    const absoluteFilename = index < 0 ? pathname : pathname + extensions[index]

    fs.stat(absoluteFilename, (err, stats) => {
      if (err) {
        tryResolve(index + 1)
      } else if (stats.isFile()) {
        callback(null, absoluteFilename)
      } else {
        tryResolve(index + 1)
      }
    })
  }

  tryResolve(-1)
}

function resolveAsDirectory(pathname: string, options: ResolveOptions, callback: Callback<string>) {
  // check if pathname is a existed directory
  // if yes, try resolve index.js or index file with extensions
  // or resolve file list in package.json with main field using extensions of options
  const defaultModuleName = 'index'

  const packageJsonPath = path.resolve(pathname, 'package.json')
  fs.access(packageJsonPath, (err) => {
    if (err) {
      resolveAsFile(
        path.resolve(pathname, defaultModuleName),
        options,
        (error, absoluteFilename) => {
          if (error) {
            callback(new Error(`Cannot resolve module: ${pathname}`), null)
          } else {
            callback(null, absoluteFilename)
          }
        }
      )
    } else {
      fs.readFile(packageJsonPath, (e, data) => {
        if (e) {
          callback(new Error(`Cannot resolve module: ${pathname}`), null)
        } else {
          const packageJson = JSON.parse(data.toString()) as Record<string, unknown>
          const main = (packageJson.main || defaultModuleName) as string
          const mainPath = path.resolve(pathname, main)
          resolveAsFile(mainPath, options, (error, absoluteFilename) => {
            if (error) {
              callback(new Error(`Cannot resolve module: ${pathname}`), null)
            } else {
              callback(null, absoluteFilename)
            }
          })
        }
      })
    }
  })
}

function resolveAsNodeModule(
  contextArray: string[],
  identifierArray: string[],
  options: ResolveOptions,
  callback: Callback<string>
) {
  const paths = (options.paths || BasicOptions.paths) as string[]
  const dirs = [...paths]

  const idx = contextArray.indexOf('node_modules')
  const rootNodeModulesIdx = idx === -1 ? 0 : idx

  for (let i = contextArray.length; i > rootNodeModulesIdx; i--) {
    if (contextArray[i - 1] !== 'node_modules') {
      const dir = `${contextArray.slice(0, i).join(path.sep) + path.sep}node_modules`
      dirs.push(dir)
    }
  }

  const tryResolveModule = (index: number) => {
    if (index >= dirs.length) {
      callback(new Error(`Module "${identifierArray.join('/')}" not found`), null)
      return
    }

    const module = path.resolve(dirs[index], ...identifierArray)
    resolveAsFile(module, options, (err, absoluteFilename) => {
      if (err) {
        resolveAsDirectory(module, options, (e, filename) => {
          if (e) {
            tryResolveModule(index + 1)
          } else {
            callback(null, filename)
          }
        })
      } else {
        callback(null, absoluteFilename)
      }
    })
  }

  tryResolveModule(0)
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
function resolve(context: string, identifier: string, callback: Callback<string>): void
function resolve(
  context: string,
  identifier: string,
  option: ResolveOptions,
  callback: Callback<string>
): void
function resolve(
  context: string,
  identifier: string,
  optionsOrCallback: ResolveOptions | Callback<string>,
  optionalCallback?: Callback<string>
) {
  // overload argument
  const callback = !optionalCallback ? (optionsOrCallback as Callback<string>) : optionalCallback
  const options = !optionalCallback ? { ...BasicOptions } : (optionsOrCallback as ResolveOptions)

  const finalCallback: Callback<string> = (err, absoluteFilename) => {
    if (err) {
      callback(new Error(`Module "${identifier}" not found in "${context}"`), null)
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
  } else {
    // resolve as module name
    resolveAsNodeModule(contextArray, identifierArray, options, finalCallback)
  }
}

export default resolve
