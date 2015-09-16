var Rx = require('rx');
var Imm = require('immutable');

var start = Imm.fromJS({content: 'shane', id: 'aww yeah'});

var rec = Imm.Record({content: '', id: ''});

console.log(new rec({content: '', another: 'hey there'}));