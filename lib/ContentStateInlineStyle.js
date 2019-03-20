/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ContentStateInlineStyle
 * @typechecks
 * 
 */

'use strict';

var CharacterMetadata = require('./CharacterMetadata');

var _require = require('immutable'),
    Map = _require.Map;

var ContentStateInlineStyle = {
  add: function add(contentState, selectionState, inlineStyle) {
    return modifyInlineStyle(contentState, selectionState, inlineStyle, true);
  },

  remove: function remove(contentState, selectionState, inlineStyle) {
    return modifyInlineStyle(contentState, selectionState, inlineStyle, false);
  }
};

function modifyInlineStyle(contentState, selectionState, inlineStyle, addOrRemove) {
  var startKey = selectionState.getStartKey();
  var startOffset = selectionState.getStartOffset();
  var endKey = selectionState.getEndKey();
  var endOffset = selectionState.getEndOffset();

  var blockMapOp = function blockMapOp(givenBlockMap) {
    var newBlocks = givenBlockMap.skipUntil(function (_, k) {
      return k === startKey;
    }).takeUntil(function (_, k) {
      return k === endKey;
    }).concat(Map([[endKey, givenBlockMap.get(endKey)]])).filter(function (a) {
      return a;
    }).map(function (block, blockKey) {
      var newBlock = block;
      var sliceStart;
      var sliceEnd;

      if (startKey === endKey) {
        sliceStart = startOffset;
        sliceEnd = endOffset;
      } else {
        sliceStart = blockKey === startKey ? startOffset : 0;
        sliceEnd = blockKey === endKey ? endOffset : block.getLength();
      }

      var chars = block.getCharacterList();
      var current;
      while (sliceStart < sliceEnd) {
        current = chars.get(sliceStart);
        chars = chars.set(sliceStart, addOrRemove ? CharacterMetadata.applyStyle(current, inlineStyle) : CharacterMetadata.removeStyle(current, inlineStyle));
        sliceStart++;
      }
      return newBlock.set('characterList', chars);
    });
    return givenBlockMap.merge(newBlocks);
  };

  contentState = contentState.applyToAllBlockMaps(blockMapOp);

  return contentState.merge({
    selectionBefore: selectionState,
    selectionAfter: selectionState
  });
}

module.exports = ContentStateInlineStyle;