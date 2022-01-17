const testAddon = require('./build/Release/testaddon.node');
console.log(testAddon.hello());
console.log(testAddon.add(12,15));

const classInstance = new testAddon.ClassExample(4.3);
const valueToAdd = 3;
console.log(`Testing classInstance value: ${ classInstance.getValue() }`);
console.log(`After adding ${ valueToAdd }: ${ classInstance.add(valueToAdd) }`);

const newFromExisting = new testAddon.ClassExample(classInstance);
console.log("Testing class initial value for derived instance");
console.log(newFromExisting.getValue());

module.exports = testAddon;
