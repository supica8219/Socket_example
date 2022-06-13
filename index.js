'use strict';
//IMPORT RIBLALY
const express = require('express');
const http = require('http');
const path = require('path');
const sleep = require('./sleep')
const socketIO = require('socket.io');
const app = express();
const server = http.Server(app);
const io = socketIO(server);
const value_table = [
  [45,-11,4,-1,-1,4,-11,45],
  [-11,-16,-1,-3,-3,2,-16,-11],
  [4,-1,2,-1,-1,2,-1,4],
  [-1,-3,-1,0,0,-1,-3,-1],
  [-1,-3,-1,0,0,-1,-3,-1],
  [4,-1,2,-1,-1,2,-1,4],
  [-11,-16,-1,-3,-3,2,-16,-11],
  [45,-11,4,-1,-1,4,-11,45],];
const room = class {
  constructor(room_name) { /* コンストラクタ */
    this.room_name = room_name;
    this.blackID = "";
    this.whiteID = "";
    this.turn = 1;
    this.users = {},
    this.bot = false,
    this.table = [
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,1,2,0,0,0],
      [0,0,0,2,1,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
    ];
  }
}
const user = class {
  constructor(id) { /* コンストラクタ */
    this.id = id;
    this.room = "";
    this.name = "";
    this.role = "";
  }
}
//ROOM LIST
var rooms = {}
//USER LIST
var users = {}
users["BOT"] = new user("BOT");
users["BOT"].name = "BOT";
users[""] = new user("");
users[""].name = "";
//EVENTLISTENER
io.on('connection', function(socket) {
  
  //CHECK CONNECTED
  console.log("connected",socket.id);
  users[socket.id] = new user(socket.id)
  io.to(socket.id).emit('ret_connected',socket.id)
  //JOIN ROOM
  socket.on("join_room", function(room_name,user_name,bot_flag){  
    for(let key of socket.rooms){
      if(socket.id != key){
        socket.leave(key)
      }
    } 
    socket.join(room_name)
    users[socket.id].room = room_name;
    users[socket.id].name = user_name;
    console.log(socket.id+"::"+users[socket.id].room)
    if( rooms[room_name] == undefined ){
      rooms[room_name] = new room(room_name);
      if(bot_flag==true){
        rooms[room_name].bot = true;
      }
    }
    io.to(room_name).emit('ret_table',retCanMoveTable(rooms[room_name].turn,room_name),room_name,rooms[room_name].turn,[]);
  })
  socket.on('admin',(role)=>{
    var room_name = users[socket.id].room;
    var user_name = users[socket.id].name;
    if(role=="black"&& rooms[room_name].blackID == ""){
      rooms[room_name].blackID = socket.id;
      users[socket.id].role = "black";
      console.log("blackID:"+socket.id)
    }else{}
    if(role=="white"&& rooms[room_name].whiteID == ""){
      rooms[room_name].whiteID = socket.id;
      users[socket.id].role = "white";
      console.log("whiteID:"+socket.id)
    }else{}
    if(rooms[room_name].bot==true){
      if(users[socket.id].role=="white"){
        rooms[room_name].blackID="BOT";
        if(rooms[room_name].turn==1)botAction(room_name);
      }
      if(users[socket.id].role=="black"){rooms[room_name].whiteID="BOT";}
    }
    if(role=="view") users[socket.id].role = "view";
    role=users[socket.id].role
    io.to(socket.id).emit('ret_admin',role,user_name)
    io.to(room_name).emit('admininfo',users[rooms[room_name].blackID].name,users[rooms[room_name].whiteID].name);
    io.to(room_name).emit('ret_chat',user_name+"が入室しました","",role); 
  })  
  
  socket.on('send_chat',(text)=>{
    var room_name = users[socket.id].room;
    var user_name = users[socket.id].name;
    var role = users[socket.id].role;
    console.log(text)
    io.to(room_name).emit('ret_chat',user_name,text,role); 
  })
  socket.on('send_roominfo',(room_name)=>{
    if(rooms.hasOwnProperty(room_name)){
      console.log(rooms[room_name].blackID,rooms[room_name].whiteID,"aaa")
      io.to(socket.id).emit('ret_roominfo',users[rooms[room_name].blackID].name,users[rooms[room_name].whiteID].name)      
    }
    else{
      io.to(socket.id).emit('ret_roominfo',"","")
    }
  })
  
  //SEND ACTION---------------------------------------------------------
  socket.on('clickedSquare', function(row,column){
    var room_name = users[socket.id].room;
    var user_name = users[socket.id].name;
    var turn = rooms[room_name].turn;
    var role = users[socket.id].role;
    //ROLE REFUSE
    if(role=="black"||role=="white"){}else{return;}
    if(role=="black"&&turn==2){return;}
    if(role=="white"&&turn==1){return;}
    if(canClickSpot(row,column,room_name,turn) == true){
      var affectedDiscs = getAffectedDiscs(row,column,room_name,turn);
      flipDiscs(affectedDiscs,room_name);
      rooms[room_name].table[row][column] = turn;
      if(!canMove(1,room_name) && !canMove(2,room_name)){
        console.log("ゲーム終了")
        var bc=0;var wc=0;
        for(var i=0;i<8;i++){for(var j=0;j<8;j++){if(rooms[room_name].table[i][j]==1){bc++;}if(rooms[room_name].table[i][j]==2){wc++;}}}
        if(bc>wc)io.to(room_name).emit('ret_chat',"","ゲーム終了:黒の勝利","SYSTEM");
        if(wc>bc)io.to(room_name).emit('ret_chat',"","ゲーム終了:白の勝利","SYSTEM");
        if(wc==bc)io.to(room_name).emit('ret_chat',"","ゲーム終了:引き分け","SYSTEM");
        //TIMER
        var time = 10;
        setInterval(function(){
          //if(time%3==0)
          io.to(room_name).emit('ret_chat',"","あと"+time+"秒でルームを閉じます","SYSTEM");
          if (time == 0) {
            io.to(room_name).emit('REMOVE');
            io.in(room_name).disconnectSockets(true);
            delete rooms[room_name];
            clearInterval(this);
          }else{time--;}
  　　　　},1000);
      }
      if(turn==1 && canMove(2,room_name)){
        rooms[room_name].turn=2;
      }
      if(turn==2 && canMove(1,room_name)){
        rooms[room_name].turn=1;
      }
      io.to(room_name).emit('ret_table',retCanMoveTable(rooms[room_name].turn,room_name),room_name,rooms[room_name].turn,affectedDiscs);
      if(room_name=="BOT_ROOM"){
        for(var i=0;i<20;i++)botAction(room_name);
      }
      if(rooms[room_name].bot==true && !((rooms[room_name].turn==1&&role=="black")||(rooms[room_name].turn==2&&role=="white"))){
        botAction2(room_name);
      }
      //io.to(room_name).emit('ret_chat',user_name,String(user_name)+"が打ちました",role);           
    }
  });
  //DISCONNECTED
  socket.on('disconnect', () => {
    if(users[socket.id].room!=""){
      var room_name=users[socket.id].room
      var user_name=users[socket.id].name
      var role = users[socket.id].role;
      io.to(room_name).emit('ret_chat',user_name+"が退室しました","",role); 
      if(rooms[room_name].blackID==socket.id)rooms[room_name].blackID="";
      if(rooms[room_name].whiteID==socket.id)rooms[room_name].whiteID="";
    }
  });
});
//FUNCTIONS -------------------------------------------------------------
function canClickSpot(row,column,room_name,turn){
  if(rooms[room_name].table[row][column] != 0){
    return false;
  }
  var affectedDiscs = getAffectedDiscs(row,column,room_name,turn);
  if (affectedDiscs.length == 0) return false;
  else return true;
}

