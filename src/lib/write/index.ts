import { Chunk, DepTree, Module } from '../buildDeps/types'
import { Options } from '../webpack/types'
import { RequireContext, RequireModule } from '../parse/types'

function writeSource(module: Module) {
  const replaces: {
    from: number
    to: number
    value: string
  }[] = [] // { from: 123, to: 125, value: "4" }

  function genReplaceRequire(requireItem: RequireModule) {
    if (requireItem.nameRange && requireItem.id !== undefined) {
      replaces.push({
        from: requireItem.nameRange[0],
        to: requireItem.nameRange[1],
        value: `${requireItem.id}`
      })
    }
  }

  if (module.requires) {
    module.requires.forEach(genReplaceRequire)
  }

  if (module.asyncs) {
    module.asyncs.forEach(function genReplacesAsync(asyncItem: RequireContext) {
      if (asyncItem.requires) {
        asyncItem.requires.forEach(genReplaceRequire)
      }
      if (asyncItem.asyncs) {
        asyncItem.asyncs.forEach(genReplacesAsync)
      }
      if (asyncItem.namesRange) {
        replaces.push({
          from: asyncItem.namesRange[0],
          to: asyncItem.namesRange[1],
          value: `${asyncItem.chunkId || '0'}`
        })
      }
    })
  }
  replaces.sort((a, b) => {
    return b.from - a.from
  })
  const { source } = module
  const result = [source]
  replaces.forEach((repl) => {
    const remSource = result.shift()
    if (remSource)
      result.unshift(
        remSource.substring(0, repl.from),
        repl.value,
        remSource.substring(repl.to + 1)
      )
  })
  return result.join('')
}

export default function writeChunk(depTree: DepTree, chunk: Chunk, options: Options): string
export default function writeChunk(depTree: DepTree, options: Options): string
export default function writeChunk(
  depTree: DepTree,
  chunkOrOptions: Chunk | Options,
  mayBeEmptyOptions?: Options
) {
  const options = !mayBeEmptyOptions ? (chunkOrOptions as Options) : mayBeEmptyOptions
  const chunk = !mayBeEmptyOptions ? null : (chunkOrOptions as Chunk)

  let buffer = ''
  const modules = chunk ? chunk.modules : depTree.modulesById
  Object.keys(modules).forEach((moduleId) => {
    if (chunk) {
      if (chunk.modules[moduleId] !== 'include') return
    }

    const module = depTree.modulesById[moduleId]

    buffer += `
    /******/
    ${moduleId}: function(module, exports, require) {
    ${options.includeFilenames ? `/*** ${module.filename} ***/` : ''}
    ${writeSource(module)}
    /******/},
    `
  })

  return buffer
}
