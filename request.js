"use strict";

let sid, url, http, host, port, path;

function isServer () {
	if (typeof global === "undefined" && typeof window !== "undefined") {
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

async function clientRequest (json) {
	if (!url) {
		throw new Error ("url not exists");
	}
	let res = await fetch (`${url}${sid ? `?sid=${sid}` : ``}`, {
		headers: {
			"Content-Type": "application/json; charset=utf-8"
		},
		method: "POST",
		body: JSON.stringify (json)
	});
	let data = await res.json ();
	
	if (data.error) {
		console.error (data);
		throw new Error (data.error);
	}
	updateDates (data);
	
	return data;
};

async function serverRequest (json) {
	if (!url) {
		throw new Error ("url not exists");
	}
	let data = JSON.stringify (json);
	
	return new Promise ((resolve, reject) => {
		let resData, reqErr;
		let req = http.request ({
			host,
			port,
			path: `${path}${sid ? `?sid=${sid}` : ``}`,
			method: "POST",
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				"Content-Length": Buffer.byteLength (data, "utf8"),
				"Connection": "Keep-Alive"
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
				if (!reqErr) {
					try {
						resData = JSON.parse (resData);
						
						if (resData.error) {
							console.error ("request", data);
							reject (new Error (resData.error));
						} else {
							updateDates (resData);
							
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

module.exports = {
	request: isServer () ? serverRequest : clientRequest,
	setSessionId,
	getSessionId,
	setUrl,
	getUrl
};

