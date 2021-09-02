;(function(root, factory) {
  // Global (browser)
  root.Gldb = factory();
})(window, function() {
  const requestHandler = request => {
    return new Promise((r, j) => {
      request.onerror = j
      request.onsuccess = (e) => {
        r(e)
      }
      request.onupgradeneeded = (e) => {
        r(e)
      }
    })
  }

  const validateNullOrFalse = (data) => {
    return data === null || data === undefined || data === '' || data === false
  }

  /**
   * GIDB 是一个包含了一系列针对 indexdb API 的动作封装的对象
   * 其中所有的动作API 执行都会返回一个 Promise
   * 
   * 相关文档：https://www.tangshuang.net/3735.html
   */

  class GIDB {
    static indexedDB = window.indexedDB || window.webkitIndexedDB 
    || window.mozIndexedDB || window.msIndexedDB || null

    // indexdb 版本校验
    static validateVersion = () => {
      if (validateNullOrFalse(GIDB.indexedDB)) throw new Error('您的浏览器不支持 indexedDB, 请使用 chrome 等浏览器')
    }

    constructor ({ databaseName, version }) {
      GIDB.validateVersion(databaseName)
      if (validateNullOrFalse(databaseName)) throw new Error('GIDB Error: databaseName is required')
      if (typeof version !== 'number') throw new Error("GIDB Error: version's type is number and required ")

      this.databaseName = databaseName
      this.version = version

      this.open(databaseName, version)
        .then((event) => {
          this.dataBase = event.target.result
          console.log('GIDB Info', '数据库链接成功', this.dataBase)
          
          // 执行任务队列
          for (let i = 0, len = this.handleQueue.length;
            i < len;
            i++) {
            const fn = this.handleQueue.shift()
            fn && fn(event)
          }
        })
        .catch(err => {
          this.dataBase == null
          console.log('GIDB Error: 数据库链接失败', err)
        })
    }

    // 任务队列 - 存储链接数据库时的同步任务
    handleQueue = []

    // 区分任务是同步执行或异步执行
    /**
     * 
     * @param { GIDB 的动作回调 } fn 
     * @param { 
     *  是否需要使用调用者的事务。主要针对同步动作中需要使用到升级事务的动作
     * } useTranscation 
     * @returns promise 
     */
    differAysncHandler(fn, useTranscation = false) {
      return new Promise((r, j) => {
        const handler = event => {
          const transaction = event.target && event.target.transaction
          if (!transaction) return fn(r, j, event)

          if (useTranscation) {
            fn(r, j, event)
          } else {
            // 存在事务以及不需要使用调用者的事务时，应等待调用者的事务完成后再执行动作
            transaction.oncomplete = function() {
              fn(r, j, event)
            }
          }
        }
        // 数据库已链接 - 直接执行
        if (this.dataBase) handler({})
        // 数据库未链接 - 将任务存储到任务队列
        else this.handleQueue.push(handler)
      })
    }

    // 连接数据库
    open(databaseName, version) {
      return requestHandler(
        GIDB.indexedDB.open(databaseName, version)
      )
    }

    // 断开连接数据库
    close() {
      this.dataBase && this.dataBase.close()
    }

    // 创建仓库
    createStore(storeName, option) {
      const fn = (r, j) => {
        if (validateNullOrFalse(storeName)) return j(
          new Error('GIDB StoreName: StoreName is required')
        )
        if (validateNullOrFalse(option)) return j(
          new Error('GIDB Store Options: Store options is required')
        )
        if (validateNullOrFalse(option.autoIncrement) && validateNullOrFalse(option.keyPath)) return j(
          new Error('GIDB Store Options: keyPath is required when autoIncrement is false')
        )
        // 判断仓库是否存在
        if (!this.dataBase.objectStoreNames.contains(storeName)) {
          this.dataBase.createObjectStore(storeName, option)
        }
        r()
      }
      return this.differAysncHandler(fn, true)
    }

    // 删除仓库
    deleteStore(storeName) {
      const fn = (r, j) => {
        if (validateNullOrFalse(storeName)) return j(
          new Error('GIDB StoreName: StoreName is required')
        )

        // 判断仓库是否存在
        if (this.dataBase.objectStoreNames.contains(storeName)) {
          this.dataBase.deleteObjectStore(storeName)
        }
        r()
      }
      return this.differAysncHandler(fn, true)
    }

    // 添加/存储 数据
    putData(storeName, data) {
      const fn = (r, j, event) => {
        if (validateNullOrFalse(storeName)) return j(
          new Error('GIDB StoreName: StoreName is required')
        )
        if (validateNullOrFalse(data)) return j(
          new Error('GIDB Store Put: Data is required')
        )

        // 创建仓库事务
        const transaction = this.dataBase.transaction([storeName], 'readwrite')
        // 链接仓库
        const objectStore = transaction.objectStore(storeName)
        if (validateNullOrFalse(objectStore.autoIncrement) && validateNullOrFalse(data[objectStore.keyPath])) return j(
          new Error(`GIDB Store Put: Data missing key of '${objectStore.keyPath}'`)
        )

        requestHandler(objectStore.put(data))
          .then(r, j)
      }
      return this.differAysncHandler(fn)
    }

    // 根据主键 获取仓库数据
    getData(storeNames, key) {
      const fn = (r, j) => {
        if (validateNullOrFalse(storeNames)) return j(
          new Error('GIDB Store Get: storeNames is required')
        )
        if (!Array.isArray(storeNames) || !storeNames.length) return j(
          new Error('GIDB Store Get: storeNames must be of type array and of length greater than 0')
        )
        // 创建仓库事务
        const transaction = this.dataBase.transaction(storeNames, 'readonly')
        Promise.all(
          storeNames.map(store => {
            // 链接仓库
            const objectStore = transaction.objectStore(store)
            return requestHandler(
              key ? objectStore.get(key) : objectStore.getAll()
            )
          })
        )
          .then(res => {
            r(
              res.map(r => r.target.result)
                .reduce((p, c) => {
                  if (validateNullOrFalse(c)) return p
                  if (Array.isArray(c)) return p.concat(c)
                  p.push(c)
                  return p
                }, [])
            )
          })
          .catch(j)
      }
      return this.differAysncHandler(fn)
    }

    // 根据主键  删除数据
    deleteData(storeName, key) {
      const fn = (r, j) => {
        if (validateNullOrFalse(storeName)) return j(
          new Error('GIDB Store Delete: storeName is required')
        )
        if (validateNullOrFalse(key)) return j(
          new Error(`GIDB Store Delete: Key is required`)
        )
        // 创建仓库事务
        const transaction = this.dataBase.transaction([storeName], 'readwrite')
        // 链接仓库
        const objectStore = transaction.objectStore(storeName)

        requestHandler(objectStore.delete(key))
          .then(r, j)
      }
      return this.differAysncHandler(fn)
    }

    // 仓库统计
    countStore(storeName) {
      const fn = (r, j) => {
        if (validateNullOrFalse(storeName)) return j(
          new Error('GIDB StoreName: StoreName is required')
        )
        // 创建仓库事务
        const transaction = this.dataBase.transaction([storeName], 'readonly')
        // 链接仓库
        const objectStore = transaction.objectStore(storeName)

        requestHandler(objectStore.count())
          .then(res => r(res.target.result))
          .catch(j)
      }
      return this.differAysncHandler(fn)
    }

    // 清空仓库
    clearStore(storeName) {
      const fn = (r, j) => {
        if (validateNullOrFalse(storeName)) return j(
          new Error('GIDB StoreName: StoreName is required')
        )
        // 创建仓库事务
        const transaction = this.dataBase.transaction([storeName], 'readwrite')
        // 链接仓库
        const objectStore = transaction.objectStore(storeName)

        requestHandler(objectStore.clear())
          .then(r, j)
      }
      return this.differAysncHandler(fn)
    }

    // 创建仓库索引
    createIndex(options) {
      const fn = (r, j, event) => {
        const {
          storeName, indexName, keyPath, unique
        } = options
        if (validateNullOrFalse(storeName)) return j(
          new Error('GIDB createIndex: StoreName is required')
        )
        if (validateNullOrFalse(indexName)) return j(
          new Error('GIDB createIndex: indexName is required')
        )
        if (validateNullOrFalse(keyPath)) return j(
          new Error('GIDB createIndex: keyPath is required when autoIncrement is false')
        )
        // 创建仓库事务
        const transaction = event.target.transaction
        if (validateNullOrFalse(transaction)) return j(
          new Error('GIDB createIndex: createIndex must be done in the upgraded transaction')
        )
        // 链接仓库
        const objectStore = transaction.objectStore(storeName)
        if (!Array.prototype.includes.call(objectStore.indexNames, indexName)) {
          objectStore.createIndex(indexName, keyPath, {
            unique: !!unique
          })
        }
        r()
      }
      return this.differAysncHandler(fn, true)
    }

    // 删除仓库索引
    deleteIndex(storeName, indexName) {
      const fn = (r, j, event) => {
        if (validateNullOrFalse(storeName)) return j(
          new Error('GIDB deleteIndex: StoreName is required')
        )
        if (validateNullOrFalse(indexName)) return j(
          new Error('GIDB deleteIndex: indexName is required')
        )
        // 创建仓库事务
        const transaction = event.target.transaction
        if (validateNullOrFalse(transaction)) return j(
          new Error('GIDB deleteIndex: deleteIndex must be done in the upgraded transaction')
        )
        // 链接仓库
        const objectStore = transaction.objectStore(storeName)
        if (Array.prototype.includes.call(objectStore.indexNames, indexName)) {
          objectStore.deleteIndex(indexName)
        }
        r()
      }
      return this.differAysncHandler(fn, true)
    }

    // 索引仓库
    indexStoreGetter(storeName, indexName, data) {
      const fn = (r, j, event) => {
        if (validateNullOrFalse(storeName)) return j(
          new Error('GIDB indexStoreGetter: StoreName is required')
        )
        if (validateNullOrFalse(indexName)) return j(
          new Error('GIDB indexStoreGetter: indexName is required')
        )
        if (validateNullOrFalse(data)) return j(
          new Error('GIDB indexStoreGetter: data is required when autoIncrement is false')
        )
        // 创建仓库事务
        const transaction = this.dataBase.transaction([storeName], 'readwrite')
        // 链接仓库
        const objectStore = transaction.objectStore(storeName)
        const index = objectStore.index(indexName)

        requestHandler(
          index.unique
          ? index.get(data)
          : index.getAll(data)
        )
          .then(event => {
            r(event.target.result)
          })
          .catch(j)
      }
      return this.differAysncHandler(fn, true)
    }

    // 仓库分页
    queryStorePage(storeName, pagenation) {
      const fn = (r, j, event) => {
        if (validateNullOrFalse(storeName)) return j(
          new Error('GIDB indexStoreGetter: StoreName is required')
        )
        // 创建仓库事务
        const transaction = this.dataBase.transaction([storeName], 'readonly')
        // 链接仓库
        const objectStore = transaction.objectStore(storeName)

        const pageNumber = pagenation.pageNumber || 1
        const pageSize = pagenation.pageSize || 10
        const data = []
        const start = (pageNumber - 1) * pageSize
        const end = pageNumber * pageSize
        let count = 1

        const request = objectStore.openCursor(null, 'prev')
        request.onsuccess = e => {
          let cursor = e.target.result
          if (!cursor) return r(data)
          if (count > start && count <= end) {
            data.push(cursor.value)
          }
          if (data.length >= pageSize) return r(data)
          count++
          cursor.continue()
        }
      }
      return this.differAysncHandler(fn, true)
    }
  }

  return GIDB
})
