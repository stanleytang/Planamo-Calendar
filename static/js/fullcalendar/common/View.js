

function View(element, calendar, viewName) {
	var t = this;
	
	
	// exports
	t.element = element;
	t.calendar = calendar;
	t.name = viewName;
	t.opt = opt;
	t.trigger = trigger;
	//t.setOverflowHidden = setOverflowHidden;
	t.isEventDraggable = isEventDraggable;
	t.isEventResizable = isEventResizable;
	t.reportEvents = reportEvents;
	t.eventEnd = eventEnd;
	t.reportEventElement = reportEventElement;
	t.reportEventClear = reportEventClear;
	t.eventElementHandlers = eventElementHandlers;
	t.showEvents = showEvents;
	t.hideEvents = hideEvents;
	t.eventDrop = eventDrop;
	t.eventResize = eventResize;
	// t.title
	// t.start, t.end
	// t.visStart, t.visEnd
	
	
	// imports
	var defaultEventEnd = t.defaultEventEnd;
	var normalizeEvent = calendar.normalizeEvent; // in EventManager
	var reportEventChange = calendar.reportEventChange;
	
	
	// locals
	var eventsByID = {};
	var eventElements = [];
	var eventElementsByID = {};
	var options = calendar.options;
	
	
	
	function opt(name, viewNameOverride) {
		var v = options[name];
		if (typeof v == 'object') {
			return smartProperty(v, viewNameOverride || viewName);
		}
		return v;
	}

	
	function trigger(name, thisObj) {
		return calendar.trigger.apply(
			calendar,
			[name, thisObj || t].concat(Array.prototype.slice.call(arguments, 2), [t])
		);
	}
	
	
	/*
	function setOverflowHidden(bool) {
		element.css('overflow', bool ? 'hidden' : '');
	}
	*/
	
	
	function isEventDraggable(event) {
		return isEventEditable(event) && !opt('disableDragging');
	}
	
	
	function isEventResizable(event) { // but also need to make sure the seg.isEnd == true
		return isEventEditable(event) && !opt('disableResizing');
	}
	
	
	function isEventEditable(event) {
		return firstDefined(event.editable, (event.source || {}).editable, opt('editable'));
	}
	
	
	
	/* Event Data
	--------------------------------------------------------------------------*/
	
	
	// report when view receives new events
	function reportEvents(events) { // events are already normalized at this pt
		eventsByID = {};
		var i, len=events.length, event;
		for (i=0; i<len; i++) {
			event = events[i];
			if (eventsByID[event._id]) {
				eventsByID[event._id].push(event);
			}else{
				eventsByID[event._id] = [event];
			}
		}
	}
	
	
	// returns a Date object for an event's end
	function eventEnd(event) {
		return event.end ? cloneDate(event.end) : defaultEventEnd(event);
	}
	
	
	
	/* Event Elements
	--------------------------------------------------------------------------*/
	
	
	// report when view creates an element for an event
	function reportEventElement(event, element) {
		eventElements.push(element);
		if (eventElementsByID[event._id]) {
			eventElementsByID[event._id].push(element);
		}else{
			eventElementsByID[event._id] = [element];
		}
	}
	
	
	function reportEventClear() {
		eventElements = [];
		eventElementsByID = {};
	}
	
	
	// attaches eventClick, eventMouseover, eventMouseout
	function eventElementHandlers(event, eventElement) {
		eventElement
			.click(function(ev) {
				if (!eventElement.hasClass('ui-draggable-dragging') &&
					!eventElement.hasClass('ui-resizable-resizing')) {
						return trigger('eventClick', this, event, ev);
					}
			})
			.hover(
				function(ev) {
					trigger('eventMouseover', this, event, ev);
				},
				function(ev) {
					trigger('eventMouseout', this, event, ev);
				}
			);
		// TODO: don't fire eventMouseover/eventMouseout *while* dragging is occuring (on subject element)
		// TODO: same for resizing
	}
	
	
	function showEvents(event, exceptElement) {
		eachEventElement(event, exceptElement, 'show');
	}
	
	
	function hideEvents(event, exceptElement) {
		eachEventElement(event, exceptElement, 'hide');
	}
	
	
	function eachEventElement(event, exceptElement, funcName) {
		var elements = eventElementsByID[event._id],
			i, len = elements.length;
		for (i=0; i<len; i++) {
			if (!exceptElement || elements[i][0] != exceptElement[0]) {
				elements[i][funcName]();
			}
		}
	}
	
	
	
	/* Event Modification Reporting
	--------------------------------------------------------------------------*/
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
	
	function eventDrop(e, event, dayDelta, minuteDelta, allDay, ev, ui) {
	    var oldAllDay = event.allDay;
        var eventId = event._id;
		
        //TODO - break off, compatible with slider
        
        //Current code assumes no slider
        if (event.repeating && !event.beingCreated) {
            var changeAll = confirm("Click OK to change for all future events. Cancel for this event only");

            //TODO - decomp code

            //Create unique event
            if (!changeAll) {
                eventId = event._id = event.id = -1; 
                //Change event times
                minuteDelta = minuteDelta || 0;
                if (allDay !== undefined) {
    				event.allDay = allDay;
    			}
                addMinutes(addDays(event.start, dayDelta, true), minuteDelta);
                addMinutes(addDays(event.end, dayDelta, true), minuteDelta);
                
                currentEvent = event;
                
                //Create new event
    		    if (currentEvent.allDay) {
    		        currentEvent.start.setHours(12);
    		        currentEvent.end.setHours(13);
    		    }
    		    
    		    // TODO need to create event exception (delete repeat instance)
    		    
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
                
                $.ajax({
                    type: 'POST',
                    url: '/cal/createEvent/',
                    data: eventJSONObject,
                    success: function(data) {
                        if (data.success) {
                            var oldID = currentEvent.id;
                            currentEvent._id = currentEvent.id = data.eventID;
                            calendar.renderEvent(currentEvent, true, oldID);
                            $("#notification-box-container").show().delay(notificationBoxDelay).fadeOut();
                            $("#notification-content").html("Successfuly updated event to calendar");
                        } else {
                            $("#notification-box-container").show().delay(notificationBoxDelay).fadeOut();
                            $("#notification-content").html("Error saving event");
                        }
                    },
                    dataType: 'json'
                });
                
                return;
                
                //TODO - add exception to repeating event

            //Change all future events
            } else {
                //If event is first instance in repeat series
                if (event.start.toString() == event.repeatStartDate.toString()) {
                    var eventInstanceIsFirst = true;

                //If event is in middle of series, break off into two repeat series
                } else {
                    var oldStart = new Date(event.start);
                    oldStart.setHours(23);
                    oldStart.setMinutes(59);
                    
                    //Change event times
                    minuteDelta = minuteDelta || 0;
                    if (allDay !== undefined) {
        				event.allDay = allDay;
        			}
                    addMinutes(addDays(event.start, dayDelta, true), minuteDelta);
                    addMinutes(addDays(event.end, dayDelta, true), minuteDelta);
                    
                    $.ajax({
                		type: 'POST',
                		url: '/cal/splitRepeatingEvents/',
                		data: {
                			'eventID': event.id,
                			'newStart': event.start.toString(),
                			'oldStart': oldStart.toString(),
                			'newEnd': event.end.toString(),
                			'allDay': event.allDay ? true : false,
                		},
                		success: function(data) {
                			if (data.success) {
                				calendar.refetchEvents();
                				$("#notification-box-container").show().delay(notificationBoxDelay).fadeOut();
                				$("#notification-content").html("Successfully updated event to calendar");
                			} else {
                				$("#notification-box-container").show().delay(notificationBoxDelay).fadeOut();
                				$("#notification-content").html("Error updating event");
                			}
                		},
                		dataType: 'json'
                	});
                	return;
                }
            }
        } 
        
        moveEvents(eventsByID[eventId], dayDelta, minuteDelta, allDay);

        //if event is first instance in repeat series
        if (eventInstanceIsFirst) {
            event.repeatStartDate = new Date(event.start.toString());
        }

        trigger(
            'eventDrop',
            e,
            event,
            dayDelta,
            minuteDelta,
            allDay,
            function() {
                // TODO: investigate cases where this inverse technique might not work
                moveEvents(eventsByID[eventId], -dayDelta, -minuteDelta, oldAllDay);
                reportEventChange(eventId);
            },
            ev,
            ui
        );
        reportEventChange(eventId);
    }
	
	
	function eventResize(e, event, dayDelta, minuteDelta, ev, ui) {
		var eventId = event._id;
		elongateEvents(eventsByID[eventId], dayDelta, minuteDelta);
		trigger(
			'eventResize',
			e,
			event,
			dayDelta,
			minuteDelta,
			function() {
				// TODO: investigate cases where this inverse technique might not work
				elongateEvents(eventsByID[eventId], -dayDelta, -minuteDelta);
				reportEventChange(eventId);
			},
			ev,
			ui
		);
		reportEventChange(eventId);
	}
	
	
	
	/* Event Modification Math
	---------------------------------------------------------------------------------*/
	
	
	function moveEvents(events, dayDelta, minuteDelta, allDay) {
		minuteDelta = minuteDelta || 0;
		for (var e, len=events.length, i=0; i<len; i++) {
			e = events[i];
			if (allDay !== undefined) {
				e.allDay = allDay;
			}
			addMinutes(addDays(e.start, dayDelta, true), minuteDelta);
			if (e.end) {
				e.end = addMinutes(addDays(e.end, dayDelta, true), minuteDelta);
			}
			normalizeEvent(e, options);
		}
	}
	
	
	function elongateEvents(events, dayDelta, minuteDelta) {
		minuteDelta = minuteDelta || 0;
		for (var e, len=events.length, i=0; i<len; i++) {
			e = events[i];
			e.end = addMinutes(addDays(eventEnd(e), dayDelta, true), minuteDelta);
			normalizeEvent(e, options);
		}
	}
	

}
