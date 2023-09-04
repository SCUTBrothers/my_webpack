import fs from 'fs'
import path from 'path'
import resolve from '../resolve'
import parse from '../parse'
import { Options } from '../webpack/types'
import { Callback } from '../utils/types'
import { Chunk, DepTree, Module } from './types'
import { RequireContext, RequireModule } from '../parse/types'

/**
 *
 * @param depTree
 * @param context 当前需要添加到chunk中的模块
 * @param chunkId chunk的id
 * @param options
 */
function addModuleToChunk(
  depTree: DepTree,
  context: Module | RequireContext,
  chunkId: number,
  options: Options
) {
  context.chunks = context.chunks || []

  if (context.chunks.indexOf(chunkId) === -1) {
    context.chunks.push(chunkId)

    // * note: async require context do not have id
    // include current module to chunk
    if (context.id !== undefined) depTree.chunks[chunkId].modules[context.id] = 'include'

    if (context.requires.length) {
      context.requires.forEach((requireItem) => {
        if (requireItem.id === undefined) {
          //   error
          throw new Error('requireItem.id is undefined')
        }

        // recursively add required modules to chunk
        addModuleToChunk(depTree, depTree.modulesById[requireItem.id], chunkId, options)
      })
    }

    if (context.asyncs.length) {
      context.asyncs.forEach((c: RequireContext) => {
        /**
         * 顶层模块或者异步require的模块可能已经初始化过了, 有以其为起点的chunk
         *
         * 如果没有初始化过, 则递归创建chunk
         */
        const subChunk = c.chunkId
          ? depTree.chunks[c.chunkId]
          : // eslint-disable-next-line @typescript-eslint/no-use-before-define
            addChunk(depTree, c, options)

        subChunk.parents = subChunk.parents || []
        subChunk.parents.push(chunkId)
      })
    }
  }
}

function addChunk(depTree: DepTree, chunkStartPoint: Module | RequireContext, options: Options) {
  const chunk: Chunk = {
    id: depTree.nextChunkId++,
    modules: {},
    context: chunkStartPoint
  }

  depTree.chunks[chunk.id] = chunk
  if (chunkStartPoint) {
    chunkStartPoint.chunkId = chunk.id

    // 将从chunk的起始/入口模块开始, 递归的将所有依赖的模块添加到chunk中
    addModuleToChunk(depTree, chunkStartPoint, chunk.id, options)
  }

  return chunk
}

function removeParentsModules(depTree: DepTree, chunk: Chunk) {
  if (!chunk.parents) return
  const moduleIds = Object.keys(chunk.modules)

  moduleIds.forEach((moduleId) => {
    let inParent = false
    chunk.parents?.forEach((parentId) => {
      if (depTree.chunks[parentId].modules[moduleId]) inParent = true
    })
    if (inParent) {
      chunk.modules[moduleId] = 'in-parent'
    }
  })
}

/**
 * @description
 * chunk that has no modules will be removed
 *
 * chunk在解析完成以后, 一定会有包含起点模块, 但是在后续的校验过程中, 可能会将这个模块移除, 此时chunk就是空的
 * 这个校验逻辑后续版本加入
 * @param depTree
 * @param chunk
 */
function removeChunkIfEmpty(depTree: DepTree, chunk: Chunk) {
  let hasModules = false
  const moduleIds = Object.keys(chunk.modules)

  moduleIds.forEach((moduleId) => {
    if (chunk.modules[moduleId] === 'include') hasModules = true
  })

  if (!hasModules) {
    if (chunk.context) {
      chunk.context.chunkId = undefined
    }
    chunk.empty = true
  }
}

/**
 * 这里应该是提取公共模块的逻辑
 * 但我还没有完全搞懂
 * @param depTree
 * @param chunk
 */
function checkObsolete(depTree: DepTree, chunk: Chunk) {
  const inParentModuleIds: number[] = []
  const moduleIds = Object.keys(chunk.modules) as unknown as number[]

  moduleIds.forEach((moduleId) => {
    if (chunk.modules[moduleId] === 'in-parent') {
      inParentModuleIds.push(moduleId)
    }
  })

  if (inParentModuleIds.length === 0) return

  inParentModuleIds.sort()
  const moduleString = inParentModuleIds.join(' ')
  if (depTree.chunkModules[moduleString]) {
    chunk.equals = depTree.chunkModules[moduleString]
    if (chunk.context) chunk.context.chunkId = chunk.equals
  } else {
    // 记录与父级chunk含有相同模块的chunk
    depTree.chunkModules[moduleString] = chunk.id
  }
}

