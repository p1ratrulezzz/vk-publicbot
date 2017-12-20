'use strict';

class VKMessage {
  /**
   *
   * @public
   */
  constructor (msg) {
    this.app = msg.extra.app;
    this.bot = msg.extra.bot;
    this.type = 'inbox';

    return Object.assign(this, msg);
  }

  hasCommand() {

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