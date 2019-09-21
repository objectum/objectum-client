Under construction.

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
* [Classes](#classes)
    * [Create class](#createClass)
    * [Get class](#getClass)
    * [Remove class](#removeClass)
* [Class attributes](#classAttrs)
    * [Create class attribute](#createClassAttre)
    * [Get class attribute](#getClassAttr)
    * [Remove class attribute](#removeClassAttr)
* [Objects](#objects)
    * [Create object](#createObject)
    * [Get object](#getObject)
    * [Remove object](#removeObject)
* [Views](#views)
    * [Create view](#createView)
    * [Get view](#getView)
    * [Remove view](#removeView)
* [View attributes](#viewAttrs)
    * [Create view attribute](#createViewAttr)
    * [Get view attribute](#getViewAttr)
    * [Remove view attribute](#removeViewAttr)
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
Auth with username "admin", password "admin.
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

<a name="classes" />

## Classes

<a name="createClass" />

### Create class
```js
await store.createClass ({
    "name": "Item",
    "code": "item"
});
```
#### JSON request:
```json
{
    "fn": "create",
    "rsc": "class",
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

<a name="getClass" />

### Get class
```js
let o = await store.getClass ("item");
```
#### JSON request:
```json
{
    "fn": "get",
    "rsc": "class",
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
    "view": null,
    "opts": null,
    "start": 1006
}
```

<a name="removeClass" />

### Remove class
```js
await store.removeClass ("item");
```
#### JSON request:
```json
{
    "fn": "remove",
    "rsc": "class",
    "id": "item"
}
```
#### JSON response:
```json
{
    "id": 1006
}
```

<a name="classAttrs" />

## Class attributes

<a name="createClassAttr" />

### Create class attribute
```js
await store.createClassAttr ({
    "class": "item",
    "type": "string",
    "name": "Name",
    "code": "name"
});
```
#### JSON request:
```json
{
    "fn": "create",
    "rsc": "classAttr",
    "class": "item",
    "type": "string",
    "name": "Name",
    "code": "name"
}
```
#### JSON response:
```json
{
    "id": 1013,
    "class": 1006,
    "name": "Name",
    "code": "name",
    "type": 1,
    "start": 1011
}
```

<a name="getClassAttr" />

### Get class attribute
```js
await store.getClassAttr ("item.name");
```
#### JSON request:
```json
{
    "fn": "get",
    "rsc": "classAttr",
    "id": "item.name"
}
```
#### JSON response:
```json
{
    "id": 1013,
    "class": 1006,
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

<a name="removeClassAttr" />

### Remove class attribute
```js
await store.removeClassAttr ("item.name");
```
#### JSON request:
```json
{
    "fn": "remove",
    "rsc": "classAttr",
    "id": "item.name"
}
```
#### JSON response:
```json
{
    "id": 1013
}
```

<a name="objects" />

## Objects

<a name="createObject" />

### Create object
```js
let o = await store.createObject ({
    "class": "item",
    "name": "Table"
});
```
#### JSON request:
```json
{
    "fn": "create",
    "rsc": "object",
    "class": "item",
    "name": "Table"
}
```
#### JSON response:
```json
{
    "id": 1005,
    "class": 1006,
    "start": 1012
    "name": "Table"
}
```

<a name="getObject" />

### Get object
```js
let o = await store.getObject (1005);
```
#### JSON request:
```json
{
    "fn": "get",
    "rsc": "object",
    "id": 1005
}
```
#### JSON response:
```json
{
    "id": 1005,
    "class": 1006,
    "name": "Table"
}
```

<a name="removeObject" />

### Remove object
```js
await store.removeObject (1005);
```
#### JSON request:
```json
{
    "fn": "remove",
    "rsc": "object",
    "id": 1005
}
```
#### JSON response:
```json
{
    "id": 1005
}
```

<a name="views" />

## Views

<a name="createView" />

### Create view
```js
let o = await store.createView ({
    "name": "Item",
    "code": "item"
});
```
#### JSON request:
```json
{
    "fn": "create",
    "rsc": "view",
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

<a name="getView" />

### Get view
```js
let o = await store.getView ("item");
```
#### JSON request:
```json
{
    "fn": "get",
    "rsc": "view",
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
    "class": null,
    "opts": null,
    "start": 1014
}
```

<a name="removeView" />

### Remove view
```js
await store.removeView ("item");
```
#### JSON request:
```json
{
    "fn": "remove",
    "rsc": "view",
    "id": "item"
}
```
#### JSON response:
```json
{
    "id": 1009
}
```

<a name="viewAttrs" />

## View attributes

<a name="createViewAttr" />

### Create view attribute

<a name="getViewAttr" />

### Get view attribute

<a name="removeViewAttr" />

### Remove view attribute

<a name="getData" />

## Get data

<a name="getDict" />

## Get dictionary

<a name="resources" />

## Resources

<a name="createRsc" />

### Create resource

<a name="getRsc" />

### Get resource

<a name="removeRsc" />

### Remove resource

<a name="setSessionId" />

## Set session id

<a name="getSessionId" />

## Get session id

<a name="setUrl" />

## Set url

<a name="getUrl" />

## Get url

