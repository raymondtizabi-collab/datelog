// SQL check in PGlite: cd /tmp/pgl && npm i @electric-sql/pglite && node /workspace/date-tracker/tests/sql_analytics.mjs
import {PGlite} from '/tmp/pgl/node_modules/@electric-sql/pglite/dist/index.js';import fs from 'fs';
const db=new PGlite();const sql=fs.readFileSync('/workspace/date-tracker/supabase/analytics.sql','utf8');let F=0;
const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)F++};
await db.exec("create role anon; create role authenticated;");await db.exec(sql);await db.exec(sql);ok(1,'applies twice (idempotent)');
const q=async(s,p)=>(await db.query(s,p)).rows;const A='a'.repeat(32),B='b'.repeat(32);
const t=async(id,e)=>q('select track_event($1,$2) r',[id,e]).then(x=>x[0].r).catch(e=>'ERR');
ok(await t(A,'visit')===true&&await t(A,'visit')===false,'visit max 1 per 30 min');
ok(await t(A,'log_date')===true&&await t(B,'visit')===true,'other events/ids ok');
ok(await t(A,'hack')==='ERR'&&await t('Bob@x.com','visit')==='ERR','enum + id checks');
for(let i=0;i<70;i++)await t(B,'share');ok((await q("select count(*)::int n from app_events where anon_id=$1",[B]))[0].n==60,'60/anon/hour cap');
await db.exec(`insert into app_events(anon_id,event,created_at) values ('${'c'.repeat(32)}','visit',now()-interval '3 days'),('${'d'.repeat(32)}','visit',now()-interval '30 days')`);
const u=(await q('select usage_counts() u'))[0].u;console.log(JSON.stringify(u));
ok(u['24h'].unique_visitors==2&&u['7d'].unique_visitors==3&&u.all.unique_visitors==4&&u['24h'].events.share==59&&u.all.events.visit==4,'usage_counts aggregates');
const s=await q('select * from usage_summary()');ok(s.length==2&&Number(s[0].unique_visitors)==2,'usage_summary per day');
const g=await q(`select has_function_privilege('anon','usage_summary(timestamptz)','execute') s, has_function_privilege('anon','usage_counts()','execute') c, has_function_privilege('anon','track_event(text,text)','execute') t, has_table_privilege('anon','app_events','select') tb`);
ok(!g[0].s&&g[0].c&&g[0].t&&!g[0].tb,'anon: no usage_summary, no table select; can track + usage_counts');
console.log('fails',F);process.exit(F?1:0);
