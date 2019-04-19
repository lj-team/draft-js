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
 * @flow
 */

'use strict';

var DraftStringKey = require('DraftStringKey');
var UnicodeUtils = require('UnicodeUtils');

import type ContentBlock from 'ContentBlock';
import type {EntityRange} from 'EntityRange';

var {strlen} = UnicodeUtils;

/**
 * Convert to UTF-8 character counts for storage.
 */
function encodeEntityRanges(
  block: ContentBlock,
  storageMap: Object
): Array<EntityRange> {
  var encoded = [];
  block.findEntityRanges(
    character => !!character.getEntity(),
    (/*number*/ start, /*number*/ end) => {
      var text = block.getText();
      var keySetMap = block.getEntityAt(start);
      // Encode keys as numbers for range storage.
      const keySet = keySetMap.toArray().map(
        key => Number(storageMap[
          DraftStringKey.stringify(key)
        ])
      );
      // Preserving this field for backward compatibility
      // with older versions which don't support sets of entities
      const priorityKey = keySet[0];

      encoded.push({
        offset: strlen(text.slice(0, start)),
        length: strlen(text.slice(start, end)),
        keySet,
        // Preserving this field for backward compatibility
        key: priorityKey,
      });
    }
  );
  return encoded;
}

module.exports = encodeEntityRanges;
