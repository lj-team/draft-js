/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule convertFromRawToDraftState
 * @flow
 */

'use strict';

var ContentBlock = require('ContentBlock');
var ContentState = require('ContentState');
var DraftEntity = require('DraftEntity');

var createCharacterList = require('createCharacterList');
var decodeEntityRanges = require('decodeEntityRanges');
var decodeInlineStyleRanges = require('decodeInlineStyleRanges');
var generateRandomKey = require('generateRandomKey');
var Immutable = require('immutable');

import type {RawDraftContentState} from 'RawDraftContentState';

var {
  Map,
  List,
  OrderedMap,
} = Immutable;

function convertFromRawToDraftState(
  rawState: RawDraftContentState
): ContentState {
  var {blocks, entityMap} = rawState;

  var fromStorageToLocal = {};

  // TODO: Update this once we completely remove DraftEntity
  Object.keys(entityMap).forEach(
    storageKey => {
      var encodedEntity = entityMap[storageKey];
      var {type, mutability, data} = encodedEntity;
      var newKey = DraftEntity.__create(type, mutability, data || {});
      fromStorageToLocal[storageKey] = newKey;
    }
  );

  const prepareBlockData = block => {
    var {
      key,
      parentKey,
      type,
      text,
      depth,
      inlineStyleRanges,
      entityRanges,
      data,
    } = block;
    key = key || generateRandomKey();
    depth = depth || 0;
    inlineStyleRanges = inlineStyleRanges || [];
    entityRanges = entityRanges || [];
    data = Map(data);

    let childBlockMap = OrderedMap();
    if (Array.isArray(block.childBlockMap)) {
      const childrenPrepped = [];
      block.childBlockMap.map(rawBlockData => {
        childrenPrepped.push([rawBlockData.key, prepareBlockData(rawBlockData)]);
      });
      childBlockMap = OrderedMap(childrenPrepped);
    }

    let markers = List();
    if (Array.isArray(block.markers)) {
      markers = List(block.markers);
    }

    var inlineStyles = decodeInlineStyleRanges(text, inlineStyleRanges);

    // Translate entity range keys to the DraftEntity map.
    var filteredEntityRanges = entityRanges
      .filter(range => fromStorageToLocal.hasOwnProperty(range.key))
      .map(range => {
        return {...range, key: fromStorageToLocal[range.key]};
      });

    var entities = decodeEntityRanges(text, filteredEntityRanges);
    var characterList = createCharacterList(inlineStyles, entities);

    return new ContentBlock({
      key,
      parentKey,
      type,
      text,
      depth,
      characterList,
      data,
      childBlockMap,
      markers,
    });
  };

  var contentBlocks = blocks.map(prepareBlockData);

  return ContentState.createFromBlockArray(contentBlocks);
}

module.exports = convertFromRawToDraftState;
