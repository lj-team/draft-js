/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule editOnSelect
 * 
 */

'use strict';

var EditorState = require('./EditorState');
var ReactDOM = require('react-dom');

var getDraftEditorSelection = require('./getDraftEditorSelection');

function editOnSelect(editor) {
  if (editor.props.handleEditOnSelect) {
    var handleStatus = editor.props.handleEditOnSelect();
    if (handleStatus === 'handled') {
      return;
    }
  }
  if (editor._blockSelectEvents || editor._latestEditorState !== editor.props.editorState) {
    return;
  }

  var editorState = editor.props.editorState;
  var editorNode = ReactDOM.findDOMNode(editor.refs.editorContainer).firstChild;
  var documentSelection = getDraftEditorSelection(editorState, editorNode);
  // Let end-user help Editor parse some `document` `selection`s
  if (editor.props.adjustParsedDocumentSelection) {
    documentSelection = editor.props.adjustParsedDocumentSelection(documentSelection, editorState, editorNode);
  }
  var updatedSelectionState = documentSelection.selectionState;

  if (updatedSelectionState !== editorState.getSelection()) {
    if (documentSelection.needsRecovery) {
      editorState = EditorState.forceSelection(editorState, updatedSelectionState);
    } else {
      editorState = EditorState.acceptSelection(editorState, updatedSelectionState);
    }
    editor.update(editorState);
  }
}

module.exports = editOnSelect;