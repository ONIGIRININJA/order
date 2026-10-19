const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
for(const [,script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script);
const code=html.slice(html.indexOf('function earliestEventDate(){'),html.indexOf('function waText(o)'));
const fields={};
function reset(){
 for(const [id,value] of Object.entries({fName:'בדיקה',fPhone:'052-5958465',fEmail:'test@example.com',fDate:'2099-01-01',fTime:'12:00',fGuests:'50',fPlace:'כתובת בדיקה'})) fields[id]={value,validity:{valid:true},setAttribute(k,v){this[k]=v},focus(){this.focused=true}};
 fields.formErr={hidden:true};
}
reset();
const context=vm.createContext({Intl,Date,Number,Object,CONFIG:{MIN_UNITS:100},qty:{salmon:50,avocado:50},document:{getElementById:id=>fields[id]}});
vm.runInContext(code,context);
assert.equal(context.validate(),true,'valid details accepted');
fields.fPhone.value='abc';assert.equal(context.validate(),false,'invalid phone rejected');
reset();fields.fDate.value='2020-01-01';assert.equal(context.validate(),false,'past event rejected');
reset();fields.fGuests.value='1.5';assert.equal(context.validate(),false,'fractional guests rejected');
reset();fields.fEmail.validity.valid=false;assert.equal(context.validate(),false,'native validity is enforced');
reset();context.qty.avocado=49;assert.equal(context.validate(),false,'99 units rejected');
context.qty.avocado=50;reset();fields.fName.value='';assert.equal(context.validate(),false,'missing required field rejected');
// Exercise the real order collection and display code without submitting an order.
const ui={};
const element=()=>({value:'',checked:false,innerHTML:'',style:{},classList:{toggle(){}},remove(){}});
for(const id of ['fName','fPhone','fEmail','fCompany','fDate','fTime','fGuests','fType','fPlace','fNotes','fStation','fNoSauces','mText','mTotal','mFill','send','sum','app','bar'])ui[id]=element();
let shipping='pickup';
const flow=vm.createContext({Date,Number,Object,Boolean,Math,String,
 CONFIG:{MIN_UNITS:100,DELIVERY_GUSH:50,VAT:.18},
 ITEMS:[{id:'salmon',n:'סלמון צלוי',k:'fish'},{id:'avocado',n:'אבוקדו',k:'vegan'}],
 qty:{salmon:50,avocado:50},price:i=>i.k==='fish'?18:16,nis:n=>n+' ₪',T:()=>'',
 document:{getElementById:id=>ui[id],querySelector:selector=>selector.includes(':checked')?{value:shipping}:element(),querySelectorAll:()=>[]},
 window:{scrollTo(){}}});
vm.runInContext(html.slice(html.indexOf('function shipVal(){'),html.indexOf('function earliestEventDate(){')),flow);
vm.runInContext(html.slice(html.indexOf('function waText(o){'),html.indexOf('document.getElementById("send").addEventListener("click", async () => {')),flow);
vm.runInContext(html.slice(html.indexOf('function escapeHTML'),html.indexOf('/* ---- מדידת משפך')),flow);
for(const mode of ['pickup','gush','other'])for(const station of [false,true]){
 shipping=mode;ui.fStation.checked=station;flow.update();const order=flow.collect();
 assert.equal(order.total,mode==='gush'?1750:1700,'published prices unchanged');
 const summary=ui.sum.innerHTML,bar=ui.mTotal.innerHTML;
 for(const output of [summary,bar,flow.waText(order)]){
  if(station)assert.match(output,/לפני.*עמדה ממותגת/,'station excluded from displayed amount');
  if(mode==='other')assert.match(output,/לפני.*משלוח מחוץ לגוש דן/,'outside delivery excluded');
 }
 flow.done(order);assert.match(ui.app.innerHTML,/ממתינה לאישור/,'receipt remains a request');
 if(station)assert.match(ui.app.innerHTML,/אינו כולל.*עמדה ממותגת/);
}
ui.fNoSauces.checked=true;ui.fNotes.value='אלרגיה — ליצור קשר';ui.fName.value='<script>alert(1)</script>';
flow.update();const withoutSauces=flow.collect();
assert.match(ui.sum.innerHTML,/ללא רטבים/);
assert.match(withoutSauces.notes,/ללא רטבים.*סויה.*טריאקי/,'preference sent in existing backend notes field');
assert.match(withoutSauces.notes,/אלרגיה — ליצור קשר/,'customer notes preserved');
assert.match(flow.waText(withoutSauces),/ללא רטבים/);
flow.done(withoutSauces);assert.match(ui.app.innerHTML,/ללא רטבים/);assert.ok(!ui.app.innerHTML.includes('<script>'),'receipt escapes customer input');
ui.fNoSauces.checked=false;assert.equal(flow.collect().notes,ui.fNotes.value,'unchecking clears generated preference');
vm.runInContext(html.slice(html.indexOf('function cardHTML(it){'),html.indexOf('document.getElementById("gFish")')),flow);
assert.match(flow.cardHTML({id:'salmon',n:'סלמון צלוי',k:'fish'}),/aria-label="הוספת 5 יחידות סלמון צלוי"/);
const begin=html.indexOf('document.getElementById("send").addEventListener("click", async () => {');
const end=html.indexOf('function escapeHTML',begin);
const handler=html.slice(begin,end);
async function checkSubmit(ok){
 let callback,completed=false;
 const button={addEventListener:(event,fn)=>callback=fn},error={hidden:true};
 const sandbox={document:{getElementById:id=>id==='send'?button:error},validate:()=>true,collect:()=>({units:100}),CONFIG:{WEBHOOK_URL:'https://example.invalid'},fetch:async()=>({ok}),done:()=>completed=true,JSON,Error};
 vm.runInNewContext(handler,sandbox);
 await callback();
 assert.equal(completed,ok,'only successful HTTP response shows confirmation');
 if(!ok){assert.equal(error.hidden,false);assert.equal(button.disabled,false);}
}
(async()=>{await checkSubmit(false);await checkSubmit(true);console.log('PASS: syntax, validation, HTTP failure/success, 6 delivery/station combinations, sauce notes, confirmation escaping, accessible quantity labels. No network requests sent.');})().catch(e=>{console.error(e);process.exitCode=1});
