/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule BlockTree
 * 
 */

'use strict';

var Immutable = require('immutable');

var emptyFunction = require('fbjs/lib/emptyFunction');
var findRangesImmutable = require('./findRangesImmutable');

var List = Immutable.List,
    Repeat = Immutable.Repeat,
    Record = Immutable.Record;


var returnTrue = emptyFunction.thatReturnsTrue;

var FINGERPRINT_DELIMITER = '-';

var defaultLeafRange = {
  start: null,
  end: null
};

var LeafRange = Record(defaultLeafRange);

var defaultDecoratorRange = {
  start: null,
  end: null,
  decoratorKey: null,
  leaves: null
};

var DecoratorRange = Record(defaultDecoratorRange);

var BlockTree = {
  /**
   * Generate a block tree for a given ContentBlock/decorator pair.
   */
  generate: function generate(contentState, block, decorator) {
    var textLength = block.getLength();
    if (!textLength) {
      return List.of(new DecoratorRange({
        start: 0,
        end: 0,
        decoratorKey: null,
        leaves: List.of(new LeafRange({ start: 0, end: 0 }))
      }));
    }

    var leafSets = [];
    var decorations = decorator ? decorator.getDecorations(block, contentState) : List(Repeat(null, textLength));

    var chars = block.getCharacterList();

    var getNthDecKey = function getNthDecKey(n, decoratorString) {
      if (!decoratorString || !decoratorString.length) {
        return null;
      }
      return decoratorString.split('-')[n + 1];
    };

    var nthDecKeyMatch = function nthDecKeyMatch(n) {
      return function (a, b) {
        var targetKeyInA = getNthDecKey(n, a);
        var targetKeyInB = getNthDecKey(n, b);
        return targetKeyInA === targetKeyInB;
      };
    };

    // Produces recursive `leaf` structures
    var generateSubTree = function generateSubTree() {
      var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var decKeyLevel = params.decKeyLevel;

      var decorationsSlice = params.decorations;
      var outputTree = [];
      findRangesImmutable(decorationsSlice, nthDecKeyMatch(decKeyLevel), returnTrue, function (start, end) {
        var decRangeBasis = {
          start: start + params.rangeOffset,
          end: end + params.rangeOffset
        };
        var firstCharDecStr = decorationsSlice.get(start);
        var firstCharNthLvlDec = getNthDecKey(decKeyLevel, firstCharDecStr);
        if (firstCharNthLvlDec) {
          // We simplify model by dropping mentions of wrapping entity key
          decRangeBasis.decoratorKey = '0-' + firstCharNthLvlDec;
        } else {
          decRangeBasis.decoratorKey = null;
        }
        var nextLevelDecKeys = decorationsSlice.toArray().slice(decRangeBasis.start, decRangeBasis.end).map(function (charDecoration) {
          return getNthDecKey(decKeyLevel + 1, charDecoration);
        });
        var allNextLevelKeysAreSame = nextLevelDecKeys.every(function (decKeyForChar) {
          return decKeyForChar === nextLevelDecKeys[0];
        });
        if (start === 0 && end === decorationsSlice.size && allNextLevelKeysAreSame) {
          decRangeBasis.leaves = generateLeaves(chars.slice(start + params.rangeOffset, end + params.rangeOffset).toList(), start + params.rangeOffset);
          if (decKeyLevel > 0) {
            outputTree = decRangeBasis.leaves;
            return;
          }
        } else {
          var subTree = generateSubTree({
            decorations: decorationsSlice.slice(start, end),
            decKeyLevel: decKeyLevel + 1,
            rangeOffset: params.rangeOffset + start
          });
          decRangeBasis.leaves = subTree;
        }
        outputTree.push(new DecoratorRange(decRangeBasis));
      });
      return List(outputTree);
    };

    var adjustedDecArr = decorations.map(function (dec) {
      if (!dec || dec === '0-' || !dec.replace) {
        return null;
      }
      return dec.replace(',', '-');
    });
    leafSets = generateSubTree({
      decorations: adjustedDecArr,
      decKeyLevel: 0,
      rangeOffset: 0
    });

    return leafSets;
  },

  /**
   * Create a string representation of the given tree map. This allows us
   * to rapidly determine whether a tree has undergone a significant
   * structural change.
   */
  getFingerprint: function getFingerprint(tree) {
    return tree.map(function (leafSet) {
      var decoratorKey = leafSet.get('decoratorKey');
      var fingerprintString = decoratorKey !== null ? decoratorKey + '.' + (leafSet.get('end') - leafSet.get('start')) : '';
      return '' + fingerprintString + '.' + leafSet.get('leaves').size;
    }).join(FINGERPRINT_DELIMITER);
  }
};

/**
 * Generate LeafRange records for a given character list.
 */
function generateLeaves(characters, offset) {
  var leaves = [];
  var inlineStyles = characters.map(function (c) {
    return c.getStyle();
  }).toList();
  findRangesImmutable(inlineStyles, areEqual, returnTrue, function (start, end) {
    leaves.push(new LeafRange({
      start: start + offset,
      end: end + offset
    }));
  });
  return List(leaves);
}

function areEqual(a, b) {
  return a === b;
}

module.exports = BlockTree;