function addModule(
  depTree: DepTree,
  context: string,
  module: string,
  options: Options,
  callback: Callback<number>
) {
  resolve(context, module, options.resolve ?? {}, (err, filename) => {
    if (err) {
      callback(err, null)
      return
    }

    if (!filename) {
      callback(new Error(`Cannot resolve module: ${module} in context ${context}`), null)
      return
    }

    const isExisted = !!depTree.modules[filename]

    if (isExisted) {
      const existedModule = depTree.modules[filename]
      callback(null, existedModule.id)
    } else {
      const newModule: Module = {
        id: depTree.nextModuleId++,
        filename,
        requires: [],
        asyncs: [],
        source: ''
      }

      depTree.modules[filename] = newModule
      depTree.modulesById[newModule.id] = newModule

      fs.readFile(filename, 'utf-8', (readFileError, source) => {
        if (err) {
          callback(readFileError, null)
          return
        }
        const moduleRequireContext = parse(source)
        newModule.requires = [...moduleRequireContext.requires]
        newModule.asyncs = [...moduleRequireContext.asyncs]
        newModule.source = source

        /**
         * 模块内部所依赖的所有模块(有重复)
         */
        const requiresMap = newModule.requires.reduce(
          (acc, cur) => {
            acc[cur.name] = acc[cur.name] || []
            acc[cur.name].push(cur)
            return acc
          },
          {} as Record<string, RequireModule[]>
        )

        const addContext = (c: RequireContext) => {
          if (c.requires) {
            // register require to requires map
            c.requires.forEach((requireItem) => {
              requiresMap[requireItem.name] = requiresMap[requireItem.name] || []
              requiresMap[requireItem.name].push(requireItem)
            })
          }
          if (c.asyncs) {
            c.asyncs.forEach(addContext)
          }
        }

        newModule.asyncs.forEach(addContext)

        const requiresNames = Object.keys(requiresMap)

        let count = requiresNames.length
        const errors: string[] = []

        const end = () => {
          callback(null, newModule.id)
        }

        if (count === 0) {
          end()
          return
        }

        requiresNames.forEach((moduleName) => {
          addModule(
            depTree,
            path.dirname(filename),
            moduleName,
            options,
            (addModuleError, moduleId) => {
              if (addModuleError) {
                errors.push(`${addModuleError.toString()}\n @ ${filename}`)
              } else {
                if (!moduleId) return

                // 当前模块文件依赖的模块只加载一次, 然后将加载的模块id赋给所有同名的模块
                requiresMap[moduleName].forEach((requireItem) => {
                  requireItem.id = moduleId
                })
              }

              count--
              if (count === 0) {
                if (errors.length) {
                  callback(new Error(errors.join('\n')), null)
                } else {
                  end()
                }
              }
            }
          )
        })
      })
    }
  })
}

/**
 * context: current directory
 * mainModule: the entrance module
 * options:
 * callback: function(err, result)
 */
function buildDeps(
  context: string,
  mainModule: string,
  options: Options,
  callback: Callback<DepTree>
): unknown
function buildDeps(context: string, mainModule: string, callback: Callback<DepTree>): unknown

function buildDeps(
  context: string,
  mainModule: string,
  optionsOrCallback: Options | Callback<DepTree>,
  maybeCallback?: Callback<DepTree>
) {
  const callback = !maybeCallback ? (optionsOrCallback as Callback<DepTree>) : maybeCallback
  const options = !maybeCallback ? (optionsOrCallback as Options) : ({} as Options)

  const depTree: DepTree = {
    modules: {},
    modulesById: {},
    chunks: {},
    nextModuleId: 0,
    nextChunkId: 0,
    chunkModules: {} // used by checkObsolete
  }

  function buildTree(mainModuleId: number) {
    addChunk(depTree, depTree.modulesById[mainModuleId], options)
    Object.keys(depTree.chunks).forEach((chunkId) => {
      removeParentsModules(depTree, depTree.chunks[chunkId])
      removeChunkIfEmpty(depTree, depTree.chunks[chunkId])
      checkObsolete(depTree, depTree.chunks[chunkId])
    })

    callback?.(null, depTree)
  }

  addModule(depTree, context, mainModule, options, (err, id) => {
    if (err) {
      callback?.(err, null)
      return
    }

    if (id === undefined || id === null) {
      return
    }

    buildTree(id)
  })
}

export default buildDeps
