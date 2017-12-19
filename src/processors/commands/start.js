'use strict';

const COMMAND = 'start';

/**
 *
 * @param app
 * @param bot
 */
function register({app, bot}) {
  bot.command(COMMAND, ({reply}) => {
    return reply('Hello. And fuck you.');
  });

  return Promise.resolve(app);
}

module.exports = {
  enabled: true,
  command: COMMAND,
  description: 'Start command',
  help: 'Are you so stupid to ask?',
  register
}