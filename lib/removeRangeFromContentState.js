/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule removeRangeFromContentState
 * 
 */

'use strict';

var Immutable = require('immutable');
var generateRandomKey = require('./generateRandomKey');

function removeRangeFromContentState(contentState, selectionState) {

  var startKey = selectionState.getStartKey();
  var startOffset = selectionState.getStartOffset();
  var endKey = selectionState.getEndKey();
  var endOffset = selectionState.getEndOffset();

  var startBlock = contentState.getBlockForKey(startKey);
  var startIsAtomic = startBlock.getType() === 'atomic';
  // Any kind of selection on `atomic`, including collapsed one,
  // is treated as full selection of `atomic`
  if (selectionState.isCollapsed() && !startIsAtomic) {
    return contentState;
  }
  var endBlock = contentState.getBlockForKey(endKey);
  var characterList;

  if (startBlock === endBlock) {
    characterList = removeFromList(startBlock.getCharacterList(), startOffset, endOffset);
  } else {
    characterList = startBlock.getCharacterList().slice(0, startOffset).concat(endBlock.getCharacterList().slice(endOffset));
  }

  var modifiedStart = startIsAtomic ? null : startBlock.merge({
    text: startBlock.getText().slice(0, startOffset) + endBlock.getText().slice(endOffset),
    characterList: characterList
  });

  var startBlockParentKey = startBlock.getParentKey();
  var startBlockParent = startBlockParentKey && contentState.getBlockForKey(startBlockParentKey);

  var targetBlockMap = void 0;
  if (startBlockParent) {
    targetBlockMap = startBlockParent.getChildBlockMap();
  } else {
    targetBlockMap = contentState.getBlockMap();
  }

  var newBlocks = targetBlockMap.toSeq().skipUntil(function (_, k) {
    return k === startKey;
  }).takeUntil(function (_, k) {
    return k === endKey;
  }).concat(Immutable.Map([[endKey, null]])).map(function (_, k) {
    return k === startKey ? modifiedStart : null;
  });

  targetBlockMap = targetBlockMap.merge(newBlocks).filter(function (block) {
    return !!block;
  });

  var keyBeforeSelection = contentState.getKeyBefore(startKey);
  var keyAfterSelection = contentState.getKeyAfter(endKey);
  var newSelectionKey = startIsAtomic ? keyAfterSelection || keyBeforeSelection : startKey;
  var newSelectionOffset = startIsAtomic ? 0 : startOffset;

  if (!targetBlockMap.size) {
    var newKey = generateRandomKey();
    var newBlock = startBlock.merge({
      text: '',
      type: 'unstyled',
      characterList: Immutable.List(),
      key: newKey
    });
    targetBlockMap = targetBlockMap.merge(Immutable.OrderedMap([[newKey, newBlock]]));
    newSelectionKey = newKey;
    newSelectionOffset = 0;
  }

  var newTopLevelBlockMap = void 0;
  if (startBlockParent) {
    var topLevelBlockMap = contentState.getBlockMap();
    newTopLevelBlockMap = topLevelBlockMap.merge(Immutable.Map([[startBlockParentKey, startBlockParent.set('childBlockMap', targetBlockMap)]]));
  } else {
    newTopLevelBlockMap = targetBlockMap;
  }

  contentState = contentState.merge({
    blockMap: newTopLevelBlockMap
  });

  return contentState.merge({
    selectionBefore: selectionState,
    selectionAfter: selectionState.merge({
      anchorKey: newSelectionKey,
      anchorOffset: newSelectionOffset,
      focusKey: newSelectionKey,
      focusOffset: newSelectionOffset,
      isBackward: false
    })
  });
}

/**
 * Maintain persistence for target list when removing characters on the
 * head and tail of the character list.
 */
function removeFromList(targetList, startOffset, endOffset) {
  if (startOffset === 0) {
    while (startOffset < endOffset) {
      targetList = targetList.shift();
      startOffset++;
    }
  } else if (endOffset === targetList.count()) {
    while (endOffset > startOffset) {
      targetList = targetList.pop();
      endOffset--;
    }
  } else {
    var head = targetList.slice(0, startOffset);
    var tail = targetList.slice(endOffset);
    targetList = head.concat(tail).toList();
  }
  return targetList;
}

module.exports = removeRangeFromContentState;