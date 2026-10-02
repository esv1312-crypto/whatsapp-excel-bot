const express=require('express');
const {Pool}=require('pg');
const https=require('https');
const app=express();
app.use(express.static('public'));
const owner='esv1312-crypto',repo='whatsapp-excel-bot';
const memory=[];
let pool=null,dbReady=false;
const databaseUrl=process.env.DATABASE_URL||process.env.RENDER_DATABASE_URL||'';
if(databaseUrl && !databaseUrl.includes('${{')) pool=new Pool({connectionString:databaseUrl,ssl:{rejectUnauthorized:false}});
async function gh(path){return new Promise((res,rej)=>{https.get({hostname:'api.github.com',path,headers:{'User-Agent':'ai-office-live-monitor','Accept':'application/vnd.github+json'}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{res(JSON.parse(d))}catch(e){rej(e)}})}).on('error',rej)})}
async function init(){if(!pool)return;try{await pool.query('CREATE TABLE IF NOT EXISTS snapshots(id bigserial primary key,ts timestamptz default now(),run_id bigint,workflow text,event text,status text,conclusion text,jobs integer,raw jsonb)');dbReady=true}catch(e){console.error('DB unavailable; using live memory buffer:',e.message)}}
async function save(row){memory.unshift(row);if(memory.length>200)memory.pop();if(dbReady)try{await pool.query('INSERT INTO snapshots(run_id,workflow,event,status,conclusion,jobs,raw) VALUES($1,$2,$3,$4,$5,$6,$7)',[row.run_id,row.workflow,row.event,row.status,row.conclusion,row.jobs,JSON.stringify(row.raw)])}catch(e){dbReady=false;console.error('DB write failed; keeping memory buffer:',e.message)}}
async function poll(){try{const x=await gh('/repos/'+owner+'/'+repo+'/actions/runs?per_page=20');if(!x.workflow_runs)return;for(const r of x.workflow_runs.slice(0,5)){const j=await gh('/repos/'+owner+'/'+repo+'/actions/runs/'+r.id+'/jobs?per_page=100');await save({ts:new Date().toISOString(),run_id:r.id,workflow:r.name,event:r.event,status:r.status,conclusion:r.conclusion,jobs:(j.jobs||[]).length,raw:{run:r,jobs:j.jobs||[]}})}}catch(e){console.error('poll failed:',e.message)}}
app.get('/api/live',async(_,res)=>{if(dbReady)try{const q=await pool.query('SELECT * FROM snapshots ORDER BY ts DESC LIMIT 100');return res.json(q.rows)}catch(e){dbReady=false}res.json(memory)});
app.get('/api/health',(_,res)=>res.json({ok:true,service:'ai-office-live-monitor',db:dbReady,buffer:memory.length,persistence:dbReady?'postgres':'memory'}));
init().then(()=>{poll();setInterval(poll,10000);app.listen(process.env.PORT||10000,'0.0.0.0')}).catch(e=>{console.error(e);process.exit(1)})