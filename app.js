const $ = (id) => document.getElementById(id);
let currentUser = null;
let studentsData = [];
let reportRows = [];
let chart = null;
let deferredPrompt = null;

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

async function login(){
  const role = $("loginRole").value;
  const username = $("loginUsername").value.trim();
  const password = $("loginPassword").value.trim();

  if(role === "admin"){
    if(username === "admin" && password === "admin123"){
      currentUser = { role, username, department:"", year:"" };
      enterApp();
      return;
    }
    alert("Wrong username or password"); return;
  }

  try{
    const snap = await db.collection("users")
      .where("username","==",username)
      .where("password","==",password)
      .where("role","==",role)
      .limit(1).get();
    if(snap.empty){ alert("Wrong username or password"); return; }
    const u = snap.docs[0].data();
    currentUser = { role, username, department:u.department || "", year:u.year || "" };
    enterApp();
  }catch(err){ alert("Login error: " + err.message); console.error(err); }
}

function enterApp(){
  $("loginPage").classList.add("hidden");
  $("appPage").classList.remove("hidden");
  $("currentUser").innerText = currentUser.role.toUpperCase() + " - " + currentUser.username +
    (currentUser.department ? ` (${currentUser.department}${currentUser.year ? ", "+currentUser.year : ""})` : "");
  applyRoleAccess();
}

function applyRoleAccess(){
  const role = currentUser.role;
  const access = {
    admin:  { navDashboard:1, navStudents:1, navAttendance:1, navReports:1, navNotifications:1, navSettings:1, usersNavBtn:1, landing:"dashboard" },
    hod:    { navDashboard:1, navStudents:1, navAttendance:1, navReports:1, navNotifications:1, navSettings:1, usersNavBtn:0, landing:"dashboard" },
    staff:  { navDashboard:0, navStudents:0, navAttendance:1, navReports:0, navNotifications:0, navSettings:0, usersNavBtn:0, landing:"attendance" },
    cr:     { navDashboard:0, navStudents:1, navAttendance:0, navReports:0, navNotifications:0, navSettings:0, usersNavBtn:0, landing:"students" }
  };
  const rules = access[role] || access.staff;
  ["navDashboard","navStudents","navAttendance","navReports","navNotifications","navSettings","usersNavBtn"].forEach(id=>{
    $(id).classList.toggle("hidden", !rules[id]);
  });
  showPage(rules.landing);
}

function logout(){ location.reload(); }

function lockDeptYear(deptId, yearId){
  if(!currentUser) return;
  const isRestricted = currentUser.role !== "admin" && currentUser.department;
  if(isRestricted){
    if($(deptId)){ $(deptId).value = currentUser.department; $(deptId).disabled = true; }
    if(currentUser.year && $(yearId)){ $(yearId).value = currentUser.year; $(yearId).disabled = true; }
  } else {
    if($(deptId)) $(deptId).disabled = false;
    if($(yearId)) $(yearId).disabled = false;
  }
}

function showPage(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));
  $(page).classList.remove("hidden");
  $("pageTitle").innerText = page.charAt(0).toUpperCase()+page.slice(1);
  if(page==="dashboard") loadDashboard();
  if(page==="students"){ lockDeptYear("filterDept","filterYear"); lockDeptYear("sDept","sYear"); loadStudents(); }
  if(page==="attendance") lockDeptYear("aDept","aYear");
  if(page==="reports") generateReport();
  if(page==="settings") firebaseCheck();
  if(page==="users") loadUsers();
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

function getSelectedPeriods(){
  return [...document.querySelectorAll("#periodChecks input:checked")].map(c=>c.value);
}

async function loadAttendanceStudents(){
  await loadStudents();
  const dept = $("aDept").value, year = $("aYear").value, subject = $("aSubject").value.trim();
  const periods = getSelectedPeriods();
  const list = studentsData.filter(s=>s.department===dept && s.year===year);
  if(!$("aDate").value) $("aDate").valueAsDate = new Date();
  if(!dept || !year || !subject){ alert("Date, Subject, Department, Year required"); return; }
  if(periods.length===0){ alert("Select at least one Period (1 to 5)"); return; }
  if(list.length===0){ $("attendanceList").innerHTML = "<p>No students found.</p>"; return; }
  $("attendanceList").innerHTML = list.map(s=>`
    <div class="row-card"><span><b>${s.name}</b> (${s.roll})</span>
    <select data-id="${s.id}" data-name="${s.name}" data-roll="${s.roll}">
      <option value="Present">Present</option><option value="Absent">Absent</option>
    </select></div>`).join("");
}

async function saveAttendance(){
  try{
    const date = $("aDate").value, subject = $("aSubject").value.trim(), department = $("aDept").value, year = $("aYear").value;
    const periods = getSelectedPeriods();
    const rows = [...document.querySelectorAll("#attendanceList select")];
    if(!date || !subject || !department || !year || rows.length===0){ alert("Load students first"); return; }
    if(periods.length===0){ alert("Select at least one Period (1 to 5)"); return; }
    for(const r of rows){
      for(const period of periods){
        await db.collection("attendance").add({
          studentId:r.dataset.id, name:r.dataset.name, roll:r.dataset.roll, status:r.value,
          date, subject, department, year, period, markedBy: currentUser ? currentUser.username : "admin",
          createdAt:new Date().toISOString(), week:getWeekKey(new Date(date)),
          month:new Date(date).toLocaleString("en-US",{month:"short",year:"numeric"})
        });
      }
    }
    toast(`Attendance saved for ${periods.length} period(s) ✅`);
    $("attendanceList").innerHTML="";
    document.querySelectorAll("#periodChecks input").forEach(c=>c.checked=false);
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
  const period = $("rPeriod") ? $("rPeriod").value : "";
  if(dept) students = students.filter(s=>s.department===dept);
  if(year) students = students.filter(s=>s.year===year);
  reportRows = students.map(s=>{
    let rec = attendance.filter(a=>a.studentId===s.id);
    if(subject) rec = rec.filter(a=>(a.subject||"").toLowerCase().includes(subject));
    if(period) rec = rec.filter(a=>a.period===period);
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

async function saveUser(){
  try{
    const role = $("uRole").value, username = $("uUsername").value.trim(), password = $("uPassword").value.trim();
    const department = $("uDept").value, year = $("uYear").value;
    if(!username || !password || !department){ alert("Username, Password, Department required"); return; }
    const existing = await db.collection("users").where("username","==",username).limit(1).get();
    if(!existing.empty){ alert("Username already exists"); return; }
    await db.collection("users").add({ role, username, password, department, year, createdAt:new Date().toISOString() });
    toast("Login created ✅");
    $("uUsername").value=""; $("uPassword").value=""; $("uDept").value=""; $("uYear").value="";
    loadUsers();
  }catch(err){ alert("Create login error: " + err.message); console.error(err); }
}

async function loadUsers(){
  try{
    const snap = await db.collection("users").orderBy("createdAt","desc").get();
    const users = snap.docs.map(d=>({id:d.id,...d.data()}));
    $("userTable").innerHTML = users.map(u=>`
      <tr><td>${u.username}</td><td>${u.role.toUpperCase()}</td><td>${u.department}</td><td>${u.year||"All"}</td>
      <td><button onclick="deleteUser('${u.id}')">Delete</button></td></tr>`).join("");
  }catch(err){ alert("Load logins error: " + err.message); console.error(err); }
}

async function deleteUser(id){
  if(!confirm("Delete this login?")) return;
  await db.collection("users").doc(id).delete();
  toast("Login deleted");
  loadUsers();
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