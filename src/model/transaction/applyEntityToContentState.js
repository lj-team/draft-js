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
 * @flow
 */

'use strict';

var Immutable = require('immutable');

var applyEntityToContentBlock = require('applyEntityToContentBlock');

import type ContentState from 'ContentState';
import type SelectionState from 'SelectionState';

function applyEntityToContentState(
  contentState: ContentState,
  selectionState: SelectionState,
  entityKey: ?string
): ContentState {
  const startKey = selectionState.getStartKey();
  const startOffset = selectionState.getStartOffset();
  const endKey = selectionState.getEndKey();
  const endOffset = selectionState.getEndOffset();

  const blockMapOp = givenBlockMap => {
    const newBlocks = givenBlockMap
    .skipUntil((_, k) => k === startKey)
    .takeUntil((_, k) => k === endKey)
    .toOrderedMap()
    .merge(Immutable.OrderedMap([[endKey, givenBlockMap.get(endKey)]]))
    .filter(a => a)
    .map((block, blockKey) => {
      const sliceStart = blockKey === startKey ? startOffset : 0;
      const sliceEnd = blockKey === endKey ? endOffset : block.getLength();
      return applyEntityToContentBlock(
        block,
        sliceStart,
        sliceEnd,
        entityKey
      );
    });
    return givenBlockMap.merge(newBlocks);
  };

  contentState = contentState.applyToAllBlockMaps(blockMapOp);

  return contentState.merge({
    selectionBefore: selectionState,
    selectionAfter: selectionState,
  });
}

module.exports = applyEntityToContentState;
