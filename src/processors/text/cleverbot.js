'use strict';

const cleverbot = require('../../modules/cleverbot/main');
const cache = require('memory-cache');

function handle(response_message) {
  /**
   *
   * @type Application
   */
  let app = response_message.getApp();

  /**
   *
   * @type {string|*}
   */
  let bot = response_message.getBot();

  /**
   * @type VKMessage
   */
  let message = response_message.response_for;

  let cBotCid = 'cleverbot:' + bot.name + ':' + (message.from_id);
  let msgToBot = cache.get(cBotCid) || {};
  msgToBot.text = message.text.slice(0, 250);

  // Пытаемся получить ответ от cleverbot.com
  return cleverbot.send({
    user: app.config.cleverbot,
    message: msgToBot,
    params: {
      'asbotname': bot.name || null
    }
  }).then((cleverAns) => {
    if (cleverAns.state !== undefined) {
      cache.put(cBotCid, cleverAns);
    }

    response_message.text = cleverAns.response.trim();
    return response_message;
  });
}

module.exports = {
  handle
}