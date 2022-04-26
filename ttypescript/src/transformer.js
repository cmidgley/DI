const { di } = require("@cmidgley/di-compiler");
const transformer = (program) => di({ program });
module.exports = transformer;
