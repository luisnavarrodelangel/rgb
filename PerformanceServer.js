var http = require('http');
var express = require('express');
var server = http.createServer();
var expressServer = express();
var osc = require ('osc')

var scOSC = new osc.UDPPort({
	localAddress: "0.0.0.0", 
	localPort: 9000,
	remoteAddress: "127.0.0.1",
	remotePort: 9010
})

var wekBlueOSC = new osc.UDPPort({
	localAddress: "0.0.0.0",
	localPort: 9001,
	remoteAddress: "127.0.0.1",
	remotePort: 9002 // this is wat wek should listen on
})
wekBlueOSC.open();
var wekRedOSC = new osc.UDPPort({
	localAddress: "0.0.0.0",
	localPort: 9011,
	remoteAddress: "127.0.0.1",
	remotePort: 9666 // this is wat wek should listen on
})
wekRedOSC.open();
var wekGreenOSC = new osc.UDPPort({
	localAddress: "0.0.0.0",
	localPort: 9021,
	remoteAddress: "127.0.0.1",
	remotePort: 9004 // this is wat wek should listen on
})
wekGreenOSC.open();


scOSC.open();

// uses current directory
expressServer.use(express.static(__dirname));
server.on('request', expressServer)


//server listening on 8000
server.listen(8000, function(){console.log("listening")})

// from this can make websocket server

var WebSocket = require('ws')
var wsServer = new WebSocket.Server({server: server});

var id=0;
var clients = {};
var close = {}
var blueTeam=0;
var redTeam=0;
var numClients=0;

wsServer.on('connection', function(r){
	id=id+1;
	console.log("@@@@@@@@@@@@@@@@@@@ ID:  "+id)
	
	numClients++;
	
	r.identifier=id;

	blueTeam++;
	r.closingFlag=false;
	//Default setting
	clients[id]={team:"Blue", client: r, xyz:[0,0,0], motion:0};

	console.log((new Date())+ 'Connection accepted, id: '+ id);
	//Tell SuperCollider how many clients there are
	scOSC.send({address:"/connect", args: []});


	r.on('message',function(message){

		var msg = JSON.parse(message);
		if (msg.type =='motion'){
			//Sends motion messages
			try{
				clients[r.identifier].xyz = [msg.xyz[0],msg.xyz[1],msg.xyz[2]]
				// where motion = a cooked measure of jerk (change in acceleration)
				clients[r.identifier].motion = msg.motion;
			}
			catch(e){
				console.log("WARNING: motion update dropped for: "+id)
				console.log(e)
		}
			// try{scOSC.send(oscMsg)}
			// catch(e){console.log("error sending OSC for: " + id)}
		}

		//@Do I use the team counters for anythign?/should they be updated here again?
		else if (msg.type == 'teamChange'){
			if(msg.value == "Blue") {
				clients[id].team = "Blue"
			}
			else if (msg.value == "Red") {
				clients[id].team = "Red"
			}
			else if (msg.value == "Green") {
				clients[id].team = "Green"
			}

		}
	});//end on message

	r.on('error',function(){
		for (var a in clients){
			if (clients[a].client.identifier == r.identifier) delete clients[a]
	}
	})

	r.on('close', function(reasonCode, description){
		for (var a in clients){
			if (clients[a].client.identifier==r.identifier) {
				// if (clients[a].team=="Blue") blueTeam--; else redTeam--;
				close[a]=true;
				console.log("Client: " +a+" disconnected");
				delete clients[a]
				break;
			}
		}
		numClients--;

		//Tell SuperCollider how many clients are connected
		scOSC.send({address:"/disconnect", args: []});
	})
	//identifier of the client. also increments the counter
	
})

