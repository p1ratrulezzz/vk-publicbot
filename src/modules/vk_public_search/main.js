'use strict';

/**
 * Module dependencies
 * @private
 */
const yargs = require('yargs');
const random = require('../random/main').randomAsync;

/**
 *
 * @param argText
 * @param VK
 * @param params
 * @returns {Promise.<TResult>}
 */
function parseCommand (argText, VK, publicInfo) {
  let yargsParams = yargs
    .boolean('k')
    .alias({
    's': ['search', 'поиск', 'п', 'и'],
    'c': ['count', 'количество', 'к'],
    'o': ['offset', 'start', 'начало', 'н'],
    'k': ['comments', 'ком', 'комменты']
  });

  let bArgs = yargsParams.parse(argText);

  // Get public info from exports. This can be defined in other modules
  let PUBLIC_INFO = publicInfo;

  // Subsets with multipliers
  let subsets = {
    'newest': 1,
    'new': 2,
    'old': 3,
    'oldest': 4
  };

  let bText = argText.substr(bArgs._ !== undefined ? argText.indexOf(bArgs._[0]) : 0);
  // Fallback to newest
  let subset = String(bText).length === 0 ? 'newest' : bText;

  // Check if subset correctly chosen
  if (!subsets[subset]) {
    // Russian aliases for subsets
    let aliases = {
      'newest': ['новее', 'нове', 'новейшее'],
      'new': ['новое', 'нов', 'нового'],
      'old': ['старое', 'стар'],
      'oldest': ['старше', 'древнее', 'динозавры', 'динозавр', 'старейшее', 'старее']
    };

    for (let name in aliases) {
      // Check if we have array
      if (aliases[name][0] === undefined) {
        continue;
      }

      if (aliases[name].indexOf(subset) !== -1) {
        subset = name;
        break;
      }
    }

    if (!subsets[subset]) {
      subset = 'newest';
    }
  }

  let params = PUBLIC_INFO;
  params.count = 1;
  params.offset = 0;

  let itemsMethod;
  if (bArgs.s !== undefined && bArgs.s.trim().length > 0) {
    itemsMethod = 'wall.search';
    params.query = bArgs.s.trim();

    // By default search only posts by posted by public itself
    if (bArgs.comments !== true) {
      params.owners_only = 1;
    }
  }
  else {
    itemsMethod = 'wall.get';
    params.filter = 'owner';
  }

  return VK.call(itemsMethod, params).then(response => {
    if (!response.count) {
      throw new Error('Error requesting count of public records', 1);
    }

    let count = response.count;
    let attachmentsCount = 1;

    if (itemsMethod == 'wall.get') {
      let items_per_subset = Math.floor(count / 4);

      // We consider that maximum items to get from public is 0.5% of items per subset
      let items_max_count = items_per_subset * 0.01; // @fixme: Move to config

      // Find random min and max value to use
      let offset_min = items_per_subset * (subsets[subset] - 1);
      // For newest items we add count of remaining items if there are some
      let offset_max = items_per_subset * subsets[subset] + ((subsets[subset] == 1) ? count % 4 : 0);

      params.count = items_max_count <= 50 ? items_max_count : 50; // Adjust maximum items to get (VK api limit)
      params.offset = random(offset_min, offset_max);
    }
    else {
      let count = bArgs.count !== undefined &&  !isNaN(parseInt(bArgs.count)) ? parseInt(bArgs.count) : 1;
      count = count > 0 ? count : 1;
      count = count > 30 ? 30 : count;

      params.count = attachmentsCount = count;
      params.offset = 0;

      if (bArgs.offset !== undefined && !isNaN(parseInt(bArgs.offset))) {
        params.offset = parseInt(bArgs.offset);
      }
    }

    // Ensure offset is correct
    params.offset = params.offset > 0 ? params.offset : 0;
    params.count = params.count < 1 ? 1 : params.count;

    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        return resolve();
      }, 500);
    }).then(() => {
      return VK.call(itemsMethod, params).then(response => {
        if (response.count == 0) {
          throw new Error('No items found', 1);
        }

        let attachments = [];
        let attachmentsRaw = [];
        if (itemsMethod == 'wall.get') {
          let count = attachmentsCount; // > response.count ? response.count : attachmentsCount;
          for (let cnt = 0; cnt < count; cnt++) {
            let max_id = 0;
            for (let i = max_id + 1; i < response.items.length; i++) {
              let likes_count = response.items[i].likes.count || 0;
              let likes_count_maxid = response.items[max_id].likes.count || 0;
              if (response.items[i].excluded !== true && likes_count > likes_count_maxid) {
                max_id = i;
              }
            }

            let post = response.items[max_id];

            if (post !== undefined && post.excluded !== true) {
              post.excluded = true; // Exclude from being selected again as maximum
              attachments.push('wall' + post.owner_id + '_' + post.id);
              attachmentsRaw.push(post);
            }
          }
        }
        else {
          for (let i = 0; i < response.items.length; i++) {
            let post = response.items[i];
            attachments.push('wall' + post.owner_id + '_' + post.id);
            attachmentsRaw.push(post);
          }
        }

        return {
          attachments: attachments,
          attachments_raw: attachmentsRaw
        };
      });
    });
  });
}

module.exports = {
  parseCommand
};
