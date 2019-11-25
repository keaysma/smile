import React from 'react';
import ReactDOM from 'react-dom';
import Cookies from 'js-cookie';
//import logo from './logo.svg';
import './App.css';

class App extends React.Component{
	constructor(props){
		super(props);
		this.state = {
				conn : null,
				connection : 0,
			   	username : Cookies.get('username'),	
				messages : [],
		}

		this.wsOnConnect = this.wsOnConnect.bind(this);
		this.wsOnError = this.wsOnError.bind(this);
		this.wsOnMessage = this.wsOnMessage.bind(this);

		/*this._conn = {}; //new WebSocket("ws://192.168.1.244:9191");
		this._conn.onopen = this.wsOnConnect;
		this._conn.onerror = this.wsOnError;
		this._conn.onmessage = this.wsOnMessage;*/
		
		this.setUsername = this.setUsername.bind(this);
		this.startSmile = this.startSmile.bind(this);
		this.initSmile = this.initSmile.bind(this);
		this.loadSmile = this.loadSmile.bind(this);
		this.WSSend = this.WSSend.bind(this);
		if(this.state.username !== undefined){
			this.startSmile();
		}

	}

	wsOnConnect = (event) => {
		console.log("Connected");
		this.setState({connection: 1});
		ReactDOM.render(this.loadSmile(), document.getElementById('msgSpc'));
	}

	wsOnError = (event) => {
		console.log("Failed to connect");
		this.setState({connection: -1});
		ReactDOM.render(this.loadSmile(), document.getElementById('msgSpc'));
	}

	wsOnMessage = (event) => {
		var newMessages = [];
		var message = JSON.parse(event.data);
		if("msg" in message){
			newMessages = this.state.messages;
			newMessages.push(<p>{message["msg"]}</p>);
		}else{
			var history = message["history"];
			console.log(history);
			history.forEach((message) => {
				newMessages.push(<p>{message}</p>);
				console.log(message);
			})
		}
		this.setState({messages : newMessages});
		ReactDOM.render(<div id="msgs">{this.state.messages}</div>, document.getElementById("msgs"));
	}

	WSSend = () => {
		var message = document.getElementById("msg").value;
		console.log(message);
		this._conn.send(this.state.username + ": " + message);
	}

	setUsername = () => {
		var _username = document.getElementById("username").value;
		Cookies.set('username', _username);
		this.setState({username : _username});
		this.startSmile();
	}

	startSmile = () => {
		this._conn = new WebSocket("ws://192.168.1.244:9191");
		this._conn.onopen = this.wsOnConnect;
		this._conn.onerror = this.wsOnError;
		this._conn.onmessage = this.wsOnMessage;
	}

	initSmile = () => {
		if(Cookies.get('username') === undefined){
			var ui = [];
			ui.push(<p>Please enter a name: </p>);
			ui.push(<input type="text" id="username"></input>);
			ui.push(<button onClick={this.setUsername}>set</button>);
			return ui;
		}
	}

	loadSmile = () => {
		var ui = [];
		if(this.state.connection === 1){
			ui.push(<div id="msgs"></div>);
			ui.push(<input type="text" id="msg"></input>);
			ui.push(<button onClick={this.WSSend}>></button>);
		}else{
			ui.push(<p>:(</p>);
		}
		return ui;	
	}

	render(){
		return (
			<div className="App">
				<header className="App-header">
					{/*<img src={logo} className="App-logo" alt="logo" />*/}
					<p>
						(:
					</p>
					<div id="msgSpc">
						{this.initSmile()}
					</div>
				</header>
			</div>
		);
	}
}

export default App;
