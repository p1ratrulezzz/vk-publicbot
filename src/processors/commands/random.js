'use strict';

const COMMAND = 'random';

const random = require('../../modules/random/main').randomAsync;

/**
 *
 * @param app
 * @param bot Telegraf
 */
function register({app, bot}) {
  bot.command('/' + COMMAND, ({reply}) => {
    return reply(random(0, 512));
  });

  return Promise.resolve(app);
}

module.exports = {
  enabled: true,
  command: COMMAND,
  description: 'Get random number between range',
  help: 'Usage: /random min-max',
  register
}