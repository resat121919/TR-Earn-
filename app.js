const tg=window.Telegram?.WebApp; tg?.ready(); tg?.expand();
const initData=tg?.initData||"";
const $=id=>document.getElementById(id);
function toast(s){$("toast").textContent=s;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2200)}
async function api(path,options={}){const r=await fetch("/api"+path,{...options,headers:{"Content-Type":"application/json","X-Telegram-Init-Data":initData,...(options.headers||{})}});const d=await r.json();if(!r.ok)throw new Error(d.error||"Request failed");return d}
function showPage(p){document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));$(p).classList.remove("hidden");document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.page===p))}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>showPage(b.dataset.page));
async function load(){try{const d=await api("/me");$("hello").textContent=`Hello, ${d.user.first_name||"User"}`;$("balance").textContent=d.user.balance;$("taskCount").textContent=d.user.tasks_done;$("refCount").textContent=d.user.referrals;$("refLink").textContent=d.user.referral_link;renderTasks(d.tasks)}catch(e){toast(e.message)}}
function renderTasks(tasks){$("tasksList").innerHTML=tasks.map(t=>`<div class="card task"><div><b>${escapeHtml(t.title)}</b><div class="muted">${escapeHtml(t.description)}</div><div class="muted">+${t.reward} TRP</div></div><button ${t.completed?"disabled":""} onclick="completeTask(${t.id})">${t.completed?"Done":"Earn"}</button></div>`).join("")||'<div class="card">No tasks available.</div>'}
async function completeTask(id){try{const d=await api("/tasks/"+id+"/complete",{method:"POST"});toast(`+${d.reward} TRP added`);load()}catch(e){toast(e.message)}}
$("checkinBtn").onclick=async()=>{try{const d=await api("/checkin",{method:"POST"});toast(d.message);load()}catch(e){toast(e.message)}};
$("copyRef").onclick=async()=>{try{await navigator.clipboard.writeText($("refLink").textContent);toast("Copied")}catch{toast("Copy failed")}};
$("withdrawBtn").onclick=async()=>{const amount=Number($("amount").value),address=$("address").value.trim(),method=$("method").value;if(!amount||!address)return toast("Enter amount and account");try{const d=await api("/withdraw",{method:"POST",body:JSON.stringify({amount,address,method})});$("withdrawMsg").textContent=d.message;$("amount").value="";$("address").value="";load()}catch(e){toast(e.message)}};
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
load();