/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule applyEntityToContentState
 * @typechecks
 * 
 */

'use strict';

var Immutable = require('immutable');

var applyEntityToContentBlock = require('./applyEntityToContentBlock');

function applyEntityToContentState(contentState, selectionState, entityKey) {
  var startKey = selectionState.getStartKey();
  var startOffset = selectionState.getStartOffset();
  var endKey = selectionState.getEndKey();
  var endOffset = selectionState.getEndOffset();

  var blockMapOp = function blockMapOp(givenBlockMap) {
    var newBlocks = givenBlockMap.skipUntil(function (_, k) {
      return k === startKey;
    }).takeUntil(function (_, k) {
      return k === endKey;
    }).toOrderedMap().merge(Immutable.OrderedMap([[endKey, givenBlockMap.get(endKey)]])).filter(function (a) {
      return a;
    }).map(function (block, blockKey) {
      var sliceStart = blockKey === startKey ? startOffset : 0;
      var sliceEnd = blockKey === endKey ? endOffset : block.getLength();
      return applyEntityToContentBlock(block, sliceStart, sliceEnd, entityKey);
    });
    return givenBlockMap.merge(newBlocks);
  };

  contentState = contentState.applyToAllBlockMaps(blockMapOp);

  return contentState.merge({
    selectionBefore: selectionState,
    selectionAfter: selectionState
  });
}

module.exports = applyEntityToContentState;