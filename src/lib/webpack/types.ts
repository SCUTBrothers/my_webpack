export interface ResolveOptions {
  /**
   * @description
   * 用于指定额外的搜索node_modules的路径范围
   */
  paths?: string[]
  extensions?: string[]
}

export interface Options {
  resolve?: ResolveOptions
  // JSONP function used to load chunks
  outputJsonpFunction?: string
  // Path from where chunks are loaded
  scriptSrcPrefix?: string
  // write files to this directory (absolute path)
  outputDirectory?: string
  // write first chunk to this file
  output?: string
  // write chunks to files named chunkId plus outputPostfix
  outputPostfix?: string
  // exports of input file are stored in this variable
  library?: string
  // minimize outputs with uglify-js
  minimize?: boolean
  // add absolute filenames of input files as comments
  includeFilenames?: boolean
}

export interface BufferStat {
  chunkCount: number
  modulesCount: number
  modulesIncludingDuplicates: number
  modulesPerChunk: number
  modulesFirstChunk: number
  fileSizes: Record<string, number>
}

export type OutPut = string | BufferStat
