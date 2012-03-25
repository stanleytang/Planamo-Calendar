/**
 * Class: EventTextBox
 * -------------------------------
 * The class for event textbox where user can type in an event.
 * EventTextBox can only communicate directly with EventSlider
 */

function EventTextBox(slider, options) {
  var t = this;
  var textbox = $("#add-event-textbox");
  var textboxFrame = $("#sidebar-top");
  var textboxForm = $("#add-event-form");
  var event = null;
  var resetable = true;
  var prevTextboxVal = ""; // helps keep track of when to reset textbox
  
  //exports
  t.render = render;
  t.resetTextbox = resetTextbox;

  /*** RENDERING ***/
  function render() {
	
		/* TEXTBOX CALLBACK FUNCTIONS ***/
		
		/* On click */
    textbox.click(function () {
    	textbox.height(48);
			readjustSidebarHeight();	
			textbox.autoResize({
					minHeight: 48,
			    extraSpace : 0,
					onAfterResize: function() {
						readjustSidebarHeight();
					}
			});
    });

		/* On blur */
		textbox.blur( function() {
			if (!event) {
				textbox.height(22);
				readjustSidebarHeight();
			}
		});
   
		/* Keypress */
    textboxForm.keyup(processKeystroke);
    
    /* Submit */
    textboxForm.submit(function() { return false; });
  }
  
  /**
   * Function: resetTextbox
   * ----------------------
   * Resets the state of the textbox to initial state (no text).
   * This function is ignored if "resetable" is false.
   *
   * @param none
   * @return none
   */
  function resetTextbox() {
    if (!resetable) return;
    event = null;
		textbox.blur();
    textbox.val("");
    prevTextboxVal = "";
		//textbox.animate({"height": "22px",}, 0 );
  }


	/**
	 * Function: readjustSidebarHeight
	 * --------------------------------
	 * When the NLP box expands, the height of the sidebar is readjusted
	 * to ensure the content still fits in the browser (and no scrollbar
	 * is needed)
	 */
	function readjustSidebarHeight() {
		var sidebarMainHeight = $("#sidebar-container").height() - textboxFrame.height();
		$("#sidebar-main").height(sidebarMainHeight);
		$("#event-slider-container").height(sidebarMainHeight);
	}

  /*** NLP background work ***/
  /**
  * Function: processKeystroke
  * --------------------------
  * Analyzes the current text and uses natural language processing to parse it
  *
  * @param keystroke event
  * @return none
  */
  function processKeystroke(e) {
    if (textbox.val() == "" && prevTextboxVal == "") {
      slider.close(null, true);
      resetTextbox();
      return;
    }
    
    prevTextboxVal = textbox.val();

    resetable = false; // do not reset textbox while processing keystroke
    var separator = textbox.val().indexOf("#");		
    var eventTitle = "";
    if (separator == -1) {
      eventTitle = textbox.val();

			//Check to see if event boxes in slider needs expanding
			$("#event-title").data('AutoResizer').check(null, true);
			$("#event-location").data('AutoResizer').check(null, true);
			
			//temp
			$("#friend-box").css('display', 'none');
			
			/*var newseparator = textbox.val().indexOf("@");
			if (newseparator != -1) {
      	eventTitle = textbox.val().substring(0, newseparator).trim();
      	var date = Date.parse(textbox.val().substring(newseparator+1).trim());
			}
			if (!date) {
        eventTitle = textbox.val();
      }*/

    } else {
			
			var newseparator = textbox.val().indexOf("@");
	
      eventTitle = textbox.val().substring(0, separator).trim();
      var date = Date.parse(textbox.val().substring(newseparator+1).trim()); 
			var nameString = textbox.val().substring(separator);
			//temp
			if (nameString.indexOf("Andy") != -1 || nameString.indexOf("andy") != -1) {
				$("#event-attendees-box").css('display', 'block');
			} else {
				$("#event-attendees-box").css('display', 'none');
			}
			
			
    }

    if (!date) {
      date = Date.parse("today");
    }
    
    newEvent = { title: eventTitle,
  	              start: date,
	                end: date,
	                allDay: true,
	                beingCreated: true,
	                nlp: true };
	                
    if (date) {
      if (!event) {
        event = newEvent;
        slider.createAndViewEvent(event);
      } else {
        // need to update each attribute because you don't want to lose eventID
        for (var attribute in newEvent) {
    	    event[attribute] = newEvent[attribute];
    	  }

        slider.update(event, true);
      }      
    } else {
      for (var attribute in newEvent) {
  	    event[attribute] = newEvent[attribute];
  	  }
      slider.viewEvent(event, true); // force cancel new events (prevent dialog from showing up)
    }
    
    resetable = true; 
  }
  
}
