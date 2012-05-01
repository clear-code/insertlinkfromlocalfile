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
 * Portions created by the Initial Developer are Copyright (C) 2012
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

		get editor()
		{
			return document.getElementById('content-frame');
		},

		get shouldDecode()
		{
			return this.mPrefs.getBoolPref('extensions.insertlinkfromlocalfile@clear-code.com.decodeLinkLabel');
		},

		get shouldAttach()
		{
			return this.mPrefs.getBoolPref('extensions.insertlinkfromlocalfile@clear-code.com.attachLinkedFile');
		},

		get isHTML()
		{
			return this.editor.getAttribute('editortype') == 'htmlmail';
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
				if (file && !isImage && !this.isImageFile(file))
					files.push(file.QueryInterface(Components.interfaces.nsILocalFile));
			}
			return files;
		},

		createBR : function(aDocument)
		{
			aDocument = aDocument || this.editor.contentDocument;
			var br = aDocument.createElement('br');
			br.setAttribute('_moz_dirty', '');
			return br;
		},

		createLink : function(aFile, aDocument)
		{
			aDocument = aDocument || this.editor.contentDocument;
			var url = this.fileProtocolHandler.newFileURI(aFile).spec;
			if (this.isHTML) {
				let content = aDocument.createTextNode(this.shouldDecode ? decodeURI(url) : url);
				let link = aDocument.createElement('a');
				link.setAttribute('href', url);
				link.setAttribute('_moz_dirty', '');
				if (!this.shouldAttach)
					link.setAttribute('moz-do-not-send', 'true');
				link.appendChild(content);
				return link;
			}
			else {
				return aDocument.createTextNode(url);
			}
		},

		init : function()
		{
			window.addEventListener('unload', this, false);
			this.editor.addEventListener('dragenter', this, true);
			this.editor.addEventListener('dragover', this, true);
			this.editor.addEventListener('drop', this, true);
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
			if (!this.isHTML &&
				this.getLinkableFiles(aEvent).length)
				aEvent.preventDefault();
		},

		onDrop : function(aEvent)
		{
			var files = this.getLinkableFiles(aEvent);
			if (!files)
				return;

			var selection = this.editor.contentWindow.getSelection();
			if (selection === null || !selection.rangeCount)
				return;

			var d = this.editor.contentDocument;
			var fragment = d.createDocumentFragment();
			files.forEach(function(aFile, aIndex) {
				if (aIndex > 0) fragment.appendChild(this.createBR(d));
				fragment.appendChild(this.createLink(aFile, d));
			}, this);

			var range = selection.getRangeAt(0);
			range.insertNode(fragment);

			aEvent.preventDefault();
		},

		onUnload : function()
		{
			window.removeEventListener('unload', this, false);
			this.editor.removeEventListener('dragenter', this, true);
			this.editor.removeEventListener('dragover', this, true);
			this.editor.removeEventListener('drop', this, true);
		}
	};
	window.LinkToDroppedFiles.init();

}, false);
