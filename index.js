var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
server.listen(3000);
app.set('view engine', 'ejs')

app.all('/', function (req, res) {
    if (req.query.nickname && req.query.nickname!='' && req.query.room && req.query.room!='') {
        res.render("gamePage", {currentUser: req.query.nickname, room: req.query.room});
    }else
    if(req.query.nickname && req.query.nickname!=''){
        res.render("lobbyPage", {currentUser: req.query.nickname});
    }else{
        console.log(req.query);
        res.render("homePage");
    }

});

app.all('/game', function (req, res) {
    if (req.query.nickname && req.query.nickname!='' && req.query.room && req.query.room!='') {
        res.render("gamePage", {currentUser: req.query.nickname, room: req.query.room});
    }
})

var connections = [];
var games = [];

io.sockets.on('connection', function (socket) {
    console.log(socket.id.toString() + " ПОДКЛЮЧИЛСЯ");
    connections.push(socket);
    refreshCounts();
    refreshGames();

    socket.on('disconnect', function () {
        connections.splice(connections.indexOf(socket), 1);
        games.splice(games.findIndex(function (current) {
            return current.socketOwner == socket;
        }), 1 );
        refreshGames();
        refreshCounts();
        console.log(socket.id.toString() + " ОТКЛЮЧИЛСЯ");
    });

    socket.on('createGame', function (data) {
        if (! games.find(
            function (currentValue) {
                if (currentValue.gameOwnerName == data.name || currentValue.socketOwner == socket){
                    return true;
                }else {
                    return false;
                }
        })){
            games.push({gameOwnerName : data.name , socketOwner : socket});
            socket.emit('msg2Client', 'Game created!');
            refreshGames();
        }else {
            socket.emit('msg2Client', 'Game NOT created!');
        }
    });

    socket.on('msg2Server', function (data) {
        console.log("msg from client:")
        console.log(data.msg);
    })

    socket.on('joinGame', function (data) {
        if (! games.find(
            function (currentValue) {
                if (currentValue.socketOwner == socket){
                    return true;
                }else {
                    return false;
                }
            })){
            var roomName = data.name;
            //находим сокет создавший игру
            var gameOwnerSocket = games[games.findIndex(function (current) {
                return current.gameOwnerName == roomName;
            })].socketOwner;


            //удаляем инфу о его комнате в лобби
            games.splice(games.findIndex(function (current) {
                return current.gameOwnerName == roomName;
            }), 1 );
            refreshGames();

            gameOwnerSocket.emit('msg2Client', 'Fight!');
            socket.emit('msg2Client', 'Fight!');
            gameOwnerSocket.emit('joinFight', roomName.toString());
            socket.emit('joinFight', roomName.toString());
        }else {
            socket.emit('msg2Client', 'You can`t join game cause u are owner of one!');
        }
    });




    socket.on('doGameStep', function (data) {
        io.sockets.in(data.room).emit('watchGameStep', data.num);
    });

    socket.on('joinRoom', function (room) {
        socket.join(room);
    });

    socket.on('want2Restart', function (room) {
        socket.broadcast.to(room).emit('want2Restart');
    })

});


function refreshGames() {
    io.sockets.emit('clearGames');
    games.forEach(function (item) {
        io.sockets.emit('addGame', item.gameOwnerName);
    })
}

function refreshCounts() {
    io.sockets.emit('refreshCount', connections.length.toString());
}
