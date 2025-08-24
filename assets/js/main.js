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
      got.textContent='تم جلب UDID تلقائيًا ✅';
      got.style.display='block';
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
})();