function getAffectedDiscs(row,column,room_name,turn){
  var affectedDiscs = [];
  // all
  for(var pi=0;pi<Math.PI*2;pi+=Math.PI/4){
    var dx=Math.round(Math.cos(pi));
    var dy=Math.round(Math.sin(pi));
    var couldBeAffected = [];
    var rowIterator = row;
    var columnIterator = column;
    rowIterator += dx;
    columnIterator += dy;
    while (rowIterator <= 7 && rowIterator >= 0 && columnIterator <= 7 && columnIterator >= 0){
      var valueAtSpot = rooms[room_name].table[rowIterator][columnIterator];
      if(valueAtSpot == 0 || valueAtSpot == turn){
        if(valueAtSpot == turn){
          affectedDiscs = affectedDiscs.concat(couldBeAffected);
        }
        break;
      }else{
        var discLocation = {row:rowIterator,column:columnIterator};
        couldBeAffected.push(discLocation);
      }
      rowIterator += dx;
      columnIterator += dy;
    }
  }
  return affectedDiscs;
}
function flipDiscs(affectedDiscs,room_name){
  for (var i = 0; i< affectedDiscs.length; i++){
    var spot = affectedDiscs[i];
    if (rooms[room_name].table[spot.row][spot.column] == 1){
      rooms[room_name].table[spot.row][spot.column] = 2;
    }else {
      rooms[room_name].table[spot.row][spot.column] = 1;
    }
  }
}

