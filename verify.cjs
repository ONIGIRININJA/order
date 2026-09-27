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
(async()=>{await checkSubmit(false);await checkSubmit(true);console.log('PASS: script syntax, valid input, 6 invalid-input cases, HTTP failure/success. No network requests sent.');})().catch(e=>{console.error(e);process.exitCode=1});
