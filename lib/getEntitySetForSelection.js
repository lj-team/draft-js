/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule getEntityKeyForSelection
 * @typechecks
 * 
 */

'use strict';

/**
 * Return the entity set that should be used when inserting text for the
 * specified target selection, only with entities which are `MUTABLE`. `IMMUTABLE`
 * and `SEGMENTED` entities should not be used for insertion behavior.
 */
function getEntitySetForSelection(contentState, targetSelection) {
  var entitySet;

  if (targetSelection.isCollapsed()) {
    var key = targetSelection.getAnchorKey();
    var offset = targetSelection.getAnchorOffset();
    if (offset > 0) {
      entitySet = contentState.getBlockForKey(key).getEntityAt(offset - 1);
      return filterKey(contentState.getEntityMap(), entitySet);
    }
    return null;
  }

  var startKey = targetSelection.getStartKey();
  var startOffset = targetSelection.getStartOffset();
  var startBlock = contentState.getBlockForKey(startKey);

  entitySet = startOffset === startBlock.getLength() ? null : startBlock.getEntityAt(startOffset);

  return filterKey(contentState.getEntityMap(), entitySet);
}

/**
 * Determine whether an entity key corresponds to a `MUTABLE` entity. If so,
 * return it. If not, return null.
 */
function filterKey(entityMap, entitySet) {
  if (entitySet) {
    var allEntitiesAreMutable = entitySet.every(function (entityKey) {
      var entityData = entityMap.__get(entityKey);
      return entityData.getMutability() === 'MUTABLE';
    });
    return allEntitiesAreMutable ? entitySet : null;
  }
  return null;
}

module.exports = getEntitySetForSelection;