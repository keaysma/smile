const fs = require("fs");
const crypto = require("crypto-js");
const WebSocket = require("ws");
const wss = new WebSocket.Server({ 
		port : 9191,
		/*autoAcceptConnections: false,*/
});
var debug = undefined;
var sessmap = {};
var clients = [];
var clientHeaders = [];
var messages = [];
var accounts = {
	"test" : {
		"password": "test",
		"sessid": null,
	}
};

let CLOSE = {
		"badsession": 4001
};

var get_sessid = (() => {
	var current_sessid = 0;
	return () => {
		current_sessid += 1;
		var new_sessid = current_sessid;
		return crypto.SHA512(new_sessid.toString()).toString();
	}
})();

wss.on('connection', (ws, req) => {
	//console.log(req.headers);
	var headers = req.headers.host;
	debug = headers;
	ws.on('message', (data) => {
		var payload = {};
		try{
			payload = JSON.parse(data);
		}catch{
			payload = {};
		}
		if("type" in payload){
			if(clientHeaders.includes(headers)){
				console.log("MESSAGE FROM KNOWN SOURCE");
				switch(payload["type"]){
					case "message": {
						if("sessid" in payload){
							if(payload["sessid"] in sessmap){
								var sessinfo = sessmap[payload["sessid"]];
								if(sessinfo["sess"] === headers){
									if(payload["data"].length > 0){
										var timestamp = new Date();
										var message = {
											"type": "message",
											"username": sessinfo["username"],
											"data": payload["data"],
											"time": timestamp,
										};
										sendAll(message);
									}
								}else{
									console.log("BAD MESSAGE: Valid session, invalid connection");
									//TODO: Should instead send a kill packet
									ws.close();
								}
							}else{
								console.log("BAD MESSAGE: INVALID SESSID");
							}
						}else{
							console.log("BAD MESSAGE: MISSING sessid");
						}
						break;
					}
					case "sessionRequest" : {
						createSession(ws, headers, payload);
						break;
					}
					default: {
						console.log("BAD MESSAGE: INVALID TYPE");
					}
				}
			}else{
				createSession(ws, headers, payload);
			}
		}else{
			console.log("Recieved malformed message, ignoring.");
			ws.close();
		}
	});
});

let createSession = (ws, headers, payload) => {
	if(payload["type"] === "sessionRequest"){
		console.log("SESSION REQUEST FROM: " + payload["username"]);
		if("existingSession" in payload){
			console.log("VALIDATING EXISTING SESSION");
			var sessid = payload["existingSession"];
			if(sessid in sessmap){
				console.log("OK");
				createValidSession(ws, headers, sessid);
			}else{
				console.log("BAD SESSION");
				ws.close(CLOSE["badsession"]);
			}
		}else if("username" in payload && "password" in payload){
			console.log("VALIDATING NEW SESSION");
			var username = payload["username"];
			if(username in accounts){
				var password = payload["password"];
				password = crypto.SHA512(password.toString()).toString();
				if(accounts[username]["password"] === password){
					var new_session = get_sessid()
					sessmap[new_session] = {"username": username, "sess": headers};
					createValidSession(ws, headers, new_session);
					sendAll({
						"type": "broadcast",
						"data": sessmap[new_session]["username"] + " has joined",
					}, false);
				}else{
					console.log("BAD PW");
					ws.close();
				}
			}else{
				console.log("BAD USERNAME");
				ws.close();
			}
		}else{
			console.log("BAD SESSION REQUEST");
			ws.close();
		}
	}else{
		console.log("MESSAGE FROM INVALID SESSION");
		console.log(clientHeaders);
		console.log(headers);
		ws.close();
	}
}

let createValidSession = (ws, headers, sessid) => {
	clients = [ ...clients, ws];
	clientHeaders = [ ...clientHeaders, headers];
	ws.send(JSON.stringify({
		"type": "sessid",
		"data": sessid,
	}));
	//todo: client should have message cache
	ws.send(JSON.stringify({
		"type": "history",
		"data": messages,
	}));
};

let sendAll = (data, keep = true) => {
	if(keep)
		messages = [ ...messages, data ];
	clients.forEach((client) => {
		if(client.readyState == WebSocket.OPEN){
			client.send(JSON.stringify(data));
		}
	});
}

/*
var messages = [];
var accounts = {
	"test" : {
		"password": "test",
		"sessid": null,
	}
};
*/
let backup = () => {
	var messageData = JSON.stringify(messages);
	var usernames = Object.keys(accounts);
	var cleanedAccounts = {};
	usernames.forEach((user) => {
		cleanedAccounts[user] = {
			"password": accounts[user]["password"],
			"sessid": null,
		}
	});
	var accountsData = JSON.stringify(cleanedAccounts);
	fs.writeFile('messages.smile', messageData, (error) => {
		if(error){
			throw error;
		}
		console.log("Messages written to messages.smile");
	});
	fs.writeFile('userdata.smile', accountsData, (error) => {
		if(error){
			throw error;
		}
		console.log("Account data written to userdata.smile");
	});
}

let load = () => {
	fs.readFile('messages.smile', (error, data) => {
		if(error){
			throw error;
		}
		messages = JSON.parse(data);
	});
	fs.readFile('userdata.smile', (error, data) => {
		if(error){
			throw error;
		}
		accounts = JSON.parse(data);
	});
}
