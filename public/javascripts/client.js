  var stream_tmp;
  var videos = [];
  var PeerConnection = window.PeerConnection
      || window.webkitPeerConnection00
      || window.webkitRTCPeerConnection
      || window.mozRTCPeerConnection
      || window.RTCPeerConnection;
      
  var getUserMedia = navigator.getUserMedia
      || navigator.webkitGetUserMedia
      || navigator.mozGetUserMedia
      ||  navigator.msGetUserMedia;

  function settingVideo(stream , socketId){
    var video = document.getElementById("you");
    video.id = "remote" + socketId;
    //web.rtc.io - 373
    rtc.attachStream(stream, video.id);
  }

  
 function removeVideo(socketId) {
    var video = document.getElementById('remote' + socketId);
    if(video) {
      console.log("videos.indexOf(video): -> " +videos.indexOf(video) );
      videos.splice(videos.indexOf(video), 1);
      video.parentNode.removeChild(video);
    }
  }
  
  function initUserId(){
    var u_id ={
      send: function(data){
        rtc._socket.send(data);
      },
        recv: function(data){
        return data;
      },
      event: 'receive_user_id'
    };
  
    //userIdをサーバからもらうように申請
    waitForConnection = function(){
      console.log("waiting...");
      if(rtc._socket.readyState==1){
        //user_idにcookieに保存された video_chat=XXXXをcookieからとりたい
        if((st = document.cookie.lastIndexOf("video_chat=")) != -1){
          user_id = $.cookie("video_chat");
          rtc._socket.send(JSON.stringify({
            "eventName" : "update_userId",
            "data" : { "u_id" : user_id}
          }));
        }else{
          u_id.send(JSON.stringify({
            "eventName" : "create_userId",
            "data" : {}
          }));
        }
        console.log("send!!");
      } else {
        setTimeout(function(){
          waitForConnection(); //相手からの通信を待ち続ける
        },500);
      }
    };
  
    waitForConnection();
    //サーバからIDを受け取る
    rtc.on(u_id.event,function(){
      //u_id.recvの返し値は、配列のようでarrayメソッドをもっていない
      //そこで、applyメソッドを使ってargumentsをwindowに与える
      //arrayは、引数を一つのみ(->callメソッド参照)
      var receive = u_id.recv.apply(this,arguments);
      $("#user_id").html("あなたの番号は<span id='mynumber'>" + receive.userId + "</span>です");
      $.cookie("video_chat", receive.userId , { expires: 30}) ;
      window.location.href="/#" + receive.userId;
    });
  }
  
  function initTel(){
    var tell ={
      send: function(data){
        rtc._socket.send(data);
      },
        recv: function(data){
        return data;
      },
      event: 'receive_tell'
    };
    
    //ユーザのdivはこの処理後追加のため、onを使用
    $(document).on("click" , "div[id^=user] " , function(){
      //id =相手の番号, my_id=自分の番号
      userId = this.id;
      var id = userId.substr(4);
      var my_id = window.location.hash.slice(1);
      
      //rtcのsocketにJSONを送る
      tell.send(JSON.stringify({
        "eventName" : "call",
        "data" : {
          "num" : id ,
          "my_id" : my_id
        }
      }));
      console.log("partner number:-> " + id);
    });
  
    rtc.on("receive_tell",function(){
      var receive = tell.recv.apply(this,arguments);
      setTimeout(function(){
        alert(receive.room + "さんから" + receive.str);
        window.location.href='/#' + receive.room;
      init();
        },2000);
    });
  
    var dis_connect={
      send: function(data){
        rtc._socket.send(data);
      },
        recv: function(data){
        return data;
      },
      event: 'disconnect_tell'
    };
    
    $("#disconnect").click( function(event) {
      var room = window.location.hash.slice(1);
      console.log("room->" + room);
      dis_connect.send(JSON.stringify({
        "eventName" : "close",
        "data" : {
          "room" : room
        }
      }));
    });
  
    rtc.on("disconnect_tell",function(){
      location.href = "/";
    });
    
  }
  
  var userList= [];
  var allUserList =[];
  
  function initList() {
    var users ={
      send: function(data){
        rtc._socket.send(data);
      },
      recv: function(data){
        return data;
      },
      event: "getUserlist"
    };
    
    rtc.callUserList = function() {
      users.send(JSON.stringify({
        "eventName" : "setUserlist",
        "data" : {}
      }));
    };
    
    rtc.on("getUserlist" , function(){
      var receive = users.recv.apply(this,arguments);
      tmpList =[];
      
      allUserList = receive.rooms;
      
      for(key in receive.rooms){
        if (key !="")
          tmpList.push(key);
      }
      
      userList = tmpList.filter( function(x, i, self){
        return self.indexOf( x ) === i;
      });
      createUsers();
    });
    
  }
  
  function init() {
    if(PeerConnection) {
      //web.rtc.io - 336
      rtc.createStream({
        "video": {"mandatory": {}, "optional": []},
        "audio": true
      }, function(stream) {
        document.getElementById('me').src = URL.createObjectURL(stream);
        document.getElementById('me').play();
      });
    } else {
      alert('Your browser is not supported or you have to turn on flags. In chrome you go to chrome://flags and turn on Enable PeerConnection remember to restart chrome');
    }
    var room = window.location.hash.slice(1);
    
    rtc.connect("ws:" + window.location.href.substring(window.location.protocol.length).split('#')[0], room);
    if(rtc._socket)
      console.log(rtc._socket.readyState);
      
  
    /* socketIDは相手のソケット番号*/
    rtc.on('add remote stream', function(stream, socketId) {
      console.log("ADDING REMOTE STREAM...");
      settingVideo(stream , socketId);
    });
    
    rtc.on('disconnect stream', function(data) {
      console.log('remove ' + data);
      removeVideo(data);
    });
    
    initUserId();
    initList();
    initTel();
    catchmyimg();
    //ユーザイメージの更新を行う
    setInterval( "catchmyimg()" , 120000);//5min:300000 1min:60000
  }
  
  window.onunload = function(event){
    console.log("socket is closed.");
    rtc._socket.close();
  };
  
  //ユーザーイメージの作成をする
  function catchmyimg(){
    setTimeout(function(){
      //canvasを使用する
      var imageElement = document.getElementById("image");
      var frame = imageElement.getContext("2d");
      var videoElement = document.getElementById("me");
      //videoの幅を決める
      imageElement.height = videoElement.videoHeight;
      imageElement.width  = videoElement.videoWidth;
      frame.drawImage( videoElement  , 0 , 0 );
    },5000);
  };
  
  //ログインユーザーを表示させるのタグ生成
  function createUsers() {
    //偶数の時のみ、<td>を生成する
    //userList = [1,2,3,....]
    var tmpnum = 0;
    for( var id of  userList ){
      //ソケットが入ってない=ログアウトしてる場合は、表示させない
      if (allUserList[id] != "") {
        //横２つずつで表示させるため
        if ( tmpnum % 2 == 0) {
          $("tbody").append("<tr>")
        }
        $("tr").append("<td>");
        $("td:last").append( '<div id="user'+id+'" class="userbox" type="button">' );
        $("td div:last").append('<img class="userimg">');
        $("td div:last").append("<h2>"+id+"</h2>");
        $("td div:last").append("</div>")
        $("td div:last").append("</td>")
        
        if ( tmpnum % 2 == 1) {
          $("tbody").append("</tr>")
        }
        tmpnum++;
      }
    }
  }
