import urlModule from "url";
import httpModule from "http";
import httpsModule from "https";
import FormData from "form-data";
import {factory, Record} from "./model.js";
import {parseDates, request, isServer, execute} from "./request.js";

class Store {
	constructor () {
		this.sid = null;
		this.url = null;
		this.http = null;
		this.host = null;
		this.port = null;
		this.path = null;
		this.userId = null;
		this.roleId = null;
		this.menuId = null;
		this.listeners = {};
		this.registered = {};
		this.informerId = null;
		this.revision = 0;
		this.inTransaction = false;
		this.rscAttrs = {
			"model": [
				"id", "parent", "name", "code", "description", "order", "unlogged", "query", "opts", "start", "end", "schema", "record"
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
		this.initMap ();
		this.addListener ("before-request", opts => {
			let req = opts.request;
			
			if (req._rsc == "record") {
				if (req._fn == "remove") {
					let record = this.map ["record"][req.id];
					
					if (record) {
						let m = this.getModel (record._model);
						let id = m.getPath ();
						
						if (this.dict [id]) {
							for (let i = 0; i < this.map ["dict"][id].length; i ++) {
								let record2 = this.map ["dict"][id][i];
								
								if (!record2 || record2.id == record.id) {
									this.map ["dict"][id].splice (i, 1);
									break;
								}
							}
							delete this.dict [id][record.id];
						}
					}
				}
			}
		});
		this.addListener ("after-request", opts => {
			let req = opts.request;
			let res = opts.response;
			
			if (req._rsc == "record") {
				if (req._fn == "create") {
					let m = this.getModel (req._model);
					let id = m.getPath ();
					
					if (this.dict [id]) {
						this.getRecord (res.id).then (record => {
							this.map ["dict"][id] = [record, ...this.map ["dict"][id]];
							this.dict [id] = this.dict [id] || {};
							this.dict [id][record.id] = record;
						});
					}
				}
			}
		});
		this.progress = {};
	}

	initMap () {
		this.map = {
			"sid": null,
			"model": {},
			"property": {},
			"query": {},
			"column": {},
			"record": {},
			"dict": {}
		};
		this.dict = {};
	}
	
	addListener (event, fn) {
		this.listeners [event] = this.listeners [event] || [];
		this.listeners [event].push (fn);
	}
	
	removeListener (event, fn) {
		this.listeners [event] = this.listeners [event] || [];
		
		for (let i = 0; i < this.listeners [event].length; i ++) {
			if (this.listeners [event][i] == fn) {
				this.listeners [event].splice (i, 1);
				break;
			}
		}
	}
	
	async callListeners (event, opts) {
		if (this.listeners [event]) {
			for (let i = 0; i < this.listeners [event].length; i ++) {
				await execute (this.listeners [event][i], opts);
			}
		}
	}
	
	async load () {
		let data = await request (this, {
			"_fn": "getAll"
		});
		Object.keys (this.rscAttrs).forEach (rsc => {
			data [rsc].forEach (row => {
				let o = factory ({rsc, row, store: this});

				if (rsc == "model") {
					o.attrs = {};
					o.properties = {};
				}
				if (rsc == "query") {
					o.attrs = {};
					o.columns = {};
				}
				this.map [rsc][o.get ("id")] = o;
			});
			if (rsc == "model" || rsc == "query") {
				Object.keys (this.map [rsc]).forEach (id => {
					let o = this.map [rsc][id];

					this.map [rsc][o.getPath ()] = o;
				});
			}
			if (rsc == "property") {
				Object.keys (this.map ["property"]).forEach (id => {
					let o = this.map ["property"][id];
					let oo = this.map ["model"][o.get ("model")];

					if (oo) {
						oo.attrs [o.get ("code")] = o;
						oo.properties [o.get ("code")] = o;
						this.map ["property"][oo.getPath () + "." + o.get ("code")] = o;
					}
				});
			}
			if (rsc == "column") {
				Object.keys (this.map ["column"]).forEach (id => {
					let o = this.map ["column"][id];
					let oo = this.map ["query"][o.get ("query")];

					if (oo) {
						oo.attrs [o.get ("code")] = o;
						oo.columns [o.get ("code")] = o;
						this.map ["column"][oo.getPath () + "." + o.get ("code")] = o;
					}
				});
			}
		});
	}
	
	async informer () {
		let data;

		try {
			data = await request (this, {
				"_fn": "getNews",
				revision: this.revision
			});
		} catch (err) {
			if (this.sid) {
				return this.informerId = setTimeout (() => this.informer (), 5000);
			}
		}
		this.revision = data.revision;

		//data.records.forEach (id => delete this.map ["record"][id]);
/*
		if (data.records.length) {
			await this.callListeners ("remoteChange", data.records);
		}
*/
		if (data.created.length || data.updated.length || data.deleted.length) {
			await this.callListeners ("record", data);
		}
		if (data.progress && this.progress [this.sid]) {
			this.progress [this.sid] (data.progress);
		}
		if (data.metaChanged) {
			await this.load ();

			if (this.sid) {
				this.informerId = setTimeout (() => this.informer (), 500);
			}
		} else {
			if (this.sid) {
				this.informerId = setTimeout (() => this.informer (), 500);
			}
		}
	}
	
	async remote (opts) {
		this.progress [this.sid] = opts.progress;

		opts._model = opts._model || opts.model;
		opts._method = opts._method || opts.method;

		delete opts.store;
		delete opts.progress;

		try {
			let data = await request (this, opts);

			if (data && data.result) {
				data = data.result;
			}
			delete this.progress [this.sid];

			return data;
		} catch (err) {
			delete this.progress [this.sid];
			throw err;
		}
	}
	
	end () {
		this.sid = null;
		this.username = null;
		this.userId = null;
		this.roleId = null;
		this.roleCode = null;
		this.menuId = null;
		clearTimeout (this.informerId);
		this.callListeners ("disconnect");
	}
	
	async auth ({url, username, password}) {
		if (url) {
			this.setUrl (url);
		}
		let data = await request (this, {
			"_fn": "auth",
			username,
			password
		});
		if (data.accessToken) {
			this.sid = data.accessToken;
			this.accessToken = data.accessToken;
			this.refreshToken = data.refreshToken;
		}
		await this.load ();
		this.informer ();

		this.username = username;
		this.userId = data.userId;
		this.roleId = data.roleId;
		this.roleCode = data.roleCode;
		this.menuId = data.menuId;
		this.code = data.code;

		let result = {
			id: data.id, sid: data.accessToken, userId: data.userId, username, roleId: data.roleId, roleCode: data.roleCode, menuId: data.menuId, code: data.code, name: data.name
		};
		await this.callListeners ("connect", result);
		return result;
	}
	
	async getRsc (rsc, id) {
		let o = this.map [rsc][id];

		if (o) {
			return o;
		} else {
			let data = await request (this, {
				_fn: "get",
				_rsc: rsc,
				id
			});
			o = factory ({rsc, data, store: this});
			//this.map [rsc][o.get ("id")] = o;
			//this.map [rsc][o.getPath ()] = o;

			return o;
		}
	}
	
	async createRsc (rsc, attrs) {
		let data = await request (this, Object.assign ({
			_fn: "create",
			_rsc: rsc
		}, attrs));
		let o = factory ({rsc, data, store: this});

		this.map [rsc][o.get ("id")] = o;
		this.map [rsc][o.getPath ()] = o;

		if (rsc == "record" && attrs ["_model"]) {
			this.unloadDict (attrs ["_model"]);
		}
		if (rsc == "property") {
			this.map ["model"][o.get ("model")].attrs [o.get ("code")] = o;
			this.map ["model"][o.get ("model")].properties [o.get ("code")] = o;
		}
		if (rsc == "column") {
			this.map ["query"][o.get ("query")].attrs [o.get ("code")] = o;
			this.map ["query"][o.get ("query")].columns [o.get ("code")] = o;
		}
		return o;
	}

	// todo: store.dict?
	async removeRsc (rsc, id) {
		await request (this, {
			_fn: "remove",
			_rsc: rsc,
			id
		});
		if (rsc == "record") {
			let o = this.map ["record"][id];

			if (o) {
				this.unloadDict (o._model);
			}
		}
		if (rsc == "property") {
			let o = this.map ["property"][id];

			if (o) {
				delete this.map ["model"][o.get ("model")].attrs [o.get ("code")];
				delete this.map ["model"][o.get ("model")].properties [o.get ("code")];
			}
		}
		if (rsc == "column") {
			let o = this.map ["column"][id];

			if (o) {
				delete this.map ["query"][o.get ("query")].attrs [o.get ("code")];
				delete this.map ["query"][o.get ("query")].columns [o.get ("code")];
			}
		}
		delete this.map [rsc][id];

		let o = this.map [rsc][id];

		if (o) {
			delete this.map [rsc][o.getPath ()];

			/*
			todo: no loaded record
							if (rsc == "record") {
								let m = map ["model"][attrs ["_model"]];

								if (m && m.isDictionary ()) {
									delete map ["dict"][m.get ("id")];
									delete map ["dict"][m.getPath ()];
								}
							}
			*/
		}
	}
	
	async startTransaction (description) {
		await request (this, {"_fn": "startTransaction", description});
		this.inTransaction = true;
	};
	
	async commitTransaction () {
		await request (this, {"_fn": "commitTransaction"});
		this.inTransaction = false;
	}
	
	async rollbackTransaction () {
		await request (this, {"_fn": "rollbackTransaction"});
		this.inTransaction = false;
	}
	
	getRecord = id => this.getRsc ("record", id);

	createRecord = attrs => this.createRsc ("record", attrs);

	removeRecord = id => this.removeRsc ("record", id);

	createModel = attrs => this.createRsc ("model", attrs);

	removeModel  = id => this.removeRsc ("model", id);

	createQuery = attrs => this.createRsc ("query", attrs);

	removeQuery = id => this.removeRsc ("query", id);

	createProperty = attrs => this.createRsc ("property", attrs);

	removeProperty = id => this.removeRsc ("property", id);

	createColumn = attrs => this.createRsc ("column", attrs);

	removeColumn = id => this.removeRsc ("column", id);

	getModel (id) {
		let o = this.map ["model"][id];
		
		if (o) {
			return o;
		} else {
			throw new Error (`unknown model: ${id}`);
		}
	}
	
	getProperty (id) {
		let o = this.map ["property"][id];
		
		if (o) {
			return o;
		} else {
			throw new Error (`unknown property: ${id}`);
		}
	}
	
	getQuery (id) {
		let o = this.map ["query"][id];
		
		if (o) {
			return o;
		} else {
			throw new Error (`unknown query: ${id}`);
		}
	}
	
	getColumn (id) {
		let o = this.map ["column"][id];
		
		if (o) {
			return o;
		} else {
			throw new Error (`unknown column: ${id}`);
		}
	}
	
	async getData (opts) {
		let result = await request (this, Object.assign ({
			"_fn": "getData"
		}, opts));

		result.recs = result.recs.map (rec => {
			let newRec = {};

			result.cols.forEach ((col, i) => {
				newRec [col.code] = rec [i];
			});
			parseDates (newRec);

			return newRec;
		});
		return result;
	}
	
	getRecs = async opts => (await this.getData (opts)).recs;

	async getDict (id) {
/*
		return new Promise ((resolve, reject) => {
			if (this.map ["dict"][id]) {
				return resolve (this.map ["dict"][id]);
			}
			request (this, {
				"_fn": "getDict",
				"model": id
			}).then (recs => {
				this.map ["dict"][id] = recs;
				this.dict [id] = {};
				
				recs.forEach (rec => this.dict [id][rec.id] = rec);
				
				resolve (recs);
			}, err => reject (err));
		});
*/
		let m = this.getModel (id);
		let path = m.getPath ();
		id = m.id;

		if (this.map ["dict"][id]) {
			return this.map ["dict"][id];
		}
		let records = await this.getRecords ({model: path, sort: true});

		this.map ["dict"][id] = records;
		this.dict [id] = {};

		records.forEach (record => {
			this.dict [id][record.id] = record;

			if (record.code && !this.dict [id][record.code]) {
				this.dict [id][record.code] = record;
			}
		});
		this.map ["dict"][path] = this.map ["dict"][id];
		this.dict [path] = this.dict [id];

		return records;
	}

	unloadDict (id) {
		let m = this.getModel (id);

		if (this.map ["dict"][m.get ("id")]) {
			delete this.map ["dict"][m.get ("id")];
			delete this.map ["dict"][m.getPath ()];
			delete this.dict [m.get ("id")];
			delete this.dict [m.getPath ()];
		}
	}

	getLog = (recordId, propertyId) => request (this, {
		"_fn": "getLog",
		"record": recordId,
		"property": propertyId
	});

	register = (path, Cls) => this.registered [path] = Cls;

	getRegistered = path => this.registered [path];

	getUserId = () => this.userId

	getRoleId = () => this.roleId;

	getMenuId = () => this.menuId;

	setSessionId = sid => this.sid = sid;

	getSessionId = () => this.sid;

	getUrl = () => this.url;

	setUrl (url) {
		if (isServer ()) {
			let opts = urlModule.parse (url);
			
			this.url = url;
			this.http = opts.protocol == "https:" ? httpsModule : httpModule;
			this.host = opts.hostname;
			this.port = opts.port || (opts.protocol == "https:" ? 443 : 80);
			this.path = opts.path;
		} else {
			this.url = url;
		}
	}

	upload ({recordId, propertyId, name, file}) {
		return new Promise ((resolve, reject) => {
			let formData;

			if (isServer ()) {
				formData = new FormData ();
			} else {
				formData = new FormData ();
			}
			formData.append ("objectId", recordId);
			formData.append ("classAttrId", propertyId);
			formData.append ("name", name);
			formData.append ("file", file, {
				filename: name,
				knownLength: file.length
			});
			let url = this.getUrl ();

			if (url [url.length - 1] == "/") {
				url = url.substr (0, url.length - 1);
			}
			if (isServer ()) {
				formData.submit ({
					host: this.host,
					port: this.port,
					path: `${this.path}upload`,
					headers: {
						Authorization: `Bearer ${this.accessToken}`
					}
				}, function (err, res) {
					if (err) {
						return reject (err);
					}
					resolve (res.statusCode);
				});
			} else {
				fetch (`${url}/upload`, {
					method: "POST",
					body: formData,
					headers: {
						Authorization: `Bearer ${this.accessToken}`
					}
				}).then (resolve).catch (reject);
			}
		});
	}
	
	async getRecords (opts) {
		if (!opts.model) {
			throw new Error ("model not exist");
		}
		if (!this.map ["model"][opts.model]) {
			throw new Error (`unknown model: ${opts.model}`);
		}
		let result = await request (this, Object.assign ({
			"_fn": "getData"
		}, opts));
		let recs = result.recs.map (rec => {
			let newRec = {};

			result.cols.forEach ((col, i) => {
				newRec [col.code] = rec [i];
			});
			parseDates (newRec);

			return newRec;
		});
		let records = recs.map (data => {
			if (this.map ["record"][data.id]) {
				return this.map ["record"][data.id];
			} else {
				data._model = opts.model;

				let record = factory ({rsc: "record", data, store: this});

				this.map ["record"][data.id] = record;

				return record;
			}
		});
		if (opts.sort && recs.length && recs [0].hasOwnProperty ("order")) {
			records = records.sort ((a, b) => a.order > b.order || -1);
		}
		return records;
	}
	
	getOpts = code => JSON.parse (localStorage.getItem (this.code) || "{}") [code] || {};

	setOpts (code, opts) {
		let v = JSON.parse (localStorage.getItem (this.code) || "{}");
		v [code] = opts || {};
		localStorage.setItem (this.code, JSON.stringify (v));
	}
	
	abortAction () {
		if (!isServer ()) {
			request (this, {
				"_fn": "abortAction"
			}).then (() => {}, () => {});
		}
		this.abort = true;
	}
	
	getModelRecords (native) {
		let records = [], map = {};
		
		for (let id in this.map.model) {
			let record = this.map.model [id];
			
			if (!map [record.id]) {
				if (record.id >= 1000 || (native && record.id < 6)) {
					records.push (record);
					map [record.id] = true;
				}
			}
		}
		return records;
	}
	
	getQueryRecords () {
		let records = [], map = {};
		
		for (let id in this.map.query) {
			let record = this.map.query [id];
			
			if (record.id >= 1000 && !map [record.id]) {
				records.push (record);
				map [record.id] = true;
			}
		}
		return records;
	}
	async transaction (description, fn) {
		if (typeof (description) == "function") {
			fn = description;
			description = "";
		}
		await this.startTransaction (description);

		try {
			let result = await fn ();
			await this.commitTransaction ();
			return result;
		} catch (err) {
			await this.rollbackTransaction ();
			throw err;
		}
	}

	getStat = () => request (this, {
		"_fn": "getStat"
	});
};

export {
	Store,
	factory,
	Record,
	isServer,
	request,
	execute
};
export default {
	Store,
	factory,
	Record,
	isServer,
	request,
	execute
};
