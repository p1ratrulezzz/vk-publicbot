'use strict';

const random = require('../../modules/random/main').randomAsync;

function handle({app, bot}) {
  bot.command('/' + COMMAND, ({reply}) => {
    return reply(random(0, 512));
  });

  return Promise.resolve(app);
}

module.exports = {
  enabled: true,
  aliases: ['рандом', 'случайно', 'rnd', 'rand'],
  cmd: 'random',
  description: 'Get random number between range',
  help: 'Usage: /random min-max',
  handle
}