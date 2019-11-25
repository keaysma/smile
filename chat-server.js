const WebSocket = require("ws");
const wss = new WebSocket.Server({ port : 9191 });

var messages = [];

wss.on('connection', (ws) => {
	ws.send(JSON.stringify({"history" : messages}));
	ws.on('message', (data) => {
		messages.push(data);
		wss.clients.forEach((client) => {
			if(client.readyState == WebSocket.OPEN){
				client.send(JSON.stringify({"msg": data}));
			}
		});
	});
});
