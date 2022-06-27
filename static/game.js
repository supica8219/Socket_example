'use strict';

//DIFINATION
var socket = io();
var socketID = "";
var blackBackground;
var gap = screen.width/100/4;
var cellWidth = screen.width/100*6-gap;
var discLayer;
var canMoveLayer;
var scoreLavel;
var pictures = []
var gameover =false;
var turn;
var discs;
var table = document.getElementById("table")
socket.emit("req_id")
socket.on("ret_id",(socketid)=>{
  socketID = socketid
  console.log(socketID)
})
document.getElementById("room_select").addEventListener("change",()=>{
  var room_name=document.getElementById("room_select").value
  socket.emit('send_roominfo',room_name)
})
socket.on("ret_roominfo",(black_name,white_name)=>{
  console.log(black_name,white_name)
  var select_roominfo=document.getElementById("select_roominfo")
  var role = document.getElementById("role_select")
  select_roominfo.innerHTML="黒:"+black_name+" 白:"+white_name;
  role.innerHTML="";
  var option=document.createElement("option");option.value="view";option.innerHTML="観戦";role.appendChild(option);
  if(black_name == ""){var option=document.createElement("option");option.value="black";option.innerHTML="黒";role.appendChild(option);}
  if(white_name == ""){var option=document.createElement("option");option.value="white";option.innerHTML="白";role.appendChild(option);}
})
socket.emit('send_roominfo',"room1")
//JOIN_ROOM_FORM
function join_room(){
  document.getElementById("chat_area").innerHTML=""
  document.getElementById("modal-window").style.display="none"
  document.getElementById("overlay").style.display="none"
  var user_name = document.getElementById("user_name").value;
  var role = document.getElementById("role_select").value;
  var room_name = document.getElementById("room_select").value;
  var bot_flag = document.getElementById("bot_flag").checked;
  var img_path = socketID + ".JPG"  
  
  if(user_name == null || role == null){console.log("NO");return;}
  socket.emit('join_room',room_name,user_name,bot_flag,img_path);
  socket.emit('admin',role)
  socket.emit('getimage')
}
socket.on("sendImage",(data)=>{
    //const imgElement = document.getElementById('imageViewer');
    //imgElement.src = data.imgSrc;
    pictures.push(data.imgSrc)
    console.log(pictures)
    //table.style.backgroundImage = "url("+data.imgSrc+")"
})
//SEND CHAT
function send_chat() {
  var text=document.getElementById("chat_text").value
  socket.emit('send_chat',text);
}
socket.on("admininfo",(black_name,white_name)=>{
  var p = document.getElementById("admininfo")
  admininfo.innerHTML = "黒:"+black_name+"<br>白:"+white_name
})
socket.on("ret_chat",(user_name,text,role)=>{
  var p = document.createElement("p");
  p.innerHTML=role+"->"+user_name+":"+text;
  display_message(role+"->"+user_name+":"+text);
  document.getElementById("chat_area").appendChild(p);
})
socket.on("ret_admin",(role,user_name)=>{
  document.getElementById("user_info").innerHTML = "ロール"+role+"<br>"+"名前"+user_name;
  /*if(role == "black"){table.style.backgroundColor = "black"}
  else if(role == "white"){table.style.backgroundColor = "white"}
  else if(role == "view"){table.style.backgroundColor = "orange"}*/
})
socket.on("ret_connected",(socketid)=>{
  document.getElementById("socketid").innerHTML = socketid
})

function gameStart(){
  blackBackground = document.getElementById("blackBackground");
  discLayer = document.getElementById("discLayer");
  canMoveLayer = document.getElementById("canMoveLayer");
  scoreLavel = document.getElementById("scoreLavel");
  blackBackground.style.width = cellWidth*8+ (gap*9)+"px";
  blackBackground.style.height = cellWidth*8+ (gap*9)+"px";
  drawGreenSquares();
  //socket.emit("table");
}
function clickedSquare(row,column){
  socket.emit('clickedSquare',row,column);
  //socket.emit("table");
}
function drawGreenSquares(){
  for(var row = 0; row < 8; row++){
    for (var column = 0; column < 8; column++){
      var greenSquare = document.createElement("div");
      greenSquare.style.position = "absolute";
      greenSquare.style.width = cellWidth+"px";
      greenSquare.style.height = cellWidth+"px";
      greenSquare.style.backgroundColor = "green";
      greenSquare.style.left = (cellWidth+gap)*column+gap+"px";
      greenSquare.style.top =　(cellWidth+gap)*row+gap+"px";
      greenSquare.setAttribute("onclick","clickedSquare("+row+","+column+")");
      blackBackground.appendChild(greenSquare);
    }
  }
}
function drawDiscs(affectedDiscs){
  discLayer.innerHTML="";
  var bcount=0,wcount=0;
  for(var row = 0; row <8; row++){
    for(var column = 0; column < 8;column++){
      var value = discs[row][column];
      if (value == 0){
        
      }else{
        var disc = document.createElement("div");
        disc.style.position = "absolute";
        disc.style.width = cellWidth-4+"px";
        disc.style.height = cellWidth-4+"px";
        disc.style.borderRadius = "50%";
        disc.style.left = (cellWidth+gap)*column+gap+2+"px";
        disc.style.top =　(cellWidth+gap)*row+gap+2+"px";
        for (var i = 0; i< affectedDiscs.length; i++){
         if(affectedDiscs[i].row==row && affectedDiscs[i].column==column){
            disc.classList.remove('disc_effect')
            disc.classList.add('disc_effect')
         }
        }
        disc.setAttribute("onclick","clickedSquare("+row+","+column+")");
        if (value == 1){
          disc.style.backgroundImage = "radial-gradient(#333333 30%, black 70%)";   
          disc.style.opacity = 1.0
        }
        if(value == 2){
          disc.style.backgroundImage = "radial-gradient(white 30%,#cccccc 70%)";
          disc.style.opacity = 1.0         
        }
        if(value == 11){
          disc.style.backgroundImage = "radial-gradient(#333333 30%, black 70%)";
          disc.style.opacity = 0.4
        }
        if(value == 22){
          disc.style.backgroundImage = "radial-gradient(white 30%,#cccccc 70%)";
          disc.style.opacity = 0.4
        } 
        discLayer.appendChild(disc);
        if(value==1){bcount++;}else{wcount++;}
      }
    }
  } 
  document.getElementById("scoreLavel").innerHTML="黒:"+bcount+" 白:"+wcount;
}
//PRINT RETURN TABLE
socket.on('ret_table',(table,room_name,turn,affectedDiscs) => {
  console.log(affectedDiscs)
  document.getElementById("annai").style.display = "none";
  discs=table
  document.getElementById("room").innerHTML = room_name
  if(turn==1)
  document.getElementById("turn").innerHTML = "黒のターン";
  else if(turn==2)
  document.getElementById("turn").innerHTML = "白のターン";
  console.log(table)
  console.log(room_name)
  drawDiscs(affectedDiscs)
});
//LOOP CONNE
socket.on('state', (mozi) => {
  console.log(mozi)
});
socket.on('connect',()=>{
  gameStart();
});

socket.on('REMOVE',()=>{
  window.location.reload(true);
})
