const svgIcon = (name, className = 'icon') => `<svg class="${className}" aria-hidden="true"><use href="./icons.svg#${name}"/></svg>`;
const screen = new URLSearchParams(location.search).get('screen');
if(screen==='bill'||screen==='record')document.documentElement.dataset.screen=screen;
const icons = [['food','餐饮'],['coffee','咖啡'],['transit','交通'],['shopping','购物'],['home','居家'],['health','医疗'],['fun','娱乐'],['pet','宠物'],['salary','收入'],['receipt','账单'],['pending','待入账'],['budget','预算'],['dog','小狗'],['plus','新增'],['calendar','日期'],['backspace','退格']];
document.getElementById('icon-grid').innerHTML = icons.map(([id,label])=>`<div class="icon-sample">${svgIcon(id)}<span>${label}</span></div>`).join('');
let kind = 'expense';
let amount = '32.00';
let replaceAmount = true;
let selectedCategory = 'food';
const sets = {expense:[['food','餐饮'],['transit','交通'],['shopping','购物'],['pet','宠物']],income:[['salary','工资'],['receipt','项目款'],['pending','报销'],['plus','其他']]};
function renderCategories(){
  document.getElementById('category-picker').innerHTML = sets[kind].map(([id,label])=>`<button type="button" class="category-choice" aria-pressed="${id===selectedCategory}" data-category="${id}">${svgIcon(id)}<span>${label}</span></button>`).join('');
}
renderCategories();
document.getElementById('category-picker').addEventListener('click',event=>{
  const button = event.target.closest('[data-category]');
  if(!button)return;
  selectedCategory=button.dataset.category;
  document.querySelectorAll('[data-category]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
});
document.querySelectorAll('[data-kind]').forEach(button=>button.addEventListener('click',()=>{
  kind=button.dataset.kind;
  document.querySelectorAll('[data-kind]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  document.getElementById('amount-caption').textContent=kind==='income'?'今天收到了多少？':'今天花了多少？';
  selectedCategory=sets[kind][0][0];renderCategories();
}));
function renderAmount(){document.getElementById('amount').textContent=amount||'0';document.getElementById('save-demo').disabled=Number(amount)<=0;}
document.querySelectorAll('[data-key]').forEach(button=>button.addEventListener('click',()=>{
  const key=button.dataset.key;
  if(key==='delete'){amount=replaceAmount?'':amount.slice(0,-1);replaceAmount=false;}
  else{if(replaceAmount){amount='';replaceAmount=false;}if(key==='.'&&!amount.includes('.'))amount=(amount||'0')+'.';else if(key!=='.'){const candidate=amount+key;const [integer,decimal='']=candidate.split('.');if(integer.length<=7&&decimal.length<=2)amount=candidate.replace(/^0+(?=\d)/,'');}}
  renderAmount();
}));
let toastTimer;
function toast(text){const node=document.getElementById('demo-toast');node.textContent=text;node.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{node.hidden=true;},3000);}
document.getElementById('save-demo').addEventListener('click',()=>{if(Number(amount)<=0)return;toast(`已演示记账 ¥${Number(amount).toFixed(2)} · 不写入真实账本`);amount='';replaceAmount=true;renderAmount();});
document.getElementById('date-button').addEventListener('click',()=>toast('当前为视觉样稿，日期选择沿用现有功能。'));
document.querySelectorAll('[data-demo-nav]').forEach(button=>button.addEventListener('click',()=>{
  const destination=button.dataset.demoNav;
  if(destination==='record'){if(screen){location.search='?screen=record';return;}document.getElementById('record-phone').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});return;}
  if(destination==='overview'){if(screen){location.search='?screen=bill';return;}document.querySelector('.overview').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});return;}
  toast('这一轮先确认账单与记账两页的视觉方向。');
}));
document.querySelectorAll('[data-size]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-size]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  const grid=document.getElementById('icon-grid');grid.style.setProperty('--sample-size',`${button.dataset.size}px`);grid.classList.toggle('large',button.dataset.size==='48');
}));
