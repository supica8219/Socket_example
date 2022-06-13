function display_message(text){
  //フェードインする
$('#msg-box').fadeIn(0, function () {
  console.log(text)
  document.getElementById("msg-box").innerHTML=text
  //コールバックで3秒後にフェードアウト	
  $(this).delay(500).fadeOut("slow");
});
}
