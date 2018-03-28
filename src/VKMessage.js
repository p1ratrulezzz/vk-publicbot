'use strict';

class VKMessage {
  /**
   *
   * @param msg {*}
   * @param bot VKBot
   * @returns VKMessage
   */
  constructor (msg, bot) {
    /**
     * @protected
     */
    this._app = bot.getApp();

    /**
     * @protected
     */
    this._bot = bot;

    this.extra = msg.extra || {};

    // Remove not
    this.setType('inbox');

    return Object.assign(this, msg);
  }

  hasCommand() {

  }

  /**
   *
   * @returns Application
   */
  getApp() {
    return this._app;
  }

  /**
   *
   * @returns {*}
   */
  getBot() {
    return this._bot;
  }

  setType(type) {
    this.type = type;
  }

  extractCommand(startPosition = 1) {
    let firstSpace = messageObject.message.indexOf(' ');
    if (firstSpace === -1) {
      firstSpace = undefined;
    }

    return messageObject.message.substr(startPosition, firstSpace).trim().toLowerCase();
  }

  isMyOwn() {
    return (this.flags & 2) !== 0;
  }

  isUnread() {
    return (this.flags & 1) !== 0;
  }
}

module.exports = VKMessage;