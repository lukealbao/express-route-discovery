'use strict';

const RouteTree = require('./lib/tree');

const memo = new Map();

module.exports = function factory(server, flushCache = false) {
  if (flushCache || !memo.has(server)) {
    memo.set(server, new RouteTree(server));
  }

  return memo.get(server);
};
