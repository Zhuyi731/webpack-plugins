const fs = require('fs')
const path = require('path')
const chokidar = require('chokidar')
const utils = require('../utils/index')
const DEBUG = false

class MergePagesJsonPlugin {
  constructor () {
    this.basePath = path.join(__dirname, './src/pages/override')
    this.overridePath = path.join(__dirname, './src')
    this.pagesJsonPath = path.join(__dirname, '../../src/pages.json')
    this.pagesJsonBakPath = path.join(__dirname, '../../src/pages.bak.json')
    this.distBasePath = path.join(__dirname, '../../dist/dev/mp-weixin')
    this.distOverridePath = path.join(__dirname, '../../dist/dev/mp-weixin/pages/override')
    this.buildDistBasePath = path.join(__dirname, '../../dist/build/mp-weixin')
    this.buildDistOverridePath = path.join(__dirname, '../../dist/build/mp-weixin/pages/override')
    this.spliter = path.sep

    let env = process.env.NODE_ENV
    this.env = env
    console.log('env sep', env, path.sep)

    // dev模式需要监视，product模式只需要搬运一次即可
    if (env !== 'production') {
      this.watch()
    }
    this.createPagesJsonBak() // 创建一次pages.json副本
  }

  createPagesJsonBak () {
    let srcPath = path.join(__dirname, '../../src/pages.json')
    let bakPath = path.join(__dirname, '../../src/pages.bak.json')
    if (!fs.existsSync(bakPath)) {
      fs.copyFileSync(srcPath, bakPath)
    }
  }

  copyDistOnece () {
    // 编译时
    // 将dist/pages/override文件夹下的内容全部复制到src下
    let allFolders = []
    let allFiles = []

    getDicInfo.call(this, this.buildDistOverridePath)
    function getDicInfo (dicPath) {
      if (fs.existsSync(dicPath)) {
        let files = fs.readdirSync(dicPath)
        files.forEach(file => {
          let curPath = path.join(dicPath, file)
          if (fs.statSync(curPath).isDirectory()) { // recurse
            let tailPath = curPath.split(this.buildDistOverridePath)[1]
            allFolders.push(tailPath)
            getDicInfo.call(this, curPath)
          } else { // delete file
            // 仅在override文件夹下存在且在src下存在时，删除对应文件
            let tailPath = curPath.split(this.buildDistOverridePath)[1]
            allFiles.push(tailPath)
          }
        })
      }
    }

    DEBUG && utils.log.logToFile(allFiles)
    DEBUG && utils.log.logToFile('/******/')
    DEBUG && utils.log.logToFile(allFolders)

    // 然后依次创建文件夹
    let curFolderPath
    allFolders.forEach(folder => {
      curFolderPath = path.join(this.buildDistBasePath, folder)
      if (!fs.existsSync(curFolderPath)) {
        fs.mkdirSync(curFolderPath)
      }
    })

    let srcFile
    let destFile
    // 然后复制所有文件至src
    allFiles.forEach(file => {
      destFile = path.join(this.buildDistBasePath, file)
      srcFile = path.join(this.buildDistOverridePath, file)

      DEBUG && utils.log.logToFile(`${srcFile}=======>${destFile}`)

      try {
        fs.copyFileSync(srcFile, destFile)
      } catch (e) {
        console.log(e)
      }
    })

    // 然后需要删除override下的文件
    utils.fo.removeFolder(this.buildDistOverridePath)
  }

  watch () {
    console.log('watch src')
    let overrideJsonPath = path.join(__dirname, '../../src/pages/override/pages.json')
    let watcher = chokidar.watch(overrideJsonPath)
    watcher.on('all', () => {
      // 如果是pages.json需要做合并处理
      let dest = fs.readFileSync(overrideJsonPath, 'utf-8')
      let src = fs.readFileSync(this.pagesJsonBakPath, 'utf-8')
      let mergedJson = utils.mergeJson(src, dest)
      fs.writeFileSync(this.pagesJsonPath, JSON.stringify(mergedJson, null, '\t'), 'utf-8')
    })
  }

  watchDist () {
    console.log('watch dist')
    let distWatcher = chokidar.watch(this.distOverridePath)

    // utils.log.logToFile('distPath:' + this.distBasePath)
    // utils.log.logToFile('distOverridePath:' + this.distOverridePath)

    distWatcher.on('all', (event, filePath) => {
      console.log(event, filePath)
      switch (event) {
        case 'add':
        case 'change':
          // 新增了文件，或者修改了文件需要搬运至src下
          if (filePath.indexOf(this.distOverridePath) === -1) return
          let dest = path.join(this.distBasePath, filePath.split(this.distOverridePath)[1])
          fs.writeFileSync(dest, fs.readFileSync(filePath), 'utf-8')
          break
        case 'addDir':
          if (filePath === this.distBasePath) return
          // 新增文件夹
          // 然后检测文件夹在src下是否存在，如果不存在，则创建
          this.createFolder(filePath)
          break
        case 'unlink':
        case 'unlinkDir':
          console.log('delete')
      }
    })
  }

  createFolder (filePath) {
    let paths = filePath.split(this.distBasePath)[1]
    if (!paths) return
    let pathList = paths.split(this.spliter)
    let curPath = this.distBasePath
    pathList.forEach(singleFolderPath => {
      curPath = path.join(curPath, singleFolderPath)
      if (!fs.existsSync(curPath)) {
        fs.mkdirSync(curPath)
      }
    })
  }

  apply (compiler) {
    if (this.env === 'production') {
      // DEBUG && console.log(Object.keys(compiler.hooks))
      compiler.hooks.done.tapAsync('overridePlugin', (compilation, callback) => {
        console.log('starting after-done')
        console.log('插件注入成功')
        // 需要复制下文件\
        callback()
        this.copyDistOnece()
      })
    } else {
      // 监听变化
      compiler.hooks.afterEmit.tapAsync('overridePlugin', (compilation, callback) => {
        console.log('starting after-emit')
        console.log('插件注入成功')
        // 监听变化
        this.watchDist()
        callback()
      })
    }
  }
}

module.exports = MergePagesJsonPlugin
