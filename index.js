"use strict";

const {map, rscAttrs, factory, getRsc, createRsc, removeRsc, parseRecDates, _Record as Record, register} = require ("./model");
const {setSessionId, getSessionId, setUrl, getUrl, request, upload} = require ("./request");
let userId = null, roleId = null, menuId = null;

let listeners = {};

function addListener (event, fn) {
	listeners [event] = listeners [event] || [];
	listeners [event].push (fn);
};

function removeListener (event, fn) {
	listeners [event] = listeners [event] || [];
	
	for (let i = 0; i < listeners [event].length; i ++) {
		if (listeners [event][i] == fn) {
			listeners [event].splice (i, 1);
			break;
		}
	}
};

function callListeners (event, opts) {
	listeners [event] = listeners [event] || [];
	
	for (let i = 0; i < listeners [event].length; i ++) {
		listeners [event][i] (opts);
	}
};

function load () {
	return new Promise ((resolve, reject) => {
		request ({
			"_fn": "getAll"
		}).then (data => {
			Object.keys (rscAttrs).forEach (rsc => {
				data [rsc].forEach (row => {
					let o = factory ({rsc, row});
					
					if (rsc == "model") {
						o.attrs = {};
						o.properties = {};
					}
					if (rsc == "query") {
						o.attrs = {};
						o.columns = {};
					}
					map [rsc][o.get ("id")] = o;
				});
				if (rsc == "model" || rsc == "query") {
					Object.keys (map [rsc]).forEach (id => {
						let o = map [rsc][id];
						
						map [rsc][o.getPath ()] = o;
					});
				}
				if (rsc == "property") {
					Object.keys (map ["property"]).forEach (id => {
						let o = map ["property"][id];
						let oo = map ["model"][o.get ("model")];
						
						if (oo) {
							oo.attrs [o.get ("code")] = o;
							oo.properties [o.get ("code")] = o;
							map ["property"][oo.getPath () + "." + o.get ("code")] = o;
						}
					});
				}
				if (rsc == "column") {
					Object.keys (map ["column"]).forEach (id => {
						let o = map ["column"][id];
						let oo = map ["query"][o.get ("query")];
						
						if (oo) {
							oo.attrs [o.get ("code")] = o;
							oo.columns [o.get ("code")] = o;
							map ["column"][oo.getPath () + "." + o.get ("code")] = o;
						}
					});
				}
			});
			resolve ();
		}, err => reject (err));
	});
};

let informerId, revision = 0;

function informer () {
	return new Promise ((resolve, reject) => {
		request ({
			"_fn": "getNews",
			revision
		}).then (data => {
			revision = data.revision;
			data.records.forEach (id => delete map ["record"][id]);
			
			informerId = setTimeout (informer, 5000);
			resolve ();
		}, err => reject (err));
	});
};

function end () {
	clearTimeout (informerId);
};

function auth ({url, username, password}) {
	return new Promise ((resolve, reject) => {
		if (url) {
			setUrl (url);
		}
		request ({
			"_fn": "auth",
			username,
			password
		}).then (data => {
			if (data.sessionId) {
				setSessionId (data.sessionId);
			}
			load ().then (() => {
				informer ();
				
				userId = data.userId;
				roleId = data.roleId;
				menuId = data.menuId;
				
				resolve (data.sessionId, data.userId, data.roleId, data.menuId);
				callListeners ("connect", data);
			}, err => reject (err));
		}, err => reject (err));
	});
};

function startTransaction (description) {
	return new Promise ((resolve, reject) => {
		request ({
			"_fn": "startTransaction",
			description
		}).then (() => resolve (), err => reject (err));
	});
};

function commitTransaction () {
	return new Promise ((resolve, reject) => {
		request ({
			"_fn": "commitTransaction"
		}).then (() => resolve (), err => reject (err));
	});
};

function rollbackTransaction () {
	return new Promise ((resolve, reject) => {
		request ({
			"_fn": "rollbackTransaction"
		}).then (() => resolve (), err => reject (err));
	});
};

function getRecord (id) {
	return new Promise ((resolve, reject) => {
		getRsc ("record", id).then ((rsc) => resolve (rsc), err => reject (err));
	});
};

function createRecord (attrs) {
	return new Promise ((resolve, reject) => {
		createRsc ("record", attrs).then ((rsc) => resolve (rsc), err => reject (err));
	});
};

function removeRecord (id) {
	return new Promise ((resolve, reject) => {
		removeRsc ("record", id).then ((rsc) => resolve (rsc), err => reject (err));
	});
};

