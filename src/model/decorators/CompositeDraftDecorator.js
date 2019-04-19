/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule CompositeDraftDecorator
 * @typechecks
 * @flow
 */

'use strict';

var Immutable = require('immutable');

import type ContentBlock from 'ContentBlock';
import type {DraftDecorator} from 'DraftDecorator';
import type ContentState from 'ContentState';

var {List} = Immutable;

var DELIMITER = '.';

/**
 * A CompositeDraftDecorator traverses through a list of DraftDecorator
 * instances to identify sections of a ContentBlock that should be rendered
 * in a "decorated" manner. For example, hashtags, mentions, and links may
 * be intended to stand out visually, be rendered as anchors, etc.
 */
class CompositeDraftDecorator {
  _decorators: Array<DraftDecorator>;

  constructor(decorators: Array<DraftDecorator>) {
    // Copy the decorator array, since we use this array order to determine
    // precedence of decoration matching. If the array is mutated externally,
    // we don't want to be affected here.
    this._decorators = decorators.slice();
  }

  getDecorations(block: ContentBlock, contentState: ContentState): List<?string> {
    var decorations = Array(block.getText().length).fill(null).map(() => ([]));

    this._decorators.forEach(
      (/*object*/ decorator, /*number*/ ii) => {
        var counter = 0;
        var strategy = decorator.strategy;
        var callback  = (/*number*/ start, /*number*/ end) => {
          occupySlice(decorations, start, end, ii + DELIMITER + counter);
          counter++;
        };
        strategy(block, callback, contentState);
      }
    );

    // Decorators with higher `wrapLevel`s behave as wraps
    // for decorators with lower `wrapLevel`s.
    // If `wrapLevel` is not set on some decorator,
    // it will be treated as having `wrapLevel` set to 0.
    const wrapLvlOrdered = decorations.map(dec => {
      return dec.sort((decMarkerA, decMarkerB) =>  {
        const aDec = this._decorators[+decMarkerA.split('.')[0]];
        const bDec = this._decorators[+decMarkerB.split('.')[0]];
        const aDecWrapLevel = aDec.wrapLevel || 0;
        const bDecWrapLevel = bDec.wrapLevel || 0;
        return bDecWrapLevel - aDecWrapLevel;
      });
    });
    return List(wrapLvlOrdered);
  }

  getComponentForKey(key: string): Function {
    var componentKey = parseInt(key.split(DELIMITER)[0], 10);
    if (!componentKey && componentKey !== 0) {
      return null;
    }
    return this._decorators[componentKey].component;
  }

  getPropsForKey(key: string): ?Object {
    var componentKey = parseInt(key.split(DELIMITER)[0], 10);
    if (!componentKey && componentKey !== 0) {
      return null;
    }
    return this._decorators[componentKey].props;
  }
}
/**
 * Splice the specified component into our decoration array at the desired
 * range.
 */
function occupySlice(
  targetArr: Array<?string>,
  start: number,
  end: number,
  componentKey: string
): void {
  for (var ii = start; ii < end; ii++) {
    targetArr[ii].push(componentKey);
  }
}

module.exports = CompositeDraftDecorator;
