import { BACKEND_URL } from './config.js';

(function(){
  // Set backend link for UDID profile
  const udidLink=document.querySelector('#get-udid');
  if(udidLink){ udidLink.href=`${BACKEND_URL}/profile.php`; }

  // Auto-fill UDID from query
  const p=new URLSearchParams(location.search);
  const udid=p.get('udid');
  if(udid){
    const targets=[document.querySelector('#udid'), document.querySelector('#udid2')].filter(Boolean);
    targets.forEach(i=>{ i.value=udid; i.readOnly=true; i.classList.add('filled'); });
    const getBtn=document.querySelector('.btn[href*="get-udid"]');
    if(getBtn){ getBtn.style.display='none'; }
    const got=document.querySelector('#udidStatus');
    if(got){
      got.textContent='تم جلب رقم UDID تلقائيًا ✅';
      got.classList.remove('hidden');
      got.classList.add('message','success');
    }
  }
  // Smooth scroll for anchors
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', e=>{
      const id=a.getAttribute('href');
      const el=document.querySelector(id);
      if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth'}); }
    });
  });

  // Quick purchase form
  const form=document.getElementById('quick-form');
  if(form){
    const email=form.querySelector('#email');
    const udidInput=form.querySelector('#udid');
    const token=form.querySelector('#token');
    const method=form.querySelector('#method');

    [email, udidInput, token, method].forEach(el=>{
      const v=localStorage.getItem(el.id);
      if(v){ el.value=v; }
    });

    const validateEmail=()=>{
      const v=email.value.trim();
      email.setCustomValidity(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)?'':'البريد غير صحيح');
    };
    const validateUdid=()=>{
      const v=udidInput.value.trim().replace(/[^a-fA-F0-9]/g,'').toUpperCase();
      udidInput.value=v;
      udidInput.setCustomValidity(/^[A-F0-9]{24,40}$/.test(v)?'' : 'رقم UDID غير صالح');
    };
    const validateToken=()=>{
      const v=token.value.trim();
      token.setCustomValidity(v ? '' : 'الرمز مطلوب');
    };

    email.addEventListener('input', ()=>{ validateEmail(); localStorage.setItem('email', email.value); });
    udidInput.addEventListener('input', ()=>{ validateUdid(); localStorage.setItem('udid', udidInput.value); });
    token.addEventListener('input', ()=>{ validateToken(); localStorage.setItem('token', token.value); });
    method.addEventListener('change', ()=>{ localStorage.setItem('method', method.value); });

    form.addEventListener('submit', async e=>{
      e.preventDefault();
      validateEmail();
      validateUdid();
      validateToken();
      if(form.checkValidity()){
        const emailVal=email.value.trim();
        const udidVal=udidInput.value.trim();
        const methodVal=method.value;
        localStorage.setItem('email', emailVal);
        localStorage.setItem('udid', udidVal);
        localStorage.setItem('token', token.value);
        localStorage.setItem('method', methodVal);
        try{
          const res=await fetch(`${BACKEND_URL}/paymob/create`,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({email:emailVal, udid:udidVal, method:methodVal})
          });
          const data=await res.json();
          if(data.iframeUrl){
            const overlay=document.createElement('div');
            overlay.style.position='fixed';
            overlay.style.inset='0';
            overlay.style.background='rgba(0,0,0,0.8)';
            overlay.style.display='flex';
            overlay.style.alignItems='center';
            overlay.style.justifyContent='center';
            const box=document.createElement('div');
            box.style.width='100%';
            box.style.maxWidth='480px';
            box.style.background='#fff';
            box.style.borderRadius='8px';
            box.style.padding='16px';
            const iframe=document.createElement('iframe');
            iframe.src=data.iframeUrl;
            iframe.style.width='100%';
            iframe.style.height='400px';
            iframe.style.border='0';
            const btn=document.createElement('button');
            btn.textContent='إكمال الطلب';
            btn.className='btn mt-12';
            btn.addEventListener('click',()=>{
              location.href=`success.html?email=${encodeURIComponent(emailVal)}&udid=${encodeURIComponent(udidVal)}`;
            });
            box.appendChild(iframe);
            box.appendChild(btn);
            overlay.appendChild(box);
            document.body.appendChild(overlay);
          }else{
            location.href=`fail.html?email=${encodeURIComponent(emailVal)}&udid=${encodeURIComponent(udidVal)}`;
          }
        }catch(err){
          location.href=`fail.html?email=${encodeURIComponent(emailVal)}&udid=${encodeURIComponent(udidVal)}`;
        }
      }else{
        form.reportValidity();
      }
    });
  }
})();
