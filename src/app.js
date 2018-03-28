'use strict';

const config = require('../config/config');
const logger = require('winston');
const getFilesInDir = require('./modules/list_dir/main');
const VKApi = require('node-vkapi');
const prequest = require('request-promise');
const Queue = require('better-queue');
const VKMessage = require('./VKMessage');
const VKBot = require('./VKBot');
const CleverbotCommand = require('./processors/text/cleverbot');

// Apply quote method.
RegExp.quote = require("regexp-quote")

const VK_EVENT_TYPE = 0;
const VK_EVENT_NEWMESSAGE = 4;

class Application {
  /**
   * @public
   */
  constructor () {
    let app = this;

    logger.level = 'debug';
    logger.info('App instance created');

    this.commands = {};

    this.logger = logger;
    this.config = config;

    this.bots = {};

    for (let bot_id in this.config.bots) {
      this.bots[bot_id] = {
        config: this.config.bots[bot_id]
      };
    }

    this.processors = {
      commands: this.commands,
      text: []
    }

    let queue_options = {
      maxRetries: 3,
      retryDelay: 5000,
      concurrent: 3
      // maxTimeout: 15000
    };

    this.queue_inbox = new Queue((job, done) => {
      app.handleInboxMessage(job.message).then((result) => {
        done(null, result);
      }).catch((err) => {
        app.logger.error(error);
        throw new Error();
      });
    }, queue_options);

    this.queue_outbox = new Queue((job, done) => {
      app.handleOutboxMessage(job.message).then((result) => {
        done(null, result);
      }).catch((err) => {
        app.logger.error(error);
        throw new Error();
      });
    }, queue_options);
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
    let bot = new VKBot();
    let app = this;

    // @fixme: method
    bot['_app'] = app;
    bot['_config'] = bot;

    let pBot = Promise.resolve(app);
    pBot.then((app) => {
      bot.api = new VKApi({
        token: bot_config.token,
        apiVersion: app.config.vk.version
      });

      bot.name = bot_config.name;

      // app.bots[bot_config.id] = bot;

      function poll(bot, pollInfo = {}) {
        if (pollInfo.server === undefined) {
          return bot.api.call('messages.getLongPollServer')
          .then((response) => {
            app.logger.info('Got new polling server');
            return poll(bot, response);
          });
        }

        app.logger.info('Polling started');
        let url = 'https://' + pollInfo.server;
        return prequest({
          url: url,
          json: true,
          qs: {
            act: 'a_check',
            key: pollInfo.key,
            ts: pollInfo.ts,
            wait: 25,
            version: 2,
            mode: 2 + 8 + 64
          }
        }).then((response) => {
          if (response.failed && response.failed !== 1) {
            app.logger.info('+ Longpolling failed. Trying to update connection');
            return poll(bot);
          }

          if (response.updates != null && response.updates[0] != null) {
            app.logger.info('Got updates');
            app.handleUpdates(bot, response.updates);
          }
          else {
            app.logger.info('Timeout reached. Polling again');
          }

          // Try normal poll.
          return poll(bot, {
            server: pollInfo.server,
            key: pollInfo.key,
            ts: response.ts
          });
        }).catch((err) => {
          app.logger.error(err);
          app.shutdown();
        });
      }

      // Start poll requests after processing unread messages
      return bot.beforePoll().then(({err, result}) => {
        return poll(bot);
      });
    });

    pBot = pBot.catch((err) => {
      app.logger.error(err);
      app.shutdown();
    });

    bot.pollPromise = pBot;

    return bot;
  }

  /**
   *
   * @param message VKMessage
   * @returns {Promise.<TResult>}
   */
  replyMessage(message) {
    let bot = message.getBot();
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

      return bot.getApi().call('messages.send', message_options);
    }).catch((err) => {
      app.logger.error(err);
    });
  }

  handleOutboxMessage(message) {
    let app = this;
    return app.replyMessage(message);
  }

  handleInboxMessage(message) {
    let app = message.getApp();
    let bot = message.getBot();

    let response_message = new VKMessage({
      response_for: message,
      extra: message.extra
    }, bot);

    delete response_message['extra'];


    /*
      Commmands processors.
     */
    // @todo: Add command processor here.
    // Command processor
    // @todo: Add command processor here.

    /*
      Fallback processors
     */
    // @todo: Move this somewhere
    return CleverbotCommand.handle(response_message).then((reply_message) => {
      return app.addOutbox(reply_message);
    }).catch((err) => {
      app.logger.error(err);

      response_message.text = 'BOT Error: An error occured. Contact the administrator.'
      return app.addOutbox(response_message);
    });
  }

  addInbox(message) {
    let app = this;
    app.logger.info('Recieved inbox message');
    return this.queue_inbox.push({message: message});
  }

  addOutbox(message) {
    let app = this;
    app.logger.info('Added outbox message');
    return this.queue_outbox.push({message: message});
  }

  handleUpdates(bot, updates) {
    let app = this;
    updates.forEach((update) => {
      app.logger.debug('Got update with code ' + update[VK_EVENT_TYPE]);
      // If message is not the one sent by bot.
      if (update[VK_EVENT_TYPE] == VK_EVENT_NEWMESSAGE) {
        let message = new VKMessage({
          from_id: update[3],
          flags: update[2],
          peer_id: update[3],
          timestamp: update[4],
          msg_id: update[1],
          text: update[5],
          attachments: update[6]
        }, bot);

        // Only handle messages got from other users, not bot's own.
        if (!message.isMyOwn() && message.isUnread()) {
          app.addInbox(message);
          app.logger.debug('Added message to inbox queue');
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

    pContinue = pContinue.then(() => {
      // Creating and starting bots.
      for (let bot_id in this.bots) {
        this.bots[bot_id].promise = app.createBot(Object.assign({id: bot_id}, this.bots[bot_id].config));
      }

      return app;
    });


    return pContinue;
  }

  shutdown() {
    process.exit(0);
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
  logger.info('= SIGINT received. Saving data and shutting down.');

  process.exit(0);
});
