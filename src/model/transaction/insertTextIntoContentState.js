/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule insertTextIntoContentState
 * @typechecks
 * @flow
 */

'use strict';

var Immutable = require('immutable');

var insertIntoList = require('insertIntoList');
var invariant = require('invariant');

var {Repeat} = Immutable;

import type CharacterMetadata from 'CharacterMetadata';
import type ContentState from 'ContentState';
import type SelectionState from 'SelectionState';

function insertTextIntoContentState(
  contentState: ContentState,
  selectionState: SelectionState,
  text: string,
  characterMetadata: CharacterMetadata
): ContentState {
  invariant(
    selectionState.isCollapsed(),
    '`insertText` should only be called with a collapsed range.'
  );

  var len = text.length;
  if (!len) {
    return contentState;
  }

  var key = selectionState.getStartKey();
  var offset = selectionState.getStartOffset();
  var block = contentState.getBlockForKey(key);
  var blockText = block.getText();

  var newBlock = block.merge({
    text: (
      blockText.slice(0, offset) +
      text +
      blockText.slice(offset, block.getLength())
    ),
    characterList: insertIntoList(
      block.getCharacterList(),
      Repeat(characterMetadata, len).toList(),
      offset
    ),
  });

  var newOffset = offset + len;

  let newContentState = contentState.changeBlockForKey(
    key,
    newBlock,
  );
  return newContentState.merge({
    selectionAfter: selectionState.merge({
      anchorOffset: newOffset,
      focusOffset: newOffset,
    }),
  });
}

module.exports = insertTextIntoContentState;
