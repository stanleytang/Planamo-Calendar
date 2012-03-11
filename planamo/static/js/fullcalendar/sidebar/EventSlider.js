/**
 * Class: EventSlider
 * -------------------------------
 * The class for event slider that is located in the sidebar, 
 * containing details to create or view an event.
 * The EventSlider can communicate directly with the Calendar and EventTextBox
 */

function EventSlider(calendar, options) {
  var t = this;
  var extended = false;
	var currentEvent = null; // event that is displayed on event slider, null if event slider is not visible
	var isTransitioning = false;
  var slider = $('#event-slider-container');
  var textbox; // EventTextbox to keep communicate with

  
  //exports
	t.render = render;
	t.createAndViewEvent = createAndViewEvent;
  t.viewEvent = viewEvent;
  t.update = update;
  t.clear = clear;
  t.triggerSlider = triggerSlider;
  t.close = close;
  t.completeEventCreation = completeEventCreation;
  t.setEventTextbox = setEventTextbox;
	
	/* ical colors: custom orange (original is ff892e), green, red, blue, pink, purple */
	var eventColorOptions = ['#ee7000', '#00ad38', '#f62725', 
													 '#006ed5', '#c744b5', '#6144aa']; 
	
	/* gcal colors: red, blue, green, purple, pink, yellow, orange, aqua, grey */
	//var eventColorOptions = ['#d06b64', '#a4bdfc', '#7ae7bf', '#dbadff', 
		//'#ff887c', '#fbd75b', '#ffb878', '#46d6db', '#e1e1e1'];
	
	/**
	 * Function: setEventTextbox
	 * -------------------------
	 * Sets the event textbox which the slider communicates with.
	 * This method is assumed to be called before anything with slider is done.
	 * 
	 * @param textbox object
	 * @return none
	 */
	function setEventTextbox(object) {
	  textbox = object;
	}
	
	
  /*** RENDERING ***/

	/**
	 * Function: render
	 * --------------------
	 * Creates the event slider
	 */
	function render() {
		//add the html returned by renderEventFunctions
		slider.append(renderEventHeader(), renderFriendsBox(), renderEventContent(), renderEventButtons());
    setEventSliderCallbacks();
		setSliderKeyListeners();
		
		//Event input boxes - autoexpand
		$('.event-editable').autoResize({
		    extraSpace : 0
		});
		
		//Highlights title when it is new event
		$("#event-title").focus(function(){
		    // Select input field contents
			if (calendar.isNewEventBeingCreated()) this.select();
		});

		// Date-time inputs
		setDateTime();
	}
	
	//temp - friend box
	function renderFriendsBox() {
		var box = $("<div id='friend-box' style='padding: 10px 10px 8px 15px; display:none' />");
		
		box.append(
			"<img src='/mymedia/images/andypic.jpg' width='45' height='45'>" + 
			"<br>&nbsp;&nbsp;Andy");
		
		return box;
	}
	
	/**
	 * Function: setSliderKeyListeners
	 * ---------------------------------
	 * Sets the key listeners for the slider. If it recieves
	 * an escape key event, it will cancel new events and close 
	 * existing events.  If it recieves a delete key event, it 
	 * will delete the event. If it receives an enter key, it
	 * will create new events or save exisiting events
	 *
	 * @param none
	 * @return this
	 */
	
	function setSliderKeyListeners() {
		$(document).keydown(function (e) {
			if (extended) {
				//ESC - cancel
				if (e.keyCode == 27)  { 
					$(".close-slider").click();
				} 
				
				//Enter - submit
				if (e.keyCode == 13) { 
					$('.event-editable').blur();
					if (calendar.isNewEventBeingCreated()) {
						$('#add-event-button').click();
					}
					$("#done-event-button").click();
				}
				
				//TODO: delete key
			}
		});
	}
	
	/**
	 * Function: setEventSliderCallbacks
	 * ---------------------------------
	 * Sets the callback functions for the various inputs in the event slider.
	 *
	 * @param none
	 * @return this
	 */
	function setEventSliderCallbacks() {
		/* event editable box input callbacks */
		$(".event-editable").blur(function() {
		 	if (currentEvent) {
				if ($(this).is('#event-title'))	currentEvent.title = $(this).val();
				if ($(this).is('#event-location')) currentEvent.location = $(this).val();
				if ($(this).is('#event-notes'))	currentEvent.notes = $(this).val();
				if ($(this).is('#event-time-start')) {
			  	setStartDate($(this).val());
				} else {
					if ($(this).is('#event-time-finish')) {
			  		setEndDate($(this).val());
					}
				}
				calendar.rerenderEvents(currentEvent.id);
			}
		});
		
		/* event input callback (on click) */
		/*$('#event-time-start').click(function() {
		  
		});*/
		
		/* checkbox allday callback */
		$("#event-allday").click(function() {
		  currentEvent.allDay = $("#event-allday").attr('checked') ? true : false;
			configureAllDay(currentEvent.allDay ? true : false);
			
			//TODO: set default time when unchecking
			calendar.rerenderEvents(currentEvent.id);
		});
		
		/* event color selection callback */
		$('.event-color').click(function() {
			$(".event-color").removeClass('event-color-selected');
			$(this).addClass('event-color-selected');
			currentEvent.color = $(this).css('background-color');
			
			calendar.rerenderEvents(currentEvent.id);
		});
		
		return this;
	}
	
	

	/**
	 * Function: renderEventHeader
	 * ----------------------------
	 * Creates the header section in the event slider and
	 * returns the html code in jquery format
	 *
	 * @return event header jquery/html code
	 */
	function renderEventHeader() {
		var eventHeader = $("<div id='event-header' />");
		eventHeader.append(
			"<div id='event-title-container'>" +
			"<textarea id='event-title' class='event-editable' type='text'" + 
			"value='New Event' placeholder='New Event'/>" +
			"</div>"
		);
		var closeSliderButton = $("<div class='close-slider'>x</div>");
		closeSliderButton.click(function() {
			if (calendar.isNewEventBeingCreated()) {
				$('#cancel-event-button').click();	
			} else {
				$("#done-event-button").click();
			}
		});
		eventHeader.append(closeSliderButton);
		return eventHeader;
	}
	
	/**
	 * Function: renderEventContent
	 * ----------------------------
	 * Creates the content section in the event slider and
	 * returns the html code in jquery format
	 *
	 * @return event content jquery/html code
	 */
	function renderEventContent() {
		var eventContent = $("<div id='event-content' />");
		var eventDetailsList = ["location", "all day", "from", "to", "repeat", "notes", "color"];
				
		var eventDetailTable = $("<table width='100%' cellpadding='4' cellspacing='0' />");
		for (eventDetailIndex in eventDetailsList) {
			var eventDetailName = eventDetailsList[eventDetailIndex];
			eventDetailTable.append(
			"<tr>" +
		    "<td class='detail-name'>" + eventDetailName + ":</td>" +
		    "<td class='detail-input'>" + renderEventDetailInput(eventDetailName) + "</td>" +
		  "</tr>"
			);
		}
		
		eventDetailTable.children().children()
			.filter(':first-child')
				.children().addClass('first');	
		eventDetailTable.children().children()		
			.filter(':last-child')
				.children().addClass('last');
		
		eventContent.append(eventDetailTable);
		return eventContent;
	}
	
	/**
	 * Function: renderEventDetailInput
	 * ----------------------------
	 * Creates the event detail input section in the event slider
	 * (e.g. where you enter location, time, color etc)  and returns
	 * that particular input depending on the parameter
	 *
	 * @param event input section to create
	 * @return event input section jquery/html code
	 */
	function renderEventDetailInput(detailInput) {
		var eventDetailInput;
		if (detailInput == "location" || detailInput == "notes") {
			eventDetailInput = "<textarea type='text' id='event-" + detailInput + 
			"' class='event-editable' placeholder='" + detailInput + "' />";
		} else if (detailInput == "repeat"){
			eventDetailInput = "<span id='event-repeat'>repeat - to be built</span>"; //temp
		} else if (detailInput == "all day") {
			eventDetailInput = "<input type='checkbox' id='event-allday' value='allday'/>";
		} else if (detailInput == "from") {
			eventDetailInput = "<input id='event-time-start' class='event-editable'/>";
		} else if (detailInput == "to") {
			eventDetailInput = "<input id='event-time-finish' class='event-editable'/>";
		} else if (detailInput == "color") {
			eventDetailInput = "";
			for (i = 0; i < eventColorOptions.length; ++i) {
				eventDetailInput += "<div class='event-color' style='background-color:" + eventColorOptions[i] + "' />";
			}
		}
		return eventDetailInput;
	}
	
	/**
	 * Function: renderEventButtons
	 * ----------------------------
	 * Creates the event buttons in the event slider and
	 * returns the html code in jquery format
	 *
	 * @return event buttons jquery/html code
	 */
	function renderEventButtons() {
		var eventButtons = $("<div id='event-buttons' align='center' />");
		
		//buttons
		var addEventButton = $("<div id='add-event-button'>add</div>");
		var cancelEventButton = $("<div id='cancel-event-button'>cancel</div>");
		var doneEventButton = $("<div id='done-event-button'>done</div>");
		var deleteEventButton = $("<div id='delete-event-button'>delete</div>");
		
		
		//button callbacks
		addEventButton.click(function () { 		
			$.ajax({
				type: 'POST',
				url: '/cal/createEvent/',
				data: {
					'title': currentEvent.title,
					'location': currentEvent.location,
					'allday': currentEvent.allDay,
					'start_date': currentEvent.start.toUTCString(),
					'end_date': currentEvent.end.toUTCString(),
					'notes': currentEvent.notes,
					'color': currentEvent.color
				},
				success: function(data) {
					debugger;
					if (data.success) {
						currentEvent.id = data.eventID;
						calendar.unselect();
				    completeEventCreation();
				    textbox.resetTextbox();
				    calendar.renderEvent(currentEvent, true);
					} else {
						alert("Error adding event"); //temp solution TODO create a notificaiton box
					}
				},
				dataType: 'json'
			});
		});
		cancelEventButton.click(function () {
		  close(function () {
        	calendar.isNewEventBeingCreated() &&
          calendar.removeEvents(calendar.isNewEventBeingCreated().id);
		    calendar.endEventCreation();
		  }, true); // don't need user confirmation again for cancel event
		  textbox.resetTextbox();
		});
		
		doneEventButton.click(function () { 
			close();
		});
		deleteEventButton.click(function () { 
			if (confirm('Are you sure you want to delete this event?')) {
				calendar.removeEvents(currentEvent.id);
				close();
			} else {
				return false;
			}
		});
		
		//add to event buttons div
		eventButtons.append(addEventButton, cancelEventButton, 
			doneEventButton, deleteEventButton);
		
		showCorrectButtons();
		
		return eventButtons;
	}
	
	/**
	 * Function: showCorrectButtons
	 * ----------------------------
	 * Shows the correct buttons for the event slider depending on
	 * whether it is in creating or viewing event mode
	 */
	function showCorrectButtons() {
		if (currentEvent && currentEvent.beingCreated) {
			$("#add-event-button").show();
			$("#cancel-event-button").show();
			$("#done-event-button").hide();
			$("#delete-event-button").hide();
		} else {
			$("#add-event-button").hide();
			$("#cancel-event-button").hide();
			$("#done-event-button").show();
			$("#delete-event-button").show();
		}
	}
	
	/**
	 * Function: showCorrectColorOptionTicked
	 * ----------------------------
	 * Shows the correct color option being ticked in the event slider
	 * input section for the particular event passed in
	 * 
	 * @param event object
	 * @return this
	 */
	function showCorrectColorOptionTicked(event) {
		$(".event-color").removeClass('event-color-selected');
		for (i = 1; i < eventColorOptions.length + 1; i++) {
			var colorFound = false;
			if (compareColors($(".event-color:nth-child(" + i + ")").css("background-color"), event.color)) {
				$(".event-color:nth-child(" + i + ")").addClass("event-color-selected");
				colorFound = true;
			}
			if (colorFound) break;
		}
		
		return this;
	}
	
	/**
	 * Function: completeEventCreation
	 * -------------------------------
	 * Adds event currently in =slider to the calendar permanently.
	 * Assumes that there is an event in the slider to add.
	 * 
	 * @param none
	 * @return none
	 */
	 function completeEventCreation() {
	   calendar.endEventCreation();
	   showCorrectButtons();
	 }
	
	
	//TODO: Bug - when resizing browser, datepicker doesn't move
	//pimp up datepicker
	
	
	/*** DATE-RELATED FUNCTIONS ***/
	/**
	 * Function: setStartDate
	 * ----------------------
	 * Verifies and sets (if valid) start date for an event
	 *
	 * @param input string to set start date to
	 * @return none
	 */
	function setStartDate(input) {
	  if (getDateFromInput(input, currentEvent.allDay) <= currentEvent.end) {
	    currentEvent.start = getDateFromInput(input, currentEvent.allDay);
	    $('#event-time-finish').datetimepicker('option', 'minDate', currentEvent.start);
	    $('#event-time-finish').val(formatDate(currentEvent.end, currentEvent.allDay));
	      // ^ needed to deal with bug when changing time-picker options
    } else {
      $('#event-time-start').val(formatDate(currentEvent.start, currentEvent.allDay));
    }
	}
	
	
	
	/**
	 * Function: setEndDate
	 * --------------------
	 * Verifies and sets (if valid) end date for an event
	 *
	 * @param input string to set end date to
	 * @return none
	 */
	function setEndDate(input) {
	  if (getDateFromInput(input, currentEvent.allDay) > currentEvent.start) {
	    currentEvent.end = getDateFromInput(input, currentEvent.allDay);
	    $('#event-time-start').datetimepicker('option', 'maxDate', currentEvent.end);
	    $('#event-time-start').val(formatDate(currentEvent.start, currentEvent.allDay));
	      // ^ needed to deal with bug when changing time-picker options
    } else {
      $('#event-time-finish').val(formatDate(currentEvent.end, currentEvent.allDay));
    }
	}
	
	
	
	/**
	 * Function: setDateTime
	 * ---------------------
	 * Establish date-time functionality for necessary inputs in event slider.
	 *
	 * @param none
	 * @return this
	 */
	function setDateTime() {
    $.mask.definitions['h']="[aApP]";
    $.mask.definitions['i']="[mM]";
    $.mask.definitions['2']="[0-1]";
    $.mask.definitions['4']="[0-3]";
    $.mask.definitions['6']="[0-5]";
    
		$("#event-time-start")
		  .datetimepicker({
		    ampm: true,
		    hourGrid: 12,
		    minuteGrid: 10,
		    onSelect: function (input) {
		      setStartDate(input);
		      calendar.rerenderEvents(currentEvent.id);
		    }
		  })
		  .mask("29/49/9999 29:69 hi", {
  		  placeholder: 'mm/dd/yyyy hh:mm am'
  		});
		$("#event-time-finish")
		  .datetimepicker({
		    ampm: true,
		    hourGrid: 12,
		    minuteGrid: 10,
		    onSelect: function (input) {
		      setEndDate(input);
		      calendar.rerenderEvents(currentEvent.id);
		    }
		  })
		  .mask("29/49/9999 29:69 hi", {
  		  placeholder: 'mm/dd/yyyy hh:mm am'
  		});
	}
	
	
	
	/**
	 * Function: getDateFromInput
	 * --------------------------
	 * Converts string of format "mm/dd/yyyy hh:mm am" into Date object
	 * or "mm/dd/yyyy" if event is all-day
	 *
	 * @param string to convert
	 * @param true if event is all-day
	 * @return Date object
	 */
	function getDateFromInput(s, allDay) {
	  var date = new Date();
	  
	  var month = parseInt(s.substring(0, 2), 10);
	  var day   = parseInt(s.substring(3, 5), 10);
	  var year  = parseInt(s.substring(6, 10), 10);
	  if (!allDay) {
		  var hour  = parseInt(s.substring(11,13), 10);
	    var mins  = parseInt(s.substring(14,16), 10);
	    var amPM  = (s.charAt(17) === 'a' || s.charAt(17) === 'A');
	    
	    if (hour == 12) hour = 0;
	    if (!amPM) { // PM
	      hour += 12;
	    }
	    // true means AM, false means PM
    }
	  date.setFullYear(year, month-1, day);
	  allDay ? date.setHours(0, 0) : date.setHours(hour, mins);
	  
	  return date;
	}
	
	
	
	/**
	 * Function: formatDate
	 * --------------------
	 * Formats given date object for correct display in slider
	 *
	 * @param Date object to format
	 * @param whether to format for all-day event or not
	 * @return formatted string to display
	 */
	function formatDate(date, isAllDay) {
	  if (!date) { return; } // this should only happen if event is malformed (e.g. no end date)
	  var time = {
      month : date.getMonth() + 1,
      day   : date.getDate(),
	    year  : date.getFullYear(),
	    hours : date.getHours(),
	    mins  : date.getMinutes()
    };
    
    var amPM = true; // true means AM, false means PM
    if ((time["hours"]/12 | 0) == 1) {
      amPM = false;
    }
    time["hours"] %= 12;
    if (time["hours"] == 0) time["hours"] = 12;
    
    for (var val in time) {
      if (time[val] < 10) time[val] = "0" + time[val];
    }
    
    return (time["month"] + "/" + time["day"] + "/" + time["year"] + (isAllDay ? "" : 
      " " + time["hours"] + ":" + time["mins"] + " " + (amPM ? "am" : "pm"))); 
	}
	
	
	
  /**
	 * Function: configureAllDay
	 * -------------------------
	 * Modifies the inputs for start/end slots to hide/show hours for all-day
	 *
	 * @param all day or not
	 * @return none
	 */
	function configureAllDay(allDay) {
	  if (!currentEvent) return; // if the slider is not even visible, don't do anything
	  currentEvent.allDay = allDay;
	  mask = "29/49/9999" + (allDay ? "" : " 29:69 hi");
	  placeholder = 'mm/dd/yyyy' + (allDay ? '' : ' hh:mm am');
	  
	  $('#event-time-start').datetimepicker('destroy');
    $('#event-time-start').datetimepicker({
		  ampm: true,
		  hourGrid: 12,
		  minuteGrid: 10,
		  onSelect: function (input) {
		    setStartDate(input);
	      calendar.rerenderEvents(currentEvent.id);
	    },
		  showTimepicker: !allDay
	  });
    $('#event-time-start').unmask().mask(mask, {
		  placeholder: placeholder
		});
    $('#event-time-start').val(
      formatDate(currentEvent.start, currentEvent.allDay));
	  $('#event-time-finish').datetimepicker('destroy');
	  $('#event-time-finish').datetimepicker({
		  ampm: true,
		  hourGrid: 12,
		  minuteGrid: 10,
		  onSelect: function (input) {
		    setEndDate(input);
	      calendar.rerenderEvents(currentEvent.id);
	    },
		  showTimepicker: !allDay
	  });
    $('#event-time-finish').unmask().mask(mask, {
		  placeholder: placeholder
		});
    $('#event-time-finish').val(
      formatDate(currentEvent.end, currentEvent.allDay));
	}

	
	
	/*** VIEWING ***/
	/**
	 * Function: createAndViewEvent
	 * ----------------------------
	 * Creates an event on calendar and displays it on the slider.
	 * 
	 * @param un-normalized event to display on calendar
	 * @return none
	 */
	function createAndViewEvent(event) {
	  var newEvent = calendar.createEvent(event);
    this.viewEvent(newEvent, true);
    calendar.renderEvent(newEvent, true);
    calendar.highlightEvent(newEvent);
    calendar.unselect();
	}
	
	/**
	 * Function: viewEvent
	 * -------------------
	 * Displays event in slider. If the user tries to display another event while
	 * event creation is happening, it prompts the user to see if s/he wants to
	 * cancel the event and acts accordingly.
	 *
	 * @param event to view
	 * @param true if cancels created events automatically
	 * @return true if view is successful, false otherwise
	 */
	function viewEvent(event, forceCancel) {
    if (currentEvent){
      // if currentEvent to view 
      if (currentEvent.beingCreated) {
        if (!this.clear()) {
          return this; // exit immediately if user didn't want to cancel event
        }
      }
      currentEvent = event;
      this.update(event);
    } else {
      currentEvent = event;
      this.triggerSlider(event, forceCancel);
    }
		
		//Resets size of event input boxes to fit content for new event
		$("#event-title").data('AutoResizer').check(null, true);
		$("#event-location").data('AutoResizer').check(null, true);
		$("#event-notes").data('AutoResizer').check(null, true);
			
		return this;
	}
	
	/**
	 * Function: clear
	 * ---------------------------
	 * Clears the slider of its current event, deleting a created event if it has
	 * not been added yet (if the user consents)
	 *
	 * @param true to ignore dialog
	 * @return true if clear was successful, false otherwise
	 */
	function clear(forceCancel) {
	  /* if user clicks to view another event during event creation process,
       check to see if they meant to cancel the event or not */
	  if (forceCancel || calendar.isNewEventBeingCreated()) {
	    var cancel;
	    if (!forceCancel) {
        cancel = confirm('Are you sure you want to cancel your event?');
        if (!cancel) {
          return false; // exit immediately if user didn't mean to cancel
        }
      }
      if (forceCancel || cancel) {
        calendar.unselect();
        if (currentEvent && calendar.isNewEventBeingCreated() &&
          currentEvent.id != calendar.isNewEventBeingCreated().id) {
          currentEvent && calendar.removeEvents(currentEvent.id);
          /* need to remove currentEvent instead of isNewEventBeingCreated
             because another new event could be in the process of being
             created (isNewEventBeingCreated), and you don't want to remove it.
          */
        } else {
          calendar.isNewEventBeingCreated() &&
            calendar.removeEvents(calendar.isNewEventBeingCreated().id);
          calendar.endEventCreation();
        }
      }
		}
		currentEvent = null;
		
		return true;
	}
	
	/**
	* Function: triggerSlider
	* -----------------------
	* When called, the slider gets triggered (i.e. slides out)
	* if it is not already extended. Otherwise, the event details
	* gets updated.
	* 
	* @param event to display on slider
	* @param true to force cancel an event in the middle of creation process
	*/
	function triggerSlider(event, forceCancel) {
		// close slider and then make changes to slider before sliding back out
		isTransitioning = true;
		this.close($.proxy(function () {
			slider.animate({ right: 0 }, 600);
			extended = true;
			this.update(event);
			isTransitioning = false;
		}, this), forceCancel);
		return this;
	}

	/**
	* Function: close
	* ---------------------
	* Retracts the slider to hide behind calendar.
	*
	* @param callback function to call after slider closes
	* @param true to force cancel an event in the middle of creation process
	*/
	function close(callback, forceCancel) {
    if (!extended) { // don't do anything if slider is already closed
      callback && callback(forceCancel);
      return this;
    }
    
	  clear(forceCancel);
	  
		if (extended) {
			calendar.highlightEvent();
			// if extended, call the callback function after animation ends
			slider.animate({ right: 280 }, { duration: 600,
			  complete: function(){ callback && callback(forceCancel); } });
			extended = false;
			currentEvent = null; // reset the event
		} else {
			// if not extended, call the callback function immediately
			callback && callback(forceCancel);
		}
		
		return this;
	}

	/**
	* Function: update
	* ----------------------------
	* Updates the slider information to display the given event information.
	* Should only be called to update the event already shown on the slider.
	*
	* @param event to display information of
	* @param true if event needs to be rerendered
	* @return none
	*/
	function update(event, rerender) {
	  if (!event) return this;
	  
		if ( currentEvent && 
		    (currentEvent.id !== null && event.id !== currentEvent.id) ) {
			// don't update the display if the event isn't on the slider
			return this;
		}
		
		//show correct title
		if (event.beingCreated) {
			if (event.title || event.title === "") {
			  $('#event-title').val(event.title);
		  }
			if (!event.nlp) $('#event-title').focus();
			  // don't focus if event was created by typing in EventTextbox
		} else {
			$('#event-title').val(event.title);
		}
		
		//show correct location
		$('#event-location').val(event.location);
			
		//show correct dates - temps
		$('#event-allday').prop("checked", event.allDay); 
		configureAllDay(event.allDay);
		
		var $start = slider.find('#event-time-start');
		var $end   = slider.find('#event-time-finish');
		$start.val(event.start ? formatDate(event.start, event.allDay) : "");
		$end.val(event.end ? formatDate(event.end, event.allDay) : "");
		
		//show correct notes
		$('#event-notes').val(event.notes);
		
		//TODO: repeat
		
		showCorrectColorOptionTicked(event);
		showCorrectButtons();
		
		if(rerender) {
		  calendar.rerenderEvents(event.id);
  		calendar.unselect();
		}

    textbox.resetTextbox(); // if slider is updated, make NLP textbox back to empty
		
		return this;
	}
}
