import path from 'path'
import fs from 'fs'
// import uglify from 'uglify-js'
import { BufferStat, Options, OutPut } from './types'
import { Callback } from '../utils/types'
import buildDeps from '../buildDeps'
import writeChunk from '../write'

const templateAsync = fs.readFileSync(path.join(__dirname, 'templateAsync.js')).toString()
const templateSingle = fs.readFileSync(path.join(__dirname, 'templateSingle.js')).toString()

function uglifyFunc(input: string, filename: string) {
  console.log('\n 🎯-> Line 22 check the variable filename: 📮️---- 📮️', filename)
  // try {
  //   source = uglify.parser.parse(input)
  //   source = uglify.uglify.ast_mangle(source)
  //   source = uglify.uglify.ast_squeeze(source)
  //   source = uglify.uglify.gen_code(source)
  // } catch (e) {
  //   console.error(`${filename} @ Line ${e.line}, Col ${e.col}, ${e.message}`)
  //   return input
  // }
  //
  // return source
  return input
}

function stringify(str: string) {
  return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/*

	callback: function(err, source / stats)
	  source if options.output is not set
	  else stats json
*/
export default function webpack(
  context: string,
  moduleName: string,
  options: Options,
  callback: Callback<OutPut>
): void
export default function webpack(
  context: string,
  moduleName: string,
  callback: Callback<OutPut>
): void
export default function webpack(
  contextOrAbsoluteModulePath: string,
  options: Options,
  callback: Callback<OutPut>
): void
export default function webpack(
  contextOrAbsoluteModulePath: string,
  callback: Callback<OutPut>
): void
export default function webpack(
  contextOrAbsoluteModulePath: string,
  moduleNameOrOptionsOrCallback: string | Options | Callback<OutPut>,
  optionsOrCallback?: Options | Callback<OutPut>,
  maybeEmptyCallback?: Callback<OutPut>
) {
  let context: string
  let moduleName: string
  let options: Options
  let callback: Callback<OutPut>
  if (!optionsOrCallback && !maybeEmptyCallback) {
    // 2 args
    context = path.dirname(contextOrAbsoluteModulePath)
    moduleName = `./${path.basename(contextOrAbsoluteModulePath)}`
    options = {} as Options
    callback = moduleNameOrOptionsOrCallback as Callback<OutPut>
  } else if (!maybeEmptyCallback) {
    // 3 args
    if (typeof moduleNameOrOptionsOrCallback === 'string') {
      context = contextOrAbsoluteModulePath
      moduleName = moduleNameOrOptionsOrCallback
      options = {} as Options
    } else {
      context = path.dirname(contextOrAbsoluteModulePath)
      moduleName = `./${path.basename(contextOrAbsoluteModulePath)}`
      options = moduleNameOrOptionsOrCallback as Options
    }
  } else {
    // 4 args
    context = contextOrAbsoluteModulePath
    moduleName = moduleNameOrOptionsOrCallback as string
    options = optionsOrCallback as Options
    callback = maybeEmptyCallback
  }

  buildDeps(context, moduleName, options, (err, depTree) => {
    if (err) {
      callback(err, null)
      return
    }

    if (!depTree) {
      callback(new Error('No depTree'), null)
      return
    }

    let buffer: string = ''
    const fileSizeMap: Record<string, number> = {}

    if (options.output) {
      const defaultOptions = {
        outputJsonpFunction: `webpackJsonp${options.library || ''}`,
        scriptSrcPrefix: '',
        outputDirectory: path.dirname(options.output),
        output: path.basename(options.output),
        outputPostfix: `.${options.output}`
      }

      options = { ...defaultOptions, ...options }

      let chunksCount = 0
      const chunkIds = Object.keys(depTree.chunks)
      chunkIds.forEach((chunkId) => {
        const chunk = depTree.chunks[chunkId]
        if (chunk.empty) return
        if (chunk.equals !== undefined) return

        chunksCount++
        const filename = path.join(
          options.outputDirectory!,
          chunk.id === 0 ? options.output! : chunk.id + options.outputPostfix!
        )

        if (chunk.id === 0) {
          if (options.library) {
            buffer += `var ${options.library}=`
          }
          if (Object.keys(depTree.chunks).length > 1) {
            buffer += `
            ${templateAsync}
            /******/({a: ${stringify(options.outputPostfix!)},
                      b: ${stringify(options.outputJsonpFunction!)},
                      c: ${stringify(options.scriptSrcPrefix!)},
            `
          } else {
            buffer += `${templateSingle}
              /******/({`
          }
        } else {
          buffer += `/******/${options.outputJsonpFunction!}(${chunk.id}, {`
        }
        buffer += writeChunk(depTree, chunk, options)
        buffer += '/******/})'
        if (options.minimize) buffer = uglifyFunc(buffer, filename)

        fs.writeFile(filename, buffer, 'utf-8', (writeFileError) => {
          if (writeFileError) throw writeFileError
        })
        fileSizeMap[path.basename(filename)] = buffer.length
      })

      const modulesIncludingDuplicates = Object.keys(depTree.chunks).reduce((sum, chunkId) => {
        const modulesIds = Object.keys(depTree.chunks[chunkId].modules)
        modulesIds.forEach((moduleId) => {
          if (depTree.chunks[chunkId].modules[moduleId] === 'include') sum++
        })
        return sum
      }, 0)

      const bufferStat: BufferStat = {
        chunkCount: chunksCount,
        modulesCount: Object.keys(depTree.modulesById).length,
        modulesIncludingDuplicates,
        modulesPerChunk: Math.round((modulesIncludingDuplicates / chunksCount) * 10) / 10,
        modulesFirstChunk: Object.keys(depTree.chunks[0].modules).reduce((sum, moduleId) => {
          if (depTree.chunks[0].modules[moduleId] === 'include') sum++
          return sum
        }, 0),
        fileSizes: fileSizeMap
      }
      callback(null, bufferStat)
    } else {
      buffer = `
      ${options.library ? `var ${options.library}=` : ''}
      ${templateSingle}
      /******/({
      ${writeChunk(depTree, options)}
      /******/})
      `
      if (options.minimize) buffer = uglifyFunc(buffer, 'output')
      callback(null, buffer)
    }
  })
}