function createModel (attrs) {
	return new Promise ((resolve, reject) => {
		createRsc ("model", attrs).then ((rsc) => resolve (rsc), err => reject (err));
	});
};

function removeModel (id) {
	return new Promise ((resolve, reject) => {
		removeRsc ("model", id).then ((rsc) => resolve (rsc), err => reject (err));
	});
};

function createQuery (attrs) {
	return new Promise ((resolve, reject) => {
		createRsc ("query", attrs).then ((rsc) => resolve (rsc), err => reject (err));
	});
};

function removeQuery (id) {
	return new Promise ((resolve, reject) => {
		removeRsc ("query", id).then ((rsc) => resolve (rsc), err => reject (err));
	});
};

function createProperty (attrs) {
	return new Promise ((resolve, reject) => {
		createRsc ("property", attrs).then ((rsc) => resolve (rsc), err => reject (err));
	});
};

function removeProperty (id) {
	return new Promise ((resolve, reject) => {
		removeRsc ("property", id).then ((rsc) => resolve (rsc), err => reject (err));
	});
};

function createColumn (attrs) {
	return new Promise ((resolve, reject) => {
		createRsc ("column", attrs).then ((rsc) => resolve (rsc), err => reject (err));
	});
};

function removeColumn (id) {
	return new Promise ((resolve, reject) => {
		removeRsc ("column", id).then ((rsc) => resolve (rsc), err => reject (err));
	});
};

function getModel (id) {
	let o = map ["model"][id];
	
	if (o) {
		return o;
	} else {
		throw new Error (`unknown model: ${id}`);
	}
};

function getProperty (id) {
	let o = map ["property"][id];
	
	if (o) {
		return o;
	} else {
		throw new Error (`unknown property: ${id}`);
	}
};

function getQuery (id) {
	let o = map ["query"][id];
	
	if (o) {
		return o;
	} else {
		throw new Error (`unknown query: ${id}`);
	}
};

function getColumn (id) {
	let o = map ["column"][id];
	
	if (o) {
		return o;
	} else {
		throw new Error (`unknown column: ${id}`);
	}
};

/*
async function execute (sql) {
	return await request ({
		fn: "execute",
		sql
	});
};
*/

function getData (opts) {
	return new Promise ((resolve, reject) => {
		request (Object.assign ({
			"_fn": "getData"
		}, opts)).then (result => {
			result.recs = result.recs.map (rec => {
				let newRec = {};
				
				result.cols.forEach ((col, i) => {
					newRec [col.code] = rec [i];
				});
				parseRecDates (newRec);
				
				return newRec;
			});
			resolve (result);
		}, err => reject (err));
	});
};

function getDict (id) {
	return new Promise ((resolve, reject) => {
		if (map ["dict"][id]) {
			return resolve (map ["dict"][id]);
		}
		request ({
			"_fn": "getDict",
			"model": id
		}).then (recs => {
			map ["dict"][id] = recs;
			
			resolve (recs);
		}, err => reject (err));
	});
};

function getLog (recordId, propertyId) {
	return new Promise ((resolve, reject) => {
		request ({
			"_fn": "getLog",
			"record": recordId,
			"property": propertyId
		}).then (recs => {
			resolve (recs);
		}, err => reject (err));
	});
};

function getRecords (opts) {
/*
	return new Promise ((resolve, reject) => {
		request (Object.assign ({
			"_fn": "getRecords"
		}, opts)).then (result => {
			result.recs = result.recs.map (rec => {
				let newRec = {};
				
				result.cols.forEach ((col, i) => {
					newRec [col.code] = rec [i];
				});
				parseRecDates (newRec);
				
				return newRec;
			});
			resolve (result);
		}, err => reject (err));
	});
*/
};

function getUserId () {
	return userId;
};

function getRoleId () {
	return roleId;
};

function getMenuId () {
	return menuId;
};

module.exports = {
	auth,
	startTransaction,
	commitTransaction,
	rollbackTransaction,
	createRecord,
	getRecord,
	removeRecord,
	createModel,
	getModel,
	removeModel,
	createQuery,
	getQuery,
	removeQuery,
	createProperty,
	getProperty,
	removeProperty,
	createColumn,
	getColumn,
	removeColumn,
	getData,
	getDict,
	getLog,
	map,
	factory,
	getRsc,
	createRsc,
	removeRsc,
	setSessionId,
	getSessionId,
	setUrl,
	getUrl,
	getUserId,
	getRoleId,
	getMenuId,
	addListener,
	removeListener,
	upload,
	end,
	Record,
	register
};
