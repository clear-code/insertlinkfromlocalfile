/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is "Insert Link from Local File".
 *
 * The Initial Developer of the Original Code is ClearCode Inc.
 * Portions created by the Initial Developer are Copyright (C) 2012-2014
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): ClearCode Inc. <info@clear-code.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

window.addEventListener('DOMContentLoaded', function() {
	window.removeEventListener('DOMContentLoaded', arguments.callee, false);

	if ('LinkToDroppedFiles' in window) return;

	window.LinkToDroppedFiles = {
		mIOService : Components.classes['@mozilla.org/network/io-service;1']
			.getService(Components.interfaces.nsIIOService),

		mMIMEService : Components.classes['@mozilla.org/mime;1']
			.getService(Components.interfaces.nsIMIMEService),

		mPrefs : Components.classes['@mozilla.org/preferences;1']
			.getService(Components.interfaces.nsIPrefBranch),

		get fileProtocolHandler()
		{
			if (!this.mFileProtocolHandler)
				this.mFileProtocolHandler = this.mIOService.getProtocolHandler('file')
					.QueryInterface(Components.interfaces.nsIFileProtocolHandler);
			return this.mFileProtocolHandler;
		},

		get frame()
		{
			return document.getElementById('content-frame');
		},

		get editor()
		{
			return this.frame.docShell.editor ||
					this.frame.docShell.QueryInterface(Components.interfaces.nsIEditorDocShell).editor;
		},

		get shouldDecodeInHTML()
		{
			return this.mPrefs.getBoolPref('extensions.insertlinkfromlocalfile@clear-code.com.decodeLinkLabel.html');
		},

		get shouldDecodeInPlainText()
		{
			return this.mPrefs.getBoolPref('extensions.insertlinkfromlocalfile@clear-code.com.decodeLinkLabel.plain');
		},

		get shouldAttach()
		{
			return this.mPrefs.getBoolPref('extensions.insertlinkfromlocalfile@clear-code.com.attachLinkedFile');
		},

		get isHTML()
		{
			return this.frame.getAttribute('editortype') == 'htmlmail';
		},

		isImageFile : function(aFile)
		{
			try {
				let type = this.mMIMEService.getTypeFromFile(aFile);
				if (type && type.indexOf('image/') == 0)
					return true;
			}
			catch(e) {
			}
			return false;
		},

		getLinkableFiles : function(aEvent)
		{
			var dt = aEvent.dataTransfer;
			var files = [];
			for (let i = 0, maxi = dt.mozItemCount; i < maxi; ++i)
			{
				let isImage = false;
				let file = null;
				let types = dt.mozTypesAt(i);
				Array.forEach(types, function(aType) {
					if (aType.indexOf('image/') == 0)
						isImage = true;
					if (aType == 'application/x-moz-file')
						file = dt.mozGetDataAt(aType, i);
				});
				if (file && !isImage && (!this.isHTML || !this.isImageFile(file)))
					files.push(file.QueryInterface(Components.interfaces.nsILocalFile));
			}
			return files;
		},

		getCursorRange : function(aEvent)
		{
			var range = this.frame.contentDocument.createRange();
			range.setStart(aEvent.rangeParent, aEvent.rangeOffset);
			return range;
		},

		createBR : function()
		{
			if (this.isHTML)
				return '<br _moz_dirty="" />';
			else
				return '\n';
		},

		createLink : function(aFile)
		{
			var url = this.fileProtocolHandler.newFileURI(aFile).spec;
			if (this.isHTML) {
				let content = this.shouldDecodeInHTML ? decodeURI(url) : url;
				content = content.replace(/&/g, '&amp;')
								.replace(/</g, '&lt;')
								.replace(/>/g, '&gt;');
				let donotsend = this.shouldAttach ? '' : ' moz-do-not-send="true" ';
				let link = '<a href='+ url.quote() + ' _moz_dirty ' + donotsend + '>' + content + '</a>';
				return link;
			}
			else {
				return this.shouldDecodeInPlainText ? decodeURI(url) : url ;
			}
		},

		setCursor : function(aParent, aOffset)
		{
			var selection = this.editor.selection.QueryInterface(Components.interfaces.nsISelectionPrivate);
			selection.interlinePosition = true;
			selection.collapse(aParent, aOffset);
		},

		init : function()
		{
			window.addEventListener('unload', this, false);
			this.frame.addEventListener('dragenter', this, true);
			this.frame.addEventListener('dragover', this, true);
			this.frame.addEventListener('drop', this, true);
		},

		handleEvent : function(aEvent)
		{
			switch (aEvent.type)
			{
				case 'dragenter':
				case 'dragover':
					return this.onDragEnter(aEvent);

				case 'drop':
					return this.onDrop(aEvent);

				case 'unload':
					return this.onUnload();
			}
		},

		onDragEnter : function(aEvent)
		{
			if (this.isHTML || !this.getLinkableFiles(aEvent).length)
				return;

			// plaintext editor doesn't accept dragged objects except text by default.
			aEvent.preventDefault();

			// plaintext editor doesn't update the cursor while dragging.
			var range = this.getCursorRange(aEvent);
			this.setCursor(range.startContainer, range.startOffset);
			range.detach();
		},

		onDrop : function(aEvent)
		{
		try {
			var files = this.getLinkableFiles(aEvent);
			dump('dropped linkable file: ' + files + '\n');
			if (!files)
				return;

			var d = this.frame.contentDocument;
			var source = '';
			files.forEach(function(aFile, aIndex) {
				if (aIndex > 0) source += this.createBR();
				source += this.createLink(aFile);
			}, this);
			dump('inserting: ' + source + '\n');

			var range = this.getCursorRange(aEvent);
			dump('cursor range: ' + !!range + '\n');
			if (range) {
				this.setCursor(range.startContainer, range.startOffset);
				range.detach();
				if (this.isHTML) {
					this.editor.QueryInterface(Components.interfaces.nsIHTMLEditor)
							.insertHTML(source);
				}
				else {
					this.editor.QueryInterface(Components.interfaces.nsIPlaintextEditor)
							.insertText(source);
					// on this timing, the caret is unexpectedly hidden.
					// after the window lose and get focus again, the caret appear.
					this.frame.contentWindow.blur();
					this.frame.contentWindow.focus();
				}
			}

			aEvent.preventDefault();
		}
		catch(e) {
			dump(e+'\n');
			Components.utils.reportError(e);
		}
		},

		onUnload : function()
		{
			window.removeEventListener('unload', this, false);
			this.frame.removeEventListener('dragenter', this, true);
			this.frame.removeEventListener('dragover', this, true);
			this.frame.removeEventListener('drop', this, true);
		}
	};
	window.LinkToDroppedFiles.init();

}, false);
