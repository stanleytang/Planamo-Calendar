
fc.sourceNormalizers = [];
fc.sourceFetchers = [];

var ajaxDefaults = {
	dataType: 'json',
	cache: false
};

var eventGUID = 1;


function EventManager(options, _sources) {
	var t = this;
	
	
	// exports
	t.isFetchNeeded = isFetchNeeded;
	t.fetchEvents = fetchEvents;
	t.addEventSource = addEventSource;
	t.removeEventSource = removeEventSource;
	t.updateEvent = updateEvent;
	t.renderEvent = renderEvent;
	t.removeEvents = removeEvents;
	t.clientEvents = clientEvents;
	t.normalizeEvent = normalizeEvent;
	t.isNewEventBeingCreated = isNewEventBeingCreated;
	t.endEventCreation = endEventCreation;
	t.createEvent = createEvent;
	t.updateCreatedEvent = updateCreatedEvent;
	t.highlightEvent = highlightEvent;
	t.getHighlightedEvent = getHighlightedEvent;
	
	// imports
	var trigger = t.trigger;
	var getView = t.getView;
	var reportEvents = t.reportEvents;

	
	// locals
	var stickySource = { events: [] };
	var sources = [ stickySource ];
	var rangeStart, rangeEnd;
	var currentFetchID = 0;
	var pendingSourceCnt = 0;
	var loadingLevel = 0;
	var cache = [];
	var newEventBeingCreated = null;
	  // detailed explanation in function header for "isNewEventBeingCreated"
	var prevHighlightedEvent = null;
	
	
	for (var i=0; i<_sources.length; i++) {
		_addEventSource(_sources[i]);
	}
	
	
	
	/* Fetching
	--------------------------------------------------------------------------*/
	
	
	function isFetchNeeded(start, end) {
		return !rangeStart || start < rangeStart || end > rangeEnd;
	}
	
	
	function fetchEvents(start, end) {
		rangeStart = start;
		rangeEnd = end;
		cache = [];
		var fetchID = ++currentFetchID;
		var len = sources.length;
		pendingSourceCnt = len;
		for (var i=0; i<len; i++) {
			fetchEventSource(sources[i], fetchID);
		}
	}
	
	
	function fetchEventSource(source, fetchID) {
		_fetchEventSource(source, function(events) {
			if (fetchID == currentFetchID) {
				if (events) {
					for (var i=0; i<events.length; i++) {
						events[i].source = source;
						normalizeEvent(events[i]);
					}
					cache = cache.concat(events);
				}
				pendingSourceCnt--;
				if (!pendingSourceCnt) {
					reportEvents(cache);
				}
			}
		});
	}
	
	
	function _fetchEventSource(source, callback) {
		var i;
		var fetchers = fc.sourceFetchers;
		var res;
		for (i=0; i<fetchers.length; i++) {
			res = fetchers[i](source, rangeStart, rangeEnd, callback);
			if (res === true) {
				// the fetcher is in charge. made its own async request
				return;
			}
			else if (typeof res == 'object') {
				// the fetcher returned a new source. process it
				_fetchEventSource(res, callback);
				return;
			}
		}
		var events = source.events;
		if (events) {
			if ($.isFunction(events)) {
				pushLoading();
				events(cloneDate(rangeStart), cloneDate(rangeEnd), function(events) {
					callback(events);
					popLoading();
				});
			}
			else if ($.isArray(events)) {
				callback(events);
			}
			else {
				callback();
			}
		}else{
			var url = source.url;
			if (url) {
				var success = source.success;
				var error = source.error;
				var complete = source.complete;
				var data = $.extend({}, source.data || {});
				var startParam = firstDefined(source.startParam,
				    options.startParam);
				var endParam = firstDefined(source.endParam, options.endParam);
				if (startParam) {
					//data[startParam] = Math.round(+rangeStart / 1000);
					data[startParam] = rangeStart.toString();
				}
				if (endParam) {
					//data[endParam] = Math.round(+rangeEnd / 1000);
					data[endParam] = rangeEnd.toString();
				}
				pushLoading();
				$.ajax($.extend({}, ajaxDefaults, source, {
					data: data,
					success: function(events) {
						events = events || [];
	                        //debugger;
	                  //  if (!prevHighlightedEvent || !(prevHighlightedEvent.repeating && !prevHighlightedEvent.beingCreated)) {
	                        cache = [];
	                  //  }
	                    
	                    /* Add highlighted event to cache 
						Assumes beingCreated events are also highlighted */			
	                    if (prevHighlightedEvent) 
	                        cache.push(prevHighlightedEvent);
	                        
	                 
	                    /*
	                    if (cache) {
	                        var eventsLength = events.length
	                        for (var i = 0; i < eventsLength; i++) {
	                                var cacheLength = cache.length;
	                                for (var j = 0; j < cacheLength; j++) {
	                                    if (events[i].id == cache[j].id) {
	                                        var eventStartDate = parseDate(events[i].start);
	                                        if (eventStartDate.getDate() == cache[j].start.getDate() &&
                                            eventStartDate.getMonth() == cache[j].start.getMonth() &&
                                            eventStartDate.getFullYear() == cache[j].start.getFullYear()) {
                                                events.splice(i, 1);
                                                cache.splice(j, 1);
                                                j--;
                                                cacheLength--;
                                                i--;
                                                eventsLength--;
                                            }
                                        }
	                                }
	                            }
	                        }*/
	                    
						
						/* Remove highlighted event from json source
						Assumes theres only one event in the cache */
			
					    if (cache[0]) {
                            for (var i = 0; i < events.length; i++) {
                                if (events[i].id == cache[0].id) {
                                    // If repeating, check to make sure event
                                    // has same time
                                    if (cache[0].repeating) {
                                        var eventStartDate = parseDate(events[i].start);
                                        if (eventStartDate.getDate() == cache[0].start.getDate() &&
                                        eventStartDate.getMonth() == cache[0].start.getMonth() &&
                                        eventStartDate.getFullYear() == cache[0].start.getFullYear()) {
                                            events.splice(i, 1);
                                            break;
                                        }
                                    } else {
                                        events.splice(i, 1);
                                        break;
                                    }
                                }
                            }
                        }
                        
						var res = applyAll(success, this, arguments);
						if ($.isArray(res)) {
							events = res;
						}
						callback(events);
					},
					error: function() {
						applyAll(error, this, arguments);
						callback();
					},
					complete: function() {
						applyAll(complete, this, arguments);
						popLoading();
					}
				}));
			}else{
				callback();
			}
		}
	}
	
	
	
	/* Sources
	-----------------------------------------------------------------------------*/
	

	function addEventSource(source) {
		source = _addEventSource(source);
		if (source) {
			pendingSourceCnt++;
			fetchEventSource(source, currentFetchID); // will eventually call reportEvents
		}
	}
	
	
	function _addEventSource(source) {
		if ($.isFunction(source) || $.isArray(source)) {
			source = { events: source };
		}
		else if (typeof source == 'string') {
			source = { url: source };
		}
		if (typeof source == 'object') {
			normalizeSource(source);
			sources.push(source);
			return source;
		}
	}
	

	function removeEventSource(source) {
		sources = $.grep(sources, function(src) {
			return !isSourcesEqual(src, source);
		});
		// remove all client events from that source
		cache = $.grep(cache, function(e) {
			return !isSourcesEqual(e.source, source);
		});
		reportEvents(cache);
	}
	
	
	
	/* Manipulation
	--------------------------------------------------------------------------*/
	
	
	function updateEvent(event) { // update an existing event
		var i, len = cache.length, e,
			defaultEventEnd = getView().defaultEventEnd, // getView???
			startDelta = event.start - event._start,
			endDelta = event.end ?
				(event.end - (event._end || defaultEventEnd(event))) // event._end would be null if event.end
				: 0;                                                      // was null and event was just resized
		for (i=0; i<len; i++) {
			e = cache[i];
			if (e._id == event._id && e != event) {
				e.start = new Date(+e.start + startDelta);
				if (event.end) {
					if (e.end) {
						e.end = new Date(+e.end + endDelta);
					}else{
						e.end = new Date(+defaultEventEnd(e) + endDelta);
					}
				}else{
					e.end = null; // TODO set e.end to 1 hour ahead of startDate
				}
				e.title = event.title;
				e.url = event.url;
				e.allDay = event.allDay;
				e.className = event.className;
				e.editable = event.editable;
				e.color = event.color;
				e.backgroudColor = event.backgroudColor;
				e.borderColor = event.borderColor;
				e.textColor = event.textColor;
				normalizeEvent(e);
			}
		}
		normalizeEvent(event);
		reportEvents(cache);
	}
	
	
	function renderEvent(event, stick, oldID) {
	    var out = normalizeEvent(event); // return normalized event
		if (!event.source) {
			if (stick) {
				stickySource.events.push(event);
				event.source = stickySource;
			}
			cache.push(event);
		}
		
		if (oldID) {
		    // if the event's id got updated, need to update the event id's of
		    // all related events (repeating)
    		for (var i = 0; i < cache.length; i++) {
    		    if (cache[i].id == oldID) {
    		        cache[i]._id = cache[i].id = out.id;
    		        cache[i].beingCreated = event.beingCreated;
    		    }
    		}
		}
		
		reportEvents(cache);
		
		return event;
	}	
	
	function removeEvents(filter) {
		if (!filter) { // remove all
			cache = [];
			// clear all array sources
			for (var i=0; i<sources.length; i++) {
				if ($.isArray(sources[i].events)) {
					sources[i].events = [];
				}
			}
		}else{
			if (!$.isFunction(filter)) { // an event ID
				var id = filter + '';
				filter = function(e) {
					return e._id == id;
				};
			}
			cache = $.grep(cache, filter, true);
			// remove events from array sources
			for (var i=0; i<sources.length; i++) {
				if ($.isArray(sources[i].events)) {
					sources[i].events = $.grep(sources[i].events, filter, true);
				}
			}
		}
		reportEvents(cache);
	}
	
	
	function clientEvents(filter) {
		if ($.isFunction(filter)) {
			return $.grep(cache, filter);
		}
		else if (filter) { // an event ID
			filter += '';
			return $.grep(cache, function(e) {
				return e._id == filter;
			});
		}
		return cache; // else, return all
	}
	
	/**
	 * Function: highlightEvent
	 * -----------------------------
	 * Highlights an event when it is selected and unhighlights the
	 * previously highlighted event
	 *
	 * @param event to be highlighted
	 * @param if true, do not immediately render calendar
	 */
	function highlightEvent(event, norender) {
		if (prevHighlightedEvent) {
			prevHighlightedEvent.highlight = false;
		}
		if (event) {
			event.highlight = true;
		}
		prevHighlightedEvent = event;
		if (!norender) this.render(); //efficiency?? 
	}
	
	/**
	 * Function: getHighlightedEvent
	 * -------------------------------
	 * Returns the highlighted event
	 * @return highlighted event object
	 */
	 function getHighlightedEvent() {
	     return prevHighlightedEvent;
	 }
	
	
	/* Loading State
	--------------------------------------------------------------------------*/
	
	
	function pushLoading() {
		if (!loadingLevel++) {
			trigger('loading', null, true);
		}
	}
	
	
	function popLoading() {
		if (!--loadingLevel) {
			trigger('loading', null, false);
		}
	}
	
	/* Event Creation
	--------------------------------------------------------------------------*/

  /**
   * Function: isNewEventBeingCreated
   * --------------------------------
   * Returns whether or not a new event is being created. The variable
   * newEventBeingCreated will be falsy (null) if no event is being created
   * and will be truthy (event object) otherwise.
   *
   * @param none
   * @return event object (true) if new event is being created
   *         null (false) if no new event is being created
   */
  function isNewEventBeingCreated() {
    return newEventBeingCreated;
  }
  
  
  /**
   * Function: createEvent
   * ---------------------
   * Establishes that an event is being created.
   *
   * @param event to create
   * @return normalized event
   */
  function createEvent(event) {
    var normalized = normalizeEvent(event);
    newEventBeingCreated = normalized;
    normalized.beingCreated = true;
    return normalized;
  }
  
  /**
   * Function: updateCreatedEvent
   * ----------------------------
   * Update the created event with the specified options
   *
   * @param associative array of options to modify
   * @return this
   */
  function updateCreatedEvent(options) {
    if (!newEventBeingCreated) return this;
    $.each(options, function(key, value) {
      newEventBeingCreated[key] = value;
    });
    
    return this;
  }
  
  
  /**
   * Function: endEventCreation
   * --------------------------
   * Clears newEventBeingCreated. Should be called when event creation finishes
   * or when event creation is canceled.
   *
   * @param none
   * @return this
   */
  function endEventCreation() {
    if (newEventBeingCreated) {
      newEventBeingCreated.beingCreated = false;
    }
    newEventBeingCreated = null;
    
    return this;
  }
	
	/* Event Normalization
	--------------------------------------------------------------------------*/
	
	
	function normalizeEvent(event) {
		var source = event.source || {};
		var ignoreTimezone = firstDefined(source.ignoreTimezone, options.ignoreTimezone);
		//event._id = event._id || (event.id === undefined ? eventGUID++ : event.id);
		//event.id = event._id;
		if (!event.id) event.id = event._id = -1; //new events get ID -1 - guarantee no conflicts
		if (!event._id) event._id = event.id;

		if (event.date) {
			if (!event.start) {
				event.start = event.date;
			}
			delete event.date;
		}
		event._start = cloneDate(event.start = parseDate(event.start, ignoreTimezone));
		event.end = parseDate(event.end, ignoreTimezone);
		if ((event.end && event.end <= event.start) || !event.end) {
			event.end = new Date(+event.start + 1*1000*3600);
			// if end date is corrupt, set it to one hour ahead of event.start
		}
		event._end = event.end ? cloneDate(event.end) : null;
		if (event.allDay === undefined) {
			event.allDay = firstDefined(source.allDayDefault, options.allDayDefault);
		}
		if (event.className) {
			if (typeof event.className == 'string') {
				event.className = event.className.split(/\s+/);
			}
		}else{
			event.className = [];
		}
		if (!event.color)	event.color = options.eventColor;
		
		//If repeating event, convert repeat interval date strings into date objects
		if (event.repeating) {
            if (typeof(event.repeatStartDate) =='string') {
                event.repeatStartDate = new Date(event.repeatStartDate);
            }
            if (typeof(event.repeatEndDate) =='string') {
                event.repeatEndDate = new Date(event.repeatEndDate);
            }
        }
		
		return event;
	}
	
	
	
	/* Utils
	--------------------------------------------------------------------------*/
	
	
	function normalizeSource(source) {
		if (source.className) {
			// TODO: repeat code, same code for event classNames
			if (typeof source.className == 'string') {
				source.className = source.className.split(/\s+/);
			}
		}else{
			source.className = [];
		}
		var normalizers = fc.sourceNormalizers;
		for (var i=0; i<normalizers.length; i++) {
			normalizers[i](source);
		}
	}
	
	
	function isSourcesEqual(source1, source2) {
		return source1 && source2 && getSourcePrimitive(source1) == getSourcePrimitive(source2);
	}
	
	
	function getSourcePrimitive(source) {
		return ((typeof source == 'object') ? (source.events || source.url) : '') || source;
	}


}
