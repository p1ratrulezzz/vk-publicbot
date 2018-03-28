'use strict';

const VKMessage = require('./VKMessage');

class VKBot {
  constructor () {
    /**
     * @type {null}
     * @protected
     */
    this._app = null;
  }

  getApp() {
    return this._app;
  }

  /**
   * @returns {VKApi}
   */
  getApi() {
    return this.api;
  }

  beforePoll() {
    return this.handleUnreadMessages();
  }

  handleUnreadMessages() {
    let app = this.getApp();
    let self = this;
    return this.getApi().call('messages.getDialogs', {
      unanswered: 1,
      count: 200
    }).then((response) => {
      response.items.forEach((item) => {
        let message = new VKMessage({
          from_id: item.message.user_id,
          flags: null,
          peer_id: item.message.user_id,
          timestamp: item.message.date,
          msg_id: item.message.id,
          text: item.message.body,
          attachments: item.message.attachments || {}
        }, self);
        app.addInbox(message);
      });

      let err = null;
      let result = {
        count: response.count
      };

      return Promise.resolve({err: err, result: result});
    }).catch((err) => {
      app.logger.error(err);
    });
  }

}

module.exports = VKBot;