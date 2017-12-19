'use strict';

/**
 * Main config.
 * @type {{Token: string}}
 */
module.exports = {
  "Token": "telegram token here", // Provide bot token.
  redis: {
    store: {
      db: 6,
      host: '127.0.0.1',
      port: '6379'
      // password: 'UDUzGsCW3mpabhMTL2nDztAVAHjZYEGHsKc9fc5ZYRSrqVqA'
    }
  },
  vk: {
    version: '5.68',
    app: {
      secret: '',
      id: ''
    },
    /**
     * Use that link to acquire token for your APP_ID.
     * @link https://oauth.vk.com/authorize?client_id=APP_ID&scope=offline&response_type=token&v=5.68
     */
    token: '' // Copy from result by the link above
  }
};