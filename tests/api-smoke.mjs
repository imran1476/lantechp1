// এন্ড-টু-এন্ড API পরীক্ষা: লগইন, রোল, যাচাই-গেট, হ্যাশ-চেইন, ছবি।
// চালানোর আগে সার্ভার চালু করুন একদম নতুন ডেটা-ফোল্ডার দিয়ে (সিড রেকর্ড ৬টি ধরে নেওয়া হয়):
//   BHOOMI_DATA_DIR=./.tmp-test-data AUTH_SECRET=test-secret-test-secret-test-secret-1234 npm run dev
//   BASE=http://localhost:3000 npm run test:api
const B=process.env.BASE||'http://localhost:3000'; let pass=0, fail=0;
const ok=(c,m)=>{ if(c){pass++;console.log('  ok  ',m)} else {fail++;console.log('  FAIL',m)} };
async function login(u){ const r=await fetch(B+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:'Bhoomi@2026'})}); const c=r.headers.get('set-cookie').split(';')[0]; return c; }
const call=(cookie,method,path,body)=>fetch(B+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
const op=await login('operator'), rv=await login('reviewer'), ad=await login('admin');

let r=await call(null,'GET','/api/records'); ok(r.status===401,'records without login -> 401');
r=await call(op,'GET','/api/records'); let j=await r.json(); ok(j.records.length===6,'seed: 6 records ('+j.records.length+')');
for(const x of j.records){ const v=await (await call(op,'GET','/api/records/'+x.id+'/verify')).json(); ok(v.result.ok,'seed '+x.id+' integrity ok'); }
const demo=j.records.find(x=>x.id==='rec-1260');

r=await call(rv,'POST','/api/records/rec-1260/approve'); j=await r.json();
ok(r.status===422 && j.error==='validation','approve with area mismatch blocked (422): '+(j.issues?.[0]?.message||''));
r=await call(op,'POST','/api/records/rec-1260/approve'); ok(r.status===403,'operator cannot approve (403)');

// fix: set total to 0.27
r=await call(op,'PUT','/api/records/rec-1260',{patch:{totalArea:0.27}}); j=await r.json();
ok(r.status===200 && j.record.status==='সংশোধিত','operator corrects total -> status সংশোধিত');
ok(j.record.checks.areaSum==='ok','areaSum ok after fix');
ok(j.record.fieldConfidences.totalArea===99,'edited field confidence = 99');
ok(j.record.auditLogs.at(-1).details.includes('মোট জমি'),'audit details mention field: '+j.record.auditLogs.at(-1).details);

r=await call(rv,'POST','/api/records/rec-1260/approve'); j=await r.json();
ok(r.status===200 && j.record.status==='অনুমোদিত','reviewer approves after fix');
ok(/^[0-9a-f]{64}$/.test(j.record.recordHash),'recordHash is 64-hex SHA-256');
let v=await (await call(op,'GET','/api/records/rec-1260/verify')).json(); ok(v.result.ok,'verify ok after approve; entries='+v.result.entries);

// edit approved -> back to needing approval
r=await call(rv,'PUT','/api/records/rec-1260',{patch:{mouza:'কাশিমপুর'}}); j=await r.json(); ok(j.record.status==='অনুমোদিত','no-op edit keeps approved');
r=await call(rv,'PUT','/api/records/rec-1260',{patch:{khatianNo:'১২৬১'}}); j=await r.json(); ok(j.record.status==='সংশোধিত' && j.record.khatianNo==='1261' && j.record.khatianNoBn==='১২৬১','editing approved record reopens it; Bangla digits normalized');

// client cannot set status/hash/audit
r=await call(op,'PUT','/api/records/rec-1260',{patch:{status:'অনুমোদিত',recordHash:'x',auditLogs:[]}}); j=await r.json(); ok(j.record.status==='সংশোধিত' && j.record.recordHash.length===64 && j.record.auditLogs.length>3,'client cannot forge status/hash/logs');

// create: reviewer 403, operator ok with image
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
r=await call(rv,'POST','/api/records',{record:{khatianNo:'1'}}); ok(r.status===403,'reviewer cannot create (403)');
r=await call(op,'POST','/api/records',{record:{khatianNo:'৭৭৭',dagNo:'৮৮',surveyType:'RS',district:'ঢাকা',upazila:'সাভার',mouza:'কাশিমপুর',totalArea:10,areaUnit:'শতক',owners:[{name:'কাল্পনিক ব্যক্তি',share:'১/১'}],plots:[{dagNo:'৮৮',dagNoBn:'',landClass:'ধানি',area:10,areaUnit:'শতক',confidence:90}]},imageBase64:png,mimeType:'image/png'}); j=await r.json();
ok(r.status===201 && j.record.imageUrl,'operator creates record with image');
const nid=j.record.id;
r=await fetch(B+j.record.imageUrl,{headers:{Cookie:op}}); ok(r.status===200 && r.headers.get('content-type')==='image/png','image served to logged-in user');
r=await fetch(B+j.record.imageUrl); ok(r.status===401,'image blocked without login');
r=await call(op,'GET','/api/records/..%2F..%2Fetc%2Fpasswd/image'); ok(r.status>=400,'path traversal id rejected ('+r.status+')');
r=await call(op,'POST','/api/records',{record:{khatianNo:'2'},imageBase64:'aaaa',mimeType:'text/html'}); ok(r.status===400,'bad mime rejected');

// reject
r=await call(rv,'POST','/api/records/'+nid+'/reject',{reason:''}); ok(r.status===400,'reject needs reason');
r=await call(rv,'POST','/api/records/'+nid+'/reject',{reason:'দাগ নম্বর অপাঠ্য'}); j=await r.json(); ok(j.record.status==='প্রত্যাখ্যাত','reject ok');
console.log(`\nPASS ${pass}  FAIL ${fail}`); process.exit(fail?1:0);