setInterval(function(){
	var blueMotionArray = []
	var blueXArray = []
	var blueYArray = []
	var blueZArray = [];
	var redMotionArray = []
	var redXArray = []
	var redYArray = []
	var redZArray = [];
	var greenMotionArray = []
	var greenXArray = []
	var greenYArray = []
	var greenZArray = [];


	// var numClients = Object.keys(motion).length;
	for (var ids in clients){
		var i = clients[ids]
		if(i.team =="Blue"){
			blueMotionArray.push(parseFloat(i.motion));
			// blueXMean = blueXMean+Math.abs(parseFloat(i.xyz[0]));
			// blueYMean = blueYMean+Math.abs(parseFloat(i.xyz[1]));
			// blueZMean = blueZMean+Math.abs(parseFloat(i.xyz[2]));
			blueXArray.push(Math.abs(parseFloat(i.xyz[0])));
			blueYArray.push(Math.abs(parseFloat(i.xyz[1])));
			blueZArray.push(Math.abs(parseFloat(i.xyz[2])));
		}
		else if (i.team =="Red"){
			console.log("red    :")
			redMotionArray.push(parseFloat(i.motion));
			// redXMean = redXMean+Math.abs(parseFloat(i.xyz[0]));
			// redYMean = redYMean+Math.abs(parseFloat(i.xyz[1]));
			// redZMean = redZMean+Math.abs(parseFloat(i.xyz[2]));
			redXArray.push(Math.abs(parseFloat(i.xyz[0])));
			redYArray.push(Math.abs(parseFloat(i.xyz[1])));
			redZArray.push(Math.abs(parseFloat(i.xyz[2])));
		}
		else if (i.team=="Green"){
			greenMotionArray.push(parseFloat(i.motion));
			// greenXMean = greenXMean+Math.abs(parseFloat(i.xyz[0]));
			// greenYMean = greenYMean+Math.abs(parseFloat(i.xyz[1]));
			// greenZMean = greenZMean+Math.abs(parseFloat(i.xyz[2]));
			greenXArray.push(Math.abs(parseFloat(i.xyz[0])));
			greenYArray.push(Math.abs(parseFloat(i.xyz[1])));
			greenZArray.push(Math.abs(parseFloat(i.xyz[2])));
			
		}
	}	

	// function sendData(motionArray, xArray, yArray, zArray, team){
	sendData(blueMotionArray, blueXArray, blueYArray, blueZArray, "Blue")
	sendData(greenMotionArray, greenXArray, greenYArray, greenZArray, "Green")
	sendData(redMotionArray, redXArray, redYArray, redZArray, "Red")

	// try{scOSC.send(blueMsg);scOSC.send(redMsg)}
	// catch(e){console.log("error sending OSC for motion")}

},50)


//@ Long dimension to variance: what kind of variance is happening over the past x Long?
// ex: mean over window, max and min over window, slope over window, etc...
 
var bxvar = [0,0,0,0,0,0,0,0,0,0];
var byvar = [0,0,0,0,0,0,0,0,0,0];
var bzvar = [0,0,0,0,0,0,0,0,0,0];

var gxvar = [0,0,0,0,0,0,0,0,0,0];
var gyvar = [0,0,0,0,0,0,0,0,0,0];
var gzvar = [0,0,0,0,0,0,0,0,0,0];

var rxvar = [0,0,0,0,0,0,0,0,0,0];
var ryvar = [0,0,0,0,0,0,0,0,0,0];
var rzvar = [0,0,0,0,0,0,0,0,0,0];


