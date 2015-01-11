/*
  ルーティング用Javascript
*/

module.exports = function(app){
    
  /*
  app.get('アクセス先'func(){
    res.render('');
  })
  */
  
  app.get('/', function (req, res){
    res.render('index', {title: 'ExpTEST Hello!!'});
  });
  
  /*テスト用　新たなページの追加に関して*/   
  app.get('/test.html',function(req, res){ 
    res.sendfile(__dirname+ '/test.html');
  });
  
    app.get('/memo', function (req, res){
    res.render('memo', {title: 'ExpTEST Hello!!'});
  });
}
