const { test } = require('./util');
const { createServer } = require('./createServer');

function main() {
  createServer();
  test();
}
