### dl-gldb · 基于 indexdb 的封装库
---
> `dl-gldb` 是一个包含了一系列针对 `indexdb API` 的动作封装的对象。其中所有的动作API 执行都会返回一个 Promise
> 下文均以 `Gldb` 命名 `dl-gldb` 


#### 基础概念
> + **仓库 store**
    > 类似于数据库中 `表` 的概念。但在 `IndexedDB` 中仓库实际是一个对象。存值均以 `key` 与 `value` 对应的关系存储。所以仓库中key值非常关键。
>  
> + **索引 index**
    > 这里索引是指对于仓库中数据的索引。索引中的数据并不是单独存储的，而是对仓库中的数据的一层映射。单纯的仓库查询数据只能通过 `key` 值获取。创建了索引之后，几乎可以从任何维度去查询数据



#### Gldb 属性
Gldb 只有一个静态属性和静态方法

| 属性名称 | 描述 |
| --- | --- |
| indexedDB | 返回当前浏览器上的indexdb对象 |
| validateVersion  | 用于校验浏览器是否支持 IndexedDB 的方法 |


#### Gldb 方法

| 方法名称 | 描述 | 传参 | 返回结果 |
| --- | --- | --- | --- |
| open | 连接数据库 | (databaseName, version) 数据库名称和版本。 | Promise |
| close | 断开链接数据库 | -- | -- |
| createStore | 创建仓库 | (storeName, option) 仓库名称，和配置项。配置项具体看下面 `storeOptions` 表 | Promise  |
| deleteStore | 删除仓库 | (storeName) 仓库名称 | Promise |
| putData | 添加/更新数据 | (storeName, data) 仓库名称和数据对象 | Promise |
| deleteData | 根据主键，删除数据 | (storeName, key) 仓库名称和主键Key值 | Promise |
| getData | 根据主键获取多个仓库的数据。如果不传主键则获取仓库下所有数据 | (storeNames, key) 仓库名称数据和主键Key值 | Promise |
| countStore | 仓库计数 | (storeName) 仓库名称 | Promise |
| clearStore | 清空仓库数据 | (storeName) 仓库名称 | Promise |
| createIndex | 创建仓库索引 | (options) 索引配置项。详细看下 `indexOptions` 表 | Promise |
| deleteIndex | 删除仓库索引 | (storeName, indexName) 仓库名称和索引名称 | Promise |
| indexStoreGetter | 索引获取仓库数据 | (storeName, indexName, data) 仓库名称，索引名称，索引值 | Promise |
| queryStorePage | 获取仓库分页数据 | (storeName, pagenation) 仓库名称，分页参数对象。详细看下 `pagenation` 表 | Promise |



#### storeOptions

| 属性 | 类型 | 描述 | 必填 | 默认值 |
| --- | --- | --- | --- | --- |
| keyPath | String | 取 store 存储的value 中的键值, 作为 store 的 key。此键应该是value的唯一值。 | false | -- |
| autoIncrement | Boolean | 是否自动生成 store 的 key 值  | false  | `false` |


#### indexOptions

| 属性 | 类型 | 描述 | 必填 | 默认值 |
| --- | --- | --- | --- | --- |
| storeName | String | 仓库名称 | true | -- |
| indexName | String | 索引名称 | true | -- |
| keyPath | String | 索引关联仓库的字段名称 | true | -- |
| unique | Boolean | 索引关联仓库的字段值是否允许重复 | true | -- |


#### pagenation

| 属性 | 类型 | 描述 | 必填 | 默认值 |
| --- | --- | --- | --- | --- |
| pageNumber | Number | 页码 | true | 1 |
| pageSize | Number | 每页的数据条数 | true | 10 |