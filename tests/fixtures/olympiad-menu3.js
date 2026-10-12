'use strict';
const old=structuredClone(require('../../data/olympiad'));
old.questionBank.tour2Blocks=require('../../data/banks/tour2-v1');
old.questionBank.tour3Matrices=require('../../data/banks/tour3-v1');
old.questionBank.tour4Tasks=require('../../data/banks/tour4-menu-v3');
module.exports=old;
