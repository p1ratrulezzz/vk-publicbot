'use strict';

const COMMAND_ALIAS = 'alias';
const COMMAND_DELALIAS = 'delalias';

function register({app, bot}) {
  bot.command('/' + COMMAND_ALIAS, ({ from, reply, message }) => {
    let argText = message.text.substr(message.text.indexOf(' '));
    argText = argText.replace(/\s*/i, '');
    let nicknameReg = new RegExp('\@([^\s]+)', 'ig');
    let nickname = nicknameReg.exec(argText);
    let userId = from.id;
    let pGotUserId = Promise.resolve(userId);
    if (nickname !== null) {
      argText = argText.replace(nicknameReg, '');
      nickname = nickname[1];

      pGotUserId = new Promise((resolve, reject) => {
        // using the 'resolver'
        self.tgresolver.tgresolve('@kamikazechaser', function(error, result) {
          if (error === null) {
            resolve(result.id);
          }
          else {
            resolve(userId);
          }
        });
      });
    }

    return pGotUserId.then((userId) => {
      let names = argText.replace(/\s*,\s*/ig, ',').replace(/,,/ig, ',').split(',');

      aliasesDB.aliases[userId] = aliasesDB.aliases[userId] || {
        id: userId,
        aliases: []
      };

      names.forEach((value) => {
        let aliasClean = value.toLocaleLowerCase();
        if (aliasesDB.index[aliasClean] === undefined) {
          aliasesDB.aliases[userId].aliases.push(aliasClean);
          aliasesDB.index[aliasClean] = aliasesDB.aliases[from.id];
        }
      });

      mentionDBFile.push('/aliases/' + userId, aliasesDB.aliases[userId]);

      return reply('Your alias nicknames were set');
    });
  });

  bot.command(COMMAND_DELALIAS, ({ from, reply, message, match, contextState }) => {
    // let argText = message.text.substr(message.text.indexOf(' '));
    // argText = argText.replace(/\s*/i, '');
    // let names = argText.replace(/\s*,\s*/ig, ',').replace(/,,/ig, ',').split(',');
    //
    // aliasesDB.aliases[from.id] = aliasesDB.aliases[from.id] || {
    //   id: from.id,
    //   aliases: []
    // };

    if (aliasesDB.aliases[from.id] != null) {
      aliasesDB.aliases[from.id].aliases.forEach((value) => {
        if (aliasesDB.index[value] != null) {
          delete aliasesDB.index[value];
        }
      });
    }

    try {
      mentionDBFile.delete('/aliases/' + from.id);
    }
    catch (error) {
      logger.log(error);
    }

    return reply('Your alias nicknames were deleted');
  });

  app.addTextProcessor({
    process: (ctx) => {
      return ctx.reply('Usual message');
    }
  });

  return Promise.resolve(app);
  // Handle message update
  bot.on('text', (ctx) =>  {

    // // Check if it is not a command.
    // if (message.text == null || message.text.substr(0, 1) == '/') {
    //   return;
    // }

    let chatId = chat.id;

    for (let alias in aliasesDB.index) {
      let item = aliasesDB.index[alias];

      let reg = new RegExp('(' + RegExp.quote(alias)  + ') ?[,\.\?\!\)\(]', 'i');
      let result = reg.exec(message.text);
      if (result !== null) {
        let mentionMd = '[' + result[1] +'](tg://user?id=' + item.id +')';
        let modifiedText = message.text.replace(reg, mentionMd);

        return reply(mentionMd + ', you\'ve been mentioned', {
          parse_mode: 'Markdown',
          disable_notification: false
        })
        .catch((error) => {
          logger.log(error);
        });

        // return bot
        // .telegram
        // .editMessageText(chatId, message.id, null, modifiedText)
        // .catch((err) => {
        //   return reply(mentionMd + ', you\'ve been mentioned', {
        //     parse_mode: 'Markdown',
        //     disable_notification: false
        //   });
        // });
      }
    }

  });
}


module.exports = {
  enabled: false,
  command: COMMAND_ALIAS,
  register
}