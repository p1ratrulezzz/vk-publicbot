'use strict';

const config = require('../config/config');
const Telegraf = require('telegraf');
const logger = require('winston');
const tgresolver = require("tg-resolve");
const TelegrafSessionRedis = require('telegraf-session-redis');
const getFilesInDir = require('./modules/list_dir/main');

// Apply quote method.
RegExp.quote = require("regexp-quote")

class Application {
  /**
   * @public
   */
  constructor () {
    logger.level = 'debug';
    logger.info('App instance created');

    /**
     * @type {Telegraf}
     */
    this.bot = '';

    this.tgresolver = '';

    this.commands = {};

    this.logger = logger;
    this.self = this;
    this.config = config;

    this.processors = {
      commands: this.commands,
      text: []
    }
  }

  addCommand (command) {
    let self = this;
    let pResult = Promise.resolve(this);
    if (command.enabled === true) {
      command.command = command.command || command.name;
      pResult = command.register({app, bot: this.bot}).then((app) => {
        self.commands[command.command] = command;

        return app;
      });
    }

    return pResult;
  }

  addTextProcessor(processor) {
    this.processors.text.push(processor);
  }

  /**
   * @protected
   */
  start() {
    let self = this;
    this.tgresolver = new tgresolver.Tgresolve(config.Token);
    let bot = this.bot = new Telegraf(config.Token);

    let session = new TelegrafSessionRedis(config.redis);

    bot.use(session.middleware());

    // // Collect self messages.
    // bot.telegram.sendMessageOriginal = bot.telegram.sendMessage;
    // bot.telegram.sendMessage = function(chatId, text, extra) {
    //   return this.sendMessageOriginal(chatId, text, extra).then((result) => {
    //     // messagesCollect.push(result);
    //     return result;
    //   });
    // }

    let pContinue = bot.telegram.getMe().then((botInfo) => {
      bot.options.username = botInfo.username;

      return app;
    });

    getFilesInDir('./src/processors/commands').forEach((value) => {
      pContinue = pContinue.then((app) => {
        return self.addCommand(value);
      });
    });

    pContinue.then((app) => {
      // Add text processors.
      bot.on('text', (ctx) => {
        let pContinue = Promise.resolve(ctx);
        this.processors.text.forEach((processor) => {
          pContinue = pContinue.then((context) => {
            return processor.process(ctx);
          });
        });

        return pContinue;
      });
    });

    return pContinue.then((app) => {
      bot.startPolling();

      return app;
    });

    // bot.command('gc', ({ from, reply, message }) => {
    //   messagesCollect.forEach((value, index) => {
    //     bot.telegram.deleteMessage(message.chat.id, value.message_id);
    //   });
    //
    //   return reply('Deleted');
    // });

    // bot.command('mention', ({ from, reply, message }) => {
    //   return reply('[' + from.first_name + '](tg://user?id=' + from.id + '), you\'ve been mentioned', {
    //     parse_mode: 'Markdown'
    //   });
    // });


  }

  stop() {
    this.bot.stop();
  }

  shutdown() {
    process.shutdown();
  }
}

let app = new Application();
app
.start()
.then((app) => {
  app.logger.info('Application started');
})
.catch((err) => {
  logger.log(err);
});


/**
 * Debugging on app stop.
 */
process.on('SIGINT', () => {
  app.stop();
  logger.info('= SIGINT received. Saving data and shutting down.');

  process.exit(0);
});