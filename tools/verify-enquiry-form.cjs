const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../frontend/enquiry-form.js'), 'utf8');
function setup({ blocked=false, search='', fetcher }={}) {
  const elements={};
  for (const id of ['contactName','contactEmail','contactSubject','contactMessage','enquirySubmit','enquiryStatus','enquiryWhatsappLink']) {
    elements[id]={value:'',hidden:true,textContent:'Send enquiry on WhatsApp',dataset:{},focus(){this.focused=true;}};
  }
  elements.contactName.value='  Local QA  ';
  elements.contactEmail.value='qa@example.com';
  elements.contactSubject.value='Bulk supply & packing';
  elements.contactMessage.value='Please quote 100 packs.\nDestination: Pune.';
  const form={attributes:{},listeners:{},valid:true,reportValidity(){return this.valid;},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},addEventListener(k,fn){this.listeners[k]=fn;},reset(){this.resetCalled=true;}};
  elements.contactForm=form;
  const popup={closed:false,location:{replace(url){popup.url=url;}},close(){this.closed=true;}};
  const calls=[];
  let timeout;
  const context={document:{getElementById:id=>elements[id],addEventListener:(name,callback)=>callback()},location:{search},crypto,URL,URLSearchParams,Uint8Array,AbortController,window:{open(){return blocked?null:popup;}},setTimeout(fn){timeout=fn;return 1;},clearTimeout(){},fetch:async(url,options)=>{
    const body=JSON.parse(options.body);calls.push({url,body});
    if(fetcher)return fetcher(url,options,body);
    return {ok:true,status:201,json:async()=>({success:true,whatsappUrl:`https://wa.me/919960725539?text=${encodeURIComponent(body.message)}`})};
  }};
  vm.runInNewContext(code,context);
  return {elements,form,popup,calls,timeout:()=>timeout(),submit:()=>form.listeners.submit({preventDefault(){}})};
}
(async()=>{
  const app=setup();await app.submit();
  assert.equal(app.calls[0].url,'/api/enquiries');
  assert.equal(app.calls[0].body.fullName,'Local QA');
  assert.equal(app.calls[0].body.source,'contact');
  assert.equal(new URL(app.popup.url).pathname,'/919960725539');
  for(const id of ['contactName','contactEmail','contactSubject','contactMessage'])assert.equal(app.elements[id].value,'');
  assert.equal(app.elements.enquiryStatus.dataset.state,'success');
  assert.match(app.elements.enquiryStatus.textContent,/recorded/);
  assert.match(app.elements.enquiryStatus.textContent,/press Send in WhatsApp/);
  assert.equal(app.elements.enquirySubmit.disabled,false);
  const blocked=setup({blocked:true});await blocked.submit();
  assert.equal(blocked.elements.enquiryWhatsappLink.hidden,false);assert.equal(blocked.elements.enquiryStatus.dataset.state,'success');
  const exportForm=setup({search:'?enquiry=turmeric-powder'});await exportForm.submit();assert.equal(exportForm.calls[0].body.source,'turmeric-powder');
  const invalid=setup();invalid.form.valid=false;await invalid.submit();assert.equal(invalid.calls.length,0);
  const failing=setup({fetcher:async()=>{throw new TypeError('Failed to fetch');}});
  await failing.submit();assert.equal(failing.elements.contactName.value,'Local QA');assert.equal(failing.form.resetCalled,undefined);assert.equal(failing.popup.closed,false);assert.equal(new URL(failing.popup.url).pathname,'/919960725539');
  assert.equal(failing.elements.enquiryStatus.dataset.state,'notice');assert.doesNotMatch(failing.elements.enquiryStatus.textContent,/Failed to fetch|has been recorded/);assert.equal(failing.elements.enquirySubmit.disabled,false);
  await failing.submit();assert.equal(failing.calls[0].body.requestId,failing.calls[1].body.requestId,'lost-response retries reuse ID');
  failing.elements.contactMessage.value='Changed message';await failing.submit();assert.notEqual(failing.calls[1].body.requestId,failing.calls[2].body.requestId);
  const unavailable=setup({fetcher:async()=>({ok:false,status:503,json:async()=>({success:false,error:'Recording unavailable'})})});
  await unavailable.submit();assert.equal(unavailable.elements.contactSubject.value,'Bulk supply & packing');assert.equal(unavailable.form.resetCalled,undefined);
  const staticHosting=setup({fetcher:async()=>({ok:false,status:404,json:async()=>{throw new Error('Not JSON');}})});
  await staticHosting.submit();assert.equal(staticHosting.elements.enquiryStatus.dataset.state,'notice');assert.ok(staticHosting.popup.url.includes('wa.me/919960725539'));assert.equal(staticHosting.form.resetCalled,undefined);
  let resolveRequest;
  const slow=setup({fetcher:()=>new Promise(resolve=>{resolveRequest=resolve;})});
  const submitting=slow.submit();await slow.submit();assert.equal(slow.calls.length,1,'double click must not duplicate request');
  resolveRequest({ok:true,status:201,json:async()=>({success:true,whatsappUrl:'https://wa.me/919960725539?text=test'})});await submitting;
  const timed=setup({fetcher:async(url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>{const error=new Error('Timeout');error.name='AbortError';reject(error);} ))});
  const timedSubmitting=timed.submit();timed.timeout();await timedSubmitting;
  assert.match(timed.elements.enquiryStatus.textContent,/ready in WhatsApp/);assert.equal(timed.elements.enquiryStatus.dataset.state,'notice');assert.equal(timed.form.resetCalled,undefined);
  const blockedOffline=setup({blocked:true,fetcher:async()=>{throw new TypeError('Failed to fetch');}});
  await blockedOffline.submit();assert.equal(blockedOffline.elements.enquiryWhatsappLink.hidden,false);
  assert.ok(new URL(blockedOffline.elements.enquiryWhatsappLink.href).searchParams.get('text').includes('qa@example.com'));
  assert.equal(blockedOffline.form.resetCalled,undefined);
  const rateLimited=setup({fetcher:async()=>({ok:false,status:429,json:async()=>({success:false,error:'Please wait and retry.'})})});
  await rateLimited.submit();assert.equal(rateLimited.elements.enquiryStatus.dataset.state,'error');assert.equal(rateLimited.popup.url,undefined);
  const redirect=setup({fetcher:async()=>({ok:true,status:201,json:async()=>({success:true,whatsappUrl:'https://example.com/'})})});
  await redirect.submit();assert.equal(redirect.popup.url,undefined);assert.equal(redirect.elements.enquiryStatus.dataset.state,'error');
  console.log('PASS: form saving/handoff, reset on success only, blocked popups, source, validation, errors, retries, timeout, offline/static-host WhatsApp fallback, duplicate submits and destination safety.');
})().catch(error=>{console.error(error);process.exitCode=1;});
