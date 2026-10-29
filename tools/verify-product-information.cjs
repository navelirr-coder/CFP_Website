const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
process.chdir(path.resolve(__dirname, '../frontend'));
const html = fs.readFileSync('shop.html', 'utf8');
// Baseline includes the replacement catalogue filenames committed before enquiry changes.
const baseline = execFileSync('git', ['show', 'cd309e4:shop.html'], {encoding:'utf8'});
const cardsIn = text => text.replace(/\r\n/g,'\n').match(/<article class="product-item-card"[\s\S]*?<\/article>/g);
assert.deepEqual(cardsIn(html), cardsIn(baseline), 'All original card markup, images, navigation and cart metadata must remain intact');
for (const file of ['style.css', 'product-details.html']) {
  // The shared responsive stylesheet is the only allowed product-detail markup addition.
  const current = fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n').replace('  <link rel="stylesheet" href="mobile.css">\n', '');
  assert.equal(current, execFileSync('git',['show',`cd309e4:${file}`],{encoding:'utf8'}).replace(/\r\n/g,'\n'), `${file} original design and product content preserved`);
}
const currentScript = fs.readFileSync('script.js', 'utf8').replace(/\r\n/g,'\n');
const originalScript = execFileSync('git', ['show', 'cd309e4:script.js'], {encoding:'utf8'}).replace(/\r\n/g,'\n');
const productController = source => source.slice(source.indexOf('  const categoryPills ='), source.indexOf('     5. PRODUCT DETAILS QUANTITY PICKER'));
assert.equal(productController(currentScript), productController(originalScript), 'Category and image-hover controllers unchanged');
assert.equal((html.match(/id="productInformation"/g)||[]).length,1);
assert.ok(html.indexOf('id="productInformation"') > html.lastIndexOf('</article>'));

class Element {
  constructor(tag='div') { this.tag=tag; this.children=[]; this.attributes={}; this.listeners={}; this.dataset={}; this.style={}; this.textContent=''; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children=nodes; }
  setAttribute(name,value) { this.attributes[name]=value; }
  querySelector(selector) { return selector==='.product-short-desc' ? this.description : null; }
  addEventListener(type,callback) { (this.listeners[type]??=[]).push(callback); }
  closest() { return this.interactive ? this : null; }
  emit(type, options={}) {
    const event={target:this,preventDefault(){this.prevented=true;},...options};
    for (const handler of this.listeners[type]??[]) handler(event);
    return event;
  }
}
const textOf = node => [node.textContent,...node.children.map(textOf)].join(' ');
function setup(hover=true) {
  const window={matchMedia:()=>({matches:hover})};
  vm.runInNewContext(fs.readFileSync('product-information-data.js','utf8'),{window});
  const products=window.CFP_PRODUCT_INFORMATION;
  const cards=Object.entries(products).map(([slug,p])=>{
    const card=new Element('article'); card.dataset={product:slug,category:p.category};
    card.style.display=p.category==='crunchies'?'flex':'none'; card.description=new Element('p'); return card;
  });
  const grid=new Element(); grid.querySelectorAll=()=>cards;
  const elements={shopProductsGrid:grid,productInformation:new Element('section'),productInformationContent:new Element(),productInformationStatus:new Element()};
  let observer;
  const document={getElementById:id=>elements[id],createElement:tag=>new Element(tag),addEventListener:(name,callback)=>callback()};
  class MutationObserver {constructor(callback){observer=callback;} observe(){}}
  vm.runInNewContext(fs.readFileSync('product-information.js','utf8'),{document,window,MutationObserver});
  return {cards,products,elements,changed:()=>observer(),text:()=>textOf(elements.productInformationContent)};
}
const app=setup();
assert.equal(Object.keys(app.products).length,8);
assert.equal(Object.values(app.products).reduce((sum,p)=>sum+p.nutrition.length,0),82);
assert.match(app.text(), /Ragi Sticks/);
const [ragi,bajra,jowarChivda,jowarChips]=app.cards;
bajra.emit('mouseenter'); assert.match(app.text(),/Bajra Chivda/);
bajra.emit('click'); assert.match(app.elements.productInformationStatus.textContent,/selected/);
ragi.emit('mouseenter'); assert.match(app.text(),/Bajra Chivda/,'hover must not replace pinned selection');
jowarChips.emit('click'); assert.match(app.text(),/Jowar Chips/);
assert.match(jowarChips.attributes['aria-label'],/, selected/);
assert.doesNotMatch(bajra.attributes['aria-label'],/, selected/);
ragi.emit('keydown',{key:'Enter'}); assert.match(app.text(),/Ragi Sticks/);
jowarChivda.emit('keydown',{key:' '}); assert.match(app.text(),/Jowar Chivda/);
const button=new Element('button');button.interactive=true;
const event=ragi.emit('click',{target:button});assert.ok(!event.prevented);assert.match(app.text(),/Jowar Chivda/,'purchase controls must not select details');
const link=new Element('a');link.interactive=true;
const linkEvent=ragi.emit('click',{target:link});assert.ok(!linkEvent.prevented);assert.match(app.text(),/Jowar Chivda/);
for (const card of app.cards) {
 card.emit('click'); const product=app.products[card.dataset.product];
 assert.ok(app.text().includes(product.name)); assert.ok(app.text().includes(product.description));
 assert.ok(app.text().includes(product.ingredients));assert.ok(app.text().includes(product.highlight));
 for (const row of product.nutrition) for (const value of Object.values(row)) assert.ok(app.text().includes(value));
 assert.equal(card.description.textContent,product.shortDescription);
}
assert.equal(app.products['millet-ladoo'].nutrition.find(r=>r.nutrient==='Carbohydrates').perServing,'60.63 g');
assert.equal(app.products['millet-cookies'].nutrition.find(r=>r.nutrient==='Total fat').perServing,'0.10 g');
assert.equal(app.products['ragi-ladoo'].servingSize,'20 g');
assert.equal(app.products['millet-cookies'].servingSize,'12 g');
assert.ok(!app.products['millet-cookies'].nutrition.some(r=>r.nutrient==='Trans fat'),'missing nutrients must not be invented');
const touch=setup(false);
touch.cards[1].emit('mouseenter'); assert.match(touch.text(),/Ragi Sticks/);
touch.cards[1].emit('click'); assert.match(touch.text(),/Bajra Chivda/,'tap click selects without hover');
const category=setup();
category.cards.forEach(c=>{c.style.display=c.dataset.category==='bites'?'flex':'none';});
category.changed(); assert.match(category.text(),/Ragi Ladoo/);
category.cards.forEach(c=>{c.style.display='none';});category.changed();assert.match(category.text(),/Choose a Crunchies or Bites/);
console.log('PASS: all eight products and 82 nutrition rows, hover, pin/reselect, keyboard, touch, categories, native controls, and original card integrity.');
