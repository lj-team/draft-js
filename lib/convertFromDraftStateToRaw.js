/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule convertFromDraftStateToRaw
 * 
 */

'use strict';

var DraftStringKey = require('./DraftStringKey');

var Immutable = require('immutable');

var encodeEntityRanges = require('./encodeEntityRanges');
var encodeInlineStyleRanges = require('./encodeInlineStyleRanges');

var List = Immutable.List,
    OrderedMap = Immutable.OrderedMap;


function convertFromDraftStateToRaw(contentState) {
  var entityStorageKey = 0;
  var entityStorageMap = {};
  var rawBlocks = [];

  var processBlock = function processBlock(block, blockKey) {
    block.findEntityRanges(function (character) {
      return character.getEntity() !== null;
    }, function (start) {
      // Stringify to maintain order of otherwise numeric keys.
      var stringifiedEntityKey = DraftStringKey.stringify(block.getEntityAt(start));
      if (!entityStorageMap.hasOwnProperty(stringifiedEntityKey)) {
        entityStorageMap[stringifiedEntityKey] = '' + entityStorageKey++;
      }
    });

    var markers = [];
    if (block.markers && block.markers.size) {
      markers = block.getMarkers();
    }

    var childBlockMap = [];
    if (block.childBlockMap && block.childBlockMap.size) {
      childBlockMap = [];
      block.childBlockMap.forEach(function (block, blockKey) {
        var processedBlock = processBlock(block, blockKey);
        childBlockMap.push(processedBlock);
      });
    }

    return {
      key: blockKey,
      parentKey: block.getParentKey(),
      text: block.getText(),
      type: block.getType(),
      depth: block.getDepth(),
      inlineStyleRanges: encodeInlineStyleRanges(block),
      entityRanges: encodeEntityRanges(block, entityStorageMap),
      data: block.getData().toObject(),
      markers: markers,
      childBlockMap: childBlockMap
    };
  };

  contentState.getBlockMap().forEach(function (block, blockKey) {
    var processedBlock = processBlock(block, blockKey);
    rawBlocks.push(processedBlock);
  });

  // Flip storage map so that our storage keys map to global
  // DraftEntity keys.
  var entityKeys = Object.keys(entityStorageMap);
  var flippedStorageMap = {};
  entityKeys.forEach(function (key, jj) {
    var entity = contentState.getEntity(DraftStringKey.unstringify(key));
    flippedStorageMap[jj] = {
      type: entity.getType(),
      mutability: entity.getMutability(),
      data: entity.getData()
    };
  });

  return {
    entityMap: flippedStorageMap,
    blocks: rawBlocks
  };
}

module.exports = convertFromDraftStateToRaw;