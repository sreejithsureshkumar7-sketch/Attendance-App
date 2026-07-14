const $ = (id) => document.getElementById(id);
let currentUser = null;
let studentsData = [];
let reportRows = [];
let chart = null;
let deferredPrompt = null;
const staffAccounts = [

  // Principal
  { role:"principal", username:"principal", password:"principal123" },

  // Vice Principal
  { role:"viceprincipal", username:"vp", password:"vp123" },

  // HOD
  { role:"hod", department:"Computer Science", username:"hodcs", password:"hodcs123" },
  { role:"hod", department:"BCA", username:"hodbca", password:"hodbca123" },
  { role:"hod", department:"B.Com", username:"hodbcom", password:"hodbcom123" },
  { role:"hod", department:"BBA", username:"hodbba", password:"hodbba123" },
  { role:"hod", department:"Mathematics", username:"hodmath", password:"hodmath123" },
  { role:"hod", department:"English", username:"hodeng", password:"hodeng123" },

  // Staff 01-25
  { role:"staff", username:"staff01", password:"staff01" },
  { role:"staff", username:"staff02", password:"staff02" },
  ...
  { role:"staff", username:"staff25", password:"staff25" },

  // Computer Science CR
  { role:"cr", department:"Computer Science", year:"I Year", username:"cs1cr", password:"cs1cr123" },
  { role:"cr", department:"Computer Science", year:"II Year", username:"cs2cr", password:"cs2cr123" },
  { role:"cr", department:"Computer Science", year:"III Year", username:"cs3cr", password:"cs3cr123" },

  // BCA CR
  { role:"cr", department:"BCA", year:"I Year", username:"bca1cr", password:"bca1cr123" },
  { role:"cr", department:"BCA", year:"II Year", username:"bca2cr", password:"bca2cr123" },
  { role:"cr", department:"BCA", year:"III Year", username:"bca3cr", password:"bca3cr123" },

  // B.Com CR
  { role:"cr", department:"B.Com", year:"I Year", username:"bcom1cr", password:"bcom1cr123" },
  { role:"cr", department:"B.Com", year:"II Year", username:"bcom2cr", password:"bcom2cr123" },
  { role:"cr", department:"B.Com", year:"III Year", username:"bcom3cr", password:"bcom3cr123" },

  // BBA CR
  { role:"cr", department:"BBA", year:"I Year", username:"bba1cr", password:"bba1cr123" },
  { role:"cr", department:"BBA", year:"II Year", username:"bba2cr", password:"bba2cr123" },
  { role:"cr", department:"BBA", year:"III Year", username:"bba3cr", password:"bba3cr123" },

  // Mathematics CR
  { role:"cr", department:"Mathematics", year:"I Year", username:"math1cr", password:"math1cr123" },
  { role:"cr", department:"Mathematics", year:"II Year", username:"math2cr", password:"math2cr123" },
  { role:"cr", department:"Mathematics", year:"III Year", username:"math3cr", password:"math3cr123" },

  // English CR
  { role:"cr", department:"English", year:"I Year", username:"eng1cr", password:"eng1cr123" },
  { role:"cr", department:"English", year:"II Year", username:"eng2cr", password:"eng2cr123" },
  { role:"cr", department:"English", year:"III Year", username:"eng3cr", password:"eng3cr123" }

];

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = $("installBtn");
  if (btn) btn.classList.remove("hidden");
});

window.addEventListener("load", () => {
  const btn = $("installBtn");
  if (btn) {
    btn.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      btn.classList.add("hidden");
    });
  }
  if ($("aDate")) $("aDate").valueAsDate = new Date();
});

function toast(msg){
  const t = $("toast");
  t.innerText = msg;
  t.style.display = "block";
  setTimeout(()=>t.style.display="none",2500);
}

function login(){

    const username = $("loginUsername").value.trim();
    const password = $("loginPassword").value.trim();

    const user = staffAccounts.find(acc =>
        acc.username === username &&
        acc.password === password
    );

    if(!user){
        alert("Invalid Username or Password");
        return;
    }

    currentUser = user;
  // Principal & Vice Principal
if (user.role === "principal" || user.role === "viceprincipal") {
    // Full Access
}

// HOD
if (user.role === "hod") {
    $("currentUser").innerText =
        HOD - ${user.department};
}

// Staff
if (user.role === "staff") {
    $("currentUser").innerText =
        Staff - ${user.username};
}

// CR
if (user.role === "cr") {
    $("currentUser").innerText =
        CR - ${user.department} (${user.year});
}

    $("loginPage").classList.add("hidden");
    $("appPage").classList.remove("hidden");

    $("currentUser").innerText =
        user.role.toUpperCase() + " - " + user.username;
  currentUser = user;

// 👇 இந்த code-ஐ இங்க paste பண்ணு

$("studentsBtn").style.display = "none";
$("attendanceBtn").style.display = "none";
$("reportsBtn").style.display = "none";
$("notificationBtn").style.display = "none";
$("settingsBtn").style.display = "none";

if (user.role === "principal" || user.role === "viceprincipal") {
    $("studentsBtn").style.display = "block";
    $("attendanceBtn").style.display = "block";
    $("reportsBtn").style.display = "block";
    $("notificationBtn").style.display = "block";
    $("settingsBtn").style.display = "block";
}

if (user.role === "hod") {
    $("attendanceBtn").style.display = "block";
    $("reportsBtn").style.display = "block";
}

if (user.role === "staff") {
    $("attendanceBtn").style.display = "block";
}

if (user.role === "cr") {
    $("attendanceBtn").style.display = "block";
}

// 👇 இதுக்கு பிறகு இந்த line இருக்கும்
showPage("dashboard");


}
  alert("Wrong username or password");
}
function logout(){ location.reload(); }

