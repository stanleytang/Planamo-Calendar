
function BasicEventRenderer() {
	var t = this;
	
	
	// exports
	t.renderEvents = renderEvents;
	t.compileDaySegs = compileSegs; // for DayEventRenderer
	t.clearEvents = clearEvents;
	t.bindDaySeg = bindDaySeg;
	
	
	// imports
	DayEventRenderer.call(t);
	var opt = t.opt;
	var trigger = t.trigger;
	//var setOverflowHidden = t.setOverflowHidden;
	var isEventDraggable = t.isEventDraggable;
	var isEventResizable = t.isEventResizable;
	var reportEvents = t.reportEvents;
	var reportEventClear = t.reportEventClear;
	var eventElementHandlers = t.eventElementHandlers;
	var showEvents = t.showEvents;
	var hideEvents = t.hideEvents;
	var eventDrop = t.eventDrop;
	var getDaySegmentContainer = t.getDaySegmentContainer;
	var getHoverListener = t.getHoverListener;
	var renderDayOverlay = t.renderDayOverlay;
	var clearOverlays = t.clearOverlays;
	var getRowCnt = t.getRowCnt;
	var getColCnt = t.getColCnt;
	var renderDaySegs = t.renderDaySegs;
	var resizableDayEvent = t.resizableDayEvent;
	
	
	
	/* Rendering
	--------------------------------------------------------------------*/
	/**
	  * Function: cloneEvent
	  * --------------------
	  * Clones an event
	  * @param event to clone
	  * @return cloned event
	  */
	 function cloneEvent(event) {
	     var clone = $.extend({}, event);
	     clone.start = event.start.clone();
	     clone.end = event.end.clone();
	     
	     return clone;
	 }
	
	function renderEvents(events, modifiedEventId) {
	    /* The renderer needs to render each repeat instance for a repeat event
	       that has not been created serverside yet */
	    /** BEGIN REPEAT RENDERING LOGIC **/
	    var repeatingEvent = this.calendar.isNewEventBeingCreated();
	    
        if (repeatingEvent && repeatingEvent.repeating) {
            // clean out repeating event instances in events array
    	    for (var i = 0; i < events.length; i++) {
    	        if (events[i].id == repeatingEvent.id) {
    	            events.splice(i, 1);
    	            i--;
    	        }
    	    }
    	    var length = +repeatingEvent.end - (+repeatingEvent.start);
            
	        switch (repeatingEvent.repeating) {
	            case 1:
	                var INTERVAL = 1000*3600*24 // millis in a day
	                var startTime = +repeatingEvent.start;
	                
	                while (startTime < +this.visStart) {
	                    startTime += INTERVAL;
	                }
	                
	                var start = new Date(startTime);
	                var end = new Date(startTime + length);
	                while (!this.calendar.isFetchNeeded(start, end)) {
	                    var repeatInstance = cloneEvent(repeatingEvent);
	                    repeatInstance.start = start;
	                    repeatInstance.end = end;
	                    events.push(repeatInstance);
	                    
	                    start = new Date(+start + INTERVAL);
	                    end = new Date(+end + INTERVAL);
	                }
	                break;
                case 2:
                    var INTERVAL = 1000*3600*24*7 // millis in a week
                    var startTime = +repeatingEvent.start;
                
                    while (startTime < +this.visStart) {
                        startTime += INTERVAL;
                    }
                
                    var start = new Date(startTime);
                    var end = new Date(startTime + length);
                    while (!this.calendar.isFetchNeeded(start, end)) {
                        var repeatInstance = cloneEvent(repeatingEvent);
                        repeatInstance.start = start;
                        repeatInstance.end = end;
                        events.push(repeatInstance);
                    
                        start = new Date(+start + INTERVAL);
                        end = new Date(+end + INTERVAL);
                    }
                    break;
                case 3:
                    var start = cloneDate(repeatingEvent.start);
                    var day = repeatingEvent.start.getDate();
                    var month = repeatingEvent.start.getMonth();

                    while (+start < +this.visStart || start.getDate() != day) {
                        start.setMonth(++month);
                        start.setDate(day);
                        
                        month = start.getMonth();
                    }
                    
                    var end = new Date(+start + length);
                    while (!this.calendar.isFetchNeeded(start, end)) {
                        var repeatInstance = cloneEvent(repeatingEvent);
                        repeatInstance.start = cloneDate(start);
                        repeatInstance.end = end;
                        events.push(repeatInstance);
                        
                        start.setMonth(++month);
                        month = start.getMonth();
                        while (start.getDate() != day) {
                            start.setMonth(++month);
                            month = start.getMonth();
                            
                            start.setDate(day);
                        }
                        end = new Date(+start + length);
                    }
                    break;
                case 4:
                    var start = cloneDate(repeatingEvent.start);
                    var day = repeatingEvent.start.getDate();
                    var month = repeatingEvent.start.getMonth();
                    var year = repeatingEvent.start.getFullYear();

                    while (+start < +this.visStart || start.getDate() != day) {
                        start.setFullYear(++year);
                        start.setDate(day);
                        start.setMonth(month);
                    }

                    var end = new Date(+start + length);
                    while (!this.calendar.isFetchNeeded(start, end)) {
                        var repeatInstance = cloneEvent(repeatingEvent);
                        repeatInstance.start = cloneDate(start);
                        repeatInstance.end = end;
                        events.push(repeatInstance);

                        start.setFullYear(++year);
                        while (start.getDate() != day) {
                            start.setFullYear(++year);
                            start.setDate(day);
                            start.setMonth(month);
                        }
                        end = new Date(+start + length);
                    }
                    break;
	        }
	    }
	    
	    /** END REPEAT RENDERING LOGIC **/
	    
		reportEvents(events);
		renderDaySegs(compileSegs(events), modifiedEventId);
	}
	
	
	function clearEvents() {
		reportEventClear();
		getDaySegmentContainer().empty();
	}
	
	
	function compileSegs(events) {
		var rowCnt = getRowCnt(),
			colCnt = getColCnt(),
			d1 = cloneDate(t.visStart),
			d2 = addDays(cloneDate(d1), colCnt),
			visEventsEnds = $.map(events, exclEndDay),
			i, row,
			j, level,
			k, seg,
			segs=[];
		for (i=0; i<rowCnt; i++) {
			row = stackSegs(sliceSegs(events, visEventsEnds, d1, d2));
			for (j=0; j<row.length; j++) {
				level = row[j];
				for (k=0; k<level.length; k++) {
					seg = level[k];
					seg.row = i;
					seg.level = j; // not needed anymore
					segs.push(seg);
				}
			}
			addDays(d1, 7);
			addDays(d2, 7);
		}
		return segs;
	}
	
	
	function bindDaySeg(event, eventElement, seg) {
		if (isEventDraggable(event)) {
			draggableDayEvent(event, eventElement);
		}
		if (seg.isEnd && isEventResizable(event)) {
			resizableDayEvent(event, eventElement, seg);
		}
		eventElementHandlers(event, eventElement);
			// needs to be after, because resizableDayEvent might stopImmediatePropagation on click
	}
	
	
	
	/* Dragging
	--------------------------------------------------------------------------*/
	
	
	function draggableDayEvent(event, eventElement) {
		var hoverListener = getHoverListener();
		var dayDelta;
		eventElement.draggable({
			zIndex: 9,
			delay: 50,
			opacity: opt('dragOpacity'),
			revertDuration: opt('dragRevertDuration'),
			start: function(ev, ui) {
				trigger('eventDragStart', eventElement, event, ev, ui);
				//hideEvents(event, eventElement);
				hoverListener.start(function(cell, origCell, rowDelta, colDelta) {
					eventElement.draggable('option', 'revert', !cell || !rowDelta && !colDelta);
					clearOverlays();
					if (cell) {
						//setOverflowHidden(true);
						dayDelta = rowDelta*7 + colDelta * (opt('isRTL') ? -1 : 1);
						renderDayOverlay(
							addDays(cloneDate(event.start), dayDelta),
							addDays(exclEndDay(event), dayDelta)
						);
					}else{
						//setOverflowHidden(false);
						dayDelta = 0;
					}
				}, ev, 'drag');
			},
			stop: function(ev, ui) {
				hoverListener.stop();
				clearOverlays();
				trigger('eventDragStop', eventElement, event, ev, ui);
				if (dayDelta) {
					eventDrop(this, event, dayDelta, 0, event.allDay, ev, ui);
				}else{
					eventElement.css('filter', ''); // clear IE opacity side-effects
					showEvents(event, eventElement);
				}
				//setOverflowHidden(false);
			}
		});
	}


}
