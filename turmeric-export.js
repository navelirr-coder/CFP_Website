/* Export presentation is limited to the two requested turmeric products. */
document.addEventListener('DOMContentLoaded', () => {
  const products = {
    'turmeric-fingers': { name:'Turmeric Fingers', image:'assets/images/turmeric/Turmeric.jpg', alt:'Whole dried golden turmeric fingers supplied by CFP', description:'Export-quality whole dried turmeric fingers for international buyers and bulk sourcing.' },
    'turmeric-powder': { name:'Turmeric Powder', image:'assets/images/turmeric/Turmeric%20(1).jpg', alt:'Close-up of golden turmeric powder supplied by CFP', description:'Export-quality turmeric powder for international buyers and bulk sourcing.' }
  };
  const params = new URLSearchParams(location.search);
  const productKey = params.get('product');
  const product = Object.hasOwn(products,productKey) ? products[productKey] : null;
  const main = document.querySelector('main');
  if (location.pathname.endsWith('product-details.html') && product && main) {
    document.title = `${product.name} — Export Enquiries | CFP`;
    const crumb=document.querySelector('.breadcrumbs span:last-child');
    if (crumb) crumb.textContent=product.name;
    const description=document.querySelector('meta[name="description"]');
    if (description) description.content=product.description;
    main.className = 'container turmeric-export-detail';
    main.replaceChildren();
    // Only fixed, local catalogue strings are rendered here; query text is
    // used exclusively to select one of the two known product records.
    main.innerHTML = `<a href="shop.html?category=turmeric">← Back to turmeric</a>
      <div class="turmeric-export-detail-grid">
        <img class="turmeric-export-detail-image" src="${product.image}" alt="${product.alt}" width="${productKey === 'turmeric-fingers' ? 736 : 590}" height="${productKey === 'turmeric-fingers' ? 736 : 881}">
        <div><p class="turmeric-export-kicker">Export quality · Bulk supply</p><h1>${product.name}</h1><p>${product.description}</p>
          <dl><div><dt>Availability</dt><dd>For export enquiries</dd></div><div><dt>Minimum order quantity</dt><dd>Enquire for MOQ</dd></div><div><dt>Pricing &amp; packing</dt><dd>Discuss your requirements</dd></div></dl>
          <a class="turmeric-export-cta" href="contact.html?enquiry=${productKey}#contactForm">Enquire for MOQ →</a>
          <p class="turmeric-export-note">Tell us your destination, required quantity and packing preferences.</p>
        </div>
      </div>`;
  }
  const enquiryKey = params.get('enquiry');
  const enquiry = Object.hasOwn(products,enquiryKey) ? products[enquiryKey] : null;
  const subject = document.getElementById('contactSubject');
  const message = document.getElementById('contactMessage');
  if (enquiry && subject && message) {
    if (!subject.value) subject.value = `Export enquiry — ${enquiry.name} / MOQ`;
    if (!message.value) message.value = `I would like to enquire about export supply of ${enquiry.name}.\n\nDestination country:\nRequired quantity:\nPacking preference:\n\nPlease share the MOQ, availability and a quotation.`;
    const form=subject.closest('form');
    const submit=form?.querySelector('button[type="submit"]');
    if (form && submit) {
      submit.textContent='Open email enquiry →';
      const note=document.createElement('p');
      note.textContent='Your email app will open with your enquiry. Review and send it there.';
      note.style.cssText='font-size:.8rem;margin-top:12px;color:var(--color-text-muted)';
      submit.after(note);
      form.onsubmit=(event)=>{
        event.preventDefault();
        const name=document.getElementById('contactName').value;
        const email=document.getElementById('contactEmail').value;
        const body=`${message.value}\n\nName: ${name}\nEmail: ${email}`;
        location.href=`mailto:chaudharifarmproducts@gmail.com?subject=${encodeURIComponent(subject.value)}&body=${encodeURIComponent(body)}`;
      };
    }
  }
});
