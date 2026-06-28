import { db } from "firebase.js";
import { collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
let chart;

window.login = function(){
  const u = document.querySelectorAll("input")[0].value.trim();
  const p = document.querySelectorAll("input")[1].value.trim();

  if(u === "admin" && p === "admin123"){
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("appPage").classList.remove("hidden");
    loadStudents();
  } else {
    alert("Wrong username or password");
  }
}

window.logout = function(){
  location.reload();
}

window.saveStudent = async function(){
  const student = {
    name: $("name").value.trim(),
    roll: $("roll").value.trim(),
    department: $("department").value,
    year: $("year").value,
    phone: $("phone").value.trim(),
    parentPhone: $("parentPhone").value.trim(),
    email: $("email").value.trim(),
    address: $("address").value.trim(),
    createdAt: new Date().toISOString(),
    week: getWeekKey(new Date()),
    month: new Date().toLocaleString("en-US", { month:"short", year:"numeric" })
  };

  if(!student.name || !student.roll || !student.department || !student.year || !student.parentPhone){
    alert("Name, Roll, Department, Year, Parent Phone required");
    return;
  }

  await addDoc(collection(db, "students"), student);
  alert("Student saved in Firebase successfully ✅");

  document.querySelectorAll("#appPage input").forEach(i => i.value = "");
  $("department").value = "";
  $("year").value = "";
  loadStudents();
}

window.loadStudents = async function(){
  const snap = await getDocs(query(collection(db, "students"), orderBy("createdAt", "desc")));
  let students = snap.docs.map(d => ({ id:d.id, ...d.data() }));

  const dept = $("filterDept").value;
  const year = $("filterYear").value;

  if(dept) students = students.filter(s => s.department === dept);
  if(year) students = students.filter(s => s.year === year);

  $("studentTable").innerHTML = students.map(s => `
    <tr>
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

  renderChart(snap.docs.map(d => d.data()));
}

window.sendSMS = function(phone, name){
  const msg = encodeURIComponent(`Dear Parent, ${name} details saved successfully in Madha Attendance App.`);
  window.location.href = `sms:${phone}?body=${msg}`;
}

window.sendWhatsApp = function(phone, name){
  const msg = encodeURIComponent(`Dear Parent, ${name} details saved successfully in Madha Attendance App.`);
  window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
}

function getWeekKey(date){
  const first = new Date(date.getFullYear(),0,1);
  const days = Math.floor((date - first) / (24*60*60*1000));
  const week = Math.ceil((days + first.getDay() + 1) / 7);
  return `Week ${week}`;
}

function renderChart(allStudents){
  const weekly = {};
  const monthly = {};

  allStudents.forEach(s => {
    weekly[s.week || "Unknown"] = (weekly[s.week || "Unknown"] || 0) + 1;
    monthly[s.month || "Unknown"] = (monthly[s.month || "Unknown"] || 0) + 1;
  });

  const labels = [...new Set([...Object.keys(weekly), ...Object.keys(monthly)])].slice(-8);
  const weeklyData = labels.map(l => weekly[l] || 0);
  const monthlyData = labels.map(l => monthly[l] || 0);

  if(chart) chart.destroy();

  chart = new Chart($("analyticsChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Weekly Students Added", data: weeklyData },
        { label: "Monthly Students Added", data: monthlyData }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "top" } },
      scales: { y: { beginAtZero: true, ticks: { precision:0 } } }
    }
  });
}
