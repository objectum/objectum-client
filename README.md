# Objectum client
Isomorhic javascript client for objectum platform https://github.com/objectum/objectum 

## Install
```bash
npm i objectum-client
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
* [Get dictionary](#getDict)
* [Resources](#resources)
    * [Create resource](#createRsc)
    * [Get resource](#getRsc)
    * [Remove resource](#removeRsc)
* [Set session id](#setSessionId)
* [Get session id](#getSessionId)
* [Set url](#setUrl)
* [Get url](#getUrl)


<a name="init" />

## Initialization
```js
const store = require ("objectum-client");

store.setUrl ("http://127.0.0.1:8200/api/projects/catalog/");
```

<a name="auth" />

## Authentication
Auth with username "admin", password "admin".
```js
let sid = await store.auth ({
    "username": "admin",
    "password": require ("crypto").createHash ("sha1").update ("admin").digest ("hex").toUpperCase ()
});
```
#### JSON request:
```json
{
    "fn": "auth",
    "username": "admin",
    "password": "D033E22AE348AEB5660FC2140AEC35850C4DA997"
}
```
#### JSON response:
```json
{
    "sessionId": "...",
    "userId": null,
    "roleId": "admin",
    "menuId": "admin"
}
```

<a name="transactions" />

## Transactions

<a name="startTransaction" />

### Start transaction
```js
await store.startTransaction ("My description");
```
#### JSON request:
```json
{
    "fn": "startTransaction",
    "description": "My description"
}
```
#### JSON response:
```json
{
    "revision": 1000
}
```

<a name="commitTransaction" />

### Commit transaction
```js
await store.commitTransaction ();
```
#### JSON request:
```json
{
    "fn": "commitTransaction"
}
```
#### JSON response:
```json
{
    "revision": 1000
}
```

<a name="rollbackTransaction" />

### Rollback transaction
```js
await store.rollbackTransaction ();
```
#### JSON request:
```json
{
    "fn": "rollbackTransaction"
}
```
#### JSON response:
```json
{
    "revision": 1000
}
```

<a name="models" />

## Models

<a name="createModel" />

### Create model
```js
await store.createModel ({
    "name": "Item",
    "code": "item"
});
```
#### JSON request:
```json
{
    "fn": "create",
    "rsc": "model",
    "name": "Item",
    "code": "item"
}
```
#### JSON response:
```json
{
    "id": 1006,
    "name": "Item",
    "code": "item",
    "start": 1006
}
```

<a name="getModel" />

### Get model
```js
let o = await store.getModel ("item");
```
#### JSON request:
```json
{
    "fn": "get",
    "rsc": "model",
    "id": "item"
}
```
#### JSON response:
```json
{
    "id": 1006,
    "parent": null,
    "name": "Item",
    "code": "item",
    "description": null,
    "order": null,
    "format": null,
    "query": null,
    "opts": null,
    "start": 1006
}
```

<a name="removeModel" />

### Remove model
```js
await store.removeModel ("item");
```
#### JSON request:
```json
{
    "fn": "remove",
    "rsc": "model",
    "id": "item"
}
```
#### JSON response:
```json
{
    "id": 1006
}
```

<a name="properties" />

## Properties

<a name="createProperty" />

### Create property
```js
await store.createProperty ({
    "model": "item",
    "type": "string",
    "name": "Name",
    "code": "name"
});
```
#### JSON request:
```json
{
    "fn": "create",
    "rsc": "property",
    "model": "item",
    "type": "string",
    "name": "Name",
    "code": "name"
}
```
#### JSON response:
```json
{
    "id": 1013,
    "model": 1006,
    "name": "Name",
    "code": "name",
    "type": 1,
    "start": 1011
}
```

<a name="getProperty" />

### Get property
```js
await store.getProperty ("item.name");
```
#### JSON request:
```json
{
    "fn": "get",
    "rsc": "property",
    "id": "item.name"
}
```
#### JSON response:
```json
{
    "id": 1013,
    "model": 1006,
    "name": "Name",
    "code": "name",
    "description": null,
    "order": null,
    "type": 1,
    "notNull": null,
    "secure": null,
    "unique": null,
    "validFunc": null,
    "removeRule": null,
    "opts": null,
    "start": 1011
}
```

<a name="removeProperty" />

### Remove property
```js
await store.removeProperty ("item.name");
```
#### JSON request:
```json
{
    "fn": "remove",
    "rsc": "property",
    "id": "item.name"
}
```
#### JSON response:
```json
{
    "id": 1013
}
```

<a name="records" />

## Records

<a name="createRecord" />

### Create record
```js
let o = await store.createRecord ({
    "model": "item",
    "name": "Table"
});
```
#### JSON request:
```json
{
    "fn": "create",
    "rsc": "record",
    "model": "item",
    "name": "Table"
}
```
#### JSON response:
```json
{
    "id": 1005,
    "model": 1006,
    "start": 1012
    "name": "Table"
}
```

<a name="getModel" />

### Get record
```js
let o = await store.getRecord (1005);
```
#### JSON request:
```json
{
    "fn": "get",
    "rsc": "record",
    "id": 1005
}
```
#### JSON response:
```json
{
    "id": 1005,
    "model": 1006,
    "name": "Table"
}
```

<a name="removeObject" />

### Remove record
```js
await store.removeRecord (1005);
```
#### JSON request:
```json
{
    "fn": "remove",
    "rsc": "record",
    "id": 1005
}
```
#### JSON response:
```json
{
    "id": 1005
}
```

<a name="queries" />

## Queries

<a name="createQuery" />

### Create query
```js
let o = await store.createQuery ({
    "name": "Item",
    "code": "item"
});
```
#### JSON request:
```json
{
    "fn": "create",
    "rsc": "query",
    "name": "Item",
    "code": "item"
}
```
#### JSON response:
```json
{
    "id": 1009,
    "name": "Item",
    "code": "item",
    "start": 1014
}
```

<a name="getQuery" />

### Get query
```js
let o = await store.getQuery ("item");
```
#### JSON request:
```json
{
    "fn": "get",
    "rsc": "query",
    "id": "item"
}
```
#### JSON response:
```json
{
    "id": 1009,
    "parent": null,
    "name": "Item",
    "code": "item",
    "description": null,
    "order": null,
    "query": null,
    "layout": null,
    "iconCls": null,
    "system": null,
    "model": null,
    "opts": null,
    "start": 1014
}
```

<a name="removeQuery" />

### Remove query
```js
await store.removeQuery ("item");
```
#### JSON request:
```json
{
    "fn": "remove",
    "rsc": "query",
    "id": "item"
}
```
#### JSON response:
```json
{
    "id": 1009
}
```

<a name="columns" />

## Columns

<a name="createColumn" />

### Create column
```js
let o = await store.createColumn ({
    "query": "item",
    "name": "Name",
    "code": "name"
});
```
#### JSON request:
```json
{
    "fn": "create",
    "rsc": "column",
    "query": "item",
    "name": "Name",
    "code": "name"
}
```
#### JSON response:
```json
{
    "id": 1011,
    "query": 1009,
    "name": "Name",
    "code": "name",
    "start": 1014
}
```

<a name="getColumn" />

### Get column
```js
let o = await store.getColumn ("item.name");
```
#### JSON request:
```json
{
    "fn": "get",
    "rsc": "column",
    "id": "item.name"
}
```
#### JSON response:
```json
{
    "id": 1011,
    "query": 1009,
    "name": "Name",
    "code": "name",
    "start": 1014
}
```

<a name="removeColumn" />

### Remove column
```js
await store.removeColumn ("item.name");
```
#### JSON request:
```json
{
    "fn": "remove",
    "rsc": "column",
    "id": "item.name"
}
```
#### JSON response:
```json
{
    "id": 1011
}
```

<a name="getData" />

## Get data
Get data using sql from query.
```js
let data = await store.getData ({
    query: "item",
    offset: 0,
    limit: 20
});
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
#### JSON request:
```json
{
    "fn": "getData",
    "query": "item",
    "offset": 0,
    "limit": 20
}
```
#### JSON response:
```json
{
    "cols": [
        {
            "model": 1006,
            "property": null,
            "code": "id",
            "name": "id",
            "order": 1,
            "type": 1
        },
        {
            "model": 1006,
            "property": 1013,
            "code": "name",
            "name": "Name",
            "order": 2,
            "type": 1
        }
    ],
    "length": 1,
    "recs": [
        {
            "id": 1005,
            "name": "Table"
        }
    ]
}
```

<a name="getDict" />

## Get dictionary
```js
let recs = await store.getDict ("d.item.type");
```
#### JSON request:
```json
{
    "fn": "getDict",
    "model": "d.item.type"
}
```
#### JSON response:
```json
[
    {
        "id": 1100,
        "name": "Furniture"
    },
    {
        "id": 1101,
        "name": "Tool"
    }
]
```

<a name="resources" />

## Resources
Common methods for all resources: model, property, query, column, record.

<a name="createRsc" />

### Create resource
```js
let o = await store.createRsc ("record", {
    "model": "item",
    "name": "Table"
});
```

<a name="getRsc" />

### Get resource
```js
let o = await store.getRsc ("record", 1005);
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

## Author

**Dmitriy Samortsev**

+ http://github.com/objectum


## Copyright and license

MIT
