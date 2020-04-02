var path = require('path')
const fs = require('fs')
const DEBUG = false
const srcPath = path.join(__dirname, './src')
const overridePath = path.join(__dirname, './src/pages/override')
const exts = ['.vue', '.js', '.json', '/index.vue', '/index.js']

module.exports = function (options) {
  var optionsToUse = (typeof options === 'boolean') ? { honorIndex: options } : (options || {})
  var exclude = optionsToUse.exclude
  var include = optionsToUse.include
  optionsToUse.exclude = exclude && !Array.isArray(exclude) ? [exclude] : exclude
  optionsToUse.include = include && !Array.isArray(include) ? [include] : include
  return {
    apply: doApply.bind(this, optionsToUse)
  }
}

function writeToLog (msg) {
  if (!DEBUG) return
  if (typeof msg === 'object') {
    msg = JSON.stringify(msg, null, '\t')
  }
  fs.appendFileSync('data.js', `${msg}\n`, 'utf-8')
}

function stringIncludes (string, maybeString) {
  // String.includes throws if the argument is not a string
  return typeof maybeString === 'string' ? string.includes(maybeString) : false
}

function detectHasFile (filePath) {
  for (let i = 0; i < exts.length; i++) {
    let fullName = filePath + exts[i]
    if (fs.existsSync(fullName)) {
      return exts[i]
    }
  }
  return false
}

function redirect (target, options, resolver) {
  return (request, resolveContext, callback) => {
  // let originRequest = Object.assign({}, request)

    DEBUG && writeToLog(request.path)
    let curPath = request.path
    if (options.exclude && options.exclude.some(function (exclude) {
      return curPath.search(exclude) >= 0 || stringIncludes(curPath, exclude)
    })) {
      return callback()
    }

    // return if path doesn't match with includes
    if (options.include && !options.include.some(function (include) {
      return curPath.search(include) >= 0 || stringIncludes(curPath, include)
    })) {
      return callback()
    }

    let ext = path.extname(curPath)
    if (ext && exts.includes(ext)) { // 说明是精准引用   其实这里有个小问题    例如xx.dat.js这种格式的  在relative阶段也会进来   我没有去做处理了  - -、
    // 如果引用的是override的话，先在override下面找，如果不存在，再去src下面找
      if (curPath.indexOf(overridePath) > -1) {
        if (!fs.existsSync(curPath)) {
          request.path = path.join(srcPath, curPath.split(overridePath)[1])
        } else {
          return callback()
        }
      } else if (curPath.indexOf(srcPath) > -1 && path.basename(curPath) !== 'pages.json') {
        curPath = path.join(overridePath, curPath.split(srcPath)[1])
        if (fs.existsSync(curPath)) {
          request.path = curPath
        } else {
          return callback()
        }
      } else {
        return callback()
      }
    } else { // 说明是非精准引用
    // 如果引用的是override的话，先在override下面找
      if (curPath.indexOf(overridePath) > -1) {
        let srcRedirectPath = path.join(srcPath, curPath.split(overridePath)[1])
        if (detectHasFile(curPath)) { // 说明当前路径下有
          return callback()
        } else if (detectHasFile(srcRedirectPath)) {
          request.path = srcRedirectPath
        } else {
          return callback()
        }
      } else if (curPath.indexOf(srcPath) > -1) {
        let overrideRedirectPath = path.join(overridePath, curPath.split(srcPath)[1])
        let hasFile = detectHasFile(overrideRedirectPath)
        if (hasFile) {
          request.path = overrideRedirectPath
        } else {
          return callback()
        }
      }
    }

    resolver.doResolve(target, request, 'using path: ' + request.path, resolveContext, callback)
  }
}

