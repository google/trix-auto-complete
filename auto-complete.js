// Copyright 2017 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

import $ from 'jquery';

export default class AutoComplete {
   constructor(editor, editorElement, dropDownContainer, strategies) {
      this.populateDropDown = this.populateDropDown.bind(this);
      this.editor = editor;
      this.editorElement = editorElement;
      this.dropDownContainer = dropDownContainer;
      this.strategies = strategies;
      this.autoCompleteOn = false;
      this.dropDownMenuActive = false;
      this.startingPosition = 0;
      this.endingPosition = 0;
      this.numDropDownItems = 0;
      this.currentStrategy = undefined;
    }

   /**
   * This function should be called whenever a trix change event is fired and
   * checks if the change results in a term that should populate a drop down
   * menu
   */
   autoCompleteHandler() {
      this.documentString = this.editor.getDocument().toString();
      const position = this.editor.getPosition();

      this.dropDownContainer.hide();

      // This means that the first character in the editor has been removed
      if (position === 0) {
         this.autoCompleteOn = false;
         return;
      }

      this.checkAutoComplete(this.documentString[position - 1], position - 1);
   }

   /**
    * Looks for a string that matches one of the autocomplete triggers
    *
    * @param {string} currentString
    * @param {int} position
    */
   checkAutoComplete(currentString, position) {
      if (!currentString) {
         return;
      }
      this.autoCompleteOn = false;
      let searchForTrigger = true;

      this.endingPosition = position;

      const self = this;

      while (searchForTrigger) {
         if (currentString[0] === ' ') {
            searchForTrigger = false;
            break;
         } else if (position < 0) {
            searchForTrigger = false;
            break;
         }
         for (let strategy of Array.from(self.strategies)) {
            if (strategy.trigger.test(currentString)) {
               searchForTrigger = false;
               this.autoCompleteOn = true;
               this.startingPosition = position;
               this.currentStrategy = strategy;
               this.searchTerm = currentString;
               break;
            }
         }
         position--;
         currentString = this.documentString[position] + currentString;
      }
      if (this.autoCompleteOn) {
         if (this.currentStrategy.index) {
            this.searchTerm = this.searchTerm.slice(this.currentStrategy.index);
         }
         this.currentStrategy.search(this.searchTerm, this.populateDropDown);
      }
   }

   autoCompleteEnd() {
      this.autoCompleteOn = false;
      this.dropDownMenuActive = false;
      this.dropDownContainer.hide();
      this.dropDownContainer.empty();
   }

   positionDropDown() {
      // TODO Must deal with situation where trix editor moves but does not
      // change size
      const domRange = this.editor.getClientRectAtPosition(this.editor.getPosition() - 1);

      if (!domRange || !this.dropDown) {
         return;
      }

      const topVal = domRange.top + domRange.height;
      const leftVal = domRange.left + domRange.width;

      this.dropDown.css({top: topVal, left: leftVal, position: 'fixed', 'z-index': 100});
   }

   /**
    * Populates dropdown menu with array of terms matching autocomplete trigger
    *
    * @param {Array} results - array of terms that match an autocomplete trigger
    */
   populateDropDown(results) {
      if (!results || !results.length || !this.autoCompleteOn) {
         return;
      }
      this.numDropDownItems = 0;

      this.dropDownContainer.empty();
      this.dropDownContainer.append("<ul class = 'dropdown-menu'></ul>");
      this.dropDown = $('.dropdown-menu');

      this.positionDropDown();

      for (let result of Array.from(results)) {
        const html = this.currentStrategy.template(result);

        const container = $('<li/>')
            .addClass('autoComplete-item')
            .attr({'tabindex': 0, 'data-index': this.numDropDownItems})
            .append(html);

        this.dropDown.append(container);
        this.numDropDownItems++;
      }
      this.dropDownMenuActive = true;
      this.dropDownContainer.show();

      this.numDropDownItems = results.length;
      this.initEventListeners();
   }

   /**
    * Takes in a jqLite element that has been selected by the user and extracts
    * HTML of this element. Removes the term that triggered the drop down menu
    * and then calls the replace function of the current strategy
    *
    * @param {jqLite.Element} dropDownItem - element that is selected for autocomplete
    */
   insertAutoCompleteItem(dropDownItem) {
      let HTML;
      const { startingPosition } = this;
      const { endingPosition } = this;
      const { currentStrategy } = this;

      if (currentStrategy.extract) {
         HTML = currentStrategy.extract(dropDownItem[0]);
      } else {
         HTML = dropDownItem[0].innerText;
      }

      if (!HTML || (endingPosition < startingPosition)) {
         return;
      }

      this.editor.setSelectedRange([startingPosition, endingPosition + 1]);
      this.editor.deleteInDirection('forward');

      currentStrategy.replace(HTML, startingPosition);
   }

   initEventListeners() {
      const self = this;
      const dropDownItemSelector = '.autoComplete-item';
      const dropDownItemJQ = $(dropDownItemSelector);
      $(dropDownItemSelector + "[data-index='0']").focus();

      $(window).on('resize', () => self.positionDropDown());
      $(window).on('mousedown', () => self.autoCompleteEnd());

      $('trix-editor').on('mousewheel', () => self.autoCompleteEnd());

      dropDownItemJQ.on('hover',
         (function() {
            $(this).focus();
            $(this).addClass('active');}),
         (function() {
            $(this).removeClass('active');
         })
      );

      dropDownItemJQ.on('mousedown', function() {
         return self.insertAutoCompleteItem($(this));
      });

      return dropDownItemJQ.on('keydown', function(event) {
         let jquerySelector;
         if (!self.dropDownMenuActive) { return; }
         const currentDataIndex = parseInt($(this).attr('data-index'));
         let nextDataIndex = 0;

         if (event.keyCode === 38) {
            if (currentDataIndex === 0) {
               nextDataIndex = self.numDropDownItems - 1;
            } else {
               nextDataIndex = currentDataIndex - 1;
            }

            jquerySelector = dropDownItemSelector + "[data-index='" + nextDataIndex + "']";
            $(this).blur();
            $(jquerySelector).focus();
            event.preventDefault();
         } else if (event.keyCode === 40) {
            if (currentDataIndex === (self.numDropDownItems - 1)) {
               nextDataIndex = 0;
            } else {
               nextDataIndex = currentDataIndex + 1;
            }

            jquerySelector = dropDownItemSelector + "[data-index='" + nextDataIndex + "']";
            $(this).blur();
            $(jquerySelector).focus();
            event.preventDefault();
         } else if ((event.keyCode === 13) || (event.keyCode === 9)) {
            self.insertAutoCompleteItem($(this));
            self.autoCompleteEnd();
            event.preventDefault();
            self.editorElement.focus();
         } else if (event.keycode === 16) {
            event.preventDefault();
         } else {
            self.autoCompleteEnd();
            self.editorElement.focus();
         }
      });
    }
 }
