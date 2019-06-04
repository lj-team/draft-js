/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule BlockTree
 * @flow
 */

'use strict';

var Immutable = require('immutable');

var emptyFunction = require('emptyFunction');
var findRangesImmutable = require('findRangesImmutable');

import type CharacterMetadata from 'CharacterMetadata';
import type ContentState from 'ContentState';
import type ContentBlock from 'ContentBlock';
import type {DraftDecoratorType} from 'DraftDecoratorType';

var {
  List,
  Repeat,
  Record,
} = Immutable;

var returnTrue = emptyFunction.thatReturnsTrue;

var FINGERPRINT_DELIMITER = '-';

var defaultLeafRange: {
  start: ?number,
  end: ?number,
} = {
  start: null,
  end: null,
};

var LeafRange = Record(defaultLeafRange);

var defaultDecoratorRange: {
  start: ?number,
  end: ?number,
  decoratorKey: ?string,
  leaves: ?List<LeafRange>,
} = {
  start: null,
  end: null,
  decoratorKey: null,
  leaves: null,
};

var DecoratorRange = Record(defaultDecoratorRange);

var BlockTree = {
  /**
   * Generate a block tree for a given ContentBlock/decorator pair.
   */
  generate: function(
    contentState: ContentState,
    block: ContentBlock,
    decorator: ?DraftDecoratorType
  ): List<DecoratorRange> {
    var textLength = block.getLength();
    if (!textLength) {
      return List.of(
        new DecoratorRange({
          start: 0,
          end: 0,
          decoratorKey: null,
          leaves: List.of(
            new LeafRange({start: 0, end: 0})
          ),
        })
      );
    }

    var leafSets = [];
    var decorations = decorator ?
      decorator.getDecorations(block, contentState) :
      List(Repeat(null, textLength));

    var chars = block.getCharacterList();

    const getNthDecKey = (n, decoratorString) => {
      if (!decoratorString || !decoratorString.length) {
        return null;
      }
      return decoratorString.split('-')[n + 1];
    };

    const nthDecKeyMatch = (n) => (a, b) => {
      const targetKeyInA = getNthDecKey(n, a);
      const targetKeyInB = getNthDecKey(n, b);
      return targetKeyInA === targetKeyInB;
    };

    // Produces recursive `leaf` structures
    const generateSubTree = (params = {}) => {
      const {
        decKeyLevel,
      } = params;
      const decorationsSlice = params.decorations;
      let outputTree = [];
      findRangesImmutable(
        decorationsSlice,
        nthDecKeyMatch(decKeyLevel),
        returnTrue,
        (start, end) => {
          const decRangeBasis = {
            start: start + params.rangeOffset,
            end: end + params.rangeOffset,
          };
          const firstCharDecStr = decorationsSlice.get(start);
          const firstCharNthLvlDec = getNthDecKey(
            decKeyLevel,
            firstCharDecStr
          );
          if (firstCharNthLvlDec) {
            // We simplify model by dropping mentions of wrapping entity key
            decRangeBasis.decoratorKey = `0-${firstCharNthLvlDec}`;
          } else {
            decRangeBasis.decoratorKey = null;
          }
          const nextLevelDecKeys = decorationsSlice.toArray().slice(
            decRangeBasis.start, decRangeBasis.end
          ).map(
            charDecoration => getNthDecKey(decKeyLevel + 1, charDecoration)
          );
          const allNextLevelKeysAreSame = nextLevelDecKeys.every(
            decKeyForChar => decKeyForChar === nextLevelDecKeys[0]
          );
          if (
            start === 0 && end === decorationsSlice.size &&
            allNextLevelKeysAreSame
          ) {
            decRangeBasis.leaves = generateLeaves(
              chars.slice(
                start + params.rangeOffset,
                end + params.rangeOffset,
              ).toList(),
              start + params.rangeOffset,
            );
            if (decKeyLevel > 0) {
              outputTree = decRangeBasis.leaves;
              return;
            }
          } else {
            const subTree = generateSubTree({
              decorations: decorationsSlice.slice(start, end),
              decKeyLevel: decKeyLevel + 1,
              rangeOffset: params.rangeOffset + start,
            });
            decRangeBasis.leaves = subTree;
          }
          outputTree.push(new DecoratorRange(decRangeBasis));
        }
      );
      return List(outputTree);
    };

    const adjustedDecArr = decorations.map((dec) => {
      if (
        !dec ||
        dec === '0-' ||
        !dec.replace
      ) {
        return null;
      }
      return dec.replace(',', '-');
    });
    leafSets = generateSubTree({
      decorations: adjustedDecArr,
      decKeyLevel: 0,
      rangeOffset: 0,
    });

    return leafSets;
  },

  /**
   * Create a string representation of the given tree map. This allows us
   * to rapidly determine whether a tree has undergone a significant
   * structural change.
   */
  getFingerprint: function(tree: List<DecoratorRange>): string {
    return tree.map(
      leafSet => {
        var decoratorKey = leafSet.get('decoratorKey');
        var fingerprintString = decoratorKey !== null ?
          decoratorKey + '.' + (leafSet.get('end') - leafSet.get('start')) :
          '';
        return '' + fingerprintString + '.' + leafSet.get('leaves').size;
      }
    ).join(FINGERPRINT_DELIMITER);
  },
};

/**
 * Generate LeafRange records for a given character list.
 */
function generateLeaves(
  characters: List<CharacterMetadata>,
  offset: number
): List<LeafRange> {
  var leaves = [];
  var inlineStyles = characters.map(c => c.getStyle()).toList();
  findRangesImmutable(
    inlineStyles,
    areEqual,
    returnTrue,
    (start, end) => {
      leaves.push(
        new LeafRange({
          start: start + offset,
          end: end + offset,
        })
      );
    }
  );
  return List(leaves);
}

function areEqual(a: any, b: any): boolean {
  return a === b;
}

module.exports = BlockTree;
