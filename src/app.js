'use strict';

const config = require('../config/config');
const logger = require('winston');
const getFilesInDir = require('./modules/list_dir/main');
const VKApi = require('node-vkapi');
const prequest = require('request-promise');

// Apply quote method.
RegExp.quote = require("regexp-quote")

const VK_EVENT_TYPE = 0;
const VK_EVENT_NEWMESSAGE = 4;

class Application {
  /**
   * @public
   */
  constructor () {
    logger.level = 'debug';
    logger.info('App instance created');

    this.bot = '';

    this.tgresolver = '';

    this.commands = {};

    this.logger = logger;
    this.self = this;
    this.config = config;

    this.bots = {};

    for (let bot_id in this.config.bots) {
      this.bots[bot_id] = {
        bot: null,
        config: this.config.bots[bot_id]
      };
    }

    this.processors = {
      commands: this.commands,
      text: []
    }
  }

  addCommand (command) {
    let app = this;
    if (command.enabled === true) {
      // @fixme: Command.command is deprecated.
      command.cmd = command.cmd || command.name;
      command.aliases = command.aliases || [];
      command.aliases.push(command.name);

      // Add commands to list.
      command.aliases.forEach((value) => {
        app.commands[value] = command;
      });
    }

    return Promise.resolve(app);
  }

  addTextProcessor(processor) {
    this.processors.text.push(processor);
  }

  createBot(bot_config) {
    let app = this;
    let pBot = Promise.resolve(app);
    pBot.then((app) => {
      let bot = {
        api: new VKApi({
          token: bot_config.token,
          apiVersion: app.config.vk.version
        }),
        name: bot_config.name
      }

      app.bots[bot_config.id] = bot;

      function poll(bot, {server, key, ts}) {
        let url = 'https://' + server;
        return prequest({
          url: url,
          json: true,
          qs: {
            act: 'a_check',
            key: key,
            ts: ts,
            wait: 25,
            version: 2,
            mode: 2 + 8 + 64
          }
        }).then((response) => {
          let pNext = Promise.resolve({});
          if (response.updates != null && response.updates[0] != null) {
            app.logger.info('Got updates');
            app.handleUpdates(bot, response.updates);
          }
          else {
            app.logger.info('Timeout reached. Polling again');
          }

          return poll(bot, {
            server: server,
            key: key,
            ts: response.ts
          });
        }).catch((err) => {
          return poll(bot, {
            server: server,
            key: key,
            ts: response.ts
          });
        });
      }

      bot.api.call('messages.getLongPollServer')
      .then((response) => {
        app.logger.info('Polling started');
        return poll(bot, response);
      }).catch((err) => {
        app.logger.error(err);
      })
    });

    return pBot;
  }

  replyMessage(bot, message) {
    return bot.api.call('messages.setActivity', {
      user_id: message.response_for.from_id,
      type: 'typing'
    }).then((response) => {
      let message_options = {
        message: message.text
      };

      // @fixme: Handle dialogs.
      // @todo: Handle attachments.
      message_options.user_id = message.response_for.from_id;

      return bot.api.call('messages.send', message_options);
    });
  }

  handleMessage(bot, message) {
    let app = this;

    return this.replyMessage(bot, {
      text: 'Привет. Я бот, но я ничего еще не умею, потому что меня не доделали :(. Возвращайтесь совсем скоро, возможно, меня к тому времени допилят. Но это не точно.',
      response_for: message
    });
  }

  handleUpdates(bot, updates) {
    let app = this;
    updates.forEach((update) => {
      // app.logger.info('Got update with code ' + update[VK_EVENT_TYPE]);
      // If message is not the one sent by bot.
      if (update[VK_EVENT_TYPE] == VK_EVENT_NEWMESSAGE) {
        let message = {
          from_id: update[3],
          flags: update[2],
          peer_id: update[3],
          timestamp: update[4],
          msg_id: update[1],
          text: update[5],
          attachments: update[6],
          extra: {
            bot: bot,
            app: app
          },
        };

        // Only handle messages got from other users, not bot's own.
        if ((message.flags & 2) === 0 && (message.flags & 1) !== 0) {
          app.handleMessage(bot, message);
        }
      }
    });
  }

  /**
   * @protected
   */
  start() {
    let app = this;

    let pContinue = Promise.resolve(app);

    pContinue = pContinue.then((app) => {
      // Reading all commands in chain.
      getFilesInDir('src/processors/commands').forEach((value) => {
        app.logger.info('Got commands');
        pContinue = pContinue.then((app) => {
          return app.addCommand(value);
        });
      });
    });

    // Reading all text processors in chain.
    // pContinue.then((app) => {
    //   // Add text processors.
    //   bot.on('text', (ctx) => {
    //     let pContinue = Promise.resolve(ctx);
    //     this.processors.text.forEach((processor) => {
    //       pContinue = pContinue.then((context) => {
    //         return processor.process(ctx);
    //       });
    //     });
    //
    //     return pContinue;
    //   });
    // });

    pContinue = pContinue.then(() => {
      // Creating and starting bots.
      for (let bot_id in this.bots) {
        this.bots[bot_id].promise = app.createBot(Object.assign({id: bot_id}, this.bots[bot_id].config));
      }

      return app;
    });


    return pContinue;
  }

  stop() {
    // this.bot.stop();
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
  app.shutdown();
});


/**
 * Debugging on app stop.
 */
process.on('SIGINT', () => {
  app.stop();
  logger.info('= SIGINT received. Saving data and shutting down.');

  process.exit(0);
});