function sendData(motionArray, xArray, yArray, zArray, team){
	var motionMean = motionVariance = xMean = xVariance = yMean = yVariance = zMean = zVariance = xVarLong=yVarLong=zVarLong= xVarShort=yVarShort=zVarShort= 0;

	//Calculates mean motion
	for (var val in motionArray){
		motionMean = motionMean + motionArray[val];
	}

	if(motionArray.length!=0) {
		motionMean = (motionMean/motionArray.length)
	}
	else {motionMean = 0;}

	//Calculates motion variance
	for (var val in motionArray){
		motionVariance = motionVariance+(motionArray[val]-motionMean)*(motionArray[val]-motionMean)
	}	
	if(motionArray.length!=0) {motionVariance = motionVariance/motionArray.length}
	else {motionVariance = 0;}
	
	//Normalize it.
	motionMean = Math.min((motionMean)/30,1)

		

	//Calculates x, y, and z means
	for (var val in xArray){
		xMean = xMean + xArray[val];
		yMean = yMean + yArray[val];
		zMean = zMean + zArray[val];
	}
	if(xArray.length!=0) {
		xMean = xMean/xArray.length
		yMean = yMean/yArray.length
		zMean = zMean/zArray.length
	}
	else {
		xMean = yMean = zMean = 0;
	}

	//Calculates variance in x, y, and z's
	for (var val in xArray){
		xVariance = xVariance + (xArray[val]-xMean)*(xArray[val]-xMean)
		yVariance = yVariance + (yArray[val]-yMean)*(yArray[val]-yMean)
		zVariance = zVariance + (zArray[val]-zMean)*(zArray[val]-zMean)
	}
	if (xArray.length !=0){
		xVariance = xVariance/xArray.length;
		yVariance = yVariance/yArray.length;
		zVariance = zVariance/zArray.length;
	}
	else{
		xVariance = yVariance = zVariance = 0;
	}



	if (team=="Blue"){
		bxvar.push(xVariance)
		//10 items == approx. every half second
		var ar
		ar = bxvar.slice(-10)
		xVarLong = mean(ar)
		ar = bxvar.slice(-5)
		xVarShort= mean(ar)
		
		byvar.push(yVariance)
		ar = byvar.slice(-10)
		yVarLong = mean(ar)
		ar = byvar.slice(-5)
		yVarShort = mean(ar)
		bzvar.push(zVariance)
		ar = bzvar.slice(-10)
		zVarLong = mean(ar)
		ar = bzvar.slice(-5)
		zVarShort = mean(ar)
	}
	else if (team =="Green"){
		gxvar.push(xVariance)
		//10 items == approx. every half second
		gxvar = gxvar.slice(-10)
		xVarLong = mean(gxvar)
		gyvar.push(yVariance)
		gyvar = gyvar.slice(-10)
		yVarLong = mean(gyvar)
		gzvar.push(zVariance)
		gzvar = gzvar.slice(-10)
		zVarLong = mean(gzvar)
	}
	else if (team == "Red"){
		rxvar.push(xVariance)
		//10 items == approx. every half second
		rxvar = rxvar.slice(-10)
		xVarLong = mean(rxvar)
		ryvar.push(yVariance)
		ryvar = ryvar.slice(-10)
		yVarLong = mean(ryvar)
		rzvar.push(zVariance)
		rzvar = rzvar.slice(-10)
		zVarLong = mean(rzvar)
	}
	else{ console.log("hmm.....")}

	// zVariance = Math.abs(zVariance-zVarianceI);
	// zVarianceI=zVariance;
	console.log("x:  "+xVariance);
	console.log("y:  "+yVariance);
	console.log("z:  "+zVariance);
	console.log("team n:  "+motionArray.length)
	console.log("motion Variance: "+motionVariance)
	console.log("mean:  "+motionMean)
	console.log("team:  "+team)
	
	var coherenceMsg = {
		address: "/wek/"+team,
		args: [motionVariance, xVariance, yVariance, zVariance,xVarLong,yVarLong,zVarLong,xVarShort,yVarShort,zVarShort]
	}

	var motionMsg = {
		address:"/motion/"+team,
		args: [motionMean]
	}


	try{
		if (team=="Blue") wekBlueOSC.send(coherenceMsg)
		else if (team=="Red") {wekRedOSC.send(coherenceMsg)}
		else if (team == "Green") wekGreenOSC.send(coherenceMsg)


		scOSC.send(motionMsg)
	}
	catch(e){
		console.log("error sending OSC to wek:")
		console.log(e)
		console.log("______________________")
	}
}



function mean(array){
	var result=0
	for (i in array){
		result=result+array[i]
	}
	return result/array.length
}


scOSC.on('message',function(msg){
	var msg;
	var team;
	var type;
	for (var i in clients) {
		console.log("id:  "+i+"   color:  "+clients[i].team)
	}
	
	switch (msg.address[7]){
		case 'b':
			team = "Blue"
			break;
		case 'g':
			team = "Green"
			break;
		case 'r':
			team = "Red"
			break;
	}
	if (msg.address.endsWith("cheering")) {type = "cheering";}
	else if (msg.address.endsWith("loudness")) {type = "loudness"}
	else if (msg.address.endsWith("penalty")) {type = "penalty"}
	else if (msg.address.endsWith("pitch")) {type = "pitch"}
	else if (msg.address.endsWith("vibration")) {type = "vibration"}
	else return;
	
	var val = parseFloat(msg.args);

	var wsMsg = {type: type, value: val}

	wsMsg=JSON.stringify(wsMsg)

	if (team=="Green"){
		for (var i in clients){
			clients[i].client.send(wsMsg)
			console.log("Green")
		}
	}
	else if(team=="Blue"){
		for (var i in clients){
			console.log("Blue")
			if (clients[i].team == "Blue") clients[i].client.send(wsMsg)
		}
	}

	else if(team=="Red"){
		for (var i in clients){
			console.log("Red")
			if (clients[i].team == "Red") clients[i].client.send(wsMsg)
		}
	}
})

wsServer.broadcast = function (data){
  for (i in clients)
    i.send(data)

}


