//Expressをロードする
var express = require('express');
//ExpressのApplicationオブジェクトを作成する
var app = express();
var server = require('http').createServer(app);
var webRTC = require('webrtc.io').listen(server);

app.set('view engine', 'jade');
app.set('views', __dirname + '/views');

app.use(express.static(__dirname+'/public'));

require("./routing.js")(app);

/*ポート番号の決定*/
var port = process.env.PORT || 8081;
server.listen(port);

console.log("Server is listening on port " + port);




//var user_numbers = 1000;
var userList={}; // {num : socket }

webRTC.rtc.on('call',function(data,socket){
  var soc;
  for(key in userList){
    if(key == data.num){ //相手のIDが存在するなら
      soc = userList[key];
      var tmp = [socket.id];
      webRTC.rtc.rooms[data.my_id] = tmp;
    }else{
      console.log("the number:" + data.num + "is nothing");
    }
  }
  console.log(webRTC.rtc.rooms);

  if (soc){
    console.log(data.num + "'s socketID is " + soc.id);
    soc.send(JSON.stringify({
      "eventName" : "receive_tell",
      "data" : {"str" : "電話がきました",
                "room" : data.my_id
      }
    }));
  }else{
    console.log(data.num + "is not found...")
  }
});

webRTC.rtc.on('create_userId',function(data,socket){
  var num = 1;
  //var num = 1001;
  /* cookieで使用されいている番号に入らないように */
  for(key in userList){
    console.log(key);
    if(key == num)
      num +=1;
  }
  console.log("num : " + num);
  console.log("socketid : " + socket.id);
  userList[num] = socket;

  socket.send(JSON.stringify({
    "eventName" : "receive_user_id",
    "data" : {
      "userId" : num ,
      "socketId" : socket.id
    }
  }));
});

webRTC.rtc.on("update_userId",function(data,socket){
  userList[data.u_id] = socket;
  console.log(data.u_id);
  console.log("socketid:" + userList[data.u_id].id);
  socket.send(JSON.stringify({
    "eventName" : "receive_user_id",
    "data" : {
      "userId" : data.u_id ,
      "socketId" : socket.id
    }
  }));
});

webRTC.rtc.on('close',function(data,socket){
  /* rootpathにリダイレクトすることで切れる*/
  var roomList = webRTC.rtc.rooms[data.room] || [];
  for (var i = 0; i < roomList.length; i++) {
    var socketId = roomList[i];
    var soc = webRTC.rtc.getSocket(socketId);//socketが取得できる

    console.log("close :" + soc);
    
    if (soc) {
      soc.send(JSON.stringify({
        "eventName": "disconnect_tell"
      }), function(error) {
        if (error) {
          console.log(error);
        }
      });
    }
  }
});
