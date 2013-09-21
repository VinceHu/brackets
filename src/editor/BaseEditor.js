/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */


/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, $, CodeMirror, window */

/**
 * BaseEditor is an abstraction of any editor instance, such as ImageViewer or a code mirror wrapper
 */
define(function (require, exports, module) {
    "use strict";

    /** @type {boolean}  Guard flag to prevent focus() reentrancy (via blur handlers), even across Editors */
    var _duringFocus = false;

    /** @type {number}  Constant: ignore upper boundary when centering text */
    var BOUNDARY_CHECK_NORMAL   = 0,
        BOUNDARY_IGNORE_TOP     = 1;
    
    /**
     * Helper functions to check options.
     * @param {number} options BOUNDARY_CHECK_NORMAL or BOUNDARY_IGNORE_TOP
     */
    function _checkTopBoundary(options) {
        return (options !== BOUNDARY_IGNORE_TOP);
    }
    function _checkBottomBoundary(options) {
        return true;
    }

    /**
     * List of all current (non-destroy()ed) BaseEditor instances. Needed when changing global preferences
     * that affect all editors, e.g. tabbing or color scheme settings.
     * @type {Array.<BaseEditor>}
     */
    var _instances = [];
    
    
    /**
     * @constructor
     *
     * Creates a new BaseEditor editor instance bound to the given Document. The Document need not have
     * a "master" Editor realized yet, even if makeMasterEditor is false; in that case, the first time
     * an edit occurs we will automatically ask EditorManager to create a "master" editor to render the
     * Document modifiable.
     *
     * ALWAYS call destroy() when you are done with an Editor - otherwise it will leak a Document ref.
     *
     * @param {!Document} document  
     * @param {!jQueryObject} container  Container to add the editor to.
     */
    function BaseEditor(document, container) {
        var self = this;
        
        _instances.push(this);
        
        // Attach to document: add ref & handlers
        this.document = document;
        document.addRef();

        
        // store this-bound version of listeners so we can remove them later
        this._handleDocumentDeleted = this._handleDocumentDeleted.bind(this);
        $(document).on("change", this._handleDocumentChange);
        $(document).on("deleted", this._handleDocumentDeleted);

        

        
        // Can't get CodeMirror's focused state without searching for
        // CodeMirror-focused. Instead, track focus via onFocus and onBlur
        // options and track state with this._focused
        this._focused = false;

        
        // Initially populate with text. This will send a spurious change event, so need to make
        // sure this is understood as a 'sync from document' case, not a genuine edit
        this._duringSync = true;
        this._duringSync = false;

    }
    
    /**
     * Removes this editor from the DOM and detaches from the Document. If this is the "master"
     * Editor that is secretly providing the Document's backing state, then the Document reverts to
     * a read-only string-backed mode.
     */
    BaseEditor.prototype.destroy = function () {
        // CodeMirror docs for getWrapperElement() say all you have to do is "Remove this from your
        // tree to delete an editor instance."
        $(this.getRootElement()).remove();
        
        _instances.splice(_instances.indexOf(this), 1);
        
        // Disconnect from Document
        this.document.releaseRef();
        $(this.document).off("change", this._handleDocumentChange);
        $(this.document).off("deleted", this._handleDocumentDeleted);
        $(this.document).off("languageChanged", this._handleDocumentLanguageChanged);

    };
  

    
    /**
     * Responds to the Document's underlying file being deleted. The Document is now basically dead,
     * so we must close.
     */
    BaseEditor.prototype._handleDocumentDeleted = function (event) {
        // Pass the delete event along as the cause (needed in MultiRangeInlineEditor)
        $(this).triggerHandler("lostContent", [event]);
    };
   
    /** Returns true if the editor has focus */
    BaseEditor.prototype.hasFocus = function () {
        return this._focused;
    };
    
    
    /**
     * Returns true if the editor is fully visible--i.e., is in the DOM, all ancestors are
     * visible, and has a non-zero width/height.
     */
    BaseEditor.prototype.isFullyVisible = function () {
        return $(this.getRootElement()).is(":visible");
    };

    
    /**
     * The Document we're bound to
     * @type {!Document}
     */
    BaseEditor.prototype.document = null;
    
    /**
     * If true, we're in the middle of syncing to/from the Document. Used to ignore spurious change
     * events caused by us (vs. change events caused by others, which we need to pay attention to).
     * @type {!boolean}
     */
    BaseEditor.prototype._duringSync = false;

    
    // Define public API
    exports.BaseEditor              = BaseEditor;
    exports.BOUNDARY_CHECK_NORMAL   = BOUNDARY_CHECK_NORMAL;
    exports.BOUNDARY_IGNORE_TOP     = BOUNDARY_IGNORE_TOP;
});
