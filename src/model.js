import {request} from "./request.js";

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

class _Rsc {
	constructor ({rsc, row, data, store}) {
		let me = this;

		me.store = store;
		
		Object.defineProperties (me, {
			_rsc: {
				value: rsc,
				writable: false,
				enumerable: false,
				configurable: false
			},
			_data: {
				value: {},
				writable: false,
				enumerable: false,
				configurable: false
			},
			_originalData: {
				value: {},
				writable: false,
				enumerable: false,
				configurable: false
			},
			_removed: {
				value: false,
				writable: true,
				enumerable: false,
				configurable: false
			}
		});

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
				initValue (me.store.rscAttrs [rsc][i], row [i]);
			}
		}
		if (rsc != "record") {
			for (let i = 0; i < me.store.rscAttrs [rsc].length; i ++) {
				let code = me.store.rscAttrs [rsc] [i];
				
				Object.defineProperty (me, code, {
					get () {
						return me.get (code);
					},
					set (value) {
						me.set (code, value);
					}
				});
			}
		}
		if (rsc == "model") {
			me.attrs = {};
			me.properties = {};
		}
		if (rsc == "query") {
			me.attrs = {};
			me.columns = {};
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
		let me = this;
		
		return new Promise ((resolve, reject) => {
			if (me._removed) {
				return me.store.removeRsc (me._rsc, me.get ("id")).then (() => resolve (), err => reject (err));
			}
			let attrs = {};
			
			for (let a in me._data) {
/*
				if (me._originalData [a] instanceof Date) {
					me._originalData [a] = me._originalData [a].toISOString ();
				}
				if (me._data [a] instanceof Date) {
					me._data [a] = me._data [a].toISOString ();
				}
*/
				if (! me._originalData.hasOwnProperty (a) || me._originalData [a] != me._data [a]) {
					attrs [a] = me._data [a];
				}
			}
			if (Object.keys (attrs).length) {
				request (me.store, Object.assign ({
					_fn: "set",
					_rsc: me._rsc,
					id: me.get ("id")
				}, attrs)).then ((data) => {
					if (me._rsc == "record") {
						let m = me.store.map ["model"][me.get ("_model")];
						
/*
						if (m && m.isDictionary ()) {
							delete me.store.map ["dict"][m.get ("id")];
							delete me.store.map ["dict"][m.getPath ()];
							delete me.store.dict [m.get ("id")];
							delete me.store.dict [m.getPath ()];
						}
*/
						for (let code in m.properties) {
							me.set (code, data [code]);
						}
					}
					if (me._rsc == "query") {
						me.store.map [me._rsc][me.getPath ()] = me;
					}
					resolve ();
				}, err => reject (err));
			} else {
				resolve ();
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
			return me.getPath (me.store.map [me._rsc][o.get ("parent")], path);
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
		
		let me = this;
		
		if (opts.data && opts.data ["_model"]) {
			let m = me.store.map ["model"][opts.data ["_model"]];

			let define = function () {
				let a = ["id", "_model", ...Object.keys (m.properties)];
				
				for (let i = 0; i < a.length; i ++) {
					let code = a [i];
					
					Object.defineProperty (me, code, {
						get () {
							return me.get (code);
						},
						set (value) {
							me.set (code, value);
						}
					});
				}
			};
			if (m) {
				 define ();
			} else {
				me.store.getRsc ("model", opts.data ["_model"]).then (_m => {
					m = _m;
					define ();
				});
			}
/*
			me.store.getRsc ("model", opts.data ["_model"]).then (m => {
				let a = ["id", "_model", ...Object.keys (m.properties)];
				
				for (let i = 0; i < a.length; i ++) {
					let code = a [i];
					
					Object.defineProperty (me, code, {
						get () {
							return me.get (code);
						},
						set (value) {
							me.set (code, value);
						}
					});
				}
			});
*/
		}
	}

	getLabel () {
		let me = this;

		if (me._label) {
			return me._label ();
		} else if (me.get ("name")) {
			return `${me.get ("name")} (id: ${me.get ("id")})`;
		} else {
			return this.get ("id");
		}
	}
	
	remote (opts) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			request (me.store, Object.assign ({
				_model: me.store.getModel (me._model).getPath (),
				id: me.get ("id")
			}, opts)).then (data => {
				try {
					data = JSON.parse (data);
				} catch (err) {
				}
				resolve (data);
			}, err => reject (err));
		});
	}
	
	getRef (property) {
		let me = this;
		let model = me.store.getModel (me.get ("_model"));
		
		if (model.properties [property]) {
			return `/files/${me.id}-${model.properties [property].id}-${me [property]}`;
		}
	}
	
	getOpts (property) {
		let me = this;
		let s = me [property] || "{}";
		
		return JSON.parse (s);
	}
};

class _Model extends _Rsc {
	constructor (opts) {
		opts.rsc = "model";
		super (opts);
	}

	getTable () {
		return `${this.get ("code").toLowerCase ()}_${this.get ("id")}`;
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
		
		return `${me.store.map ["model"][me.get ("model")].getPath ()}.${me.get ("code")}`;
	}
	
	getField () {
		return `${this.get ("code").toLowerCase ()}_${this.get ("id")}`;
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
	
	getModel () {
		let mid;
		let query = this.query;
		
		if (query) {
			let tokens = query.split ("from");
			
			if (tokens.length > 1) {
				tokens = tokens [1].split ('{"model"');
				
				let token = tokens [1].substr (0, tokens [1].indexOf ("}"));
				let o = JSON.parse (`{"model"${token}}`);
				
				mid = o.model;
			}
		}
		return mid;
	}
};

class _Column extends _Rsc {
	constructor (opts) {
		opts.rsc = "column";
		super (opts);
	}
	
	getPath () {
		let me = this;
		
		return `${me.store.map ["query"][me.get ("query")].getPath ()}.${me.get ("code")}`;
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
			let m = opts.store.map ["model"][opts.data._model];
			
			if (opts.store.registered [m.getPath ()]) {
				let M = opts.store.registered [m.getPath ()];
				o = new M (opts);
			} else {
				o = new _Record (opts);
			}
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
	opts.store.map [rsc][o.id] = o;
	opts.store.map [rsc][o.getPath ()] = o;
	
	return o;
};

const Record = _Record;

export {
	factory,
	parseRecDates,
	Record
};
