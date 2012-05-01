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

		mDirectoryService : Components.classes['@mozilla.org/file/directory_service;1']
			.getService(Components.interfaces.nsIProperties),

		mMIMEService : Components.classes['@mozilla.org/mime;1']
			.getService(Components.interfaces.nsIMIMEService),

		get fileHandler()
		{
			if (!this.mFileHandler)
				this.mFileHandler = this.mIOService.getProtocolHandler('file')
					.QueryInterface(Components.interfaces.nsIFileProtocolHandler);
			return this.mFileHandler;
		},

		getFileWithPath : function(aPath)
		{
			var file = Components.classes['@mozilla.org/file/local;1']
						.createInstance(Components.interfaces.nsILocalFile);
			file.initWithPath(aPath);
			return file;
		},

		get editor()
		{
			return document.getElementById('content-frame');
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

		init : function()
		{
			window.addEventListener('unload', this, false);
			this.editor.addEventListener('drop', this, true);
		},

		handleEvent : function(aEvent)
		{
			switch (aEvent.type)
			{
				case 'drop':
					return this.onDrop(aEvent);

				case 'unload':
					return this.onUnload();
			}
		},

		onDrop : function(aEvent)
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
			if (!files.length)
				return;
		},

		onUnload : function()
		{
			window.removeEventListener('unload', this, false);
			this.editor.removeEventListener('drop', this, true);
		}
	};
	window.LinkToDroppedFiles.init();

}, false);