function showPage(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));
  $(page).classList.remove("hidden");
  $("pageTitle").innerText = page.charAt(0).toUpperCase()+page.slice(1);
  if(page==="dashboard") loadDashboard();
  if(page==="students") loadStudents();
  if(page==="reports") generateReport();
  if(page==="settings") firebaseCheck();
}

async function saveStudent(){
  try{
    const photoFile = $("sPhoto").files[0];
    let photoURL = "";
    const student = {
      name:$("sName").value.trim(), roll:$("sRoll").value.trim(), regNo:$("sReg").value.trim(),
      department:$("sDept").value, year:$("sYear").value, section:$("sSection").value.trim(),
      phone:$("sPhone").value.trim(), parentPhone:$("sParentPhone").value.trim(),
      email:$("sEmail").value.trim(), address:$("sAddress").value.trim(),
      createdAt:new Date().toISOString(), week:getWeekKey(new Date()),
      month:new Date().toLocaleString("en-US",{month:"short",year:"numeric"})
    };
    if(!student.name || !student.roll || !student.department || !student.year || !student.parentPhone){
      alert("Name, Roll, Department, Year, Parent Phone required"); return;
    }
    if(photoFile){
      const ref = storage.ref("student_photos/" + Date.now() + "_" + photoFile.name);
      await ref.put(photoFile);
      photoURL = await ref.getDownloadURL();
    }
    student.photoURL = photoURL;
    await db.collection("students").add(student);
    toast("Student saved in Firebase ✅");
    document.querySelectorAll("#students input").forEach(i=>i.value="");
    $("sDept").value=""; $("sYear").value="";
    loadStudents();
  }catch(err){ alert("Firebase save error: " + err.message); console.error(err); }
}

async function loadStudents(){
  try{
    const snap = await db.collection("students").orderBy("createdAt","desc").get();
    let students = snap.docs.map(d=>({id:d.id,...d.data()}));
    const dept = $("filterDept") ? $("filterDept").value : "";
    const year = $("filterYear") ? $("filterYear").value : "";
    const search = $("searchStudent") ? $("searchStudent").value.toLowerCase() : "";
    if(dept) students = students.filter(s=>s.department===dept);
    if(year) students = students.filter(s=>s.year===year);
    if(search) students = students.filter(s=>(s.name||"").toLowerCase().includes(search) || (s.roll||"").toLowerCase().includes(search));
    studentsData = students;
    $("studentTable").innerHTML = students.map(s=>`
      <tr>
        <td>${s.photoURL ? `<img class="avatar" src="${s.photoURL}"/>` : "👤"}</td>
        <td>${s.name}</td><td>${s.roll}</td><td>${s.department}</td><td>${s.year}</td><td>${s.parentPhone}</td>
        <td><button class="sms" onclick="sendSMS('${s.parentPhone}','${s.name}')">SMS</button>
        <button class="wa" onclick="sendWhatsApp('${s.parentPhone}','${s.name}')">WhatsApp</button></td>
      </tr>`).join("");
  }catch(err){ alert("Load students error: " + err.message); console.error(err); }
}

async function loadAttendanceStudents(){
  await loadStudents();
  const dept = $("aDept").value, year = $("aYear").value, subject = $("aSubject").value.trim();
  const list = studentsData.filter(s=>s.department===dept && s.year===year);
  if(!$("aDate").value) $("aDate").valueAsDate = new Date();
  if(!dept || !year || !subject){ alert("Date, Subject, Department, Year required"); return; }
  if(list.length===0){ $("attendanceList").innerHTML = "<p>No students found.</p>"; return; }
  $("attendanceList").innerHTML = list.map(s=>`
    <div class="row-card"><span><b>${s.name}</b> (${s.roll})</span>
    <select data-id="${s.id}" data-name="${s.name}" data-roll="${s.roll}">
      <option value="Present">Present</option><option value="Absent">Absent</option>
    </select></div>`).join("");
}

