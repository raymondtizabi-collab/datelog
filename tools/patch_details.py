import sys;sys.path.insert(0,'tools');from crowd_details import js
s=open('index.html').read()
def rep(a,b,c=1):
    global s;assert s.count(a)==c,(a[:60],s.count(a));s=s.replace(a,b)
css='''.cdw{border:1px solid var(--line);border-radius:12px;padding:8px 10px;margin:8px 0;background:#141820}.cdw>summary{font-size:15px}.cdh{font-weight:700;color:var(--tx);margin:10px 0 2px}.cdg{margin:6px 0}.cdg>label{font-size:12px;color:var(--mu);display:block;margin-bottom:3px}.cdc{display:flex;flex-wrap:wrap;gap:5px}.cdc button{font-size:13px;padding:5px 10px;min-height:32px;border-radius:999px;background:#0f1218;border:1px solid var(--line);color:var(--tx)}.cdc button.on{background:var(--ac,#e84a7f);border-color:transparent;color:#fff;font-weight:600}.cdwarn{font-size:12px;color:#f5b84a;margin:4px 0}
.cdv{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0 4px}.cdv>div{background:#141820;border:1px solid var(--line);border-radius:10px;padding:6px 8px;font-size:12px;line-height:1.35;min-width:0}.cdv b{display:block;font-size:12px;color:var(--tx);margin-bottom:2px}.cdv span{color:var(--mu)}.cdx{font-size:12px;color:var(--mu);margin:2px 0}.cdx i{font-style:normal;color:var(--tx)}
'''
rep('.ws{margin-top:8px;',css+'.ws{margin-top:8px;')
rep('</select></div></div><div class="copub" id="coPrev">','</select></div></div><details class="ws cdw hide" id="coMore" open><summary>✨ Give The Crowd more to go on <small class="muted">(all optional · ranges &amp; categories only)</small></summary><div id="coMoreB"></div></details><div class="copub" id="coPrev">')
code=js()+r'''
const CDS=[['you','🙋 You',CD.P],['them','💘 Them',CD.P],['ctx','📅 The date',CD.C]];
function cdBuild(){const el=$('#coMoreB');if(!el||el.dataset.b)return;el.dataset.b=1;
 el.innerHTML=CDS.map(([s,h,F])=>`<div class="cdh">${h}</div>`+F.filter(x=>!(s==='you'&&x[0]==='age')).map(([k,l,o,m])=>`<div class="cdg" data-s="${s}" data-k="${k}" data-m="${m}"><label>${esc(l)}</label><div class="cdc">${o.map(v=>`<button type="button" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div></div>`).join('')).join('')
 +`<div class="cdh">💬 One line each</div>`+CD.T.map(([k,l,n])=>`<div class="cdg"><label for="cd_${k}">${esc(l)} (max ${n})</label><input id="cd_${k}" maxlength="${n}" autocomplete="off" placeholder="${k==='like'?'e.g. Plans ahead and asked me out on a call':'e.g. Took 3 days to reply once'}"></div>`).join('')
 +`<div class="cdwarn">⚠️ No names, @handles, workplaces, schools, links or numbers — nothing that could identify either of you.</div>`;
 el.addEventListener('click',e=>{const b=e.target.closest('.cdc button');if(!b)return;e.preventDefault();const g=b.closest('.cdg'),m=+g.dataset.m;
  if(m){if(!b.classList.contains('on')&&g.querySelectorAll('.on').length>=m)return toast('Pick up to '+m);b.classList.toggle('on')}else{const was=b.classList.contains('on');g.querySelectorAll('.on').forEach(x=>x.classList.remove('on'));if(!was)b.classList.add('on')}coPrevUpd()});
 el.addEventListener('input',()=>coPrevUpd())}
function cdGet(){const el=$('#coMoreB'),o={};if(!el||!el.dataset.b)return null;
 el.querySelectorAll('.cdg[data-k]').forEach(g=>{const v=[...g.querySelectorAll('.on')].map(b=>b.dataset.v);if(!v.length)return;(o[g.dataset.s]=o[g.dataset.s]||{})[g.dataset.k]=+g.dataset.m?v:v[0]});
 if($('#coAge').value)(o.you=o.you||{}).age=$('#coAge').value;
 CD.T.forEach(([k,,n])=>{const v=($('#cd_'+k).value||'').trim().replace(/\s+/g,' ').slice(0,n);if(v)o[k]=v});return Object.keys(o).length?o:null}
const cdBadTxt=t=>/@|https?:|www\.|\d{3}/i.test(t)||BAD.test(t);
function cdView(d){if(!d||typeof d!=='object')return'';const P=CD.P.map(x=>x[0]),C=CD.C.map(x=>x[0]);
 const col=(h,x)=>`<div><b>${h}</b>${x&&Object.keys(x).length?P.filter(k=>x[k]&&(!Array.isArray(x[k])||x[k].length)).map(k=>`<span>${esc([].concat(x[k]).join(', '))}</span>`).join(' · '):'<span>—</span>'}</div>`;
 const c=d.ctx?C.filter(k=>d.ctx[k]).map(k=>esc(d.ctx[k])):[];
 return(d.you||d.them?`<div class="cdv">${col('🙋 Me',d.you)}${col('💘 Them',d.them)}</div>`:'')+(c.length?`<div class="cdx">📅 ${c.join(' · ')}</div>`:'')
  +(d.like?`<div class="cdx">💚 <i>“${esc(d.like)}”</i></div>`:'')+(d.flag?`<div class="cdx">🚩 <i>“${esc(d.flag)}”</i></div>`:'')}
'''
rep('function coArgs(r){',code+'function coArgs(r){')
rep(" return{p_nick:nk,p_type:r.type,",
 " const det=CO.det?cdGet():null;if(det&&CD.T.some(([k])=>det[k]&&cdBadTxt(det[k])))return'One-liners: no names, @handles, links or numbers';\n if(det&&det.you&&det.you.age&&CO.ext)dm.p_age=det.you.age;\n return{...(det?{p_details:det}:{}),p_nick:nk,p_type:r.type,")
rep("$('#coDemo').classList.toggle('hide',!CO.ext);","$('#coDemo').classList.toggle('hide',!CO.ext);$('#coMore').classList.toggle('hide',!CO.det);if(CO.det)cdBuild();")
rep("seeking:$('#coSeek').value}):''}<small class=\"muted\">${dy?dy.l:'⚠️ date must be within 2 weeks'} · met via ${esc(f.met.value)}${ex?' · excitement '+ex+'/5':''}</small>",
 "seeking:$('#coSeek').value}):''}<small class=\"muted\">${dy?dy.l:'⚠️ date must be within 2 weeks'} · met via ${esc(f.met.value)}${ex?' · excitement '+ex+'/5':''}</small>${CO.det?cdView(cdGet()):''}")
rep("Never public:</b> the venue/where,","Never public:</b> photos, real names, @handles, the venue/where,")
rep("<small class=\"muted\">That’s all.","<small class=\"muted\">That’s all${CO.det?' — the extra details are only the chips you tapped (ranges &amp; categories) and the one-liners you typed':''}.")
rep("CO.ext=CO.posts.some(p=>'is_example' in p);","CO.ext=CO.posts.some(p=>'is_example' in p);CO.det=CO.posts.some(p=>'details' in p);")
rep("excitement '+p.excite+'/5':''}</small>","excitement '+p.excite+'/5':''}</small>${cdView(p.details)}",2)
open('index.html','w').write(s)
