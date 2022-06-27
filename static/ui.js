function display_message(text){
  //フェードインする
$('#msg-box').fadeIn(0, function () {
  console.log(text)
  document.getElementById("msg-box").innerHTML=text
  //コールバックで3秒後にフェードアウト	
  $(this).delay(500).fadeOut("slow");
});
}
const form = document.getElementById("form")
const submitButton = document.getElementById("submit-button")

var num = 0;

function slide_time() {
  if(pictures.length == 0)return;
  console.log(num)
  document.getElementById("table").style.backgroundImage = "url("+pictures[num]+")";
  if (num == pictures.length - 1) {
    num = 0;
  }else{
    num++;
  }

}
setInterval(slide_time, 20000);

submitButton.onclick = () => {
  //document.getElementById("img_file").files[0].name = Math.random(0,100) + ".png"
  var formData = new FormData(form)
  formData.append('socketID',socketID)
  const action = form.getAttribute("action")
  const options = {
    method: 'POST',
    body: formData,
  }
  fetch(action, options).then((e) => {
    if(e.status == 200) {
      alert("保存しました。")
      return
    }
    alert("保存できませんでした。")
  })
}
