import {factory, parseRecDates, Record} from "./model.js";
import {request, isServer, execute} from "./request.js";

class Store {
	constructor () {
		let me = this;
		
		me.sid = null;
		me.url = null;
		me.http = null;
		me.host = null;
		me.port = null;
		me.path = null;
		me.userId = null;
		me.roleId = null;
		me.menuId = null;
		me.listeners = {};
		me.registered = {};
		me.informerId = null;
		me.revision = 0;
		me.rscAttrs = {
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
		me.initMap ();
		me.addListener ("before-request", opts => {
			let req = opts.request;
			
			if (req._rsc == "record") {
				if (req._fn == "remove") {
					let record = me.map ["record"][req.id];
					
					if (record) {
						let m = me.getModel (record._model);
						let id = m.getPath ();
						
						if (me.dict [id]) {
							for (let i = 0; i < me.map ["dict"][id].length; i ++) {
								let record2 = me.map ["dict"][id][i];
								
								if (!record2 || record2.id == record.id) {
									me.map ["dict"][id].splice (i, 1);
									break;
								}
							}
							delete me.dict [id][record.id];
						}
					}
				}
			}
		});
		me.addListener ("after-request", opts => {
			let req = opts.request;
			let res = opts.response;
			
			if (req._rsc == "record") {
				if (req._fn == "create") {
					let m = me.getModel (req._model);
					let id = m.getPath ();
					
					if (me.dict [id]) {
						me.getRecord (res.id).then (record => {
							me.map ["dict"][id] = [record, ...me.map ["dict"][id]];
							me.dict [id][record.id] = record;
						});
					}
				}
			}
		});
		me.progress = {};
	}

	initMap () {
		let me = this;
		
		me.map = {
			"sid": null,
			"model": {},
			"property": {},
			"query": {},
			"column": {},
			"record": {},
			"dict": {}
		};
		me.dict = {};
	}
	
	addListener (event, fn) {
		let me = this;
		
		me.listeners [event] = me.listeners [event] || [];
		me.listeners [event].push (fn);
	}
	
	removeListener (event, fn) {
		let me = this;
		
		me.listeners [event] = me.listeners [event] || [];
		
		for (let i = 0; i < me.listeners [event].length; i ++) {
			if (me.listeners [event][i] == fn) {
				me.listeners [event].splice (i, 1);
				break;
			}
		}
	}
	
	callListeners (event, opts) {
		let me = this;
		
		if (me.listeners [event]) {
			for (let i = 0; i < me.listeners [event].length; i ++) {
				me.listeners [event][i] (opts);
			}
		}
	}
	
	load () {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			request (me, {
				"_fn": "getAll"
			}).then (data => {
				Object.keys (me.rscAttrs).forEach (rsc => {
					data [rsc].forEach (row => {
						let o = factory ({rsc, row, store: me});
						
						if (rsc == "model") {
							o.attrs = {};
							o.properties = {};
						}
						if (rsc == "query") {
							o.attrs = {};
							o.columns = {};
						}
						me.map [rsc][o.get ("id")] = o;
					});
					if (rsc == "model" || rsc == "query") {
						Object.keys (me.map [rsc]).forEach (id => {
							let o = me.map [rsc][id];
							
							me.map [rsc][o.getPath ()] = o;
						});
					}
					if (rsc == "property") {
						Object.keys (me.map ["property"]).forEach (id => {
							let o = me.map ["property"][id];
							let oo = me.map ["model"][o.get ("model")];
							
							if (oo) {
								oo.attrs [o.get ("code")] = o;
								oo.properties [o.get ("code")] = o;
								me.map ["property"][oo.getPath () + "." + o.get ("code")] = o;
							}
						});
					}
					if (rsc == "column") {
						Object.keys (me.map ["column"]).forEach (id => {
							let o = me.map ["column"][id];
							let oo = me.map ["query"][o.get ("query")];
							
							if (oo) {
								oo.attrs [o.get ("code")] = o;
								oo.columns [o.get ("code")] = o;
								me.map ["column"][oo.getPath () + "." + o.get ("code")] = o;
							}
						});
					}
				});
				resolve ();
			}, err => reject (err));
		});
	}
	
	informer () {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			request (me, {
				"_fn": "getNews",
				revision: me.revision
			}).then (data => {
				me.revision = data.revision;
				data.records.forEach (id => delete me.map ["record"][id]);
				
				if (data.progress && me.progress [me.sid]) {
					me.progress [me.sid] (data.progress);
				}
				if (data.metaChanged) {
					me.load ().then (() => {
						me.informerId = setTimeout (() => me.informer (), 500);
						resolve ();
					}, err => reject (err));
				} else {
					me.informerId = setTimeout (() => me.informer (), 500);
					resolve ();
				}
			}, err => reject (err));
		});
	}
	
	request (opts) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			request (me, opts).then (data => {
				resolve (data);
			}, err => reject (err));
		});
	}
	
	remote (opts) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			me.progress [me.sid] = opts.progress;
			
			opts._model = opts._model || opts.model;
			opts._method = opts._method || opts.method;
			
			delete opts.store;
			delete opts.progress;
			
			request (me, opts).then (data => {
				if (data && data.result) {
					data = data.result;
				}
				delete me.progress [me.sid];

				resolve (data);
			}, err => {
				delete me.progress [me.sid];
				
				reject (err);
			});
		});
	}
	
	end () {
		clearTimeout (this.informerId);
	}
	
	auth ({url, username, password}) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			if (url) {
				me.setUrl (url);
			}
			request (me, {
				"_fn": "auth",
				username,
				password
			}).then (data => {
				if (data.sessionId) {
					me.setSessionId (data.sessionId);
				}
				me.load ().then (() => {
					me.informer ();
					
					me.username = username;
					me.userId = data.userId;
					me.roleId = data.roleId;
					me.menuId = data.menuId;
					me.code = data.code;
					
					resolve ({sid: data.sessionId, userId: data.userId, roleId: data.roleId, menuId: data.menuId, code: data.code, name: data.name});
					me.callListeners ("connect", data);
				}, err => reject (err));
			}, err => reject (err));
		});
	}
	
	getRsc (rsc, id) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			let o = me.map [rsc][id];
			
			if (o) {
				resolve (o);
			} else {
				request (me, {
					_fn: "get",
					_rsc: rsc,
					id
				}).then (data => {
					o = factory ({rsc, data, store: me});
					
					//me.map [rsc][o.get ("id")] = o;
					//me.map [rsc][o.getPath ()] = o;
					
					resolve (o);
				}, err => reject (err));
			}
		});
	}
	
	createRsc (rsc, attrs) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			request (me, Object.assign ({
				_fn: "create",
				_rsc: rsc
			}, attrs)).then (data => {
				let o = factory ({rsc, data, store: me});
				
				me.map [rsc][o.get ("id")] = o;
				me.map [rsc][o.getPath ()] = o;
				
				if (rsc == "record" && attrs ["_model"]) {
					let m = me.map ["model"][attrs ["_model"]];
					
					if (m.isDictionary ()) {
						delete me.map ["dict"][m.get ("id")];
						delete me.map ["dict"][m.getPath ()];
						delete me.dict [m.get ("id")];
						delete me.dict [m.getPath ()];
					}
				}
				if (rsc == "property") {
					me.map ["model"][o.get ("model")].attrs [o.get ("code")] = o;
					me.map ["model"][o.get ("model")].properties [o.get ("code")] = o;
				}
				if (rsc == "column") {
					me.map ["query"][o.get ("query")].attrs [o.get ("code")] = o;
					me.map ["query"][o.get ("query")].columns [o.get ("code")] = o;
				}
				resolve (o);
			}, err => reject (err));
		});
	}
	
	removeRsc (rsc, id) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			request (me, {
				_fn: "remove",
				_rsc: rsc,
				id
			}).then (() => {
				if (rsc == "property") {
					let o = me.map ["property"][id];
					
					if (o) {
						delete me.map ["model"][o.get ("model")].attrs [o.get ("code")];
						delete me.map ["model"][o.get ("model")].properties [o.get ("code")];
					}
				}
				if (rsc == "column") {
					let o = me.map ["column"][id];
					
					if (o) {
						delete me.map ["query"][o.get ("query")].attrs [o.get ("code")];
						delete me.map ["query"][o.get ("query")].columns [o.get ("code")];
					}
				}
				delete me.map [rsc][id];
				
				let o = me.map [rsc][id];
				
				if (o) {
					delete me.map [rsc][o.getPath ()];
					
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
				resolve ();
			}, err => reject (err));
		});
	}
	
	startTransaction (description) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			request (me, {
				"_fn": "startTransaction",
				description
			}).then (() => {
				resolve ();
			}, err => reject (err));
		});
	};
	
	commitTransaction () {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			request (me, {
				"_fn": "commitTransaction"
			}).then (() => {
				resolve ();
			}, err => reject (err));
		});
	}
	
	rollbackTransaction () {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			request (me, {
				"_fn": "rollbackTransaction"
			}).then (() => {
				resolve ();
			}, err => reject (err));
		});
	}
	
	getRecord (id) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			me.getRsc ("record", id).then ((rsc) => resolve (rsc), err => reject (err));
		});
	}
	
	createRecord (attrs) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			me.createRsc ("record", attrs).then ((rsc) => resolve (rsc), err => reject (err));
		});
	}
	
	removeRecord (id) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			me.removeRsc ("record", id).then ((rsc) => resolve (rsc), err => reject (err));
		});
	}
	
	createModel (attrs) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			me.createRsc ("model", attrs).then ((rsc) => resolve (rsc), err => reject (err));
		});
	}
	
	removeModel (id) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			me.removeRsc ("model", id).then ((rsc) => resolve (rsc), err => reject (err));
		});
	}
	
	createQuery (attrs) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			me.createRsc ("query", attrs).then ((rsc) => resolve (rsc), err => reject (err));
		});
	}
	
	removeQuery (id) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			me.removeRsc ("query", id).then ((rsc) => resolve (rsc), err => reject (err));
		});
	}
	
	createProperty (attrs) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			me.createRsc ("property", attrs).then ((rsc) => resolve (rsc), err => reject (err));
		});
	}
	
	removeProperty (id) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			me.removeRsc ("property", id).then ((rsc) => resolve (rsc), err => reject (err));
		});
	}
	
	createColumn (attrs) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			me.createRsc ("column", attrs).then ((rsc) => resolve (rsc), err => reject (err));
		});
	}
	
	removeColumn (id) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			me.removeRsc ("column", id).then ((rsc) => resolve (rsc), err => reject (err));
		});
	}
	
	getModel (id) {
		let me = this;
		let o = me.map ["model"][id];
		
		if (o) {
			return o;
		} else {
			throw new Error (`unknown model: ${id}`);
		}
	}
	
	getProperty (id) {
		let me = this;
		let o = me.map ["property"][id];
		
		if (o) {
			return o;
		} else {
			throw new Error (`unknown property: ${id}`);
		}
	}
	
	getQuery (id) {
		let me = this;
		let o = me.map ["query"][id];
		
		if (o) {
			return o;
		} else {
			throw new Error (`unknown query: ${id}`);
		}
	}
	
	getColumn (id) {
		let me = this;
		let o = me.map ["column"][id];
		
		if (o) {
			return o;
		} else {
			throw new Error (`unknown column: ${id}`);
		}
	}
	
	getData (opts) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			request (me, Object.assign ({
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
	}
	
	getRecs (opts) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			request (me, Object.assign ({
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
				resolve (result.recs);
			}, err => reject (err));
		});
	}
	
	getDict (id) {
		let me = this;
		
/*
		return new Promise ((resolve, reject) => {
			if (me.map ["dict"][id]) {
				return resolve (me.map ["dict"][id]);
			}
			request (me, {
				"_fn": "getDict",
				"model": id
			}).then (recs => {
				me.map ["dict"][id] = recs;
				me.dict [id] = {};
				
				recs.forEach (rec => me.dict [id][rec.id] = rec);
				
				resolve (recs);
			}, err => reject (err));
		});
*/
		return new Promise ((resolve, reject) => {
			if (me.map ["dict"][id]) {
				return resolve (me.map ["dict"][id]);
			}
			me.getRecords ({model: id}).then (records => {
				me.map ["dict"][id] = records;
				me.dict [id] = {};
				
				records.forEach (record => me.dict [id][record.id] = record);
				
				resolve (records);
			}, err => reject (err));
		});
	}
	
	getLog (recordId, propertyId) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			request (me, {
				"_fn": "getLog",
				"record": recordId,
				"property": propertyId
			}).then (recs => {
				resolve (recs);
			}, err => reject (err));
		});
	}
	
	getUserId () {
		return this.userId;
	}
	
	getRoleId () {
		return this.roleId;
	}
	
	getMenuId () {
		return this.menuId;
	}
	
	setSessionId (sid) {
		this.sid = sid;
	}
	
	getSessionId () {
		return this.sid;
	}
	
	setUrl (url) {
		let me = this;
		
		if (isServer ()) {
			let opts = require ("url").parse (url);
			
			me.url = url;
			me.http = opts.protocol == "https:" ? require ("https") : require ("http");
			me.host = opts.hostname;
			me.port = opts.port || (opts.protocol == "https:" ? 443 : 80);
			me.path = opts.path;
		} else {
			me.url = url;
		}
	}
	
	getUrl () {
		return this.url;
	}
	
	upload ({recordId, propertyId, name, file}) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			let formData;
			
			if (isServer ()) {
				let FormData = require ("form-data");
				
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
			let url = me.getUrl ();
			
			if (url [url.length - 1] == "/") {
				url = url.substr (0, url.length - 1);
			}
			if (isServer ()) {
				formData.submit ({
					host: me.host,
					port: me.port,
					path: `${me.path}upload?sid=${me.sid}`,
				}, function (err, res) {
					resolve (res.statusCode);
				});
			} else {
				fetch (`${url}/upload?sid=${me.sid}`, {
					method: "POST",
					body: formData
				}).then (() => {
					resolve ();
				});
			}
		});
	}
	
	register (path, Cls) {
		this.registered [path] = Cls;
	}
	
	getRegistered (path) {
		return this.registered [path];
	}
	
	getRecords (opts) {
		let me = this;
		
		if (!opts.model) {
			throw new Error ("model not exist");
		}
		if (!me.map ["model"][opts.model]) {
			throw new Error (`unknown model: ${opts.model}`);
		}
		return new Promise ((resolve, reject) => {
			request (me, Object.assign ({
				"_fn": "getData"
			}, opts)).then (result => {
				let recs = result.recs.map (rec => {
					let newRec = {};
					
					result.cols.forEach ((col, i) => {
						newRec [col.code] = rec [i];
					});
					parseRecDates (newRec);
					
					return newRec;
				});
				let records = recs.map (data => {
					if (me.map ["record"][data.id]) {
						return me.map ["record"][data.id];
					} else {
						data._model = opts.model;
						
						let record = factory ({rsc: "record", data, store: me});
						
						me.map ["record"][data.id] = record;
						
						return record;
					}
				});
				resolve (records);
			}, err => reject (err));
		});
	}
	
	getOpts (code) {
		let v = JSON.parse (localStorage.getItem (this.code) || "{}");
		
		return v [code] || {};
	}
	
	setOpts (code, opts) {
		let v = JSON.parse (localStorage.getItem (this.code) || "{}");
		
		v [code] = opts || {};
		localStorage.setItem (this.code, JSON.stringify (v));
	}
};

export {
	Store,
	factory,
	Record,
	isServer,
	execute
};

export default {
	Store,
	factory,
	Record,
	isServer,
	execute
};
