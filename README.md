# objectum-client
Isomorhic javascript client for objectum platform https://github.com/objectum/objectum 

Objectum ecosystem:
* Javascript platform https://github.com/objectum/objectum  
* Isomorhic javascript client https://github.com/objectum/objectum-client  
* Proxy for server methods and access control https://github.com/objectum/objectum-proxy  
* React components https://github.com/objectum/objectum-react  
* Command-line interface (CLI) https://github.com/objectum/objectum-cli  
* Objectum project example https://github.com/objectum/catalog 

## Install
```bash
npm install --save objectum-client
```

## API
* [Initialization](#init)  
* [Authentication](#auth)  
* [Transactions](#transactions)
    * [Start transaction](#startTransaction)
    * [Commit transaction](#commitTransaction)
    * [Rollback transaction](#rollbackTransaction)
* [Models](#models)
    * [Create model](#createModel)
    * [Get model](#getModel)
    * [Remove model](#removeModel)
* [Properties](#properties)
    * [Create property](#createProperty)
    * [Get property](#getProperty)
    * [Remove property](#removeProperty)
* [Records](#records)
    * [Create record](#createRecord)
    * [Get record](#getRecord)
    * [Remove record](#removeRecord)
* [Queries](#queries)
    * [Create query](#createQuery)
    * [Get query](#getQuery)
    * [Remove query](#removeQuery)
* [Columns](#columns)
    * [Create column](#createColumn)
    * [Get column](#getColumn)
    * [Remove column](#removeColumn)
* [Get data](#getData)
    * [Query SQL](#getDataSql)
        * [Select](#getDataSelect)
        * [Select and count](#getDataCount)
        * [Tree](#getDataTree)
    * [Model records](#getDataModel)
* [Get dictionary](#getDict)
* [Resources](#resources)
    * [Create resource](#createRsc)
    * [Get resource](#getRsc)
    * [Remove resource](#removeRsc)
* [Set session id](#setSessionId)
* [Get session id](#getSessionId)
* [Set url](#setUrl)
* [Get url](#getUrl)
* [Log](#log)
* [Upload](#upload)
* [Registered models](#registeredModels)


<a name="init" />

## Initialization
```js
import {Store} from "objectum-client";

const store = new Store ();
store.setUrl ("http://127.0.0.1:8200/projects/catalog/");
```

<a name="auth" />

## Authentication
Auth with username "admin", password "admin".
```js
await store.auth ({
    "username": "admin",
    "password": require ("crypto").createHash ("sha1").update ("admin").digest ("hex").toUpperCase ()
});
```

<a name="transactions" />

## Transactions

<a name="startTransaction" />

### Start transaction
```js
await store.startTransaction ("My description");
```

<a name="commitTransaction" />

### Commit transaction
```js
await store.commitTransaction ();
```

<a name="rollbackTransaction" />

### Rollback transaction
```js
await store.rollbackTransaction ();
```

<a name="models" />

## Models

<a name="createModel" />

### Create model
```js
const model = await store.createModel ({
    "name": "Item",
    "code": "item"
});
```

<a name="getModel" />

### Get model
```js
const model = store.getModel ("item");
```

<a name="removeModel" />

### Remove model
```js
await store.removeModel ("item");
```

<a name="properties" />

## Properties

<a name="createProperty" />

### Create property
```js
const property = await store.createProperty ({
    "model": "item",
    "type": "string",
    "name": "Name",
    "code": "name"
});
```

<a name="getProperty" />

### Get property
```js
const property = store.getProperty ("item.name");
```

<a name="removeProperty" />

### Remove property
```js
await store.removeProperty ("item.name");
```

<a name="records" />

## Records

<a name="createRecord" />

### Create record
```js
const record = await store.createRecord ({
    "_model": "item",
    "name": "Foo"
});
```

<a name="getRecord" />

### Get record
```js
const record = await store.getRecord (1005);
```

<a name="removeRecord" />

### Remove record
```js
await store.removeRecord (1005);
```

<a name="queries" />

## Queries

<a name="createQuery" />

### Create query
```js
const query = await store.createQuery ({
    "name": "Item",
    "code": "item"
});
```

<a name="getQuery" />

### Get query
```js
const query = store.getQuery ("item");
```

<a name="removeQuery" />

### Remove query
```js
await store.removeQuery ("item");
```

<a name="columns" />

## Columns

<a name="createColumn" />

### Create column
```js
const column = await store.createColumn ({
    "query": "item",
    "name": "Name",
    "code": "name"
});
```

<a name="getColumn" />

### Get column
```js
const column = store.getColumn ("item.name");
```

<a name="removeColumn" />

### Remove column
```js
await store.removeColumn ("item.name");
```

<a name="getData" />

## Get data

<a name="getDataSql" />

### Query SQL

Get data using sql from query.

<a name="getDataSelect" />

#### Select

Used in simple read data.

```js
const data = await store.getData ({
    query: "item",
    offset: 0,
    limit: 20
});
console.log (data.cols, data.recs);
```
SQL example:
```sql
{"data": "begin"}
select
    {"prop": "a.id", "as": "id"},
    {"prop": "a.name", "as": "name"}
from
    {"model": "item", "alias": "a"}
{"data": "end"}

{"where": "empty"}

limit {"param": "limit"}
offset {"param": "offset"}
```

<a name="getDataCount" />

#### Select and count

Used in grid. 
{"where": "empty"} - where class for filters and access control (objectum-proxy).
{"order": "empty"} - order class for order.
    
```js
const data = await store.getData ({
    query: "item",
    offset: 0,
    limit: 20
});
console.log (data.cols, data.recs, data.length);
```
SQL example:
```sql
{"data": "begin"}
select
    {"prop": "a.id", "as": "id"},
    {"prop": "a.name", "as": "name"}
{"data": "end"}

{"count": "begin"}
select
    count (*) as num
{"count": "end"}

from
    {"model": "item", "alias": "a"}
    
{"where": "empty"}

{"order": "empty"}
    
limit {"param": "limit"}
offset {"param": "offset"}
```
1. Select SQL:
```sql
select
    {"prop": "a.id", "as": "id"},
    {"prop": "a.name", "as": "name"}
from
    {"model": "item", "alias": "a"}
limit 20
offset 0
```
2. Count SQL:
```sql
select
    count (*) as num
from
    {"model": "item", "alias": "a"}
limit {config.query.maxCount}
offset 0
```

<a name="getDataTree" />

#### Tree
```js
const data = await store.getData ({
    query: "item",
    offset: 0,
    limit: 20
});
console.log (data.cols, data.recs, data.length, data.childs, data.position);
```
SQL example:
```sql
{"data": "begin"}
select
    {"prop": "a.id", "as": "id"},
    {"prop": "a.name", "as": "name"},
    {"prop": "a.parent", "as": "parent"},
    {"prop": "a.order", "as": "order"}
{"data": "end"}

{"count": "begin"}
select
    count (*) as num
{"count": "end"}

{"tree": "begin"}
select
    {"prop": "a.parent", "as": "parent"}, count (*) as num
{"tree": "end"}

from
    {"model": "item", "alias": "a"}

{"where": "begin"}
    {"prop": "a.parent"} {"tree": "filter"}
{"where": "end"}    

{"order": "begin"}
    {"prop": "a.order"}
{"order": "end"}

{"tree": "begin"}
group by
    {"prop": "a.parent"}
{"tree": "end"}

limit {"param": "limit"}
offset {"param": "offset"}  
```
1. Select SQL:
```sql
select
    {"prop": "a.id", "as": "id"},
    {"prop": "a.name", "as": "name"},
    {"prop": "a.order", "as": "order"},
    {"prop": "a.parent", "as": "parent"}
from
    {"model": "item", "alias": "a"}
where
    {"prop": "a.parent"} is null
order by
    {"prop": "a.order"}
limit 0
offset 20  
```
2. Count SQL:
```sql
select
    count (*) as num
from
    {"model": "item", "alias": "a"}
where
    {"prop": "a.parent"} is null
limit {config.query.maxCount}
offset 0
```
3. Childs SQL
```sql
select
    {"prop": "a.parent", "as": "parent"}, count (*) as num
from
    {"model": "item", "alias": "a"}
where
    {"prop": "a.parent"} in (${_.map (data.recs, "id").join (",")})
group by
    {"prop": "a.parent"}
```

<a name="getDataModel" />

#### Model records
```js
const records = await store.getRecords ({
    model: "item",
    filters: [
        ["name", "is not null"],
        ["id", "in", [1000, 1010, 1020]]
    ] 
});
console.log (data.cols, data.recs, data.length);

<a name="getDict" />

## Get dictionary
```js
const records = await store.getDict ("d.item.type");
```

<a name="resources" />

## Resources
Common methods for all resources: model, property, query, column, record.

<a name="createRsc" />

### Create resource
```js
const o = await store.createRsc ("record", {
    "model": "item",
    "name": "Table"
});
```

<a name="getRsc" />

### Get resource
```js
const o = await store.getRsc ("record", 1005);
```

<a name="removeRsc" />

### Remove resource
```js
await store.removeRsc ("record", 1005);
```

<a name="setSessionId" />

## Set session id
```js
store.setSessionId (sid);
```

<a name="getSessionId" />

## Get session id
```js
let sid = store.getSessionId ();
```

<a name="setUrl" />

## Set url
```js
store.setUrl ("/api/projects/catalog/");
```

<a name="getUrl" />

## Get url
```js
let url = store.getUrl ();
```

<a name="log" />

## Log
Change history
```js
const recs = await getLog (recordId, propertyId);
```

<a name="upload" />

## Upload
name - file name. file - File. propertyId - property type must be "file".
```js
await upload ({recordId, propertyId, name, file})
```

<a name="registeredModels" />

## Registered models
```js
import {Record} from "objectum-client";

class ItemModel extends Record {
    async myMethod () {
        return this.store.getData (...);
    }
};
store.register ("item", ItemModel);

const record = await store.createRecord ({
    _model: "item", name: "Foo"
});
await record.myMethod ();
```

## Author

**Dmitriy Samortsev**

+ http://github.com/objectum


## Copyright and license

MIT
