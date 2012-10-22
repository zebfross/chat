var http = require("http"),
	WebSocket = require('faye-websocket');

User = function(args) {
	this.messages = [];
	this.nick = null;
	if (args) {
		if (args.nick !== undefined) {
			this.nick = args.nick;
		}
		if (args.messages !== undefined) {
			this.messages = args.messages;
		}
	}
};
User.prototype = {};
User.prototype.addMessage = function(index) {
	this.messages.push(index);
};
User.prototype.getAllUnread = function() {
	var temp = this.messages;
	this.messages = [];
	return temp;
};

Error = function(args) {
	this.prototype = args;
	this.method = "error";
};

broadcastUsers = function() {
	var message = {"method":"getUsers", "data":users};
	for (socket in sockets) {
		sockets[socket].send(JSON.stringify(message));
	}
};

unregisterClient = function(user) {
	delete users[user.nick];
	delete sockets[user.nick];
};

getUsers = function() {
	return users;
};

broadcastChat = function(chat) {
	var message = {"method": "getMessages"};
	message.data = [chat]
	var strMessage = JSON.stringify(message);
	for (socket in sockets) {
		sockets[socket].send(strMessage);
	}
}

var users = {};
var sockets = {};
var messages = [];

var server = http.createServer();
server.addListener('upgrade', function(request, socket, head) {
	var ws = new WebSocket(request, socket, head);
	console.log("created new socket")
	var user = null;
	
	ws.onmessage = function(event) {
		console.log(event.data);
		var call = null;
		try {
			var call = JSON.parse(event.data);
		} catch (exc) {
			console.log("caught error: " + exc);
		}
		if (call.method == "registerClient") {
			if (user != null)
				console.log("not registering duplicate user");
			user = new User(call.data);
			sockets[user.nick] = ws;
			users[user.nick] = user;
			broadcastUsers();
		} else if (call.method == "getUsers") {
			var message = {"method":"getUsers", "data":users};
			ws.send(JSON.stringify(message));
		} else if (call.method == "sendMessage") {
			var chat = {};
			chat.user = user.nick;
			chat.message = call.data.message;
			chat.timestamp = new Date().getTime();
			messages.push(chat);
			broadcastChat(chat);
		} else {
			ws.send(JSON.stringify(new Error({"message":"unknown method: " + call.method})));
		}
	};

	ws.onclose = function(event) {
		if (user != null) {
			unregisterClient(user);
			broadcastUsers();
		}
		console.log("close", event.code, event.reason);
		ws = null;
	};
	
});

server.listen(8080);

