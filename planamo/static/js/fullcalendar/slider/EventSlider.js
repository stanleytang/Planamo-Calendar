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
	var originalEvent = new Object(); // keeps a copy of the orignal state of currentEvent. 
                            // So if a user decides to cancel, we can revert
                            
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
    t.extended = extended;
	
	/* ical colors: custom orange (original is ff892e), green, red, blue, pink, purple */
	var eventColorOptions = ['#ee7000', '#00ad38', '#f62725', 
	    '#006ed5', '#c744b5', '#6144aa']; 
													 
	/* notification box - milliseconds to display before fading away
	TODO - also initialized in calendar.html... some way of only having
	to declare once? */
	var notificationBoxDelay = 3000;
	
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
	    slider.append(renderEventHeader(), renderEventAttendeesBox(), 
	        renderEventContent(), renderEventButtons());
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
            if (t.extended) {
                //ESC - cancel event
                if (e.keyCode == 27)  { 
                    $(".close-slider").click();
                } 

                //Enter - submit event
                if (e.keyCode == 13) { 
                    $('.event-editable').blur();
                    if (calendar.isNewEventBeingCreated()) {
                        $('#add-event-button').click();
                    } else {
                        $("#done-event-button").click();
                    }
                }

                //Delete - delete event
                if (e.keyCode === 8) {
                    var element = e.target.nodeName.toLowerCase();
                    if ((element != 'input' && element != 'textarea') || $(e.target).attr("readonly")) {
                        $('.event-editable').blur();
                        if (calendar.isNewEventBeingCreated()) {
                            $('#cancel-event-button').click();
                        } else {
                            $("#delete-event-button").click();
                        }
                        return false;
                    }
                }
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
			calendar.rerenderEvents(currentEvent.id);
		});
		
		/* repeating event callback */
		$("#event-repeat").change(function() {
            if (this.value != 'none') {
                //TODO - update repeating event rendering
                if (this.value == 'every-day') currentEvent.repeating = 1;
                else if (this.value == 'every-week') currentEvent.repeating = 2;
                else if (this.value == 'every-month') currentEvent.repeating = 3;
                else currentEvent.repeating = 4; //defaults to every-year 

                if (!currentEvent.repeatStartDate) currentEvent.repeatStartDate = currentEvent.start;
                if (!currentEvent.repeatEndDate) $("#end-repeat-option").val('never');
                updateEventEndRepeatOptions();
                $("#end-repeat-option").parent().parent().show();
            } else {
                currentEvent.repeating = 0;
                currentEvent.repeatStartDate = null;
                currentEvent.repeatEndDate = null;
                $("#end-repeat-option").parent().parent().hide();
            }
        });
        //TODO - update repeating event re-rendering
		$("#end-repeat-option").change(function() {
            updateEventEndRepeatOptions()
        });
        
        /* HELPER FUNCTION: Updates the end date options for repeating events */
        function updateEventEndRepeatOptions() {
            if ($("#end-repeat-option").val() == 'never') {
                $("#event-end-repeat-date").hide();
                currentEvent.repeatEndDate = 0;
            } else {
                $("#event-end-repeat-date").show();
                if (!currentEvent.repeatEndDate) {
                    $('#event-end-repeat-date').
                        val(formatDate(currentEvent.end, true));
                    currentEvent.repeatEndDate = currentEvent.end;
                } else {
                    $('#event-end-repeat-date').val(formatDate(currentEvent.repeatEndDate, true));
                }
            }
        }
		
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
			    cancelEventChanges();
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
		var eventDetailsList = ["location", "all day", "from", "to", "repeat", 
		                            "end", "notes", "color"];
				
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
		} else if (detailInput == "repeat") {
			eventDetailInput = "<select id='event-repeat'>" +
			                        "<option value='none'>None</option>" +
			                        "<option value='every-day'>Every day</option>" +
			                        "<option value='every-week'>Every week</option>" +
			                        "<option value='every-month'>Every month</option>" +
			                        "<option value='every-year'>Every year</option>" +
			                    "</select>";  
		} else if (detailInput == "end")	{
		    eventDetailInput = "<select id='end-repeat-option'>" +
 			                        "<option value='never'>Never</option>" +
 			                        "<option value='on-date'>On date</option>" +
 			                    "</select>" + 
 			                    "<input id='event-end-repeat-date' class='event-editable' />";
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
	 * Function: renderEventAttendeesBox
	 * ----------------------------------
	 * Creates the event attendees box that is displayed below the
	 * title and returns the html code in jquery format
	 *
	 * @return event attendees box jquery/html code
	 */
	function renderEventAttendeesBox() {
		var box = $("<div id='event-attendees-box' />");
		
		//TODO - fix up box
		box.append(
			"<img src='/mymedia/images/andypic.jpg' width='45' height='45'>" + 
			"<br>&nbsp;&nbsp;Andy");
		
		return box;
	}
  
	
	/**
	 * Function: rgb2hex
	 * -----------------
	 * Outputs a HTML hex-formatted color given an rgb color string.
	 * This is a helper funtion for the AJAX call to be standardized to send
	 * always hex-formatted colors
	 *
	 * @param rgb string
	 * @return hex string
	 */
	function rgb2hex(rgb) {
         if (rgb.search("rgb") == -1) {
              return rgb;
         } else {
              rgb = 
                rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+))?\)$/);
              function hex(x) {
                   return ("0" + parseInt(x).toString(16)).slice(-2);
              }
              return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]); 
         }
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
		    //Weird bug where all day event times gets messed up
		    if (currentEvent.allDay) {
		        currentEvent.start.setHours(12);
		        currentEvent.end.setHours(13);
		    }
		    
		    //Create event json object
		    var eventJSONObject = {
                'title': currentEvent.title,
                'location': currentEvent.location,
                'allDay': currentEvent.allDay ? true : false,
                'start': currentEvent.start.toString(),
                'end': currentEvent.end.toString(),
                'notes': currentEvent.notes,
                'color': rgb2hex(currentEvent.color)
            }
            
            //Add on repeating details
            if (currentEvent.repeating) {
                var repeatingJSONObject = {
                    'repeating': currentEvent.repeating,
                    'repeatStartDate': currentEvent.repeatStartDate.toString(),
                    'repeatEndDate': currentEvent.repeatEndDate != 0 ? currentEvent.repeatEndDate.toString() : 0
                }
                eventJSONObject = $.extend(eventJSONObject, repeatingJSONObject);
            }
            $.ajax({
                type: 'POST',
                url: '/cal/createEvent/',
                data: eventJSONObject,
                success: function(data) {
                    if (data.success) {
                        currentEvent._id = currentEvent.id = data.eventID;
                        calendar.unselect();
                        completeEventCreation();

                        textbox.resetTextbox(); 
                        calendar.renderEvent(currentEvent, true); //TODO - render repeating
                        $("#notification-box-container").show().delay(notificationBoxDelay).fadeOut();
                        $("#notification-content").html("Successfuly added event to calendar");
                    } else {
                        $("#notification-box-container").show().delay(notificationBoxDelay).fadeOut();
                        $("#notification-content").html("Error saving event");
                    }
                },
                dataType: 'json'
            });
        });
		cancelEventButton.click(function () {
		    if (calendar.isNewEventBeingCreated()) {
		        close(function () {
		            calendar.isNewEventBeingCreated() && 
		                calendar.removeEvents(calendar.isNewEventBeingCreated().id);
                    calendar.endEventCreation();
                }, true); // don't need user confirmation again for cancel event
                textbox.resetTextbox();
            } else {
                cancelEventChanges(true);
            }
        });
		doneEventButton.click(function () {
		    var updatedEventData = getChangesMadeToEvent();
		    if (updatedEventData) {
                $.ajax({
                    type: 'POST',
                    url: '/cal/updateEvent/',
                    data: updatedEventData,
                    success: function(data) {
                        if (data.success) {
                            close(null, true);
                            $("#notification-box-container").show().
                                delay(notificationBoxDelay).fadeOut();
                            $("#notification-content").
                                html("Successfuly updated event to calendar");
                        } else {
                            $("#notification-box-container").show().
                                delay(notificationBoxDelay).fadeOut();
                            $("#notification-content").
                                html("Error updating event");
                        }
                    },
                    dataType: 'json'
                });
    		} else {
		      close(null, true);
		    }
		});
		deleteEventButton.click(function () { 
			if (confirm('Are you sure you want to delete this event?')) {
				$.ajax({
					type: 'POST',
					url: '/cal/deleteEvent/',
					data: {
						'eventID': currentEvent.id
					},
					success: function(data) {
						if (data.success) {
							calendar.removeEvents(currentEvent.id);
							close();
							$("#notification-box-container").show().
							    delay(notificationBoxDelay).fadeOut();
							$("#notification-content").
							    html("Successfuly deleted event from calendar");
						} else {
							$("#notification-box-container").show().
							    delay(notificationBoxDelay).fadeOut();
							$("#notification-content").
							    html("Error deleting event from calendar");
						}
					},
					dataType: 'json'
				});
			} else {
				return false;
			}
		});
		
		//add to event buttons div
		eventButtons.append(addEventButton, doneEventButton, 
		    cancelEventButton, deleteEventButton);
		
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
			$("#cancel-event-button").show();
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
	     
	     // Make copy of event
	     originalEvent = $.extend({}, currentEvent);
	     originalEvent.start = currentEvent.start.clone();
	     originalEvent.end = currentEvent.end.clone();
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
    
        /* start date */
		$("#event-time-start").datetimepicker({
		    ampm: true,hourGrid: 12,
		    minuteGrid: 10,
		    onSelect: function (input) {
		        setStartDate(input);
		        calendar.rerenderEvents(currentEvent.id);
		    }
		}).mask("29/49/9999 29:69 hi", {
		    placeholder: 'mm/dd/yyyy hh:mm am'
  		});
  		
  		/* finish date */
		$("#event-time-finish").datetimepicker({
		    ampm: true,
		    hourGrid: 12,
		    minuteGrid: 10,
		    onSelect: function (input) {
		        setEndDate(input);
		        calendar.rerenderEvents(currentEvent.id);
		    }
		}).mask("29/49/9999 29:69 hi", {
		    placeholder: 'mm/dd/yyyy hh:mm am'
  		});
  		
  		/* repeating end date */
  		$("#event-end-repeat-date").datetimepicker({
		    onSelect: function (input) {
		        var endDate = getDateFromInput(input, true);
		        if (currentEvent.repeatStartDate && endDate < currentEvent.repeatStartDate) {
		            endDate = currentEvent.repeatEndDate || currentEvent.repeatStartDate;
		            $('#event-end-repeat-date').val(formatDate(endDate, true));
		            $("#event-end-repeat-date").datetimepicker("setDate", endDate);
		        }
		        endDate.setHours(23);
		        endDate.setMinutes(59);
		        currentEvent.repeatEndDate = endDate;
		    },
		    showTimepicker: false
		}).mask("29/49/9999", {
		    placeholder: 'mm/dd/yyyy'
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
        date.setSeconds(0);

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
   * Function: getChangesMadeToEvent
   * ----------------------------
   * Detects if changes have been made to the current event.
   * If so, create a new object that contains only the changed 
   * values of the event. Otherwise, return NULL
   * NOTE: Only applies to current event. Ignores new events
   *
   * @return Updated event values, or NULL
   */
   function getChangesMadeToEvent() {
       var updatedEvent = {};

       //Hack fix - sometimes, fullcalendar automatically adds a few seconds to dates. TODO
       currentEvent.start.setSeconds(0);
       currentEvent.end.setSeconds(0);
       originalEvent.start.setSeconds(0);
       originalEvent.end.setSeconds(0);

       //Weird bug where all day event times gets messed up
       if (currentEvent.allDay) {
           currentEvent.start.setHours(12);
           currentEvent.end.setHours(13);
       }

       if (currentEvent && !calendar.isNewEventBeingCreated()) {
           for (var name in currentEvent) {
               if (currentEvent.hasOwnProperty(name)) {
                   if (name === "highlight" || name == "source" || name.indexOf("_") == 0) continue;
                   if (name == "start" || name == "end") {
                       if (currentEvent[name].toString() != originalEvent[name].toString()) {
                           if (name == "start") updatedEvent.start = currentEvent.start.toString();
                           else if (name == "end") updatedEvent.end = currentEvent.end.toString();
                       }
                   } else if (name == "repeatStartDate" || name == "repeatEndDate") {
                       //If one of the repeat end dates is 0
                        if (originalEvent[name] === 0 || currentEvent[name] === 0) {
                            if (originalEvent[name] != currentEvent[name]) {
                                updatedEvent[name] = currentEvent[name];
                            }
                        //If one of the repeat end dates is valid
                        } else if (!originalEvent[name] || currentEvent[name].toDateString() != originalEvent[name].toDateString()) {
                            if (name == "repeatStartDate") updatedEvent.repeatStartDate = currentEvent.repeatStartDate.toString();
                            else if (name == "repeatEndDate") updatedEvent.repeatEndDate = currentEvent.repeatEndDate.toString(); 
                        }
                   } else if (currentEvent[name] != originalEvent[name]) {
                       if (name == "allday") updatedEvent.allday = currentEvent.allDay ? true : false;
                       else if (name == "color") updatedEvent.color = rgb2hex(currentEvent.color);
                       else updatedEvent[name] = currentEvent[name];
                   }
               }
           }
       }

       //Add event id
       if (!$.isEmptyObject(updatedEvent)) updatedEvent.eventID = currentEvent.id;
       else updatedEvent = null;

       return updatedEvent;
   } 
  
	/**
	 * Function: createAndViewEvent
	 * ----------------------------
	 * Creates an event on calendar and displays it on the slider.
	 * 
	 * @param un-normalized event to display on calendar
	 * @return none
	 */
	function createAndViewEvent(event) {
        // Before new event is created, check if there is a current event that
        // has been edited but not saved
        if (!cancelEventChanges(false, true)) {
            event.highlight = false;
            currentEvent.highlight = true;
            calendar.unselect();
            return this;
        }

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
	 * event creation is happening, or the current event has been edited but not
	 * yet saved, it prompts the user to see if s/he wants to cancel the event and 
	 * acts accordingly.
	 *
	 * @param event to view
	 * @param true if cancels created events automatically
	 * @return true if view is successful, false otherwise
	 */
	function viewEvent(event, forceCancel) {
        if (currentEvent && event.id == currentEvent.id) return;

        if (currentEvent){ 
            // if currentEvent to view is being created
            if (currentEvent.beingCreated) {
                if (!this.clear()) {
                    return this; // exit immediately if user didn't want to cancel event
                }
            } else {
                // if currentEvent was edited but not yet saved
                if (!cancelEventChanges(false, true)) {
                    event.highlight = false;
                    currentEvent.highlight = true;
                    calendar.rerenderEvents(event.id, currentEvent.id);
                    return this;
                };
            }
            currentEvent = event;
            this.update(event);
        } else {
            currentEvent = event;
            this.triggerSlider(event, forceCancel);
        }

        // Make copy of event
        originalEvent = $.extend({}, currentEvent);
        originalEvent.start = currentEvent.start.clone();
        originalEvent.end = currentEvent.end.clone();

        //Resets size of event input boxes to fit content for new event
        $("#event-title").data('AutoResizer').check(null, true);
        $("#event-location").data('AutoResizer').check(null, true);
        $("#event-notes").data('AutoResizer').check(null, true);

        //Highlight event
        if (!calendar.isNewEventBeingCreated()) {
            calendar.highlightEvent(event);
        }

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
                cancel = confirm('Your event has not been created. Are you sure you want to cancel?');
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
            t.extended = true;
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
        if (!t.extended) { // don't do anything if slider is already closed
            callback && callback(forceCancel);
            return this;
        }

        clear(forceCancel);

        if (t.extended) {
            calendar.highlightEvent();
            // if extended, call the callback function after animation ends
            slider.animate({ right: 280 }, { duration: 600,
                complete: function(){ callback && callback(forceCancel); } });
            t.extended = false;
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

        //show correct dates
        $('#event-allday').prop("checked", event.allDay); 
        configureAllDay(event.allDay);

        var $start = slider.find('#event-time-start');
        var $end   = slider.find('#event-time-finish');
        $start.val(event.start ? formatDate(event.start, event.allDay) : "");
        $end.val(event.end ? formatDate(event.end, event.allDay) : "");

        //show correct notes
        $('#event-notes').val(event.notes);

        //show correct repeating event details
        if (event.repeating) {
            if (event.repeating == 1) $("#event-repeat").val('every-day');
            if (event.repeating == 2) $("#event-repeat").val('every-week');
            if (event.repeating == 3) $("#event-repeat").val('every-month');
            if (event.repeating == 4) $("#event-repeat").val('every-year'); 
            
            //Convert date strings into date objects
            if (typeof(event.repeatStartDate)=='string') {
                event.repeatStartDate = new Date(event.repeatStartDate);
            }
            if (typeof(event.repeatEndDate)=='string') {
                event.repeatEndDate = new Date(event.repeatEndDate);
            }
           
            $("#end-repeat-option").parent().parent().show();
            if (event.repeatEndDate) {
                $("#end-repeat-option").val('on-date');
                $("#event-end-repeat-date").show();
                $('#event-end-repeat-date').val(formatDate(event.repeatEndDate, true));
            } else {
                $("#end-repeat-option").val('never');
                $("#event-end-repeat-date").hide();   
            }
        } else {
            $("#event-repeat").val('none');
            $("#end-repeat-option").parent().parent().hide();
        }

        showCorrectColorOptionTicked(event);
        showCorrectButtons();

        if(rerender) {
            calendar.rerenderEvents(event.id);
            calendar.unselect();
        }

        textbox.resetTextbox(); // if slider is updated, make NLP textbox back to empty

        return this;
    }
	
	/**
	 * Function: cancelEventChanges
	 * -----------------------
	 * Cancels the changes made to the current event. If force cancel,
	 * does not ask user beforehand whether want to cancel event. If
	 * no changes made to event, just close slider, otherwise, update
	 * details with original event
	 * NOTE: This function does not apply to new events
	 *
	 * @param true to force cancel an event without prompting user
	 * @param true if dont close slider at the end of process, otherwise close
	 * @return true if event is cancelled, otherwise false
	 */
     function cancelEventChanges(forceCancel, dontCloseSlider) {
         if (currentEvent == null) return true;

         if (getChangesMadeToEvent()) {
             if (!forceCancel) {
                 var cancel = confirm("Your changes to the event isn't saved. Are you sure you to cancel?");
                 if (!cancel) return false;
             }
             for (var name in currentEvent) {
                 if (currentEvent.hasOwnProperty(name)) {
                     currentEvent[name] = originalEvent[name];
                 }
             }

             calendar.updateEvent(currentEvent);
             //calendar.rerenderEvents(currentEvent.id);
         }
         if (!dontCloseSlider) close(null, true);
         return true;
     }
}



