const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
class Element {
  constructor(tag='div'){ this.tag=tag;this.children=[];this.textContent='';this.style={};this.listeners={};this.attrs={}; }
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=items;}
  setAttribute(key,value){this.attrs[key]=value;}
  addEventListener(key,fn){this.listeners[key]=fn;}
  set innerHTML(value){throw new Error('Use textContent for customer/order data');}
}
const text = element => [element.textContent,...element.children.map(text)].join(' ');
function setup(fetcher){
 const elements={accountOrderHistory:new Element(),accountOrdersHeading:new Element('h3')};
 const listeners={}; const calls=[];
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../frontend/order-history.js'),'utf8'),{
  document:{getElementById:id=>elements[id],createElement:tag=>new Element(tag),addEventListener:(name,fn)=>{listeners[name]=fn;}},
  localStorage:{getItem(){throw new Error('No browser-stored history');},setItem(){throw new Error('No browser-stored history');}},
  fetch:async(url,options)=>{calls.push({url,options});return fetcher(url,options);}
 });
 return {elements,calls,load:()=>listeners['cfp:account-rendered']()};
}
(async()=>{
 const app=setup(async()=>({ok:true,status:200,json:async()=>({success:true,orders:[{id:'one',order_number:'CFP-1',fulfillment_status:'hidden-delivery-status',payment_status:'hidden-payment-status',shipping_fee:876.54,total_amount:9876.54,items:[{product_name:'Ragi Sticks <test>',quantity:2}]}]})}));
 await app.load();
 assert.equal(app.calls[0].url,'/api/orders');assert.equal(app.calls[0].options.cache,'no-store');assert.equal(app.calls[0].options.credentials,'same-origin');
 assert.match(text(app.elements.accountOrderHistory),/Ragi Sticks <test>/);assert.match(text(app.elements.accountOrderHistory),/2/);
 assert.doesNotMatch(text(app.elements.accountOrderHistory),/hidden-delivery|hidden-payment|876\.54|9876\.54/);
 assert.equal(app.elements.accountOrdersHeading.textContent,'Previous Orders (1)');
 const empty=setup(async()=>({ok:true,status:200,json:async()=>({success:true,orders:[]})}));await empty.load();assert.match(text(empty.elements.accountOrderHistory),/No orders found/);
 const failed=setup(async()=>{throw new TypeError('Failed to fetch');});await failed.load();assert.match(text(failed.elements.accountOrderHistory),/could not be loaded/);assert.match(text(failed.elements.accountOrderHistory),/Retry/);
 const expired=setup(async()=>({ok:false,status:401,json:async()=>({success:false})}));await expired.load();assert.match(text(expired.elements.accountOrderHistory),/sign in again/);
 let resolve;
 const stale=setup(()=>new Promise(r=>{resolve=r;}));const old=stale.elements.accountOrderHistory;const pending=stale.load();stale.elements.accountOrderHistory=new Element();
 resolve({ok:true,status:200,json:async()=>({success:true,orders:[{order_number:'SECRET',items:[]}]})});await pending;assert.doesNotMatch(text(old),/SECRET/);assert.doesNotMatch(text(stale.elements.accountOrderHistory),/SECRET/);
 const script=fs.readFileSync(path.join(__dirname,'../frontend/script.js'),'utf8');
 assert.ok(!script.includes('saveUserOrder('));assert.ok(!script.includes('getUserOrders('));assert.ok(!script.includes('CFP-982143'));
 assert.ok(script.includes("key.startsWith('cfp_orders_')"));assert.ok(script.includes('localStorage.removeItem(key)'));
 assert.ok(script.includes("fetch('/api/orders', {"),'Checkout still uses backend order creation');
 console.log('PASS: authenticated item-only history, no browser persistence/cache, empty/error/session states, safe text and stale-response isolation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
