"use strict";

const {map, rscAttrs, factory, getRsc, createRsc, removeRsc, parseRecDates} = require ("./model");
const {setSessionId, getSessionId, setUrl, getUrl, request} = require ("./request");

function load () {
	return new Promise ((resolve, reject) => {
		request ({
			"fn": "getAll"
		}).then (data => {
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
						map ["classAttr"][oo.getPath () + "." + o.get ("code")] = o;
					});
				}
				if (rsc == "viewAttr") {
					Object.keys (map ["viewAttr"]).forEach (id => {
						let o = map ["viewAttr"][id];
						let oo = map ["view"][o.get ("view")];
						
						oo.attrs [o.get ("code")] = o;
						map ["viewAttr"][oo.getPath () + "." + o.get ("code")] = o;
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
			"fn": "getNews",
			revision
		}).then (data => {
			revision = data.revision;
			data.objects.forEach (id => delete map ["object"][id]);
			
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
			"fn": "auth",
			username,
			password
		}).then (data => {
			if (data.sessionId) {
				setSessionId (data.sessionId);
			}
			load ().then (() => {
				informer ();
				
				resolve (data.sessionId, data.userId, data.roleId, data.menuId);
			}, err => reject (err));
		}, err => reject (err));
	});
};

function startTransaction (description) {
	return new Promise ((resolve, reject) => {
		request ({
			"fn": "startTransaction",
			description
		}).then (() => resolve (), err => reject (err));
	});
};

function commitTransaction () {
	return new Promise ((resolve, reject) => {
		request ({
			"fn": "commitTransaction"
		}).then (() => resolve (), err => reject (err));
	});
};

function rollbackTransaction () {
	return new Promise ((resolve, reject) => {
		request ({
			"fn": "rollbackTransaction"
		}).then (() => resolve (), err => reject (err));
	});
};

function getObject (id) {
	return new Promise ((resolve, reject) => {
		getRsc ("object", id).then ((rsc) => resolve (rsc), err => reject (err));
	});
};

function createObject (attrs) {
	return new Promise ((resolve, reject) => {
		createRsc ("object", attrs).then ((rsc) => resolve (rsc), err => reject (err));
	});
};

function removeObject (id) {
	return new Promise ((resolve, reject) => {
		removeRsc ("object", id).then ((rsc) => resolve (rsc), err => reject (err));
	});
};

function createClass (attrs) {
	return new Promise ((resolve, reject) => {
		createRsc ("class", attrs).then ((rsc) => resolve (rsc), err => reject (err));
	});
};

function removeClass (id) {
	return new Promise ((resolve, reject) => {
		removeRsc ("class", id).then ((rsc) => resolve (rsc), err => reject (err));
	});
};

function createView (attrs) {
	return new Promise ((resolve, reject) => {
		createRsc ("view", attrs).then ((rsc) => resolve (rsc), err => reject (err));
	});
};

function removeView (id) {
	return new Promise ((resolve, reject) => {
		removeRsc ("view", id).then ((rsc) => resolve (rsc), err => reject (err));
	});
};

function createClassAttr (attrs) {
	return new Promise ((resolve, reject) => {
		createRsc ("classAttr", attrs).then ((rsc) => resolve (rsc), err => reject (err));
	});
};

function removeClassAttr (id) {
	return new Promise ((resolve, reject) => {
		removeRsc ("classAttr", id).then ((rsc) => resolve (rsc), err => reject (err));
	});
};

function createViewAttr (attrs) {
	return new Promise ((resolve, reject) => {
		createRsc ("viewAttr", attrs).then ((rsc) => resolve (rsc), err => reject (err));
	});
};

function removeViewAttr (id) {
	return new Promise ((resolve, reject) => {
		removeRsc ("viewAttr", id).then ((rsc) => resolve (rsc), err => reject (err));
	});
};

function getClass (id) {
	let o = map ["class"][id];
	
	if (o) {
		return o;
	} else {
		throw new Error (`unknown class: ${id}`);
	}
};

function getClassAttr (id) {
	let o = map ["classAttr"][id];
	
	if (o) {
		return o;
	} else {
		throw new Error (`unknown class attr: ${id}`);
	}
};

function getView (id) {
	let o = map ["view"][id];
	
	if (o) {
		return o;
	} else {
		throw new Error (`unknown view: ${id}`);
	}
};

function getViewAttr (id) {
	let o = map ["viewAttr"][id];
	
	if (o) {
		return o;
	} else {
		throw new Error (`unknown view attr: ${id}`);
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
			"fn": "getData"
		}, opts)).then (result => {
			result.recs.forEach (rec => {
				parseRecDates (rec);
			});
			resolve (result);
		}, err => reject (err));
	});
};

function getDict (id) {
	return new Promise ((resolve, reject) => {
		if (map ["dict"][id]) {
			return map ["dict"][id];
		}
		request ({
			"fn": "getDict",
			"class": id
		}).then (recs => {
			map ["dict"][id] = recs;
			
			resolve (recs);
		}, err => reject (err));
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
	getUrl,
	end
};
