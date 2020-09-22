const tzOffset = new Date ().getTimezoneOffset () * 60000;

function isServer () {
	if (typeof window !== "undefined") {
		return false;
	} else {
		return true;
	}
};

function parseDates (rec) {
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

function updateDates (data) {
	if (data instanceof Array) {
		for (let i = 0; i < data.length; i ++) {
			parseDates (data [i]);
		}
	} else {
		parseDates (data);
	}
};

// корректирует дату, чтобы после JSON.stringify строка даты "2020-08-31T21:00:00.000Z" была "2020-09-01T00:00:00.000Z"
function prepareDates (json) {
	for (let a in json) {
		let v = json [a];
		
		if (v && typeof (v) == "object" && v.getMonth) {
			json [a] = (new Date (v - tzOffset)).toISOString ();
		}
	}
};

function clientRequest (store, json) {
	if (store.abort && json._fn != "getNews") {
		store.abort = false;
		throw new Error ("Action aborted");
	}
	return new Promise ((resolve, reject) => {
		if (!store.url) {
			return reject (new Error ("url not exists"));
		}
		store.callListeners ("before-request", {request: json});
		
		if (json._trace) {
			json._trace = [["clientRequest-start", new Date ().getTime ()]];
		}
		prepareDates (json);
		
		fetch (`${store.url}${store.sid ? `?sid=${store.sid}` : ``}`, {
			headers: {
				"Content-Type": "application/json; charset=utf-8"
			},
			method: "POST",
			body: JSON.stringify (json)
		}).then (res => {
			res.json ().then (data => {
				if (data.error) {
					console.error (data);
					return reject (new Error (data.error));
				}
				updateDates (data);
				
				if (data._trace) {
					data._trace.push (["clientRequest-end", new Date ().getTime ()]);
				}
				resolve (data);
				
				store.callListeners ("after-request", {request: json, response: data});
			}, err => reject (err));
		}, err => reject (err));
	});
};

function serverRequest (store, json) {
	if (store.abort && json._fn != "getNews") {
		store.abort = false;
		throw new Error ("Action aborted");
	}
	return new Promise ((resolve, reject) => {
		if (!store.url) {
			return reject (new Error ("url not exists"));
		}
		prepareDates (json);
		
		let data = JSON.stringify (json);
		let resData, reqErr;

		store.callListeners ("before-request", {request: json});
		
		if (json._trace) {
			json._trace = [["serverRequest-start", new Date ().getTime ()]];
		}
		let req = store.http.request ({
			host: store.host,
			port: store.port,
			path: `${store.path}${store.sid ? `?sid=${store.sid}` : ``}`,
			method: "POST",
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				"Content-Length": Buffer.byteLength (data, "utf8")//,
//				"Connection": "Keep-Alive"
			}
		}, function (res) {
			res.setEncoding ("utf8");
			
			res.on ("data", function (d) {
				if (resData) {
					resData += d;
				} else {
					resData = d;
				}
			});
			res.on ("end", function () {
				if (! reqErr) {
					try {
						resData = JSON.parse (resData);
						
						if (resData.error) {
							console.error ("request", data);
							return reject (new Error (resData.error));
						} else {
							updateDates (resData);
							
							if (process.env.OBJECTUM_DEBUG && json.fn != "getAll") {
								console.log ("request:", JSON.stringify (json, null, "\t"));
								console.log ("response:", JSON.stringify (resData, null, "\t"));
							}
							if (resData._trace) {
								resData._trace.push (["serverRequest-end", new Date ().getTime ()]);
							}
							resolve (resData);
							
							store.callListeners ("after-request", {request: json, response: resData});
						}
					} catch (err) {
						reject (err);
					}
				}
			});
		});
		req.on ("error", function (err) {
			reqErr = err;
			reject (err);
		});
		req.end (data);
	});
};

function execute (fn, opts) {
	return new Promise ((resolve, reject) => {
		let promise = fn (opts);
		
		if (promise && promise.then) {
			promise.then (result => {
				resolve (result);
			}).catch (err => {
				reject (err);
			});
		} else {
			resolve (promise);
		}
	});
};

const request = isServer () ? serverRequest : clientRequest;

export {
	request,
	isServer,
	execute
};

