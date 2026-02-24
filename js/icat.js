// changeTime函数
const changeTime = (time, more = false) => {
  const currentDate = new Date()

  const formatTimestamp = (date) => {
    const d = new Date(date)
    const pad = (num) => String(num).padStart(2, '0')
    return `${pad(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` + `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const calculateDiff = (date1, date2, unit) => {
    const units = { day: 24 * 60 * 60 * 1000, hour: 60 * 60 * 1000 }
    return Math.floor(Math.abs(date1 - date2) / units[unit])
  }

  const describeTime = (datetime) => {
    const timeObj = new Date(datetime)
    const diffDays = calculateDiff(timeObj, currentDate, 'day')
    const diffHours = calculateDiff(timeObj, currentDate, 'hour')

    if (diffHours < 1) return `最近`
    if (diffHours <= 24) return `${diffHours}小时前`
    if (diffDays === 1) return `昨天`
    if (diffDays === 2) return `前天`
    if (diffDays <= 7) return `${diffDays}天前`

    const year = timeObj.getFullYear()
    const month = timeObj.getMonth() + 1
    const date = timeObj.getDate()
    return year !== currentDate.getFullYear() ? `${year}/${month}/${date}` : `${month}/${date}`
  }

  if (more) return formatTimestamp(time)
  if (time) return describeTime(time)

  document.querySelectorAll('time.datatime').forEach((e) => { e.textContent = describeTime(e.getAttribute('datetime')) })
}

// 祭奠日自动变灰
if(PublicSacrificeDay()){
    document.getElementsByTagName("html")[0].setAttribute("style","filter:gray !important;filter:grayscale(100%);-webkit-filter:grayscale(100%);-moz-filter:grayscale(100%);-ms-filter:grayscale(100%);-o-filter:grayscale(100%);");
  }
  
  function PublicSacrificeDay(){
      var PSFarr=new Array("0707","0909","0918","1109","1213");
      var currentdate = new Date();
      var str = "";
      var mm = currentdate.getMonth()+1;
      if(currentdate.getMonth()>9){
        str += mm;
      }else{
        str += "0" + mm;
      }
      if(currentdate.getDate()>9){
        str += currentdate.getDate();
      }else{
        str += "0" + currentdate.getDate();
      }
      if(PSFarr.indexOf(str)>-1){
          return 1;
      }else{
          return 0;
      }
  }

// 0707 - 七七事变
// 0909 - 毛主席忌辰
// 0918 - 九一八事变
// 1109 - 娣外公忌辰
// 1213 - 南京公祭日
