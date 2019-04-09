"use strict";

const {map, rscAttrs, factory, getRsc, createRsc, removeRsc, parseRecDates} = require ("./model");
const {setSessionId, getSessionId, setUrl, getUrl, request} = require ("./request");

async function load () {
	let data = await request ({
		"fn": "getAll"
	});
	Object.keys (rscAttrs).forEach (rsc => {
		data [rsc].forEach (row => {
			let o = factory ({rsc, row});
			
			if (rsc == "class" || rsc == "view") {
				o.attrs = {};
			}
			map [rsc][o.get ("id")] = o;
		});
		if (rsc == "class" || rsc == "view") {
			Object.keys (map [rsc]).forEach (id => {
				let o = map [rsc][id];

				map [rsc][o.getPath ()] = o;
			});
		}
		if (rsc == "classAttr") {
			Object.keys (map ["classAttr"]).forEach (id => {
				let o = map ["classAttr"][id];
				let oo = map ["class"][o.get ("class")];
				
				oo.attrs [o.get ("code")] = o;
			});
		}
		if (rsc == "viewAttr") {
			Object.keys (map ["viewAttr"]).forEach (id => {
				let o = map ["viewAttr"][id];
				let oo = map ["view"][o.get ("view")];
				
				oo.attrs [o.get ("code")] = o;
			});
		}
	});
};

let informerId, revision = 0;

async function informer () {
	let data = await request ({
		"fn": "getNews",
		revision
	});
	revision = data.revision;
	data.objects.forEach (id => delete map ["object"][id]);
	
	informerId = setTimeout (informer, 5000);
};

async function auth ({url, username, password}) {
	if (url) {
		setUrl (url);
	}
	let data = await request ({
		"fn": "auth",
		username,
		password
	});
	
	if (data.sessionId) {
		setSessionId (data.sessionId);
	}
	await load ();
	informer ();
	
	return data.sessionId;
};

async function startTransaction (description) {
	await request ({
		"fn": "startTransaction",
		description
	});
};

async function commitTransaction () {
	await request ({
		"fn": "commitTransaction"
	});
};

async function rollbackTransaction () {
	await request ({
		"fn": "rollbackTransaction"
	});
};

async function getObject (id) {
	return await getRsc ("object", id);
};

async function createObject (attrs) {
	return await createRsc ("object", attrs);
};

async function removeObject (id) {
	return await removeRsc ("object", id);
};

async function getClass (id) {
	return await getRsc ("class", id);
};

async function createClass (attrs) {
	return await createRsc ("class", attrs);
};

async function removeClass (id) {
	return await removeRsc ("class", id);
};

async function getView (id) {
	return await getRsc ("view", id);
};

async function createView (attrs) {
	return await createRsc ("view", attrs);
};

async function removeView (id) {
	return await removeRsc ("view", id);
};

async function getClassAttr (id) {
	return await getRsc ("classAttr", id);
};

async function createClassAttr (attrs) {
	return await createRsc ("classAttr", attrs);
};

async function removeClassAttr (id) {
	return await removeRsc ("classAttr", id);
};

async function getViewAttr (id) {
	return await getRsc ("viewAttr", id);
};

async function createViewAttr (attrs) {
	return await createRsc ("viewAttr", attrs);
};

async function removeViewAttr (id) {
	return await removeRsc ("viewAttr", id);
};

/*
async function execute (sql) {
	return await request ({
		fn: "execute",
		sql
	});
};
*/

async function getData (opts) {
	let result = await request ({
		"fn": "getData",
		...opts
	});
	result.recs.forEach (rec => {
		parseRecDates (rec);
	});
	return result;
};

async function getDict (id) {
	return await request ({
		"fn": "getDict",
		"class": id
	});
};

module.exports = {
	auth,
	startTransaction,
	commitTransaction,
	rollbackTransaction,
	createObject,
	getObject,
	removeObject,
	createClass,
	getClass,
	removeClass,
	createView,
	getView,
	removeView,
	createClassAttr,
	getClassAttr,
	removeClassAttr,
	createViewAttr,
	getViewAttr,
	removeViewAttr,
	getData,
	getDict,
	map,
	factory,
	getRsc,
	createRsc,
	removeRsc,
	setSessionId,
	getSessionId,
	setUrl,
	getUrl
};
