'use strict';

const random = require('../../modules/random/main').randomAsync;

function handle(response_message) {
  response_message.text = random(0, 512);

  return Promise.resolve(response_message);
}

module.exports = {
  enabled: true,
  aliases: ['рандом', 'случайно', 'rnd', 'rand'],
  cmd: 'random',
  description: 'Get random number between range',
  help: 'Usage: /random min-max',
  handle
}