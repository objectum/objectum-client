"use strict";

const {factory, parseRecDates, Record} = require ("./model");
const {request, isServer} = require ("./request");

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
		me.map = {
			"sid": null,
			"model": {},
			"property": {},
			"query": {},
			"column": {},
			"record": {},
			"dict": {}
		};
		me.rscAttrs = {
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
		
		me.listeners [event] = me.listeners [event] || [];
		
		for (let i = 0; i < me.listeners [event].length; i ++) {
			me.listeners [event][i] (opts);
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
				
				me.informerId = setTimeout (() => me.informer (), 5000);
				resolve ();
			}, err => reject (err));
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
					
					me.userId = data.userId;
					me.roleId = data.roleId;
					me.menuId = data.menuId;
					
					resolve (data.sessionId, data.userId, data.roleId, data.menuId);
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
					
					me.map [rsc][o.get ("id")] = o;
					me.map [rsc][o.getPath ()] = o;
					
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
			}).then (() => resolve (), err => reject (err));
		});
	};
	
	commitTransaction () {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			request (me, {
				"_fn": "commitTransaction"
			}).then (() => resolve (), err => reject (err));
		});
	}
	
	rollbackTransaction () {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			request (me, {
				"_fn": "rollbackTransaction"
			}).then (() => resolve (), err => reject (err));
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
	
	/*
	async function execute (sql) {
		return await request ({
			fn: "execute",
			sql
		});
	};
	*/
	
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
	
	getDict (id) {
		let me = this;
		
		return new Promise ((resolve, reject) => {
			if (me.map ["dict"][id]) {
				return resolve (me.map ["dict"][id]);
			}
			request (me, {
				"_fn": "getDict",
				"model": id
			}).then (recs => {
				me.map ["dict"][id] = recs;
				
				resolve (recs);
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
	
	getRecords (opts) {
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
					path: `${me.path}upload?sessionId=${me.sid}`,
				}, function (err, res) {
					resolve (res.statusCode);
				});
			} else {
				fetch (`${url}/upload?sessionId=${me.sid}`, {
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
};

module.exports = {
	Store,
	factory,
	Record,
	isServer
};
