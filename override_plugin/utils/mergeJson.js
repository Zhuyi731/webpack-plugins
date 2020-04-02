const stripJsonComment = require('./stripJsonComment')
/**
 * 记录目标json
 * @param {*目标json} src  type:String
 * @param {*需要合入的json} dest  type:String
 * @return 返回合并后的JSON  type:Object
 */
function mergeJson (src, dest) {
  src = stripJsonComment(src)
  dest = stripJsonComment(dest)
  let srcFilteredJson
  let destFilterdJson
  try {
    srcFilteredJson = JSON.parse(src)
  } catch (e) {
    console.log(src)
    console.error('转换src json出错！')
  }
  try {
    destFilterdJson = JSON.parse(dest)
  } catch (e) {
    console.log(dest)
    console.error('转换dest json出错！')
  }

  // 然后遍历destFiltered  合并至src
  Object.entries(destFilterdJson).forEach(entry => {
    switch (entry[0]) {
      case 'pages':
        let pages = entry[1]
        pages.forEach(page => {
          // 如果当前page在src中存在，则覆盖掉 ，如果不存在则添加
          let pageIndex = srcFilteredJson.pages.findIndex(el => {
            return el.path === page.path
          })
          if (pageIndex === -1) { // 不存在  添加
            srcFilteredJson.pages.push(page)
          } else {
            srcFilteredJson.pages.splice(pageIndex, 1, page)
          }
        })
        break
      case 'subPackages':
        let subPackages = entry[1]
        subPackages.forEach(subPackage => {
          // 如果当前subPackages在src中存在，则继续比较每一个subpackge ，如果不存在则添加
          let subPackageIndex = srcFilteredJson.subPackages.findIndex(el => {
            return el.root === subPackage.root
          })
          if (subPackageIndex === -1) { //
            srcFilteredJson.subPackages.push(subPackage)
          } else {
            let srcSub = srcFilteredJson.subPackages[subPackageIndex]
            subPackage.pages.forEach(page => {
              let pageIndex = srcSub.pages.findIndex(el => {
                return el.path === page.path
              })
              if (pageIndex === -1) { // 不存在  添加
                srcSub.pages.push(page)
              } else {
                srcSub.pages.splice(pageIndex, 1, page)
              }
            })
          }
        })
        break
      default:
        // 其余属性直接覆盖
        let prop = entry[0]
        let val = entry[1]
        srcFilteredJson[prop] = val
    }
  })

  return srcFilteredJson
}

module.exports = mergeJson
