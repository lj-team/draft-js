'use strict';

function editOnCompositionEnd(editor, e) {
  if (editor.props.handleCompositionEnd) {
    var output = editor.props.handleCompositionEnd(editor, e);
    if (output === 'handled') {
      return;
    }
  }
}

module.exports = editOnCompositionEnd;