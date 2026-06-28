import { db } from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentUser = null;
let students = [];
let attendanceRecords = [];
let reportRows = [];

const $ = (id) => document.getElementById(id);

window.showPage = function(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));
  $(page).classList.remove("hidden");
  $("pageTitle").innerText = page.charAt(0).toUpperCase()+page.slice(1);
  if(page==="students") loadStudents();
  if(page==="reports") generateReport();
  if(page==="dashboard") loadDashboard();
  if(page==="users") renderUsers();
}

window.login = async function(){
  const role=$("loginRole").value, username=$("loginUsername").value.trim(), password=$("loginPassword").value.trim();
  if(role==="admin" && username==="admin" && password==="admin123"){
    currentUser={role:"admin",username:"admin"};
    openApp(); return;
  }
  const q=query(collection(db,"users"), where("role","==",role), where("username","==",username), where("password","==",password));
  const snap=await getDocs(q);
  if(snap.empty){ alert("Invalid login details"); return; }
  currentUser={id:snap.docs[0].id,...snap.docs[0].data()};
  openApp();
}

function openApp(){
  $("loginPage").classList.add("hidden");
  $("mainApp").classList.remove("hidden");
  $("currentUser").innerText = `${currentUser.role.toUpperCase()} - ${currentUser.username}`;
  showPage("dashboard");
}

window.logout=function(){ location.reload(); }

function canManageStudents(){ return currentUser && ["admin"].includes(currentUser.role); }
function canMarkAttendance(){ return currentUser && ["admin","staff"].includes(currentUser.role); }
function canViewReports(){ return currentUser && ["admin","cr","hod","staff"].includes(currentUser.role); }

window.addStudent = async function(){
  if(!canManageStudents()){ alert("Only admin can add students"); return; }
  const data={
    name:$("sName").value.trim(), roll:$("sRoll").value.trim(), department:$("sDept").value.trim(),
    year:$("sYear").value.trim(), phone:$("sPhone").value.trim(), parentPhone:$("sParentPhone").value.trim(),
    email:$("sEmail").value.trim(), address:$("sAddress").value.trim(), profile:$("sProfile").value.trim(),
    createdAt:new Date().toISOString()
  };
  if(!data.name || !data.roll || !data.department || !data.year){ alert("Name, Roll, Department, Year required"); return; }
  await addDoc(collection(db,"students"),data);
  alert("Student added");
  document.querySelectorAll("#students input").forEach(i=>i.value="");
  loadStudents();
}

async function loadStudents(){
  const snap=await getDocs(collection(db,"students"));
  students=snap.docs.map(d=>({id:d.id,...d.data()}));
  renderStudents();
}

window.renderStudents=function(){
  const dept=$("filterDept").value.toLowerCase(), year=$("filterYear").value.toLowerCase();
  const rows=students.filter(s=>
    (!dept || (s.department||"").toLowerCase().includes(dept)) &&
    (!year || (s.year||"").toLowerCase().includes(year))
  );
  $("studentsTable").innerHTML=rows.map(s=>`
    <tr>
      <td>${s.name}</td><td>${s.roll}</td><td>${s.department}</td><td>${s.year}</td>
      <td>${s.phone||"-"}</td><td>${s.parentPhone||"-"}</td>
      <td><button onclick="deleteStudent('${s.id}')">Delete</button></td>
    </tr>`).join("");
}

window.deleteStudent=async function(id){
  if(!canManageStudents()){ alert("Only admin can delete"); return; }
  if(confirm("Delete this student?")){
    await deleteDoc(doc(db,"students",id));
    loadStudents();
  }
}

window.loadAttendanceStudents=async function(){
  if(!canMarkAttendance()){ alert("Only admin/staff can mark attendance"); return; }
  await loadStudents();
  const dept=$("aDept").value.trim().toLowerCase(), year=$("aYear").value.trim().toLowerCase();
  const list=students.filter(s=>(s.department||"").toLowerCase()===dept && (s.year||"").toLowerCase()===year);
  if(list.length===0){ $("attendanceList").innerHTML="<p>No students found</p>"; return; }
  $("attendanceList").innerHTML=list.map(s=>`
    <div class="student-row">
      <span><b>${s.name}</b> (${s.roll})</span>
      <select name="${s.id}" data-name="${s.name}" data-roll="${s.roll}">
        <option value="Present">Present</option>
        <option value="Absent">Absent</option>
      </select>
    </div>`).join("");
}

