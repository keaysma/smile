import React from 'react';
import Cookies from 'js-cookie';
//import arro from './arro.png';
import './App.css';

const SERVERS = [
	"108.18.248.41",
	//Can I search the local network for smile servers?
	"192.168.1.242",
	"192.168.1.24",
	"localhost",
];

class App extends React.Component{
	constructor(props){
		super(props);
		this.state = {
				conn : null,
				connection : 0,
			   	username : Cookies.get('username'),
				pw : undefined,
				sessid : Cookies.get('sessid'),
				messages : [],
		}

		this.wsOnConnect = this.wsOnConnect.bind(this);
		this.wsOnDisconnect = this.wsOnDisconnect.bind(this);
		this.wsOnError = this.wsOnError.bind(this);
		this.wsOnMessage = this.wsOnMessage.bind(this);

		this.setUsername = this.setUsername.bind(this);
		this.startSmile = this.startSmile.bind(this);
		this.WSSend = this.WSSend.bind(this);
	}

	componentDidMount(){
		if(this.state.sessid !== undefined){
			this.setState({connection : 1});
			this.startSmile();
		}else{
			this.setState({connection : -2});
		}
	}

	wsOnConnect = (event) => {
		console.log("Connected");
		this.setState({connection: 1});
		if(this.state.sessid === undefined || this.state.pw !== undefined){
			console.log("password validation");
			this._conn.send(JSON.stringify({
					"type": "sessionRequest", 
					"username": this.state.username,
					"password" : this.state.pw,
			}));
		}else{
			this._conn.send(JSON.stringify({
					"type": "sessionRequest",
					"username": this.state.username,
					"existingSession": this.state.sessid,
			}));
		}
	}

	wsOnDisconnect = (event) => {
		console.log("Disconnected");
		this.setState({connection: -2});
	}

	wsOnError = (event) => {
		console.log("Failed to connect");
		this.setState({connection: -1});
	}

	wsOnMessage = (event) => {
		var newMessages = [];
		var message = JSON.parse(event.data);
		var messageKey = undefined;

		var scrollSpace = document.getElementById("msgs")
		var atScrollBottom = true;
		if(scrollSpace !== null){
			atScrollBottom = scrollSpace.scrollHeight === (scrollSpace.clientHeight + scrollSpace.scrollTop)
		}
					
		switch(message.type){
			case "sessid": {
				var sessid = message["data"];
				this.setState({sessid : sessid});
				Cookies.set("sessid", sessid);
				console.log("SESSION GRANTED: " + sessid);
				this.setState({connection : 2});
				break;
			}
			case "message": {
				newMessages = this.state.messages;
				messageKey = newMessages.length.toString();
				newMessages.push(<p key={messageKey}>{message["username"]}: {message["data"]}</p>);
				break;
			}	
			case "history": {
				console.log(message);
				var history = message["data"];
				history.forEach((message, i) => {
					switch(message["type"]){
						case "message" : {
							newMessages.push(<p key={i.toString()}>{message["username"]}: {message["data"]}</p>);
							break;
						}
						case "broadcast" : {
							newMessages.push(<p key={i.toString()}>{message["data"]}</p>);
							break;
						}
						default: {}
					}
				})
				break;
			}
			case "broadcast": {
				newMessages = this.state.messages;
				messageKey = newMessages.length.toString();
				newMessages.push(<p key={messageKey}>{message["data"]}</p>);
				break;
			}
			default: {
				console.error("Recieved invalid server response: " + event.data.toString());
			}
		}
		this.setState({messages : newMessages});
		if(atScrollBottom && scrollSpace !== null){
			scrollSpace.scrollTop = scrollSpace.scrollHeight;
		}
	}

	WSSend = () => {	
		var message = document.getElementById("msg").value;
		if(message !== ""){
			var payload = JSON.stringify({
				"type": "message",
				"sessid": this.state.sessid,
				"data": message
			});
			this._conn.send(payload);
			document.getElementById("msg").value = "";
		}
	}

	setUsername = () => {
		var _username = document.getElementById("username").value;
		var _pw = document.getElementById("pw").value;
		Cookies.set('username', _username);
		this.setState({username : _username});
		this.setState({pw : _pw});
		this.startSmile();
	}

	touchServer = (server) => {
		console.log(`Resolving: ${server}`);
		return new Promise((resolve, reject) =>{
			var conn = new WebSocket(server);
			console.log("attempting...");
			conn.onopen = () => {console.log("conn");resolve("1");};
			conn.onerror = () => {resolve(null);};
		});
	}

	startSmile = () => {
		var lastServer = Cookies.get("lastServer");
		if(lastServer !== undefined){
			console.log(`Connecting back to ${lastServer}`);
			this._conn = new WebSocket(`ws://${lastServer}:9191`);
		}
		if(lastServer === undefined || this._conn.readyState === WebSocket.CLOSED){
			/*try{
				SERVERS.forEach((server) => {
					this._conn = new WebSocket(`ws://${server}:9191`);
					if(this._conn.readyState === WebSocket.OPEN)
							Cookies.set("lastServer", server);
							throw `Connected to ${server}`;
				});
			}catch(e){console.log(e);}*/
			var attempts = SERVERS.map(async (server) => {
				return this.touchServer(`ws://${server}:9191`);
			});

			var connections = Promise.all(attempts).then((x) => {console.log(x);});
			console.log(connections);
		}
		//this._conn.onopen = this.wsOnConnect;
		//this._conn.onclose = this.wsOnDisconnect;
		//this._conn.onerror = this.wsOnError;
		//this._conn.onmessage = this.wsOnMessage;
	}

	render(){
		return (
			<div className="App">
				<header className="App-header">
					{/*<img src={logo} className="App-logo" alt="logo" />*/}
					<div id="smileHeader">
						<p>
							(:
						</p>
					</div>
					<div id="msgSpc">
						{this.state.connection === -2 &&
							<div id="lgn">
								<p id="lgnTxt">Please log in: </p>
								<input type="text" id="username" placeholder="username"></input>
								<input type="password" id="pw" placeholder="password"></input>
								<button id="sendLogin" onClick={this.setUsername}>set</button>
							</div>
						}
						{this.state.connection === -1 &&
							<p key="-1">:(</p>
						}
						{this.state.connection === 1 && 
							<p key="-1">Loading...</p>
						}
						{this.state.connection === 2 &&
							<div id="msgs">{this.state.messages}</div>
						}
					</div>
					{this.state.connection === 2 &&
						<div id="wrtSpc">
							<input id="msg" type="text" placeholder="(:"></input>
							<button id="send" onClick={this.WSSend}>
								{/*<img src={arro} alt=""/>*/}
							</button>
						</div>
					}
				</header>
			</div>
		);
	}
}

export default App;
