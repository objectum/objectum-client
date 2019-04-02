"use strict";

async function request (sid, json) {
	let res = await fetch (`/projects/${$o.code}/${sid ? `?sid=${sid}` : ``}`, {
		headers: {
			"Content-type": "application/json; charset=utf-8"
		},
		method: "POST",
		body: JSON.stringify (json)
	});
	let data = await res.json ();
	
	if (data.error) {
		console.error (data);
		throw new Error (data.error);
	}
	return data;
};

module.exports = request;
