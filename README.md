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

#### JSON request to http://127.0.0.1:8200/api/projects/catalog/
```json
{
    "fn": "auth",
    "username": "admin",
    "password": "D033E22AE348AEB5660FC2140AEC35850C4DA997"
}
```

