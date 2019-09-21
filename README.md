Under construction.

# Objectum client
Isomorhic javascript client for objectum platform https://github.com/objectum/objectum 

## Install
```bash
npm i objectum-client
```
## Initialization
```js
const store = require ("objectum-client");

store.setUrl ("http://127.0.0.1:8200/api/projects/catalog/");
```
## Authentication
Auth with username "admin", password "admin.
#### Javascript:
```js
let sid = await store.auth ({
    username: "admin",
    password: require ("crypto").createHash ("sha1").update ("admin").digest ("hex").toUpperCase ()
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

## Transactions
### Start transaction
#### Javascript:
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
### Commit transaction
#### Javascript:
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
## Classes
### createClass
```js
await store.createClass ({
    name: "Item",
    code: "item"
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
	"start": 1006,
	"end": 0
}
```
### getClass
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
	"start": 1006,
	"end": 0,
	"schema": null,
	"record": null
}
```
### removeClass
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
## Class attributes

### createClassAttr

### getClassAttr

### removeClassAttr

## Objects

### createObject

### getObject

### removeObject

### createView

## Views

### getView

### removeView

## View attributes

### createViewAttr

### getViewAttr

### removeViewAttr

## getData

## getDict

## Resources

### getRsc

### createRsc

### removeRsc

## setSessionId

## getSessionId

## setUrl

## getUrl

