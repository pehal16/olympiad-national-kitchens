(function(root){
  'use strict';
  // Geographical display only. No dish associations or marking keys.
  const locations={it:[12.5,42.8],fr:[2.2,46.5],at:[14.5,47.6],gb:[-2,54],jp:[138,37],kr:[128,36],vn:[106,16],th:[101,15],pt:[-8,39.5],es:[-4,40],be:[4.5,50.5],ru:[60,58],cn:[104,35],ge:[43.5,42],hu:[19,47],us:[-98,39],mx:[-102,24]};
  const project=([lon,lat])=>[(lon+180)/360*1000,(85-lat)/145*500];
  const slots=[[220,95],[780,95],[220,390],[780,390]];
  function coordinates(country){const code=(country.flagUrl||'').match(/\/([a-z]{2})\.svg$/)?.[1];return locations[code]?project(locations[code]):[500,250];}
  function layout(countries,tall=false){
    const labels=tall?[[220,240],[780,240],[220,960],[780,960]]:slots;
    const points=countries.map(c=>{const p=coordinates(c);return [p[0],p[1]+(tall?350:0)];});let best=null,cost=Infinity;
    function visit(order,remaining){if(!remaining.length){const score=order.reduce((sum,slot,i)=>sum+Math.hypot(points[i][0]-labels[slot][0],points[i][1]-labels[slot][1]),0);if(score<cost){cost=score;best=order;}return;}remaining.forEach(s=>visit([...order,s],remaining.filter(r=>r!==s)));}
    visit([],labels.map((_,i)=>i));return countries.map((country,i)=>({country,point:points[i],label:labels[best[i]]}));
  }
  function attach(board,countries){
    const doc=board.ownerDocument,ns='http://www.w3.org/2000/svg';board.classList.add('t2-atlas-board');
    const map=doc.createElement('img');map.src='/assets/olympiad/story/layout-v3/world-land.svg';map.alt='Карта мира: расположение стран текущего задания';map.className='t2-atlas-world';map.draggable=false;map.addEventListener('error',()=>{map.hidden=true;});
    const routes=doc.createElementNS(ns,'svg');routes.classList.add('t2-atlas-routes');routes.setAttribute('aria-hidden','true');
    board.prepend(map,routes);
    const mobile=doc.defaultView.matchMedia('(max-width:767px)');
    function render(){const height=mobile.matches?1200:500;routes.setAttribute('viewBox',`0 0 1000 ${height}`);routes.replaceChildren();
    for(const {country,point,label} of layout(countries,mobile.matches)){
      const zone=[...board.querySelectorAll('.t2-country')].find(n=>n.dataset.countryId===country.id);if(!zone)continue;
      zone.style.setProperty('--atlas-x',label[0]/10+'%');zone.style.setProperty('--atlas-y',label[1]/height*100+'%');
      const line=doc.createElementNS(ns,'path');line.setAttribute('d',`M${point.join(' ')} L${label.join(' ')}`);routes.append(line);
      const dot=doc.createElementNS(ns,'circle');dot.setAttribute('cx',point[0]);dot.setAttribute('cy',point[1]);dot.setAttribute('r','7');dot.addEventListener('click',()=>zone.querySelector('.t2-target').click());routes.append(dot);
    }}render();mobile.addEventListener('change',render);return ()=>mobile.removeEventListener('change',render);
  }
  const api={attach,coordinates,layout};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RestaurantAtlas=api;
})(typeof window!=='undefined'?window:globalThis);