async function saveAttendance(){
  try{
    const date = $("aDate").value, subject = $("aSubject").value.trim(), department = $("aDept").value, year = $("aYear").value; const hour = $("aHour").value;
    const rows = [...document.querySelectorAll("#attendanceList select")];
    if(!date || !subject || !hour || !department || !year || rows.length===0){ alert("Load students first"); return; }
    for(const r of rows){
      await db.collection("attendance").add({
        studentId:r.dataset.id, name:r.dataset.name, roll:r.dataset.roll, status:r.value,
        date, subject,hour, department, year, markedBy: currentUser ? currentUser.username : "admin",
        createdAt:new Date().toISOString(), week:getWeekKey(new Date(date)),
        month:new Date(date).toLocaleString("en-US",{month:"short",year:"numeric"})
      });
    }
    toast("Attendance saved ✅");
    $("attendanceList").innerHTML="";
    loadDashboard();
  }catch(err){ alert("Attendance save error: " + err.message); console.error(err); }
}

async function loadDashboard(){
  const sSnap = await db.collection("students").get();
  const aSnap = await db.collection("attendance").get();
  const students = sSnap.docs.map(d=>d.data());
  const attendance = aSnap.docs.map(d=>d.data());
  $("totalStudents").innerText = students.length;
  $("totalPresent").innerText = attendance.filter(a=>a.status==="Present").length;
  $("totalAbsent").innerText = attendance.filter(a=>a.status==="Absent").length;
  const avg = attendance.length ? Math.round((attendance.filter(a=>a.status==="Present").length / attendance.length)*100) : 0;
  $("avgPercent").innerText = avg + "%";
  renderDashboardChart(attendance, students);
}

async function generateReport(){
  const sSnap = await db.collection("students").get();
  const aSnap = await db.collection("attendance").get();
  let students = sSnap.docs.map(d=>({id:d.id,...d.data()}));
  const attendance = aSnap.docs.map(d=>d.data());
  const dept = $("rDept").value, year = $("rYear").value, subject = $("rSubject").value.toLowerCase();
  if(dept) students = students.filter(s=>s.department===dept);
  if(year) students = students.filter(s=>s.year===year);
  reportRows = students.map(s=>{
    let rec = attendance.filter(a=>a.studentId===s.id);
    if(subject) rec = rec.filter(a=>(a.subject||"").toLowerCase().includes(subject));
    const present = rec.filter(a=>a.status==="Present").length;
    const absent = rec.filter(a=>a.status==="Absent").length;
    const total = rec.length;
    const percentage = total ? Math.round((present/total)*100) : 0;
    return {name:s.name, roll:s.roll, present, absent, total, percentage:percentage+"%"};
  });
  $("reportTable").innerHTML = reportRows.map(r=>`
    <tr><td>${r.name}</td><td>${r.roll}</td><td>${r.present}</td><td>${r.absent}</td><td>${r.total}</td><td>${r.percentage}</td></tr>`).join("");
}

function downloadCSV(){
  if(!reportRows.length){ alert("Generate report first"); return; }
  const header = "Name,Roll,Present,Absent,Total,Percentage\n";
  const body = reportRows.map(r=>`${r.name},${r.roll},${r.present},${r.absent},${r.total},${r.percentage}`).join("\n");
  const blob = new Blob([header+body], {type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "attendance-report.csv"; a.click();
}

function sendSMS(phone, name){
  const msg = encodeURIComponent(`Dear Parent, ${name} attendance/student details updated in Madha Attendance App.`);
  window.location.href = `sms:${phone}?body=${msg}`;
}
function sendWhatsApp(phone, name){
  const msg = encodeURIComponent(`Dear Parent, ${name} attendance/student details updated in Madha Attendance App.`);
  window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
}

async function firebaseCheck(){
  const sSnap = await db.collection("students").limit(20).get();
  const aSnap = await db.collection("attendance").limit(20).get();
  const data = {students:sSnap.docs.map(d=>({id:d.id,...d.data()})), attendance:aSnap.docs.map(d=>({id:d.id,...d.data()}))};
  $("firebaseOutput").innerText = JSON.stringify(data, null, 2);
}

function getWeekKey(date){
  const first = new Date(date.getFullYear(),0,1);
  const days = Math.floor((date - first)/(24*60*60*1000));
  return "Week " + Math.ceil((days + first.getDay() + 1)/7);
}

function renderDashboardChart(attendance, students){
  const weekCounts = {}, monthCounts = {};
  attendance.forEach(a=>{ weekCounts[a.week || "Unknown"] = (weekCounts[a.week || "Unknown"] || 0) + 1; monthCounts[a.month || "Unknown"] = (monthCounts[a.month || "Unknown"] || 0) + 1; });
  if(attendance.length===0){ students.forEach(s=>{ weekCounts[s.week || "Students"] = (weekCounts[s.week || "Students"] || 0) + 1; monthCounts[s.month || "Students"] = (monthCounts[s.month || "Students"] || 0) + 1; }); }
  const labels = [...new Set([...Object.keys(weekCounts), ...Object.keys(monthCounts)])].slice(-8);
  const weeklyData = labels.map(l=>weekCounts[l] || 0), monthlyData = labels.map(l=>monthCounts[l] || 0);
  if(chart) chart.destroy();
  chart = new Chart($("dashboardChart"),{type:"bar",data:{labels,datasets:[{label:"Weekly Count",data:weeklyData},{label:"Monthly Count",data:monthlyData}]},options:{responsive:true,scales:{y:{beginAtZero:true,ticks:{precision:0}}}}});
}
