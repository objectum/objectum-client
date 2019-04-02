"use strict";

const { map, factory, getRsc, createRsc, removeRsc } = require ("./model");
const request = require ("./request");

let sid, revision = 0;

async function load () {
	let data = await request (sid, {
		fn: "getAll"
	});
	Object.keys (rscAttrs).forEach (rsc => {
		data [rsc].forEach (row => {
			let o = factory ({rsc, row});
			
			if (rsc == "class" || rsc == "view") {
				o.attrs = [];
			}
			map [rsc][o.get ("id")] = o;
		});
		if (rsc == "class" || rsc == "view") {
			Object.keys (data [rsc]).forEach (id => {
				let o = data [rsc][id];

				map [rsc][o.getPath ()] = o;
			});
		}
		if (rsc == "classAttr" || rsc == "viewAttr") {
			Object.keys (data [rsc]).forEach (id => {
				let o = data [rsc][id];
				let oo = data [rsc.substr (0, rsc.length - 4)][o.get (rsc)];
				
				oo.attrs.push (o);
			});
		}
	});
};

async function informer () {
	let data = await request (sid, {
		fn: "getNews",
		revision
	});
	revision = data.revision;
	data.objects.forEach (id => delete map ["object"][id]);
	
	setTimeout (informer, 5000);
};

async function auth ({username, password}) {
	let data = await request (sid, {
		fn: "auth",
		username,
		password
	});
	if (data.sid) {
		sid = data.sid;
	}
	await load ();
	informer ();
};

async function startTransaction (description) {
	await request (sid, {
		fn: "startTransaction",
		description
	});
};

async function commitTransaction () {
	await request (sid, {
		fn: "commitTransaction"
	});
};

async function rollbackTransaction () {
	await request (sid, {
		fn: "rollbackTransaction"
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

async function execute (sql) {
	await request (sid, {
		fn: "execute",
		sql
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
	map,
	factory,
	getRsc,
	createRsc,
	removeRsc
};
