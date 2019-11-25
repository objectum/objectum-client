"use strict";

let sid, url, http, host, port, path;

function isServer () {
	if (typeof window !== "undefined") {
		return false;
	} else {
		return true;
	}
};

function setSessionId (_sid) {
	sid = _sid;
};

function getSessionId () {
	return sid;
};

function setUrl (_url) {
	if (isServer ()) {
		let opts = require ("url").parse (_url);
		
		url = _url;
		http = opts.protocol == "https:" ? require ("https") : require ("http");
		host = opts.hostname;
		port = opts.port || (opts.protocol == "https:" ? 443 : 80);
		path = opts.path;
	} else {
		url = _url;
	}
};

function getUrl () {
	return url;
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

function clientRequest (json) {
	return new Promise ((resolve, reject) => {
		if (! url) {
			return reject (new Error ("url not exists"));
		}
		fetch (`${url}${sid ? `?sid=${sid}` : ``}`, {
			headers: {
				"Content-Type": "application/json; charset=utf-8"
			},
			method: "POST",
			body: JSON.stringify (json)
		}).then (res => {
			res.json ().then (data => {
				if (data.error) {
					console.error (data);
					reject (new Error (data.error));
				}
				updateDates (data);
				
				resolve (data);
			}, err => reject (err));
		}, err => reject (err));
	});
};

function serverRequest (json) {
	return new Promise ((resolve, reject) => {
		if (! url) {
			return reject (new Error ("url not exists"));
		}
		let data = JSON.stringify (json);
		let resData, reqErr;
		let req = http.request ({
			host,
			port,
			path: `${path}${sid ? `?sid=${sid}` : ``}`,
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
							reject (new Error (resData.error));
						} else {
							updateDates (resData);
							
							if (process.env.OBJECTUM_DEBUG && json.fn != "getAll") {
								console.log ("request:", JSON.stringify (json, null, "\t"));
								console.log ("response:", JSON.stringify (resData, null, "\t"));
							}
							resolve (resData);
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

function upload ({recordId, propertyId, name, file}) {
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
		let url = getUrl ();
		
		if (url [url.length - 1] == "/") {
			url = url.substr (0, url.length - 1);
		}
		if (isServer ()) {
			formData.submit ({
				host,
				port,
				path: `${path}upload?sessionId=${sid}`,
			}, function (err, res) {
				resolve (res.statusCode);
			});
		} else {
			fetch (`${url}/upload?sessionId=${sid}`, {
				method: "POST",
				body: formData
			}).then (() => {
				resolve ();
			});
		}
	});
};

module.exports = {
	request: isServer () ? serverRequest : clientRequest,
	setSessionId,
	getSessionId,
	setUrl,
	getUrl,
	upload
};

