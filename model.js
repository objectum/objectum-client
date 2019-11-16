"use strict";

const {request} = require ("./request");

let map = {
	"sid": null,
	"model": {},
	"property": {},
	"query": {},
	"column": {},
	"record": {},
	"dict": {}
};
const rscAttrs = {
	"model": [
		"id", "parent", "name", "code", "description", "order", "format", "query", "opts", "start", "end", "schema", "record"
	],
	"property": [
		"id", "model", "name", "code", "description", "order", "type", "notNull", "secure", "unique", "validFunc", "removeRule", "opts", "start", "end", "schema", "record"
	],
	"query": [
		"id", "parent", "name", "code", "description", "order", "query", "layout", "iconCls", "system", "model", "opts", "start", "end", "schema", "record"
	],
	"column": [
		"id", "query", "name", "code", "description", "order", "property", "area", "columnWidth", "opts", "start", "end", "schema", "record"
	]
};

function parseRecDates (rec) {
	for (let a in rec) {
		let v = rec [a];

		if (v && v.type) {
			if (v.type == "date") {
				let tokens = v.value.split ("-");
				
				rec [a] = new Date (tokens [0], tokens [1] - 1, tokens [2]);
			}
			if (v.type == "datetime") {
				rec [a] = new Date (Date.parse (v.value));
			}
		}
	}
};

function getRsc (rsc, id) {
	return new Promise ((resolve, reject) => {
		let o = map [rsc][id];
		
		if (o) {
			resolve (o);
		} else {
			request ({
				_fn: "get",
				_rsc: rsc,
				id
			}).then (data => {
				o = factory ({rsc, data});
				
				map [rsc][o.get ("id")] = o;
				map [rsc][o.getPath ()] = o;
				
				resolve (o);
			}, err => reject (err));
		}
	});
};

function createRsc (rsc, attrs) {
	return new Promise ((resolve, reject) => {
		request (Object.assign ({
			_fn: "create",
			_rsc: rsc
		}, attrs)).then (data => {
			let o = factory ({rsc, data});
			
			map [rsc][o.get ("id")] = o;
			map [rsc][o.getPath ()] = o;
			
			resolve (o);
		}, err => reject (err));
	});
};

function removeRsc (rsc, id) {
	return new Promise ((resolve, reject) => {
		request ({
			_fn: "remove",
			_rsc: rsc,
			id
		}).then (() => {
			delete map [rsc][id];
			
			let o = map [rsc][id];
			
			if (o) {
				delete map [rsc][o.getPath ()];
			}
			resolve ();
		}, err => reject (err));
	});
};

class _Rsc {
	constructor ({rsc, row, data}) {
		let me = this;
		
		me._rsc = rsc;
		me._data = {};
		me._originalData = {};
		me._removed = false;

		let initValue = function (a, v) {
			me._data [a] = v;
			me._originalData [a] = v;
		};
		parseRecDates (me._data);
		parseRecDates (me._originalData);
		
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
		return this._data [a];
	}
	
	set (a, v) {
		let me = this;
		
		if (typeof a == "object") {
			Object.keys (a, aa => {
				me.set (aa, a [aa]);
			});
		}
		if (a == "id" && me._data.id) {
			return;
		}
		me._data [a] = v;
	}
	
	remove () {
		this._removed = true;
	}

	sync () {
		return new Promise ((resolve, reject) => {
			let me = this;
			
			if (me._removed) {
				return removeRsc (me._rsc, me.get ("id")).then (() => resolve (), err => reject (err));
			}
			let attrs = {};
			
			for (let a in me._data) {
				if (me._originalData [a] instanceof Date) {
					me._originalData [a] = me._originalData [a].toISOString ();
				}
				if (me._data [a] instanceof Date) {
					me._data [a] = me._data [a].toISOString ();
				}
				if (! me._originalData.hasOwnProperty (a) || me._originalData [a] != me._data [a]) {
					attrs [a] = me._data [a];
				}
			}
			if (Object.keys (attrs).length) {
				request (Object.assign ({
					_fn: "set",
					_rsc: me._rsc,
					id: me.get ("id")
				}, attrs)).then (() => resolve (), err => reject (err));
			}
		});
	}

	getPath (o, path = []) {
		let me = this;
		
		if (me._rsc != "model" && me._rsc != "query") {
			return null;
		}
		o = o || me;
		path.unshift (o.get ("code"));
		
		if (o.get ("parent")) {
			return this.getPath (map [me._rsc][o.get ("parent")], path);
		} else {
			return path.join (".");
		}
	}

	getLabel () {
		return `${this.get ("name")} (${this.getPath ()}: ${this.get ("id")})`;
	}
	
	getOpts () {
		return JSON.parse (this.get ("opts") || "{}");
	}
};

class _Record extends _Rsc {
	constructor (opts) {
		opts.rsc = "record";
		super (opts);
	}

	getLabel () {
		if (this.get ("name")) {
			return `${this.get ("name")} (${this.get ("id")})`;
		} else {
			return this.get ("id");
		}
	}
};

class _Model extends _Rsc {
	constructor (opts) {
		opts.rsc = "model";
		super (opts);
	}

	getTable () {
		return `${this.get ("code")}_${this.get ("id")}`;
	}
	
	isDictionary () {
		return this.getPath ().substr (0, 2) == "d.";
	}
	
	isTable () {
		return this.getPath ().substr (0, 2) == "t.";
	}
};

class _Property extends _Rsc {
	constructor (opts) {
		opts.rsc = "property";
		super (opts);
	}
	
	getPath () {
		let me = this;
		
		return `${map ["model"][me.get ("model")].getPath ()}.${me.get ("code")}`;
	}
	
	getField () {
		return `${this.get ("code")}_${this.get ("id")}`;
	}
	
	getLogField () {
		let f = "fnumber";
		
		switch (this.get ("type")) {
			case 1:
			case 5:
				f = "fstring";
				break;
			case 3:
				f = "ftime";
				break;
		}
		return f;
	}
	
	getLabel () {
		return `${this.get ("name")} (${this.get ("code")}: ${this.get ("id")})`;
	}
};

class _Query extends _Rsc {
	constructor (opts) {
		opts.rsc = "query";
		super (opts);
	}
};

class _Column extends _Rsc {
	constructor (opts) {
		opts.rsc = "column";
		super (opts);
	}
	
	getPath () {
		let me = this;
		
		return `${map ["query"][me.get ("query")].getPath ()}.${me.get ("code")}`;
	}
	
	getLabel () {
		return `${this.get ("name")} (${this.get ("code")}: ${this.get ("id")})`;
	}
};

function factory (opts) {
	let o;
	let rsc = opts.rsc;
	
	switch (rsc) {
		case "record":
			o = new _Record (opts);
			break;
		case "model":
			o = new _Model (opts);
			break;
		case "property":
			o = new _Property (opts);
			break;
		case "query":
			o = new _Query (opts);
			break;
		case "column":
			o = new _Column (opts);
			break;
		default:
			throw new Error (`factory: unknown resource: ${rsc}`);
	}
	return o;
};

module.exports = {
	map,
	rscAttrs,
	factory,
	getRsc,
	createRsc,
	removeRsc,
	parseRecDates
};