function doApply (options, resolver) {
  // file type taken from: https://github.com/webpack/enhanced-resolve/blob/v4.0.0/test/plugins.js
  // var target = resolver.ensureHook('resolved')
  var target = resolver.ensureHook('relative')
  resolver.getHook('before-relative')
    .tapAsync('DirectoryNamedWebpackPlugin', redirect(target, options, resolver))
  // source和target在这里 https://github.com/webpack/enhanced-resolve/blob/master/lib/ResolverFactory.js
  // var target = resolver.ensureHook('file')
  // resolver.getHook('before-relative')
  //   .tapAsync('DirectoryNamedWebpackPlugin', redirect(target, options, resolver))

  // resolver.getHook('before-existing-file')
  //   .tapAsync('DirectoryNamedWebpackPlugin', (request, resolveContext, callback) => {
  //     let curPath = request.path
  //     if (options.exclude && options.exclude.some(function (exclude) {
  //       return curPath.search(exclude) >= 0 || stringIncludes(curPath, exclude)
  //     })) {
  //       return callback()
  //     }
  //     writeToLog(curPath)
  //     // 如果引用的是override的话，先在override下面找，如果不存在，再去src下面找
  //     if (curPath.indexOf(overridePath) > -1 && !fs.existsSync(curPath)) {
  //       console.log('curPath1', curPath)
  //       request.path = path.join(srcPath, curPath.split(overridePath)[1])
  //       writeToLog(request.path)
  //     } else if (curPath.indexOf(srcPath) > -1 && path.basename(curPath) !== 'pages.json') {
  //       // console.log('curPath2', curPath)
  //       if (/test/.test(curPath)) {
  //         console.log('****************', curPath)
  //       }
  //       curPath = path.join(overridePath, curPath.split(srcPath)[1])
  //       if (fs.existsSync(curPath)) {
  //         request.path = curPath
  //       }
  //     }

  //     resolver.doResolve(target, request, 'using path: ' + request.path, resolveContext, callback)
  //   })
  // let hooks = [
  //   // 'parsedResolve',
  //   // 'describedResolve',
  //   // 'rawModule',
  //   // 'module',
  //   // 'resolveInDirectory',
  //   // 'resolveInExistingDirectory',
  //   'relative',
  //   'resolved'
  // ]
  // hooks.forEach(hook => {
  //   resolver.getHook(`before-${hook}`)
  //     .tapAsync('DirectoryNamedWebpackPlugin', (request, resolveContext, callback) => {
  //       let curPath = request.path
  //       if (options.exclude && options.exclude.some(function (exclude) {
  //         return curPath.search(exclude) >= 0 || stringIncludes(curPath, exclude)
  //       })) {
  //         return callback()
  //       }
  //       writeToLog(`****${hook}*****` + curPath)
  //       return callback()
  //     // resolver.doResolve(target, request, 'using path: ' + request.path, resolveContext, callback)
  //     })
  // })
  // resolver.getHook('before-resolved')
  //   .tapAsync('DirectoryNamedWebpackPlugin', (request, resolveContext, callback) => {
  //     let curPath = request.path
  //     if (options.exclude && options.exclude.some(function (exclude) {
  //       return curPath.search(exclude) >= 0 || stringIncludes(curPath, exclude)
  //     })) {
  //       return callback()
  //     }
  //     writeToLog('*********' + curPath)
  //     return callback()
  //     // resolver.doResolve(target, request, 'using path: ' + request.path, resolveContext, callback)
  //   })
  // resolver.getHook('existingFile')
  //   .tapAsync('DirectoryNamedWebpackPlugin', (request, resolveContext, callback) => {
  //     // fs.appendFileSync('data.txt', JSON.stringify(request, null, '\t'), 'utf-8')
  //     // return if path matches with excludes
  //     let curPath = request.path
  //     // if (options.exclude && options.exclude.some(function (exclude) {
  //     //   return curPath.search(exclude) >= 0 || stringIncludes(curPath, exclude)
  //     // })) {
  //     //   return callback()
  //     // }

  //     // // return if path doesn't match with includes
  //     // if (options.include && !options.include.some(function (include) {
  //     //   return curPath.search(include) >= 0 || stringIncludes(curPath, include)
  //     // })) {
  //     //   return callback()
  //     // }
  //     // if (curPath.indexOf('config/index') > -1) {
  //     //   writeToLog(request)
  //     // }

  //     // 如果引用的是override的话，先在override下面找，如果不存在，再去src下面找
  //     if (curPath.indexOf(overridePath) > -1 && !fs.existsSync(curPath)) {
  //       console.log('curPath1', curPath)
  //       writeToLog(curPath)
  //       request.path = path.join(srcPath, curPath.split(overridePath)[1])
  //       writeToLog(request.path)
  //     } else if (curPath.indexOf(srcPath) > -1 && path.basename(curPath) !== 'pages.json') {
  //       // console.log('curPath2', curPath)
  //       if (/test/.test(curPath)) {
  //         console.log('****************', curPath)
  //       }
  //       curPath = path.join(overridePath, curPath.split(srcPath)[1])
  //       if (fs.existsSync(curPath)) {
  //         request.path = curPath
  //         // console.log('curPath', curPath)
  //         // writeToLog(request)
  //       }
  //     }

  //     resolver.doResolve(target, request, 'using path: ' + request.path, resolveContext, callback)

  //     // if (options.ignoreFn && options.ignoreFn(request)) {
  //     //   return callback()
  //     // }

  //     // var dirPath = request.path
  //     // var dirName = basename(dirPath)
  //     // var attempts = []

  //     // // return if path matches with excludes
  //     // if (options.exclude && options.exclude.some(function (exclude) {
  //     //   return dirPath.search(exclude) >= 0 || stringIncludes(dirPath, exclude)
  //     // })) {
  //     //   return callback()
  //     // }

  //     // // return if path doesn't match with includes
  //     // if (options.include && !options.include.some(function (include) {
  //     //   return dirPath.search(include) >= 0 || stringIncludes(dirPath, include)
  //     // })) {
  //     //   return callback()
  //     // }

  //     // if (options.mainFields) {
  //     //   try {
  //     //     var pkg = require(path.resolve(dirPath, 'package.json'))
  //     //     options.mainFields.forEach(function (field) {
  //     //       pkg[field] && attempts.push(pkg[field])
  //     //     })
  //     //   } catch (e) {
  //     //     // No problem, this is optional.
  //     //   }
  //     // }

  //     // if (options.honorIndex) {
  //     //   attempts.push('index')
  //     // }

  //     // if (options.transformFn) {
  //     //   var transformResult = options.transformFn(dirName, dirPath, request)

  //     //   if (!Array.isArray(transformResult)) {
  //     //     transformResult = [transformResult]
  //     //   }

  //     //   transformResult = transformResult.filter(function (attemptName) {
  //     //     return typeof attemptName === 'string' && attemptName.length > 0
  //     //   })

  //     //   attempts = attempts.concat(transformResult)
  //     // } else {
  //     // attempts.push(dirName)
  //     // }
  //     // resolver.doResolve(target, request, 'using path: ' + dirPath, resolveContext, callback)
  //     // const srcPath = path.join(__dirname, './src')
  //     // const overridePath = path.join(__dirname, './src/pages/override')
  //     // forEachBail(
  //     //   attempts,

  //     //   function (fileName, innerCallback) {
  //     //     // approach taken from: https://github.com/webpack/enhanced-resolve/blob/v4.0.0/lib/CloneBasenamePlugin.js
  //     //     var filePath = resolver.join(dirPath, fileName)
  //     //     let relativePath = path.join(__dirname, request.relativePath)
  //     //     if (relativePath.indexOf(srcPath) > -1) {
  //     //       relativePath = path.join(overridePath, relativePath.split(srcPath)[1])
  //     //     }

  //     //     var obj = assign({}, request, {
  //     //       path: filePath,
  //     //       relativePath: request.relativePath && resolver.join(request.relativePath, fileName)
  //     //     })
  //     //     resolver.doResolve(target, obj, 'using path: ' + filePath, resolveContext, innerCallback)
  //     //   },
  //     //   callback
  //     // )
  //   })
}
