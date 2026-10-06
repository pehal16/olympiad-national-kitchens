// Private marking keys; the participant receives only the current fixed dish.
const release = require('../../src/t5-photo-release.json');
const required = {
  pizza:['Тесто для пиццы','Томаты и оливковое масло','Моцарелла','Базилик'],
  greek:['Томаты и огурец','Красный лук и оливки','Фета','Оливковое масло и орегано'],
  roll:['Рис и нори','Сливочный сыр','Огурец','Лосось']
};
module.exports=release.map((dish,index)=>({
  id:'t5-photo-'+(index+1),sourceId:'t5-photo-'+(index+1),type:'final_kitchen',presentationVersion:4,guestServiceEnabled:true,maxScore:16,
  station:{number:index+1,title:dish.title},prompt:'Выберите четыре компонента для заявленной версии блюда, выполните сборку и подайте блюдо гостю.',
  cuisine:'mixed',cuisineGroup:'general',dishKey:'t5-photo-'+dish.photo.kind,
  dishes:[{...dish,dishId:{pizza:'margherita_pizza',greek:'greek_salad',roll:'philadelphia_roll'}[dish.photo.kind],correctIngredientIds:dish.items.filter(item=>required[dish.photo.kind].includes(item.text)).map(item=>item.id)}]
}));
