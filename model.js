"use strict";

const {request} = require ("./request");

let map = {
	"sid": null,
	"class": {},
	"classAttr": {},
	"view": {},
	"viewAttr": {},
	"object": {}
};
const rscAttrs = {
	"class": [
		"id", "parent", "name", "code", "description", "order", "format", "view", "opts", "start", "end", "schema", "record"
	],
	"classAttr": [
		"id", "class", "name", "code", "description", "order", "type", "notNull", "secure", "unique", "validFunc", "removeRule", "opts", "start", "end", "schema", "record"
	],
	"view": [
		"id", "parent", "name", "code", "description", "order", "query", "layout", "iconCls", "system", "class", "opts", "start", "end", "schema", "record"
	],
	"viewAttr": [
		"id", "view", "name", "code", "description", "order", "classAttr", "area", "columnWidth", "opts", "start", "end", "schema", "record"
	],
};

class _Rsc {
	constructor ({rsc, row, data}) {
		let me = this;
		
		me.rsc = rsc;
		me.data = {};
		me.originalData = {};
		me.removed = false;

		let initValue = function (a, v) {
			me.data [a] = v;
			me.originalData [a] = v;
		};
		if (data) {
			Object.keys (data).forEach (a => {
				initValue (a, data [a]);
			});
		}
		if (row) {
			for (let i = 0; i < row.length; i ++) {
				initValue (rscAttrs [rsc][i], row [i]);
			}
		}
	}
	
	get (a) {
		return this.data [a];
	}
	
	set (a, v) {
		let me = this;
		
		if (a == "id" && me.data.id) {
			return;
		}
		me.data [a] = v;
	}
	
	remove () {
		this.removed = true;
	}

	async sync () {
		let me = this;
		
		if (me.removed) {
			return await removeRsc (me.rsc, me.get ("id"));
		}
		let attrs = {};
		
		for (let a in me.data) {
			if (me.originalData [a] instanceof Date) {
				me.originalData [a] = me.originalData [a].toISOString ();
			}
			if (me.data [a] instanceof Date) {
				me.data [a] = me.data [a].toISOString ();
			}
			if (!me.originalData.hasOwnProperty (a) || me.originalData [a] != me.data [a]) {
				attrs [a] = me.data [a];
			}
		}
		if (Object.keys (attrs).length) {
			await request ({
				fn: "set",
				rsc: me.rsc,
				id: me.get ("id"),
				...attrs
			});
		}
	}

	getPath (o, path = []) {
		let me = this;
		
		if (me.rsc != "class" && me.rsc != "view") {
			return null;
		}
		o = o || me;
		path.unshift (o.get ("code"));
		
		if (o.get ("parent")) {
			this.getPath (map [me.rsc][o.get ("parent")], path);
		} else {
			return path.join (".");
		}
	}
};

class _Object extends _Rsc {
	constructor (opts) {
		opts.rsc = "object";
		super (opts);
	}
};

class _Class extends _Rsc {
	constructor (opts) {
		opts.rsc = "class";
		super (opts);
	}
};

class _ClassAttr extends _Rsc {
	constructor (opts) {
		opts.rsc = "classAttr";
		super (opts);
	}
};

class _View extends _Rsc {
	constructor (opts) {
		opts.rsc = "view";
		super (opts);
	}
};

class _ViewAttr extends _Rsc {
	constructor (opts) {
		opts.rsc = "viewAttr";
		super (opts);
	}
};

function factory (opts) {
	let o;
	let rsc = opts.rsc;
	
	switch (rsc) {
		case "object":
			o = new _Object (opts);
			break;
		case "class":
			o = new _Class (opts);
			break;
		case "classAttr":
			o = new _ClassAttr (opts);
			break;
		case "view":
			o = new _View (opts);
			break;
		case "viewAttr":
			o = new _ViewAttr (opts);
			break;
		default:
			throw new Error (`factory: unknown resource: ${rsc}`);
	}
	return o;
};

async function getRsc (rsc, id) {
	let o = map [rsc][id];
	
	if (!o) {
		let data = await request ({
			fn: "get",
			rsc,
			id
		});
		o = factory ({rsc, data});
	}
	return o;
};

async function createRsc (rsc, attrs) {
	let data = await request ({
		fn: "create",
		rsc,
		...attrs
	});
	let o = factory ({rsc, data});
	
	map [rsc][o.get ("id")] = o;
	map [rsc][o.getPath ()] = o;
	
	return o;
};

async function removeRsc (rsc, id) {
	await request ({
		fn: "remove",
		rsc,
		id
	});
	delete map [rsc][id];
	
	let o = map [rsc][id];
	
	if (o) {
		delete map [rsc][o.getPath ()];
	}
};

module.exports = {
	map,
	rscAttrs,
	factory,
	getRsc,
	createRsc,
	removeRsc
};
