const fs = require('fs')
const path = require('path')

function createFolders (folders, basePath = '') {
  let curFolderPath
  folders.forEach(folder => {
    curFolderPath = path.join(basePath, folder)
    if (!fs.existsSync(curFolderPath)) {
      fs.mkdirSync(curFolderPath)
    }
  })
}

function removeFolder (folderPath) {
  let files = []
  if (fs.existsSync(folderPath)) {
    files = fs.readdirSync(folderPath)
    files.forEach(file => {
      let curPath = path.join(folderPath, file)
      if (fs.statSync(curPath).isDirectory()) { // recurse
        this.removeFolder(curPath)
      } else { // delete file
        fs.unlinkSync(curPath)
      }
    })
    fs.rmdirSync(folderPath)
  }
}

module.exports = {
  createFolders,
  removeFolder
}
