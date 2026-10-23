(function(){
  'use strict';
  const form=document.getElementById('contact-form');
  if(!form)return;
  const $=id=>document.getElementById(id);
  const types=form.querySelectorAll('input[name="kind"]');
  let pending=false;
  function activeKind(){return form.querySelector('input[name="kind"]:checked').value;}
  function setMode(){
    const doc=activeKind()==='document';
    $('document-fields').hidden=!doc;$('service-fields').hidden=doc;
    for(const input of $('document-fields').querySelectorAll('input,textarea,select'))input.disabled=!doc;
    for(const input of $('service-fields').querySelectorAll('input,textarea,select'))input.disabled=doc;
    $('contact-reference').required=doc;$('contact-doc-details').required=doc;$('contact-service').required=!doc;
    $('contact-message-label').textContent=doc?'Your question *':'Project details / requested work *';
    $('contact-message').placeholder=doc?'What would you like to know about this document?':'Describe the product or equipment, production site, market and work you need.';
  }
  types.forEach(x=>x.addEventListener('change',setMode));
  const params=new URLSearchParams(location.search);
  if(params.get('type')==='service')form.querySelector('[name="kind"][value="service"]').checked=true;
  if(params.get('type')==='document')form.querySelector('[name="kind"][value="document"]').checked=true;
  const ref=params.get('number');if(ref&&ref.length<=100)$('contact-reference').value=ref;
  setMode();
  function output(title,text,error=false){
    const panel=$('contact-result');panel.className='verify-result show '+(error?'error':'found');
    panel.replaceChildren();const h=document.createElement('div');h.className='result-title';h.textContent=title;
    const p=document.createElement('p');p.className='small-note';p.textContent=text;panel.append(h,p);
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(pending || !form.reportValidity())return;
    const kind=activeKind();
    const payload={
      kind,name:$('contact-name').value,email:$('contact-email').value,company:$('contact-company').value,
      reference:kind==='document'?$('contact-reference').value:'',
      documentDetails:kind==='document'?$('contact-doc-details').value:'',
      service:kind==='service'?$('contact-service').value:'',
      whatsapp:kind==='service'?$('contact-whatsapp').value:'',
      wechat:kind==='service'?$('contact-wechat').value:'',
      telegram:kind==='service'?$('contact-telegram').value:'',
      message:$('contact-message').value,omegaExtra:$('contact-trap').value,
      acceptPrivacy:$('contact-privacy').checked
    };
    // Enable when optional Turnstile is configured. The secret is never embedded here.
    if(window.turnstile && typeof window.turnstile.getResponse==='function'){
      payload.turnstileToken=window.turnstile.getResponse();
    }
    pending=true;const submit=$('contact-submit');submit.disabled=true;submit.textContent='Sending…';
    try{
      const res=await fetch('/api/contact',{method:'POST',credentials:'omit',cache:'no-store',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});
      let data;try{data=await res.json();}catch{throw Error('Unable to process your request at this time.');}
      if(!res.ok || !data.accepted)throw Error(data.error||'Unable to send your inquiry.');
      // An actual inquiry must have a uniquely issued server-side Q- reference.
      if(typeof data.reference !== 'string' || !/^Q-[A-Z0-9]{8}-[A-Z0-9]+$/.test(data.reference)) {
        throw Error('Your message could not be confirmed. Please try again.');
      }
      output('Inquiry received','Thank you. Your reference is '+data.reference+'. We will review your message and reply using the email address you provided.');
      form.reset();setMode();if(window.turnstile?.reset)window.turnstile.reset();
    }catch(e){output('Inquiry not sent',e.message||'Please try again later.',true);if(window.turnstile?.reset)window.turnstile.reset();}
    finally{pending=false;submit.disabled=false;submit.textContent='Send inquiry';}
  });
})();
