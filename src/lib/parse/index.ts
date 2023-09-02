import parser from '@babel/parser'
import traverse from '@babel/traverse'
import type { CallExpression, StringLiteral } from '@babel/types'
import { RequireContext, RequireModuleValue, RequireTypeEnum } from './types'

/**
 * @description parse the dependencies of a module
 */
const isRequireExpression = (node: CallExpression) => {
  const { callee } = node
  return callee.type === 'Identifier' && callee.name === 'require'
}

const isAsyncRequireExpression = (node: CallExpression) => {
  const { callee } = node

  if (callee.type !== 'MemberExpression') return false

  return (
    callee.object.type === 'Identifier' &&
    callee.object.name === 'require' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'ensure'
  )
}

const checkRequireExpressionType = (node: CallExpression): RequireTypeEnum | undefined => {
  if (isRequireExpression(node)) {
    return RequireTypeEnum.SYNC
  }
  if (isAsyncRequireExpression(node)) {
    return RequireTypeEnum.ASYNC
  }
  return undefined
}

/**
 * @param node
 * require("moduleA") -> ["moduleA"]
 * require.ensure("moduleA", ...) -> ["moduleA"]
 * require.ensure(["moduleA", "moduleB"], ...) -> ["moduleA", "moduleB"]
 */
const parseRequireFirstArg = (node: CallExpression): RequireModuleValue | null => {
  const arg = node.arguments[0]
  if (arg.type === 'StringLiteral') {
    return {
      type: 'single',
      value: arg.value,
      nameRange: [arg.start!, arg.end!]
    }
  }

  if (arg.type === 'ArrayExpression') {
    return {
      type: 'multiple',
      value: arg.elements
        .filter((element) => element?.type === 'StringLiteral')
        .map((element) => (element as StringLiteral).value),
      namesRange: [arg.start!, arg.end!]
    }
  }

  return null
}

/**
 *
 * @param source
 *
 * script file is a require context
 *
 * async require (require.ensure(<preload modules>, callback)) is a require context
 *
 * @example
 * require.ensure(["moduleA", "moduleB"], function(require){
 *  require("moduleC")
 * })
 * - preload modules and sync requires are in the same require context
 * - async requires are in the same require context, and will be parsed as a new require context
 *
 */
const parse = (source: string) => {
  const ast = parser.parse(source)

  let preContext: RequireContext | null = null
  let currentContext: RequireContext = {
    requires: [],
    asyncs: []
  }

  traverse(ast, {
    CallExpression: {
      enter(path) {
        const { node } = path

        const requireType = checkRequireExpressionType(node)
        if (!requireType) return

        const leadingModuleValue = parseRequireFirstArg(node)

        if (requireType === RequireTypeEnum.SYNC) {
          if (!leadingModuleValue || leadingModuleValue.type !== 'single') {
            throw new Error(
              `line ${node.loc!.start.line}, column ${
                node.loc!.start.column
              }}: sync require must be a string`
            )
          }
          currentContext.requires.push({
            name: leadingModuleValue.value,
            nameRange: leadingModuleValue.nameRange,
            line: node.loc!.start.line,
            column: node.loc!.start.column
          })
          return
        }

        if (requireType === RequireTypeEnum.ASYNC) {
          if (!leadingModuleValue) {
            throw new Error(
              `line ${node.loc!.start.line}, column ${
                node.loc!.start.column
              }}: async require must be a string or array`
            )
          }

          const modules =
            leadingModuleValue.type === 'single'
              ? [leadingModuleValue.value]
              : leadingModuleValue.value
          const namesRange =
            leadingModuleValue.type === 'single'
              ? leadingModuleValue.nameRange
              : leadingModuleValue.namesRange

          const context: RequireContext = {
            requires: [
              ...modules.map((item) => ({
                name: item
              }))
            ],
            asyncs: [],
            namesRange,
            line: node.loc!.start.line,
            column: node.loc!.start.column
          }

          currentContext.asyncs.push(context)
          preContext = currentContext
          currentContext = context
        }
      },
      exit(path) {
        const { node } = path
        const requireType = checkRequireExpressionType(node)
        if (!requireType) return

        if (requireType === RequireTypeEnum.ASYNC) {
          currentContext = preContext!
        }
      }
    }
  })

  return currentContext
}

export default parse
