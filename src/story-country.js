'use strict';
const names={fr:'Франция',jp:'Япония',ge:'Грузия',mx:'Мексика',th:'Таиланд',it:'Италия',uz:'Узбекистан',es:'Испания',us:'США',ru:'Россия',by:'Беларусь',il:'Израиль',lb:'Ливан',at:'Австрия',gr:'Греция',ua:'Украина',pl:'Польша'};
const photoTrips={'T1-A01':'fr','T1-A02':'jp','T1-A03':'ge','T1-A04':'mx','T1-A05':'th','T1-A06':'it','T1-A07':'jp','T1-A08':'uz','T1-A09':'es','T1-A10':'us'};
const dishes={syrniki:'ru',draniki:'by',shakshuka:'il',samsa:'uz',hummus:'lb',apple_strudel:'at',cheesecake:'us',beef_stroganoff:'ru',guacamole:'mx',solyanka:'ru',borsch:'ua',vinaigrette_t4_v3:'ru',chakhokhbili_t4_v3:'ge',beef_roast_t4_v3:'ru',zander_polish_t4_v3:'pl',ricotta_ravioli:'it',thin_blini:'ru',medovik_t4_v3:'ru',margherita_pizza:'it',greek_salad:'gr',philadelphia_roll:'us'};
function countryFor(question,plate){
 if(question.type==='bucket_sort'){
  const bucket=question.buckets.find(b=>b.id===question.correctBuckets[plate.itemId]);
  const code=bucket?.flagUrl?.match(/\/flags\/([a-z]{2})\.svg$/)?.[1];
  return code?{code,name:bucket.label,flagUrl:bucket.flagUrl,context:'Пункт гастрономического маршрута'}:null;
 }
 const note=question.type==='dish_detective'?question.scenario?.match(/Страница блокнота: ([^.]+)\./)?.[1]:null;
 const code=note?Object.keys(names).find(code=>names[code]===note):question.tourCode==='T1'?photoTrips[question.sourceId]:dishes[plate.dishId];
 if(!code)return null;
 let context=question.tourCode==='T1'||note?'Страна поездки нашего гостя':'Кухня, с которой связано блюдо';
 if(plate.dishId==='philadelphia_roll')context='Американская адаптация японских роллов с лососем и сливочным сыром';
 if(plate.dishId==='zander_polish_t4_v3')context='Польский соус · ресторанная версия подачи';
 return {code,name:names[code],flagUrl:'/assets/olympiad/flags/'+code+'.svg',context};
}
module.exports={countryFor};
