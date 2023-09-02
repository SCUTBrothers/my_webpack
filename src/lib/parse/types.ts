export enum RequireTypeEnum {
  SYNC = 'sync',
  ASYNC = 'async'
}

export interface RequireModule {
  name: string
  id?: number

  nameRange?: [number, number]
  line?: number
  column?: number
}

export interface RequireContext {
  requires: RequireModule[]
  asyncs: RequireContext[]
  id?: number

  namesRange?: [number, number]
  line?: number
  column?: number

  // dynamically parse and set
  chunkId?: number
  chunks?: number[]
}

export interface RequireSingleModuleValue {
  type: 'single'
  value: string
  nameRange: [number, number]
}

export interface RequireMultipleModuleValue {
  type: 'multiple'
  value: string[]
  namesRange: [number, number]
}

export type RequireModuleValue = RequireSingleModuleValue | RequireMultipleModuleValue
