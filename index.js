'use strict'

//
// needs cleanup, refactoring, and tests!
//

let fs = require('fs')
let path = require('path')
let _ = require('lodash')

let fileTypeRegex = /(.*)\.(controller|component|directive|factory|filter|provider|service|run|config|constant)\.js$/

function ngModuleLoader (content) {
  let resourcePath = this.resourcePath
  let modulePath = path.dirname(resourcePath)

  let config = JSON.parse(content)
  let callback = this.async()

  let template = []

  this.cacheable()
  this.addContextDependency(modulePath)

  //
  // create a stat promise that resolves into false or a require statment
  //
  function createPackage(path) {
    return new Promise((resolve) => {
      fs.stat(`${modulePath}/${path}/ng-module.json`, (err, stat) => {
        if (err || !stat.isFile()) {
          return resolve(false)
        }

        resolve(`require('./${path}/ng-module.json').name`)
      })
    })
  }

  fs.readdir(modulePath, (err, files) => {
    if (err) return callback(err, null)

    let deps = []
    let pkgs = []

    //
    // nb. autopackage can be expensive, so try to only use during dev.
    //
    if (config.autopackage) {
      for (let file of files) {
        pkgs.push(createPackage(file))
      }
    }

    Promise.all(pkgs).then((stmts) => {
      deps = deps.concat(stmts.filter((value) => value))

      if (config.depends) {
        deps = deps.concat(config.depends.map((dep) => {
          if (dep.ngModule) {
            return `require('${dep.ngModule}/ng-module.json').name`
          }

          return JSON.stringify(dep)
        }))
      }

      template.push("'use strict'")
      template.push("var angular = require('angular')")
      template.push(`var app = angular.module('${config.name}', [${deps.join(',')}])`)
      template.push(`module.exports = app`)

      for (let file of files) {
        let pieces = fileTypeRegex.exec(file)

        if (pieces) {
          let type = pieces[2]
          let name = pieces[1]
          let camelName = _.camelCase(`${name}-${type}`)

          this.addDependency(`${modulePath}/${file}`)

          if (type === 'run' || type === 'config') {
            template.push(`var ${camelName} = require('./${file}')`)
            template.push(`app.${type}(${camelName}.FN)`)
          } else {
            template.push(`var ${camelName} = require('./${file}')`)
            template.push(`app.${type}(${camelName}.NAME, ${camelName}.OPTIONS)`)
          }
        }
      }

      callback(null, template.join(';\n'))
    })
  })
}

module.exports = ngModuleLoader
