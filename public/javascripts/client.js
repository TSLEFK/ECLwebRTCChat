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
  
  function getNumPerRow() {
    var len = videos.length;
    var biggest;
  
    // Ensure length is even for better division.
    if(len % 2 === 1) {
      len++;
    }
  
    biggest = Math.ceil(Math.sqrt(len));
    while(len % biggest !== 0) {
      biggest++;
    }
    return biggest;
  }
  
  function subdivideVideos() {
    var perRow = getNumPerRow();
    var numInRow = 0;
    for(var i = 0, len = videos.length; i < len; i++) {
      var video = videos[i];
      setWH(video, i);
      numInRow = (numInRow + 1) % perRow;
    }
  }
  
  //削除
  function setWH(video, i) {
    var perRow = getNumPerRow();
    var perColumn = Math.ceil(videos.length / perRow);
    var width = window.innerWidth;
    var height = window.innerHeight / 2;
    video.width = 320;//width;
    video.height = 300;//height;
    video.style.visibility = "visible";
  }
  
  //ビデオを表示させるタグを作る
  function cloneVideo(domId, socketId) {
    var video = document.getElementById(domId);
    var clone = video.cloneNode(false);
    clone.id = "remote" + socketId;
    document.getElementById('videos').appendChild(clone);
    videos.push(clone);
    return clone;
  }
  
  function callClone(stream , socketId) {
    console.log("start callClone. socketId->" + socketId);
    console.log("this.stream" + stream);
    var clone = cloneVideo('you', socketId);
    document.getElementById(clone.id).setAttribute("class", "");
    //web.rtc.io - 373
    rtc.attachStream(stream, clone.id);
  }
  
  function removeVideo(socketId) {
    var video = document.getElementById('remote' + socketId);
    if(video) {
      console.log("videos.indexOf(video): -> " +videos.indexOf(video) );
      videos.splice(videos.indexOf(video), 1);
      video.parentNode.removeChild(video);
    }
  }
  
  function sanitize(msg) {
    return msg.replace(/</g, '&lt;');
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
          console.log("user_id on cookie:-> " + user_id );
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
      console.log("waitForConnection OK");
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
      
      //IDの振り分け後の動作
      //ログインしているユーザーを表示する
      var list = receive.roomlist;
      
      for (key in list){
         console.log("key" +  key );
      }
      
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
      console.log("callUserList");
    //発火条件必要？
      users.send(JSON.stringify({
        "eventName" : "setUserlist",
        "data" : {}
      }));
    };
    
    rtc.on("getUserlist" , function(){
      var receive = users.recv.apply(this,arguments);
      
      allUserList = receive.rooms;
      
      for(key in receive.rooms){
        if (key !="")
          userList.push(key);
      }
      
      console.log("login usersList -> " + userList);
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
  /*常にFじゃね？
    if(rtc._socket)
      console.log(rtc._socket.readyState);
    */ 
    rtc.connect("ws:" + window.location.href.substring(window.location.protocol.length).split('#')[0], room);
    if(rtc._socket)
      console.log(rtc._socket.readyState);
      
  
    /* socketIDは相手のソケット番号*/
    rtc.on('add remote stream', function(stream, socketId) {
      console.log("ADDING REMOTE STREAM...");
      callClone(stream , socketId);
      subdivideVideos();
    });
    
    rtc.on('disconnect stream', function(data) {
      console.log('remove ' + data);
      removeVideo(data);
    });
    
    
    //initNewRoom();
    initUserId();
    initList();
    
    initTel();
    catchmyimg();
    //ユーザイメージの更新を行う
    setInterval( "catchmyimg()" , 120000);//5min:300000 1min:60000
    //setInterval( "initList()" , 1000);
  }
  
  window.onresize = function(event) {
    subdivideVideos();
  };
  
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
