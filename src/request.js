const isServer = () => typeof (window) === "undefined";

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
}

function updateDates (data) {
	if (data instanceof Array) {
		for (let i = 0; i < data.length; i ++) {
			parseDates (data [i]);
		}
	} else {
		parseDates (data);
	}
}

function prepareDates (json) {
	for (let a in json) {
		let v = json [a];
		
		// min = 0, sec = 0, msec = 0 => date
		if (v && typeof (v) == "object" && v.getMonth &&
			!v.getHours () && !v.getMinutes () && !v.getSeconds () && !v.getMilliseconds ()
		) {
			json [a] = `${v.getFullYear ()}-${String (v.getMonth () + 1).padStart (2, "0")}-${String (v.getDate ()).padStart (2, "0")}`;
		}
	}
}

async function clientRequest (store, json) {
	if (store.abort && json._fn != "getNews") {
		store.abort = false;
		throw new Error ("Action aborted");
	}
	if (!store.url) {
		throw new Error ("url not exists");
	}
	store.callListeners ("before-request", {request: json});

	if (json._trace) {
		json._trace = [["clientRequest-start", new Date ().getTime ()]];
	}
	prepareDates (json);

	let headers = {
		"Content-Type": "application/json; charset=utf-8"
	}
	if (store.accessToken) {
		headers ["Authorization"] = `Bearer ${store.accessToken}`;
	}
	let res = await fetch (`${store.url}`, {
		headers,
		method: "POST",
		body: JSON.stringify (json)
	});
	let data = await res.json ();

	if (data.error) {
		console.error (data);
		store.callListeners ("error", {request: json, response: data, error: data.error});
		throw new Error (data.error);
	}
	updateDates (data);

	if (data._trace) {
		data._trace.push (["clientRequest-end", new Date ().getTime ()]);
	}
	store.callListeners ("after-request", {request: json, response: data});

	return data;
}

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
		let headers = {
			"Content-Type": "application/json; charset=utf-8",
			"Content-Length": Buffer.byteLength (data, "utf8")
		};
		if (store.accessToken) {
			headers ["Authorization"] = `Bearer ${store.accessToken}`;
		}
		let req = store.http.request ({
			host: store.host,
			port: store.port,
			path: `${store.path}`,
			method: "POST",
			headers
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
				if (!reqErr) {
					try {
						resData = JSON.parse (resData);

						if (resData.error) {
							console.error ("request", data, "error", resData.error);
							store.callListeners ("error", {request: json, response: resData, error: resData.error});
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
			store.callListeners ("error", {request: json, response: resData, error: err});
			reject (err);
		});
		req.end (data);
	});
}

function execute (fn, opts) {
	return new Promise ((resolve, reject) => {
		let promise = fn.call (this, opts);

		if (promise && promise.then) {
			promise.then (result => resolve (result)).catch (err => reject (err));
		} else {
			resolve (promise);
		}
	});
}

async function request (store, json) {
	let requestInternal = isServer () ? serverRequest : clientRequest;

	try {
		return await requestInternal (store, json);
	} catch (err) {
		if (err.message == "401 Unauthenticated" && store.refreshToken) {
			let authData = await requestInternal (store, {
				_fn: "auth",
				refreshToken: store.refreshToken
			});
			if (authData.accessToken) {
				store.accessToken = authData.accessToken;
				store.refreshToken = authData.refreshToken;
				return await requestInternal (store, json);
			}
		}
		throw err;
	}
}

export {
	parseDates,
	request,
	isServer,
	execute
};
export default {
	parseDates,
	request,
	isServer,
	execute
};

