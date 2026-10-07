(function(root){
  'use strict';
  const poses={T1:'album',T2:'map',T3:'notes',T4:'orders',T5:'table'};
  function forQuestion(q){return q.dialogue||{key:q.id,version:1,pose:poses[q.tourCode]||'table',line:'Продолжим наш вечер. Прочитайте условие и сохраните свой ответ.',student:'Продолжаем?',extra:'Да, следующая запись уже ждёт в альбоме.'};}
  root.StoryDialogue={forQuestion};
})(window);
