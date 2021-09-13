const {request, parseDates} = require ("./request");

class _Rsc {
	constructor ({rsc, row, data, store}) {
		this.store = store;
		
		Object.defineProperties (this, {
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

		let initValue = (a, v) => {
			this._data [a] = v;
			this._originalData [a] = v;
		};
		parseDates (this._data);
		parseDates (this._originalData);
		
		if (data) {
			Object.keys (data).forEach (a => {
				initValue (a, data [a]);
			});
		}
		if (row) {
			for (let i = 0; i < row.length; i ++) {
				initValue (this.store.rscAttrs [rsc][i], row [i]);
			}
		}
		if (rsc != "record") {
			for (let i = 0; i < this.store.rscAttrs [rsc].length; i ++) {
				let code = this.store.rscAttrs [rsc] [i];
				
				Object.defineProperty (this, code, {
					get () {
						return this.get (code);
					},
					set (value) {
						this.set (code, value);
					}
				});
			}
		}
		if (rsc == "model") {
			this.attrs = {};
			this.properties = {};
		}
		if (rsc == "query") {
			this.attrs = {};
			this.columns = {};
		}
	}
	
	get (a) {
		return this._data [a];
	}

	set (a, v) {
		if (typeof a == "object") {
			Object.keys (a, aa => {
				this.set (aa, a [aa]);
			});
		}
		if (a == "id" && this._data.id) {
			return;
		}
		this._data [a] = v;
	}
	
	remove () {
		this._removed = true;
	}

	async sync () {
		if (this._removed) {
			return await this.store.removeRsc (this._rsc, this.get ("id"));
		}
		let attrs = {};

		for (let a in this._data) {
			if (!this._originalData.hasOwnProperty (a) || this._originalData [a] != this._data [a]) {
				attrs [a] = this._data [a];
			}
		}
		if (Object.keys (attrs).length) {
			let data = await request (this.store, Object.assign ({
				_fn: "set",
				_rsc: this._rsc,
				id: this.get ("id")
			}, attrs));

			if (this._rsc == "record") {
				let m = this.store.map ["model"][this.get ("_model")];
/*
				if (m && m.isDictionary ()) {
					delete this.store.map ["dict"][m.get ("id")];
					delete this.store.map ["dict"][m.getPath ()];
					delete this.store.dict [m.get ("id")];
					delete this.store.dict [m.getPath ()];
				}
*/
				for (let code in m.properties) {
					this.set (code, data [code]);
				}
			}
			if (this._rsc == "query") {
				this.store.map [this._rsc][this.getPath ()] = this;
			}
		}
	}

	getPath (o, path = []) {
		if (this._rsc != "model" && this._rsc != "query") {
			return null;
		}
		o = o || this;
		path.unshift (o.get ("code"));
		
		if (o.get ("parent")) {
			return this.getPath (this.store.map [this._rsc][o.get ("parent")], path);
		} else {
			return path.join (".");
		}
	}

	getLabel () {
		return`${this.get ("name")} (${this.getPath ()}: ${this.get ("id")})`;
	}

	getOpts (property = "opts") {
		return JSON.parse (this.get (property) || "{}");
	}
};

class _Record extends _Rsc {
	constructor (opts) {
		opts.rsc = "record";
		
		super (opts);
		
		if (opts.data && opts.data ["_model"]) {
			let m = this.store.map ["model"][opts.data ["_model"]];

			let define = () => {
				let a = ["id", "_model", ...Object.keys (m.properties)];
				
				for (let i = 0; i < a.length; i ++) {
					let code = a [i];
					
					Object.defineProperty (this, code, {
						get () {
							return this.get (code);
						},
						set (value) {
							this.set (code, value);
						}
					});
				}
			};
			if (m) {
				 define ();
			} else {
				this.store.getRsc ("model", opts.data ["_model"]).then (_m => {
					m = _m;
					define ();
				});
			}
/*
			this.store.getRsc ("model", opts.data ["_model"]).then (m => {
				let a = ["id", "_model", ...Object.keys (m.properties)];
				
				for (let i = 0; i < a.length; i ++) {
					let code = a [i];
					
					Object.defineProperty (me, code, {
						get () {
							return this.get (code);
						},
						set (value) {
							this.set (code, value);
						}
					});
				}
			});
*/
		}
	}

	getLabel () {
		if (this._label) {
			return this._label ();
		} else if (this.get ("name")) {
			return `${this.get ("name")} (id: ${this.get ("id")})`;
		} else {
			return this.get ("id");
		}
	}
	
	async remote (opts) {
		let data = await request (this.store, Object.assign ({
			_model: this.store.getModel (this._model).getPath (),
			id: this.get ("id")
		}, opts));

		try {
			data = JSON.parse (data);
		} catch (err) {
		}
		return data;
	}
	
	getRef (property) {
		let model = this.store.getModel (this.get ("_model"));
		
		if (model.properties [property]) {
			return `/files/${this.id}-${model.properties [property].id}-${this [property]}`;
		}
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
		return `${this.store.map ["model"][this.get ("model")].getPath ()}.${this.get ("code")}`;
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
		return `${this.store.map ["query"][this.get ("query")].getPath ()}.${this.get ("code")}`;
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

module.exports = {
	factory,
	Record
};
