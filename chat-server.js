const WebSocket = require("ws");
const wss = new WebSocket.Server({ port : 9191 });

var messages = [];
var get_sessid = (() => {
	var current_sessid = 0;
	return () => {
		current_sessid += 1;
		return current_sessid;
	}
})();

wss.on('connection', (ws) => {
	/*temporary -- send new session id, needs to validate pw first*/
	ws.send(JSON.stringify({
		"type" : "sessid",
		"data" : get_sessid()
	}));

	ws.send(JSON.stringify({
		"type" : "history",
		"data" : messages
	}));
	
	ws.on('message', (data) => {
		messages.push(data);
		wss.clients.forEach((client) => {
			if(client.readyState == WebSocket.OPEN){
				client.send(JSON.stringify({
						"type": "message",
						"data": data
				}));
			}
		});
	});
});
