'use strict';

/**
 * Module dependencies.
 * @private
 */
const prequest = require('request-promise');
const xml2js   = require('xml2js');

const REQUEST_URL    = 'http://cleverbot.existor.com/webservicexml';
const REQUEST_URL_AU = 'http://cleverbot.existor.com/webservicexml_ais_';

/**
 * Парсит ответ Cleverbot
 * @param  {String} response XML-документ
 * @return {Promise} => Result object { response, state }
 * @private
 */
function parseResponse (response) {
  if (response && response.length === 0)
    return Promise.reject(new Error('"response" is empty.'));

  return new Promise((resolve, reject) => {
    xml2js.parseString(response, (err, res) => {
      if (err)
        return reject(err);

      let rootObj   = res.webservicexml.session[0];
      let resultTxt = '';
      let resultObj = {};

      for (let i = 0, keys = Object.keys(rootObj), len = keys.length; i < len; i++)
        resultObj[keys[i]] = rootObj[keys[i]][0];

      resultTxt = resultObj.response;

      delete resultObj.response;

      resolve({
        response: resultTxt,
        state:    resultObj
      });
    });
  });
}

/**
 * Шифрует параметры запроса
 * @param  {Object} params Параметры запроса
 * @return {String}
 * @private
 */
function encodeParams (params) {
  let output = [];

  for (let x in params) {
    output.push(x + "=" + encodeURIComponent(params[x]));
  }

  return output.join("&");
}

/**
 * Send function
 * @param  {Object} {
 *   @prop {Object} user {
 *     @prop {String} username
 *     @prop {String} password
 *   }
 *   @prop {Object} message {
 *     @prop {String} text
 *     @prop {Object} state
 *   }
 * }
 * @return {Promise} => return of parseResponse()
 * @public
 */
function send ({ user = {}, message = {}, params = {} }) {
  let requestUrl    = REQUEST_URL;
  let requestParams = {};

  if (!user.login || !user.password || !user.botapi)
    return Promise.reject(new Error('"user" is required.'));

  if (!message || !message.text)
    return Promise.reject(new Error('"message.text" can not be empty.'));

  // Основные параметры запроса
  requestParams['icognoID']    = user.login;
  requestParams['icognoCheck'] = user.password;
  requestParams['botapi']      = user.botapi;
  requestParams['isLearning']  = '1';
  requestParams['stimulus']    = message.text;
  //requestParams['asbotname'] = 'Bot';

  // Merge some additional params
  requestParams = Object.assign(requestParams, params);
  if (message.state) {
    requestUrl = REQUEST_URL_AU + message.state.rpsais;

    // Дополнительные параметры запроса
    requestParams = Object.assign(requestParams, message.state);

    /**
     * String data = "stimulus=" + s + "&start=y&sessionid=" + sessionID + "&vText8=&vText7=&vText6=&vText5=&vText4=&vText3=&vText2=&icognoid=" +
     "wsf&icognocheck=" + hash + "&fno=0&prevref=&emotionaloutput=&emotionalhistory=&asbotname=" +
     "&ttsvoice=&typing=&lineref=&sub=Say&islearning=1&cleanslate=false";
     */
    // Clean not necessary values. As we don't know the emotion of speaker.
    ['emotion', 'emotionDegree', 'reaction', 'reactionDegree'].forEach(function(value) {
      if (requestParams[value] !== undefined) {
        delete requestParams[value];
      }
    });

    // Add additional data
    requestParams.cleanslate = 'false';
  }
  else {
    requestParams['cleanslate']  = 'true';
    requestParams['start']  = '1';
  }

  return prequest.post({
      url:  requestUrl,
      body: encodeParams(requestParams)
    })
    .then(response => parseResponse(response));
}

module.exports = {
  send
};
