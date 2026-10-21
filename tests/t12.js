// call-it card PNG, title, share text, friend landing with sender name
const {run,U,S}=require('./lib');const fs=require('fs');run(async({p,ok})=>{
ok(await p.title()=='Datelog — I’d like your input 🔮','title');
for(const [me,ty,nk,file] of [['Jen','Dinner','Thomas','card-v3.png'],['Maximiliana-Josephine','Activity','Bartholomew1','card-long.png']]){
 const u=await p.evaluate(async([me,ty,nk])=>{D.me=me;const f=await cardPNG({rows:[{t:me+' seeks your input 🔮',s:76,w:800,max:3},{t:`${ty} date with ${nk}`,s:56,w:700,gap:44,max:3},{t:'Will there be a 2nd date?',s:50,w:800,gap:56,pill:1,max:2}]});return await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r([fr.result,f.size]);fr.readAsDataURL(f)})},[me,ty,nk]);
 fs.writeFileSync(S+file,Buffer.from(u[0].split(',')[1],'base64'));ok(u[1]>20000&&/image\/jpeg/.test(u[0]),'jpeg size '+u[1])}
await p.evaluate(()=>{D.me='Jen';save();$('#demo').click()});await p.goto(U+'#log');await p.reload();
await p.click('.ask');await p.waitForTimeout(400);await p.click('#askShare');const t=await p.evaluate(()=>__sh[0].text);ok(/^Call it 🔮 Love story or one-date wonder\? I’ve got a date with DEMO-\w+( [\w ]+)?\. Make your prediction:$/.test(t),'share text: '+t);
const url=await p.inputValue('#askUrl');await p.goto(url.replace(/^.*#/,U+'#'));await p.reload();const fc=await p.innerText('#friendCard');ok(/Jen seeks your input/i.test(fc)&&/Call it: love story or one-date wonder/.test(fc),'landing name');
},{share:true});
