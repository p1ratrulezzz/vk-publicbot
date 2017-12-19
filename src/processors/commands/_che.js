'use strict';

const COMMAND = 'che';
const VKPublicSearcher = require('../../modules/vk_public_search/main');
const vkapi = require('node-vkapi');

/**
 * Local constants
 * @private
 */
const PUBLIC_INFO = {
  //id: -123, // id has priority
  domain: '21jqofa'
};

/**
 *
 * @param app
 * @param bot
 */
function register({app, bot}) {
  // @fixme: To config
  let vk = new vkapi(app.config.vk);

  return vk.call('account.getInfo').then((response) => {
    bot.command(COMMAND, ({from, reply, message}) => {
      let argText = message.text.substr(message.text.indexOf(' '));
      argText = argText.replace(/\s*/i, '');

      return VKPublicSearcher
      .parseCommand(argText, vk, PUBLIC_INFO)
      .then((data) => {
        let post = data.attachments_raw[0];
        let linkMD = '[Че:](https://vk.com/' + data.attachments[0] + ')';

        if (post.text != null && post.attachments === undefined) {
          return reply(linkMD + "\n" + post.text , {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
          });
        }
        else {
          return reply(linkMD, {
            parse_mode: 'Markdown'
          });
        }
      })
      .catch((err) => {
        return reply('Error: ' + err);
      });
    });

    return app;
  })
  .catch((err) => {
    bot.command(COMMAND, ({ctx}) => {
      return reply('This command doesnt work. Contact developer/admin');
    });

    return app;
  });
}

module.exports = {
  enabled: true,
  command: COMMAND,
  description: 'Выдает случайный пост с паблика "че" https://vk.com/21jqofa. Если не задан второй параметр,' +
  ' по умолчанию ищет среди самых новых записей (новее).',
  help:         '/che [-п строка_поиска] [-н индекс_начала_поиска] [-к количество_элементов] [новее|новое|старое|старейшее]',
  register
}