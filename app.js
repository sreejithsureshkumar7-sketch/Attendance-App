const $ = (id) => document.getElementById(id);

let currentUser = null;
let studentsData = [];
let attendanceData = [];
let reportRows = [];
let chart = null;

function toast(msg){
  const t = $("toast");
  t.innerText = msg;
  t.style.display = "block";
  setTimeout(()=>t.style.display="none",2500);
}

function login(){
  const role = $("loginRole").value;
  const username = $("loginUsername").value.trim();
  const password = $("loginPassword").value.trim();

  if(username === "admin" && password === "admin123"){
    currentUser = { role, username };
    $("loginPage").classList.add("hidden");
    $("appPage").classList.remove("hidden");
    $("currentUser").innerText = role.toUpperCase() + " - " + username;
    showPage("dashboard");
    return;
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
      name:$("sName").value.trim(),
      roll:$("sRoll").value.trim(),
      regNo:$("sReg").value.trim(),
      department:$("sDept").value,
      year:$("sYear").value,
      section:$("sSection").value.trim(),
      phone:$("sPhone").value.trim(),
      parentPhone:$("sParentPhone").value.trim(),
      email:$("sEmail").value.trim(),
      address:$("sAddress").value.trim(),
      createdAt:new Date().toISOString(),
      week:getWeekKey(new Date()),
      month:new Date().toLocaleString("en-US",{month:"short",year:"numeric"})
    };

    if(!student.name || !student.roll || !student.department || !student.year || !student.parentPhone){
      alert("Name, Roll, Department, Year, Parent Phone required");
      return;
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
  }catch(err){
    alert("Firebase save error: " + err.message);
    console.error(err);
  }
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
        <td>${s.name}</td>
        <td>${s.roll}</td>
        <td>${s.department}</td>
        <td>${s.year}</td>
        <td>${s.parentPhone}</td>
        <td>
          <button class="sms" onclick="sendSMS('${s.parentPhone}','${s.name}')">SMS</button>
          <button class="wa" onclick="sendWhatsApp('${s.parentPhone}','${s.name}')">WhatsApp</button>
        </td>
      </tr>
    `).join("");
  }catch(err){
    alert("Load students error: " + err.message);
    console.error(err);
  }
}

async function loadAttendanceStudents(){
  await loadStudents();
  const dept = $("aDept").value;
  const year = $("aYear").value;
  const list = studentsData.filter(s=>s.department===dept && s.year===year);

  if(!$("aDate").value) $("aDate").valueAsDate = new Date();

  if(!dept || !year || !$("aSubject").value.trim()){
    alert("Date, Subject, Department, Year required");
    return;
  }

  if(list.length===0){
    $("attendanceList").innerHTML = "<p>No students found.</p>";
    return;
  }

  $("attendanceList").innerHTML = list.map(s=>`
    <div class="row-card">
      <span><b>${s.name}</b> (${s.roll})</span>
      <select data-id="${s.id}" data-name="${s.name}" data-roll="${s.roll}">
        <option value="Present">Present</option>
        <option value="Absent">Absent</option>
      </select>
    </div>
  `).join("");
}

async function saveAttendance(){
  try{
    const date = $("aDate").value;
    const subject = $("aSubject").value.trim();
    const department = $("aDept").value;
    const year = $("aYear").value;
    const rows = [...document.querySelectorAll("#attendanceList select")];

    if(!date || !subject || !department || !year || rows.length===0){
      alert("Load students first");
      return;
    }

    for(const r of rows){
      await db.collection("attendance").add({
        studentId:r.dataset.id,
        name:r.dataset.name,
        roll:r.dataset.roll,
        status:r.value,
        date, subject, department, year,
        markedBy: currentUser ? currentUser.username : "admin",
        createdAt:new Date().toISOString(),
        week:getWeekKey(new Date(date)),
        month:new Date(date).toLocaleString("en-US",{month:"short",year:"numeric"})
      });
    }

    toast("Attendance saved ✅");
    $("attendanceList").innerHTML="";
    loadDashboard();
  }catch(err){
    alert("Attendance save error: " + err.message);
    console.error(err);
  }
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

  const dept = $("rDept").value;
  const year = $("rYear").value;
  const subject = $("rSubject").value.toLowerCase();

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
    <tr><td>${r.name}</td><td>${r.roll}</td><td>${r.present}</td><td>${r.absent}</td><td>${r.total}</td><td>${r.percentage}</td></tr>
  `).join("");
}

function downloadCSV(){
  if(!reportRows.length){ alert("Generate report first"); return; }
  const header = "Name,Roll,Present,Absent,Total,Percentage\n";
  const body = reportRows.map(r=>`${r.name},${r.roll},${r.present},${r.absent},${r.total},${r.percentage}`).join("\n");
  const blob = new Blob([header+body], {type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "attendance-report.csv";
  a.click();
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
  const data = {
    students:sSnap.docs.map(d=>({id:d.id,...d.data()})),
    attendance:aSnap.docs.map(d=>({id:d.id,...d.data()}))
  };
  $("firebaseOutput").innerText = JSON.stringify(data, null, 2);
}

function getWeekKey(date){
  const first = new Date(date.getFullYear(),0,1);
  const days = Math.floor((date - first)/(24*60*60*1000));
  return "Week " + Math.ceil((days + first.getDay() + 1)/7);
}

function renderDashboardChart(attendance, students){
  const weekCounts = {};
  const monthCounts = {};

  attendance.forEach(a=>{
    weekCounts[a.week || "Unknown"] = (weekCounts[a.week || "Unknown"] || 0) + 1;
    monthCounts[a.month || "Unknown"] = (monthCounts[a.month || "Unknown"] || 0) + 1;
  });

  if(attendance.length===0){
    students.forEach(s=>{
      weekCounts[s.week || "Students"] = (weekCounts[s.week || "Students"] || 0) + 1;
      monthCounts[s.month || "Students"] = (monthCounts[s.month || "Students"] || 0) + 1;
    });
  }

  const labels = [...new Set([...Object.keys(weekCounts), ...Object.keys(monthCounts)])].slice(-8);
  const weeklyData = labels.map(l=>weekCounts[l] || 0);
  const monthlyData = labels.map(l=>monthCounts[l] || 0);

  if(chart) chart.destroy();
  chart = new Chart($("dashboardChart"),{
    type:"bar",
    data:{labels,datasets:[
      {label:"Weekly Count",data:weeklyData},
      {label:"Monthly Count",data:monthlyData}
    ]},
    options:{responsive:true,scales:{y:{beginAtZero:true,ticks:{precision:0}}}}
  });
}

window.addEventListener("load",()=>{ if($("aDate")) $("aDate").valueAsDate = new Date(); });