window.saveAttendance=async function(){
  if(!canMarkAttendance()){ alert("Only admin/staff can save attendance"); return; }
  const date=$("aDate").value, subject=$("aSubject").value.trim(), department=$("aDept").value.trim(), year=$("aYear").value.trim();
  if(!date || !subject || !department || !year){ alert("Date, Subject, Department, Year required"); return; }
  const selects=[...document.querySelectorAll("#attendanceList select")];
  if(selects.length===0){ alert("Load students first"); return; }
  for(const sel of selects){
    await addDoc(collection(db,"attendance"),{
      studentId:sel.name, name:sel.dataset.name, roll:sel.dataset.roll,
      status:sel.value, date, subject, department, year,
      markedBy:currentUser.username, createdAt:new Date().toISOString()
    });
  }
  alert("Attendance saved successfully");
  $("attendanceList").innerHTML="";
  loadDashboard();
}

window.generateReport=async function(){
  if(!canViewReports()){ alert("No report permission"); return; }
  await loadStudents();
  const snap=await getDocs(collection(db,"attendance"));
  attendanceRecords=snap.docs.map(d=>({id:d.id,...d.data()}));
  const dept=$("rDept").value.trim().toLowerCase(), year=$("rYear").value.trim().toLowerCase(), subject=$("rSubject").value.trim().toLowerCase();
  const filteredStudents=students.filter(s=>
    (!dept || (s.department||"").toLowerCase()===dept) &&
    (!year || (s.year||"").toLowerCase()===year)
  );
  reportRows=filteredStudents.map(s=>{
    const rec=attendanceRecords.filter(a=>a.studentId===s.id && (!subject || (a.subject||"").toLowerCase()===subject));
    const present=rec.filter(a=>a.status==="Present").length;
    const total=rec.length;
    const percentage=total?Math.round((present/total)*100):0;
    return {name:s.name, roll:s.roll, present, total, percentage:percentage+"%"};
  });
  $("reportTable").innerHTML=reportRows.map(r=>`<tr><td>${r.name}</td><td>${r.roll}</td><td>${r.present}</td><td>${r.total}</td><td>${r.percentage}</td></tr>`).join("");
}

window.downloadExcel=function(){
  if(!reportRows.length){ alert("Generate report first"); return; }
  const ws=XLSX.utils.json_to_sheet(reportRows);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Attendance Report");
  XLSX.writeFile(wb,"attendance-report.xlsx");
}

window.downloadPDF=function(){
  if(!reportRows.length){ alert("Generate report first"); return; }
  const { jsPDF } = window.jspdf;
  const docPdf = new jsPDF();
  docPdf.text("Attendance Report", 14, 15);
  let y=25;
  reportRows.forEach((r,i)=>{
    docPdf.text(`${i+1}. ${r.name} (${r.roll}) - Present: ${r.present}/${r.total} - ${r.percentage}`,14,y);
    y+=8;
    if(y>280){ docPdf.addPage(); y=20; }
  });
  docPdf.save("attendance-report.pdf");
}

window.createUser=async function(){
  if(!currentUser || currentUser.role!=="admin"){ alert("Only admin can create users"); return; }
  const data={
    role:$("uRole").value, username:$("uUsername").value.trim(), password:$("uPassword").value.trim(),
    department:$("uDept").value.trim(), year:$("uYear").value.trim(), subject:$("uSubject").value.trim(),
    createdAt:new Date().toISOString()
  };
  if(!data.username || !data.password){ alert("Username and Password required"); return; }
  await addDoc(collection(db,"users"),data);
  alert("User created");
  document.querySelectorAll("#users input").forEach(i=>i.value="");
  renderUsers();
}

window.renderUsers=async function(){
  if(!currentUser || currentUser.role!=="admin"){ $("usersList").innerHTML="<p>Only admin can view users.</p>"; return; }
  const snap=await getDocs(collection(db,"users"));
  const users=snap.docs.map(d=>d.data());
  $("usersList").innerHTML=users.map(u=>`<p class="badge">${u.role} - ${u.username} - ${u.department||""} ${u.subject||""}</p>`).join("");
}

async function loadDashboard(){
  await loadStudents();
  const snap=await getDocs(collection(db,"attendance"));
  attendanceRecords=snap.docs.map(d=>d.data());
  $("totalStudents").innerText=students.length;
  $("totalAttendance").innerText=attendanceRecords.length;
  const present=attendanceRecords.filter(a=>a.status==="Present").length;
  $("avgPercentage").innerText=attendanceRecords.length?Math.round((present/attendanceRecords.length)*100)+"%":"0%";
}

window.addEventListener("load",()=>{ $("aDate").valueAsDate=new Date(); });
