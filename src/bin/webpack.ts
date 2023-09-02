#!/usr/bin/env node

import path from 'path'
import fs from 'fs'
import meow from 'meow/build'
import webpack from '../lib/webpack'
import { BufferStat, Options } from '../lib/webpack/types'

const cli = meow(
  `
  Usage: $0 <input> <output>
  
  Options:
    --single, -s  Disable Code Splitting (default: false)
    --min, -m     Minimize it with uglifyjs (default: false)
    --filenames   Output Filenames Into File (default: false)
    --options     Options JSON      
    --script-src-prefix  Path Prefix For JavaScript Loading
    --library     Stores the exports into this variable  
`,
  {
    importMeta: import.meta,
    flags: {
      single: {
        type: 'boolean',
        alias: 's'
      },
      min: {
        type: 'boolean',
        alias: 'm'
      },
      filenames: {
        type: 'boolean'
      },
      options: {
        type: 'string'
      },
      'script-src-prefix': {
        type: 'string'
      },
      library: {
        type: 'string'
      }
    }
  }
)

let [input, output] = cli.input

if (input && input[0] !== '/' && input[1] !== ':') {
  input = path.join(process.cwd(), input)
}
if (output && output[0] !== '/' && input[1] !== ':') {
  output = path.join(process.cwd(), output)
}

const { flags } = cli

let options: Options = {}

if (flags.options) {
  options = JSON.parse(fs.readFileSync(flags.options, 'utf-8')) as Record<string, unknown>
}

if (flags['script-src-prefix']) {
  options.scriptSrcPrefix = cli.flags['script-src-prefix'] as string | undefined
}

if (flags.min) {
  options.minimize = true
}

if (flags.filenames) {
  options.includeFilenames = true
}

if (flags.libary) {
  options.library = flags.library
}

if (flags.single) {
  webpack(input, options, (err, source) => {
    if (err) {
      console.error(err)
      return
    }
    if (output) {
      fs.writeFileSync(output, source as string, 'utf-8')
    } else {
      process.stdout.write(source as string)
    }
  })
} else {
  output = output || path.join(process.cwd(), 'js', 'web.js')
  if (!options.outputDirectory) options.outputDirectory = path.dirname(output)
  if (!options.output) options.output = path.basename(output)
  if (!options.outputPostfix) options.outputPostfix = `.${path.basename(output)}`

  const outExists = fs.existsSync(options.outputDirectory)

  if (!outExists) fs.mkdirSync(options.outputDirectory)

  webpack(input, options, (err, stats) => {
    if (err) {
      console.error(err)
      return
    }
    console.log(stats as BufferStat)
  })
}
