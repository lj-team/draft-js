'use strict';

import type DraftEditor from 'DraftEditor.react';

function editOnCompositionEnd(editor: DraftEditor, e: SyntheticEvent): void {
  if (editor.props.handleCompositionEnd) {
    const output = editor.props.handleCompositionEnd(editor, e);
    if (output === 'handled') {
      return;
    }
  }
}

module.exports = editOnCompositionEnd;