function canMove(id,room_name){
  for(var i=0;i<8;i++){
    for(var j=0;j<8;j++){
      if(canClickSpot(i,j,room_name,id)){
        return true;}
    }
  }
  return false;
}
function retCanMoveTable(id,room_name){
  var tmp_table = new Array(8);
  for(let i = 0;i<8;i++){tmp_table[i] = new Array(8).fill(0);}
  for(let i = 0;i<8;i++){for(let j = 0;j<8;j++){tmp_table[i][j]=rooms[room_name].table[i][j];}}
  var couldBeAffected=[]
  for(var i=0;i<8;i++){
    for(var j=0;j<8;j++){
      if(canClickSpot(i,j,room_name,id)){   
        couldBeAffected.push({row:i,column:j});
      }
    }
  }
  for (var i = 0; i< couldBeAffected.length; i++){
    var spot = couldBeAffected[i];
    if(id==1)
      tmp_table[spot.row][spot.column]=11
    if(id==2)
      tmp_table[spot.row][spot.column]=22
  }
  return tmp_table;
}
function botAction2(room_name){
  sleep(1000).then( () => {
    var turn = rooms[room_name].turn;
    var value=-999;var row=-999,column=-999;
    for(var i=0;i<8;i++)
    for(var j=0;j<8;j++)
    if(canClickSpot(i,j,room_name,turn) == true){
      if(value_table[i][j]>value){
        row=i;column=j;
        value=value_table[i][j]
      }
    }
    if(row==-999){return;}
    console.log(row,column,value)
    console.log("BOTACTION2",row,column)
    var affectedDiscs = getAffectedDiscs(row,column,room_name,turn);
    flipDiscs(affectedDiscs,room_name);
    rooms[room_name].table[row][column] = turn;
    if(!canMove(1,room_name) && !canMove(2,room_name)){
      console.log("ゲーム終了")
      var bc=0;var wc=0;
      for(var i=0;i<8;i++){for(var j=0;j<8;j++){if(rooms[room_name].table[i][j]==1){bc++;}if(rooms[room_name].table[i][j]==2){wc++;}}}
      if(bc>wc)io.to(room_name).emit('ret_chat',"","ゲーム終了:黒の勝利","SYSTEM");
      if(wc>bc)io.to(room_name).emit('ret_chat',"","ゲーム終了:白の勝利","SYSTEM");
      if(wc==bc)io.to(room_name).emit('ret_chat',"","ゲーム終了:引き分け","SYSTEM");
      //TIMER
      var time = 10;
      setInterval(function(){
        //if(time%3==0)
        io.to(room_name).emit('ret_chat',"","あと"+time+"秒でルームを閉じます","SYSTEM");
        if (time == 0) {
          io.to(room_name).emit('REMOVE');
          io.in(room_name).disconnectSockets(true);
          delete rooms[room_name];
          clearInterval(this);
        }else{time--;}
      },1000);
    }
    if(turn==1 && canMove(2,room_name)){
      rooms[room_name].turn=2;
    }else if(turn==2 && canMove(1,room_name)){
      rooms[room_name].turn=1;
    }else{
      console.log("REACT");botAction2(room_name);
    }
    io.to(room_name).emit('ret_table',retCanMoveTable(rooms[room_name].turn,room_name),room_name,rooms[room_name].turn,affectedDiscs);
    return;
  })
}
function botAction(room_name){
  sleep(1000).then( () => {
  var turn = rooms[room_name].turn;
  for(var row=0;row<8;row++)
  for(var column=0;column<8;column++)
  if(canClickSpot(row,column,room_name,turn) == true){
    console.log("BOTACTION",row,column)
    var affectedDiscs = getAffectedDiscs(row,column,room_name,turn);
    flipDiscs(affectedDiscs,room_name);
    rooms[room_name].table[row][column] = turn;
    if(!canMove(1,room_name) && !canMove(2,room_name)){
      console.log("ゲーム終了")
      var bc=0;var wc=0;
      for(var i=0;i<8;i++){for(var j=0;j<8;j++){if(rooms[room_name].table[i][j]==1){bc++;}if(rooms[room_name].table[i][j]==2){wc++;}}}
      if(bc>wc)io.to(room_name).emit('ret_chat',"","ゲーム終了:黒の勝利","SYSTEM");
      if(wc>bc)io.to(room_name).emit('ret_chat',"","ゲーム終了:白の勝利","SYSTEM");
      if(wc==bc)io.to(room_name).emit('ret_chat',"","ゲーム終了:引き分け","SYSTEM");
      //TIMER
      var time = 10;
      setInterval(function(){
        //if(time%3==0)
        io.to(room_name).emit('ret_chat',"","あと"+time+"秒でルームを閉じます","SYSTEM");
        if (time == 0) {
          io.to(room_name).emit('REMOVE');
          io.in(room_name).disconnectSockets(true);
          delete rooms[room_name];
          clearInterval(this);
        }else{time--;}
      },1000);
    }
    if(turn==1 && canMove(2,room_name)){
      rooms[room_name].turn=2;
    }else if(turn==2 && canMove(1,room_name)){
      rooms[room_name].turn=1;
    }else{
      console.log("REACT");botAction(room_name);
    }
    io.to(room_name).emit('ret_table',retCanMoveTable(rooms[room_name].turn,room_name),room_name,rooms[room_name].turn,affectedDiscs);
    return;
  }
  })
}
app.use('/static', express.static(__dirname + '/static'));
//RETURN HTML FILE
app.get('/', (request, response) => {
  response.sendFile(path.join(__dirname, '/static/othello.html'))
});
//LISTEN SERVER PORT 3000
server.listen(3000, function() {
  console.log('Starting server on port 3000');
});
