/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ContentStateEntity
 * @typechecks
 * @flow
 */

'use strict';

var CharacterMetadata = require('CharacterMetadata');
var {Map} = require('immutable');

import type ContentState from 'ContentState';
import type SelectionState from 'SelectionState';

var ContentStateEntity = {
  add: function(
    contentState: ContentState,
    selectionState: SelectionState,
    entityKey: string
  ): ContentState {
    return modifyInlineEntity(contentState, selectionState, entityKey, true);
  },

  remove: function(
    contentState: ContentState,
    selectionState: SelectionState,
    entityKey: string
  ): ContentState {
    return modifyInlineEntity(contentState, selectionState, entityKey, false);
  },
};

function modifyInlineEntity(
  contentState: ContentState,
  selectionState: SelectionState,
  entityKey: string,
  addOrRemove: boolean
): ContentState {
  var blockMap = contentState.getBlockMap();
  var startKey = selectionState.getStartKey();
  var startOffset = selectionState.getStartOffset();
  var endKey = selectionState.getEndKey();
  var endOffset = selectionState.getEndOffset();

  var newBlocks = blockMap
    .skipUntil((_, k) => k === startKey)
    .takeUntil((_, k) => k === endKey)
    .concat(Map([[endKey, blockMap.get(endKey)]]))
    .map((block, blockKey) => {
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
        chars = chars.set(
          sliceStart,
          addOrRemove ?
            CharacterMetadata.applyEntity(current, entityKey) :
            CharacterMetadata.removeEntity(current, entityKey)
        );
        sliceStart++;
      }

      return block.set('characterList', chars);
    });

  return contentState.merge({
    blockMap: blockMap.merge(newBlocks),
    selectionBefore: selectionState,
    selectionAfter: selectionState,
  });
}

module.exports = ContentStateEntity;
