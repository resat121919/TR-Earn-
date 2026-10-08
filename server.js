require("dotenv").config();
const express=require("express"), crypto=require("crypto"), path=require("path"), Database=require("better-sqlite3");
const app=express(); app.use(express.json()); app.use(express.static(path.join(__dirname,"public")));
const db=new Database(process.env.DB_FILE||"tr_earn.db");
db.pragma("journal_mode = WAL");
db.exec(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, telegram_id TEXT UNIQUE NOT NULL, first_name TEXT, username TEXT, balance INTEGER NOT NULL DEFAULT 0, referrals INTEGER NOT NULL DEFAULT 0, tasks_done INTEGER NOT NULL DEFAULT 0, referred_by TEXT, last_checkin TEXT);
CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT,description TEXT,reward INTEGER,active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS completions(user_id INTEGER,task_id INTEGER,created_at TEXT,UNIQUE(user_id,task_id));
CREATE TABLE IF NOT EXISTS withdrawals(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,amount INTEGER,address TEXT,method TEXT,status TEXT DEFAULT 'pending',created_at TEXT);`);
const count=db.prepare("SELECT COUNT(*) c FROM tasks").get().c;
if(!count) db.prepare("INSERT INTO tasks(title,description,reward) VALUES (?,?,?),(?,?,?)").run("Daily check-in","Open the app once per day",10,"Starter task","Complete your first task",25);

function validate(initData){
 if(!initData) throw new Error("Open this app from Telegram.");
 const p=new URLSearchParams(initData), hash=p.get("hash"), auth=p.get("auth_date");
 if(!hash||!auth) throw new Error("Invalid Telegram data.");
 if(Date.now()/1000-Number(auth)>86400) throw new Error("Telegram session expired.");
 p.delete("hash"); const data=[...p.entries()].sort().map(([k,v])=>`${k}=${v}`).join("\n");
 const secret=crypto.createHmac("sha256","WebAppData").update(process.env.BOT_TOKEN).digest();
 const check=crypto.createHmac("sha256",secret).update(data).digest("hex");
 if(!crypto.timingSafeEqual(Buffer.from(check),Buffer.from(hash))) throw new Error("Telegram verification failed.");
 return JSON.parse(p.get("user"));
}
function auth(req,res,next){try{req.tg=validate(req.header("X-Telegram-Init-Data"));next()}catch(e){res.status(401).json({error:e.message})}}
function user(tg){let u=db.prepare("SELECT * FROM users WHERE telegram_id=?").get(String(tg.id));if(!u){db.prepare("INSERT INTO users(telegram_id,first_name,username) VALUES (?,?,?)").run(String(tg.id),tg.first_name||"",tg.username||"");u=db.prepare("SELECT * FROM users WHERE telegram_id=?").get(String(tg.id))}return u}
app.get("/api/me",auth,(req,res)=>{const u=user(req.tg),tasks=db.prepare("SELECT t.*, EXISTS(SELECT 1 FROM completions c WHERE c.user_id=? AND c.task_id=t.id) completed FROM tasks t WHERE t.active=1").all(u.id);res.json({user:u,tasks,referral_link:`https://t.me/${process.env.BOT_USERNAME}?start=ref_${u.telegram_id}`})});
app.post("/api/checkin",auth,(req,res)=>{const u=user(req.tg),today=new Date().toISOString().slice(0,10);if(u.last_checkin===today)return res.json({message:"Already checked in today."});db.prepare("UPDATE users SET balance=balance+10,last_checkin=?,tasks_done=tasks_done+1 WHERE id=?").run(today,u.id);res.json({message:"Daily check-in complete! +10 TRP"});});
app.post("/api/tasks/:id/complete",auth,(req,res)=>{const u=user(req.tg),t=db.prepare("SELECT * FROM tasks WHERE id=? AND active=1").get(req.params.id);if(!t)return res.status(404).json({error:"Task not found"});try{db.transaction(()=>{db.prepare("INSERT INTO completions VALUES (?,?,?)").run(u.id,t.id,new Date().toISOString());db.prepare("UPDATE users SET balance=balance+?,tasks_done=tasks_done+1 WHERE id=?").run(t.reward,u.id)})();res.json({reward:t.reward})}catch{res.status(400).json({error:"Task already completed."})}});
app.post("/api/withdraw",auth,(req,res)=>{const u=user(req.tg),amount=Number(req.body.amount),address=String(req.body.address||"").trim(),method=String(req.body.method||"manual");const min=Number(process.env.MIN_WITHDRAW||100);if(!Number.isInteger(amount)||amount<min)return res.status(400).json({error:`Minimum withdrawal is ${min} TRP.`});if(amount>u.balance)return res.status(400).json({error:"Insufficient balance."});if(!address||address.length>200)return res.status(400).json({error:"Invalid account/address."});db.transaction(()=>{db.prepare("UPDATE users SET balance=balance-? WHERE id=?").run(amount,u.id);db.prepare("INSERT INTO withdrawals(user_id,amount,address,method,created_at) VALUES (?,?,?,?,?)").run(u.id,amount,address,method,new Date().toISOString())})();res.json({message:"Withdrawal request submitted for admin review."})});
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
const port=process.env.PORT||3000;app.listen(port,()=>console.log("TR Earn running on "+port));