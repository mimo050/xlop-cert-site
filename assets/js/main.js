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
      const v=udidInput.value.trim();
      udidInput.setCustomValidity(v.startsWith('000') && v.length===40 ? '' : 'رقم UDID غير صالح');
    };
    const validateToken=()=>{
      const v=token.value.trim();
      token.setCustomValidity(v ? '' : 'الرمز مطلوب');
    };

    email.addEventListener('input', ()=>{ validateEmail(); localStorage.setItem('email', email.value); });
    udidInput.addEventListener('input', ()=>{ validateUdid(); localStorage.setItem('udid', udidInput.value); });
    token.addEventListener('input', ()=>{ validateToken(); localStorage.setItem('token', token.value); });
    method.addEventListener('change', ()=>{ localStorage.setItem('method', method.value); });

    form.addEventListener('submit', e=>{
      e.preventDefault();
      validateEmail();
      validateUdid();
      validateToken();
      if(form.checkValidity()){
        const params=new URLSearchParams({email:email.value.trim(), udid:udidInput.value.trim(), token:token.value.trim(), method:method.value});
        localStorage.setItem('email', email.value);
        localStorage.setItem('udid', udidInput.value);
        localStorage.setItem('token', token.value);
        localStorage.setItem('method', method.value);
        location.href=`purchase.html?${params.toString()}`;
      }else{
        form.reportValidity();
      }
    });
  }
})();
