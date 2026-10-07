(function(root){
  'use strict';
  const prefixes=['/assets/olympiad/tour1/','/assets/olympiad/tour2/','/assets/olympiad/tour3/','/assets/olympiad/tour4/','/assets/olympiad/tour5/photo-v4/','/assets/olympiad/tour5/service/','/assets/olympiad/story/layout-v2/scenes/'];
  function displayUrl(url,role='preview'){
    if(typeof url!=='string'||!prefixes.some(p=>url.startsWith(p))||!url.endsWith('.webp'))return url;
    return '/assets/olympiad/display-v1/'+role+url.slice('/assets/olympiad'.length);
  }
  function setImage(image,url,role='preview'){
    image.dataset.sourceUrl=url;image.decoding='async';
    image.addEventListener('error',()=>{if(image.getAttribute('src')!==url){image.hidden=false;image.src=url;}},{once:true});
    image.addEventListener('load',()=>{image.hidden=false;image.parentElement?.querySelectorAll('.t2-photo-missing,.t3-image-fallback,.t4-photo-missing').forEach(n=>n.hidden=true);});
    image.src=displayUrl(url,role);
  }
  root.RestaurantMedia={displayUrl,setImage};
})(window);
