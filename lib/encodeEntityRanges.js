/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule encodeEntityRanges
 * @typechecks
 * 
 */

'use strict';

var DraftStringKey = require('./DraftStringKey');
var UnicodeUtils = require('fbjs/lib/UnicodeUtils');

var strlen = UnicodeUtils.strlen;

/**
 * Convert to UTF-8 character counts for storage.
 */

function encodeEntityRanges(block, storageMap) {
  var encoded = [];
  block.findEntityRanges(function (character) {
    return !!character.getEntity();
  }, function ( /*number*/start, /*number*/end) {
    var text = block.getText();
    var keySetMap = block.getEntityAt(start);
    // Encode keys as numbers for range storage.
    var keySet = keySetMap.toArray().map(function (key) {
      return Number(storageMap[DraftStringKey.stringify(key)]);
    });
    // Preserving this field for backward compatibility
    // with older versions which don't support sets of entities
    var priorityKey = keySet[0];

    encoded.push({
      offset: strlen(text.slice(0, start)),
      length: strlen(text.slice(start, end)),
      keySet: keySet,
      // Preserving this field for backward compatibility
      key: priorityKey
    });
  });
  return encoded;
}

module.exports = encodeEntityRanges;