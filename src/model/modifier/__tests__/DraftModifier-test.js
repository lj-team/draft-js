'use strict';

jest.disableAutomock();

var CharacterMetadata = require('CharacterMetadata');
var Immutable = require('immutable');
const getSampleStateForTesting = require('getSampleStateForTesting');

const {moveText} = require('DraftModifier');

describe('DraftModifier', () => {
  let {
    contentState,
    selectionState,
  } = getSampleStateForTesting();
  let blockMap = contentState.getBlockMap();
  let secondBlock = blockMap.skip(1).first().merge({
    characterList: Immutable.List(
      Immutable.Repeat(CharacterMetadata.EMPTY, 5)
    ),
  });
  blockMap = blockMap.set(
    secondBlock.getKey(),
    secondBlock,
  );
  contentState = contentState.set('blockMap', blockMap);
  const firstBlock = blockMap.first();

  describe('moveText', () => {
    it('must move fragment to the last block of that fragment', () => {
      const resultContent = moveText(
        contentState,
        selectionState.merge({
          anchorKey: firstBlock.getKey(),
          anchorOffset: secondBlock.getText().length - 1,
          focusKey: secondBlock.getKey(),
          focusOffset: 1,
        }),
        selectionState.merge({
          anchorKey: secondBlock.getKey(),
          focusKey: secondBlock.getKey(),
          anchorOffset: 2,
          focusOffset: 2,
        })
      );

      // Empty block inserted above content.
      const newFirstBlock = resultContent.getBlockMap().first();
      expect(newFirstBlock.getText()).toBe('Alphra');

      const newSecondBlock = resultContent.getBlockMap().skip(1).first();
      expect(newSecondBlock.getText()).toBe('Bavo');
    });
  });
});
