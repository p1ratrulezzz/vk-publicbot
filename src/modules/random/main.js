'use strict';

/**
 * Module dependencies.
 * @private
 */
const MultiRandom = require('multi-random');


function randomSync(min, max) {
  return randomCore('sync', min, max);
}

function randomAsync(min, max) {
  return randomCore('async', min, max);
}

function randomDefault(min, max) {
  return Math.round(Math.random() * (max - min)) + min;
}

function randomCore(type, min, max) {
  let randoms = {};
  let randId = 'random-bot-shared';
  randoms.sync = new MultiRandom({
    plugin: 'app-incredible-trng',
    pluginOptions: {
      poolSize: 16
    },
    id: randId,
    blockingRand: true
  });

  randoms.async = new MultiRandom({
    plugin: 'app-incredible-trng',
    pluginOptions: {
      poolSize: 512
    },
    id: randId,
    blockingRand: false
  });

  if (randoms[type] !== undefined) {
    return randoms[type].random(min, max);
  }

  return randomDefault(min, max);
}

module.exports.randomSync = randomSync;
module.exports.randomAsync = randomAsync;
module.exports.random = randomAsync;
