import { RequireContext, RequireModule } from '../parse/types'

export interface Module {
  id: number
  filename: string
  requires: RequireModule[]
  asyncs: RequireContext[]
  source: string

  // dynamically parse and set
  chunkId?: number
  chunks?: number[]
}

export interface DepTree {
  modules: Record<string, Module>
  modulesById: Record<string, Module>
  chunks: Record<string, Chunk>
  nextModuleId: number
  nextChunkId: number
  chunkModules: Record<string, number>
}

export interface Chunk {
  id: number
  modules: Record<number, Module | 'include' | 'in-parent'>
  // todo why RequireContext can be a context?
  context?: Module | RequireContext
  parents?: number[]
  empty?: boolean
  equals?: number
}
