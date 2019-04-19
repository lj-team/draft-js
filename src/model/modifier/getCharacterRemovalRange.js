/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule getCharacterRemovalRange
 * @typechecks
 * @flow
 */

'use strict';

var DraftEntitySegments = require('DraftEntitySegments');

var getRangesForDraftEntity = require('getRangesForDraftEntity');
var invariant = require('invariant');

import type ContentBlock from 'ContentBlock';
import type {DraftRemovalDirection} from 'DraftRemovalDirection';
import type SelectionState from 'SelectionState';
import type {EntityMap} from 'EntityMap';

/**
 * Given a SelectionState and a removal direction, determine the entire range
 * that should be removed from a ContentState. This is based on any entities
 * within the target, with their `mutability` values taken into account.
 *
 * For instance, if we are attempting to remove part of an "immutable" entity
 * range, the entire entity must be removed. The returned `SelectionState`
 * will be adjusted accordingly.
 */
function getCharacterRemovalRange(
  entityMap: EntityMap,
  block: ContentBlock,
  selectionState: SelectionState,
  direction: DraftRemovalDirection
): SelectionState {
  var start = selectionState.getStartOffset();
  var end = selectionState.getEndOffset();

  const entitySet = block.getEntityAt(start);
  if (entitySet.size == 0) {
    return selectionState;
  }

  const entityMetadataSet = entitySet.map(entityKey => {
    // Find the entity range that overlaps with our removal range.
    const entityRanges = getRangesForDraftEntity(block, entityKey).filter(
      (range) => start < range.end && end > range.start
    );

    invariant(
      entityRanges.length == 1,
      'There should only be one entity range within this removal range.'
    );

    return {
      key: entityKey,
      data: entityMap.__get(entityKey),
      entityRange: entityRanges[0],
    };
  });

  const mutableEntityMetadatas = entityMetadataSet.filter(
    entityMetadata => entityMetadata.data.getMutability() === 'MUTABLE'
  );

  // `MUTABLE` entities can just have the specified range of text removed
  // directly. No adjustments are needed.
  if (mutableEntityMetadatas.size === entitySet.size) {
    return selectionState;
  }

  const immutableEntityMetadatas = entityMetadataSet.filter(
    entityMetadata => entityMetadata.data.getMutability() === 'IMMUTABLE'
  );

  // For `IMMUTABLE` entity types, we will remove the entire entity range.
  if (immutableEntityMetadatas.size > 0) {
    const immutableEntitiesRangeSum = immutableEntityMetadatas.reduce((reducedRange, currentMetadata) => {
      if (!reducedRange) {
        return currentMetadata.entityRange;
      }
      return {
        start: Math.min(currentMetadata.entityRange.start, reducedRange.start),
        end: Math.max(currentMetadata.entityRange.end, reducedRange.end),
      };
    });
    return selectionState.merge({
      anchorOffset: immutableEntitiesRangeSum.start,
      focusOffset: immutableEntitiesRangeSum.end,
      isBackward: false,
    });
  }

  const firstSegmentedEntityRange = entityMetadataSet.filter(
    entityMetadata => entityMetadata.data.getMutability() === 'SEGMENTED'
  ).entityRange;

  // For `SEGMENTED` entity types, determine the appropriate segment to
  // remove.
  var removalRange = DraftEntitySegments.getRemovalRange(
    start,
    end,
    block.getText().slice(firstSegmentedEntityRange.start, firstSegmentedEntityRange.end),
    firstSegmentedEntityRange.start,
    direction
  );

  return selectionState.merge({
    anchorOffset: removalRange.start,
    focusOffset: removalRange.end,
    isBackward: false,
  });
}

module.exports = getCharacterRemovalRange;
