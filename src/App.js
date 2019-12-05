import React from 'react';
import Cookies from 'js-cookie';
//import arro from './arro.png';
import './App.css';

//TODO: Message sound
//TODO: Scroll to bottom button

const SERVERS = [
	"108.18.248.41",
	//Can I search the local network for smile servers?
	"192.168.1.242",
	"192.168.1.190",
	"192.168.1.24",
	//Just for me lol
	"localhost",
];

class App extends React.Component{
	constructor(props){
		super(props);
		this.state = {
				conn : null,
				connection : 0,
				error: "",
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
		this.getServer = this.getServer.bind(this);
		this.startSmile = this.startSmile.bind(this);
		this.WSSend = this.WSSend.bind(this);
		this.scrollToBottom = this.scrollToBottom.bind(this);
	}

	componentDidMount(){
		if(this.state.sessid !== undefined && this.state.sessid !== ""){
			this.startSmile();
		}else{
			this.setState({error: ""});
			this.setState({connection : -2});
		}
	}

	wsOnConnect = (event) => {
		console.log("Connected");
		this.setState({connection: 1});
		if(this.state.pw !== undefined){
			console.log("password validation");
			this._conn.send(JSON.stringify({
					"type": "sessionRequest", 
					"username": this.state.username,
					"password" : this.state.pw,
			}));
		}else if(this.state.sessid !== undefined && this.state.sessid !== ""){
			console.log(`sending sessid: ${this.state.sessid}`);
			this._conn.send(JSON.stringify({
					"type": "sessionRequest",
					"username": this.state.username,
					"existingSession": this.state.sessid,
			}));
		}else{
			this.setState({error: "Please login"});
			this.setState({connection: -2});
		}
	}

	wsOnDisconnect = (event) => {
		console.log(event);
		var blame = "";
		switch(event.code){
			case 4001: {
				blame = "Bad sessid";
				Cookies.remove("sessid");
			}
		}
		this.setState({
				connection: -2,
				error: `Disconnected: ${blame}`
		});
	}

	wsOnError = (event) => {
		console.log(event.text);
		this.setState({
				connection: -2,
				error: "An error occured :("
		});
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
			case "acknowledge": {
				//for acknowledging messages recieved
				//clear message bar here so that you don't loose
				//your message if the connection goes back
				break;
			}
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
				var isMyMessage = message["username"] === this.state.username;
				var displayId = isMyMessage ? "mine" : "foreign";
				var time = "time"  in message ? message["time"] : "";
				newMessages.push(
					<div id="msgContainer">
						<p key={messageKey} id={displayId}>
							{message["username"]}: {message["data"]}
							<p id="time">
								{time}
							</p>
						</p>
					</div>
				);
				break;
			}	
			case "history": {
				console.log(message);
				var history = message["data"];
				history.forEach((message, i) => {
					switch(message["type"]){
						case "message" : {
							var isMyMessage = message["username"] === this.state.username;
							var displayId = isMyMessage ? "mine" : "foreign";
							var time = "time"  in message ? message["time"] : "";
							newMessages.push(
								<div id="msgContainer">
									<p key={i.toString()} id={displayId}>
										{message["username"]}: {message["data"]}
										<p id="time">
											{time}
										</p>
									</p>
								</div>
							);
							break;
						}
						case "broadcast" : {
							newMessages.push(<p key={i.toString()} id="broadcast">{message["data"]}</p>);
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
				newMessages.push(<p key={messageKey} id="broadcast">{message["data"]}</p>);
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

	scrollToBottom = () => {
		var scrollSpace = document.getElementById("msgs")
		var atScrollBottom = true;
		if(scrollSpace !== null){
			atScrollBottom = scrollSpace.scrollHeight === (scrollSpace.clientHeight + scrollSpace.scrollTop)
			scrollSpace.scrollTop = scrollSpace.scrollHeight;
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

	//"Why would yo-": https://stackoverflow.com/questions/39940152/get-first-fulfilled-promise
	touchServer = (server) => {
		console.log(`Resolving: ${server}`);
		return new Promise((resolve, reject) =>{
			var conn = new WebSocket(server);
			console.log("attempting...");
			conn.onopen = () => {reject(conn);};
			conn.onerror = () => {resolve(null);};
		});
	}

	getServer = async () => {
		var lastServer = await Cookies.get("lastServer");
		if(lastServer !== undefined){
			console.log(`Connecting back to ${lastServer}`);
			return new WebSocket(`ws://${lastServer}:9191`);
		}
		if(lastServer === undefined || this._conn.readyState === WebSocket.CLOSED){
			//maybe await?
			var attempts = SERVERS.map(async (server) => {
				return this.touchServer(`ws://${server}:9191`);
			});

			var connection = await Promise.all(attempts).then(
				allFailed => {return null;},
				successful => {return successful;}
			);
			return connection;
		}
	}

	startSmile = async () => {
		this.setState({connection: 1});
		if(this._conn === undefined || this._conn === null || this._conn.readyState === WebSocket.CLOSED){
			this._conn = await this.getServer();
			if(this._conn !== null){
				//this.setState({connection: 2});
				this._conn.onopen = this.wsOnConnect;
				this._conn.onclose = this.wsOnDisconnect;
				this._conn.onerror = this.wsOnError;
				this._conn.onmessage = this.wsOnMessage;
				console.log("Sending login protocol");
				this._conn.onopen();
			}else{
				this.setState({
					connection: -2,
					error: "Could not connect"
				});
			}
		}else{
			this._conn.onopen();
		}
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
								<p id="lgnTxt">Welcome to Smile</p>
								<p id="errTxt">{this.state.error}</p>
								<input type="text" id="username" placeholder="username"></input>
								<input type="password" id="pw" placeholder="password"></input>
								<button id="sendLogin" onClick={this.setUsername}>login</button>
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
							<input id="msg" type="text" placeholder="(:" onKeyDown={(e) => {if(e.key === 'Enter'){this.WSSend()}}}></input>
							<button id="send" onClick={this.WSSend}>
								{/*<img src={arro} alt=""/>*/}
							</button>
							<button id="send" onClick={this.scrollToBottom}>v</button>
						</div>
					}
				</header>
			</div>
		);
	}
}

export default App;
