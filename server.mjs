import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';

const root=path.dirname(new URL(import.meta.url).pathname).replace(/^\//,'');
const parse=p=>Object.fromEntries(fs.readFileSync(p,'utf8').split(/\r?\n/).flatMap(line=>{const i=line.indexOf('=');return i>0&&!line.trim().startsWith('#')?[[line.slice(0,i).trim(),line.slice(i+1).trim()]]:[]}));
const env=parse('C:/Documents2/global.env');
const page=fs.readFileSync(path.join(root,'index.html'));
const host=fs.readFileSync(path.join(root,'host.png'));
const localUrl=env.OLLAMA_URL||'http://127.0.0.1:11434';
const localModel=env.OLLAMA_MODEL||'qwen3:4b';
const projects={"3000studios.vip":"C:/Users/MrJws/OneDrive/Workspaces/3000studios.vip","boughtitonline.com":"C:/Users/MrJws/OneDrive/Workspaces/boughtitonline.com","campdream.store":"C:/Users/MrJws/OneDrive/Workspaces/campdream.store","getnexa.space":"C:/Users/MrJws/OneDrive/Workspaces/getnexa.space","myappai.org":"C:/Users/MrJws/OneDrive/Workspaces/myappai.org"};
const briefPolicy=`You are Nova, 3000Studios' operations chief. Give a concise execution brief. Choose one worker: Codex for complex verified implementation, OpenCode for fast local coding, Grok for independent code tasks. Mention the right project. Never perform money, deletion, publishing, checkout, secret, customer-data, billing, domain, or credential actions without explicit approval. HARD TRUTH POLICY: never claim anything is live, deployed, published, working, or verified unless personally visually checked on the production site/store after deployment. A commit, build, push, or deployment log is not proof. State visual evidence or say verification is pending. Be sharp, human, slightly funny, never abusive.`;
const send=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(body));};
const textFrom=j=>j.output_text||j.output?.flatMap(i=>i.content||[]).filter(p=>p.type==='output_text').map(p=>p.text).join('')||j.error?.message||'No response';
async function ollamaReady(){try{const r=await fetch(`${localUrl}/api/tags`,{signal:AbortSignal.timeout(900)});return r.ok}catch{return false}}
async function localBrief(task){const r=await fetch(`${localUrl}/api/chat`,{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(8000),body:JSON.stringify({model:localModel,stream:false,think:false,keep_alive:'10m',options:{temperature:.35,num_predict:300},messages:[{role:'system',content:briefPolicy},{role:'user',content:`Task: ${task}`}]})});const j=await r.json();if(!r.ok||!j.message?.content)throw Error('Local model unavailable');return j.message.content}
async function cloudBrief(task){const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${env.OPENAI_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model:env.OPENAI_MODEL||'gpt-4.1-mini',input:`${briefPolicy}\nTask: ${task}`})});const j=await r.json();if(!r.ok)throw Error(textFrom(j));return textFrom(j)}
http.createServer(async(req,res)=>{
  if(req.method==='GET'&&req.url==='/'){res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});return res.end(page)}
  if(req.method==='GET'&&req.url==='/host.png'){res.writeHead(200,{'content-type':'image/png','cache-control':'no-store'});return res.end(host)}
  if(req.method==='GET'&&req.url==='/health')return send(res,200,{ok:true,local:{available:await ollamaReady(),model:localModel},cloud:{available:Boolean(env.OPENAI_API_KEY)},voice:{available:Boolean(env.OPENAI_API_KEY)}});
  let body='';for await(const chunk of req)body+=chunk;let q={};try{q=JSON.parse(body||'{}')}catch{}
  if(req.url==='/projects')return send(res,200,{projects:Object.keys(projects)});
  if(req.url==='/chat'){
    const task=String(q.message||'').slice(0,6000);if(!task)return send(res,400,{error:'Tell Nova what you need done.'});
    try{let text,provider='openai';if(q.mode!=='cloud'&&await ollamaReady()){try{text=await localBrief(task);provider='ollama'}catch{}}if(!text)text=await cloudBrief(task);return send(res,200,{text,provider})}catch{return send(res,502,{error:'Nova could not reach a configured model. Check the local service or OpenAI balance.'})}
  }
  if(req.url==='/voice'){
    const input=String(q.text||'').slice(0,1800);if(!input)return send(res,400,{error:'Nothing to speak.'});
    try{const r=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{authorization:`Bearer ${env.OPENAI_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model:env.OPENAI_TTS_MODEL||'gpt-4o-mini-tts',voice:env.OPENAI_TTS_VOICE||'marin',input,format:'mp3'})});if(!r.ok)return send(res,502,{error:'Natural voice is unavailable.'});res.writeHead(200,{'content-type':'audio/mpeg','cache-control':'no-store'});return res.end(Buffer.from(await r.arrayBuffer()))}catch{return send(res,502,{error:'Natural voice is unavailable.'})}
  }
  if(req.url==='/launch'){
    const cwd=projects[q.project],agent=q.agent==='Grok'?'Grok':q.agent==='OpenCode'?'OpenCode':null;if(!cwd||!agent)return send(res,400,{error:'Choose a known project and worker.'});const cmd=agent==='Grok'?'grok':'opencode';const args=agent==='Grok'?['--cwd',cwd,'--permission-mode','acceptEdits',String(q.task||'')]:['run','--agent','build',String(q.task||'')];spawn('powershell.exe',['-NoExit','-Command',`Set-Location '${cwd}'; ${cmd} ${args.map(x=>`'${x.replaceAll("'","''")}'`).join(' ')}`],{detached:true,stdio:'ignore'}).unref();return send(res,200,{text:`Opened ${agent} in ${q.project}. It must commit and push main, then visually verify production before reporting anything live.`});
  }
  return send(res,404,{error:'not found'});
}).listen(3410,()=>console.log(`Orchestrator: http://localhost:3410 | local model: ${localModel}`));
