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
 * 
 */

'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Immutable = require('immutable');

var List = Immutable.List;


var DELIMITER = '.';

/**
 * A CompositeDraftDecorator traverses through a list of DraftDecorator
 * instances to identify sections of a ContentBlock that should be rendered
 * in a "decorated" manner. For example, hashtags, mentions, and links may
 * be intended to stand out visually, be rendered as anchors, etc.
 */

var CompositeDraftDecorator = function () {
  function CompositeDraftDecorator(decorators) {
    _classCallCheck(this, CompositeDraftDecorator);

    // Copy the decorator array, since we use this array order to determine
    // precedence of decoration matching. If the array is mutated externally,
    // we don't want to be affected here.
    this._decorators = decorators.slice();
  }

  CompositeDraftDecorator.prototype.getDecorations = function getDecorations(block, contentState) {
    var _this = this;

    var decorations = Array(block.getText().length).fill(null).map(function () {
      return [];
    });

    this._decorators.forEach(function ( /*object*/decorator, /*number*/ii) {
      var counter = 0;
      var strategy = decorator.strategy;
      var callback = function callback( /*number*/start, /*number*/end) {
        occupySlice(decorations, start, end, ii + DELIMITER + counter);
        counter++;
      };
      strategy(block, callback, contentState);
    });

    // Decorators with higher `wrapLevel`s behave as wraps
    // for decorators with lower `wrapLevel`s.
    // If `wrapLevel` is not set on some decorator,
    // it will be treated as having `wrapLevel` set to 0.
    var wrapLvlOrdered = decorations.map(function (dec) {
      return dec.sort(function (decMarkerA, decMarkerB) {
        var aDec = _this._decorators[+decMarkerA.split('.')[0]];
        var bDec = _this._decorators[+decMarkerB.split('.')[0]];
        var aDecWrapLevel = aDec.wrapLevel || 0;
        var bDecWrapLevel = bDec.wrapLevel || 0;
        return bDecWrapLevel - aDecWrapLevel;
      });
    });
    return List(wrapLvlOrdered);
  };

  CompositeDraftDecorator.prototype.getComponentForKey = function getComponentForKey(key) {
    var componentKey = parseInt(key.split(DELIMITER)[0], 10);
    if (!componentKey && componentKey !== 0) {
      return null;
    }
    return this._decorators[componentKey].component;
  };

  CompositeDraftDecorator.prototype.getPropsForKey = function getPropsForKey(key) {
    var componentKey = parseInt(key.split(DELIMITER)[0], 10);
    if (!componentKey && componentKey !== 0) {
      return null;
    }
    return this._decorators[componentKey].props;
  };

  return CompositeDraftDecorator;
}();
/**
 * Splice the specified component into our decoration array at the desired
 * range.
 */


function occupySlice(targetArr, start, end, componentKey) {
  for (var ii = start; ii < end; ii++) {
    targetArr[ii].push(componentKey);
  }
}

module.exports = CompositeDraftDecorator;