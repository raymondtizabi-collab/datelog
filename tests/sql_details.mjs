// SQL check in PGlite: cd /tmp/pgl && npm i @electric-sql/pglite && node /workspace/date-tracker/tests/sql_details.mjs
import {PGlite} from '/tmp/pgl/node_modules/@electric-sql/pglite/dist/index.js';import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';import fs from 'fs';
const db=new PGlite({extensions:{pgcrypto}});const S='/workspace/date-tracker/supabase/';
await db.exec("create role anon; create role authenticated;");
for(const f of['schema.sql','community.sql','examples.sql','details.sql','details.sql']){try{await db.exec(fs.readFileSync(S+f,'utf8'));console.log('applied',f)}catch(e){console.log('ERR',f,e.message);process.exit(1)}}
const q=async(s,p)=>(await db.query(s,p)).rows;
console.log(await q("select count(*) filter (where details is not null) n, count(*) t from community_posts where is_example"));
const r=await q("select nick, details->'them'->>'job' j, day_label from list_community(null) limit 2");console.log(r);
const post=d=>q("select post_community('Chef','dinner','West LA','tomorrow','Hinge',4,1,'abcdef0123456789',null,'Woman','Man',$1::jsonb) r",[d]).then(x=>'OK').catch(e=>'REJ '+e.message);
for(const d of[null,'{}','{"you":{"job":"Tech","vibe":["Funny","Chill"]},"ctx":{"num":"1st"},"like":"Funny"}','{"you":{"vibe":["Funny","Chill","Nerdy","Artsy"]}}','{"you":{"job":"Astronaut"}}','{"them":{"name":"Bob"}}','{"like":"call me 555 1234"}','{"flag":"insta @bob"}','{"like":"'+'x'.repeat(81)+'"}','{"x":1}','{"them":{"age":"30–34","height":"6′3″+"}}'])console.log(String(d).slice(0,60),'=>',await post(d));
console.log(await q("select proname, pg_get_function_identity_arguments(oid) a from pg_proc where proname in('post_community','list_community')"));
console.log(await q("select count(*) from list_community(null) where details is not null"));
