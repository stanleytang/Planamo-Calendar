from django.shortcuts import render_to_response, get_object_or_404
from planamocal.models import Calendar, Event, Attendance, RepeatingEvent
from django.http import HttpResponse, Http404
from django.template import RequestContext
from django.utils import simplejson
from datetime import datetime
import calendar
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.decorators import login_required
from django.db.models import Q
import pytz

@login_required
def index(request):
    calendar = get_object_or_404(Calendar, id=request.user.calendar.id)
    
    return render_to_response(
        'planamocal/calendar.html',
        {'calendar': calendar},
        context_instance = RequestContext(request)
    )

@login_required
def jsonfeed(request):
    """
    Returns all the events associated with that calendar in JSON within a
    specified time interval
    """    
    # Gets URL parameters, which should be in the form of JavaScript Date object
    # toString() method
    start_date = request.GET.get('start', '0')
    end_date = request.GET.get('end', '0')
    
    data = []
    if start_date == '0' and end_date == '0':
        # return an empty data set if start/end params are not specified
        return HttpResponse(simplejson.dumps(data), mimetype='application/json')
    
    user_timezone = pytz.timezone(request.user.get_profile().timezone)
    start_date = adjustDateStringToTimeZone(user_timezone, start_date, False)
    end_date = adjustDateStringToTimeZone(user_timezone, end_date, False)
    
    events = (Event.objects.
        filter(Q(end_date__gt=start_date) | Q(end_date__isnull=True),
        attendance__calendar=request.user.calendar,
        start_date__lt=end_date))
        
    for event in events:
        attendance = get_object_or_404(Attendance,
            calendar=request.user.calendar, event=event)
        if not event.repeating:
            json_object = event.json(request.user)
            json_object['color'] = attendance.color
            json_object['notes'] = attendance.notes
            data.append(json_object)
        else: # repeating-events
            repeating_event = event.repeatingevent
            interval = repeating_event.repeat_interval
            if interval == 1:   # daily repeat
                json_repeating_events_fixed(start_date=start_date, event=event,
                    end_date=end_date, attendance = attendance,
                    user=request.user, data=data)
            elif interval == 2: # weekly repeat
                json_repeating_events_fixed(start_date=start_date, event=event,
                    end_date=end_date, attendance = attendance,
                    user=request.user, data=data)
            elif interval == 3: # monthly repeat
                json_repeating_events_notfixed(start_date=start_date, data=data,
                    event=event, end_date=end_date, attendance = attendance,
                    user=request.user)
            elif interval == 4: # yearly repeat
                json_repeating_events_notfixed(start_date=start_date, data=data,
                    event=event, end_date=end_date, attendance = attendance,
                    user=request.user)
    return HttpResponse(simplejson.dumps(data), mimetype='application/json')

def append_repeating_json(data, event, attendance, user, interval, timestamp):
    """
    HELPER FUNCTION
    This function appends an event JSON object to the given JSON data list
    """
    repeating_event = event.repeatingevent
    user_timezone = pytz.timezone(user.get_profile().timezone)
    length = repeating_event.instance_length_in_min * 60
    json_object = event.json(user)
    json_object['repeatStartDate'] = json_object['start']
    json_object['repeatEndDate'] = json_object['end']
    json_object['start'] = (datetime.
        fromtimestamp(timestamp, pytz.utc).
        astimezone(user_timezone).isoformat())
    json_object['end'] = (datetime.
        fromtimestamp(timestamp+length, pytz.utc).
        astimezone(user_timezone).isoformat())
    json_object['repeating'] = interval
    json_object['color'] = attendance.color
    json_object['notes'] = attendance.notes
    data.append(json_object)

def json_repeating_events_fixed(**kwarg):
    """
    Function used to create event JSON objects for a repeating event
    whose repeat interval is constant (e.g. daily/weekly)
    """
    event = kwarg['event']
    start_date = kwarg['start_date']
    end_date = kwarg['end_date']
    user = kwarg['user']
    data = kwarg['data']
    attd = kwarg['attendance']
    
    user_timezone = pytz.timezone(user.get_profile().timezone)
    repeating_event = event.repeatingevent
    interval = repeating_event.repeat_interval
    

    if interval == 1:
        FIXED_INTERVAL = 3600*24 # seconds in a day
    elif interval == 2:
        FIXED_INTERVAL = 3600*24*7 # seconds in a week
    
    event_start_ts = calendar.timegm(event.start_date.
        utctimetuple())
    request_start_ts = calendar.timegm(start_date.utctimetuple())
    request_end_ts = calendar.timegm(end_date.utctimetuple()) 
    
    # get the first renderable timestamp
    rendered_event_ts = event_start_ts
    while rendered_event_ts < request_start_ts:
        rendered_event_ts += FIXED_INTERVAL
    
    # add event JSON objects to data until the end timestamp
    # (end of rendering, or repeating [whichever comes first])
    if event.end_date is None:
        end_ts = request_end_ts
    else:
        event_end_ts = calendar.timegm(event.end_date.
            utctimetuple())
        end_ts = min(event_end_ts, request_end_ts)
    exceptions = repeating_event.exception_set.all()
    exceptions_ts = []
    for exception in exceptions:
        exceptions_ts.append(calendar.timegm(exception.supposed_start_date.
            utctimetuple()))
    exceptions_ts = set(exceptions_ts)
    while rendered_event_ts <= end_ts:
        if rendered_event_ts in exceptions_ts:
            rendered_event_ts += FIXED_INTERVAL
            continue
    
        append_repeating_json(data, event, attd, user, interval,
            rendered_event_ts)    
        rendered_event_ts += FIXED_INTERVAL
        
def json_repeating_events_notfixed(**kwarg):
    """
    Function used to create event JSON objects for repeating event whose repeat
    interval is not fixed (e.g. monthly, yearly)
    """
    event = kwarg['event']
    user = kwarg['user']
    data = kwarg['data']
    start_date = kwarg['start_date']
    end_date = kwarg['end_date']
    attd = kwarg['attendance']
    
    user_timezone = pytz.timezone(user.get_profile().timezone)
    repeating_event = event.repeatingevent
    interval = repeating_event.repeat_interval

    event_start = event.start_date.astimezone(user_timezone)
    year = event_start.year
    month = event_start.month
    day = event_start.day
    hour = event_start.hour
    minute = event_start.minute
    
    if event.end_date is None:
        end = end_date
    else:
        end = min(event.end_date, end_date)
    end = end.astimezone(user_timezone)
    rendered_event_datetime = event.start_date
    
    while rendered_event_datetime < start_date:
        if interval == 3:
            month += 1
            if month > 12:
                month = 1
                year += 1
        elif interval == 4:
            year += 1
        try:
            attempt = datetime(year, month, day, hour, 
                minute, 0, 0, user_timezone)
        except TypeError:
            continue
        rendered_event_datetime = attempt
    
    while rendered_event_datetime <= end:
        try:
            attempt = datetime(year, month, day, hour, 
                minute, 0, 0, user_timezone)
        except TypeError:
            continue
        if attempt > end:
            break
        rendered_event_datetime = attempt
        append_repeating_json(data, event, attd, user, interval,
            calendar.timegm(rendered_event_datetime.utctimetuple()))
        if interval == 3:
            month += 1
            if month > 12:
                month = 1
                year += 1
        elif interval == 4:
            year += 1

def get_seconds_from_time(time):
    """
    HELPER FUNCTION
    Converts a datetime object into a representation in terms of seconds
    """
    return (time.hour*3600 + time.minute*60 + time.second)

def get_boolean(value):
    """
    HELPER FUNCTION
    Converts a String into a Boolean value
    """
    if value == 'False' or value == 'false':
        value = False
    elif value:
        value = True
    else:
        value = False
    return value
    
def adjustDateStringToTimeZone(user_timezone, date_string, allday):
    """
    HELPER FUNCTION
    Converts a date string into a datetime object with adjusted timezone
    to UTC time and seconds to zero.
    
    All-Day Events Exception: if event is allday, treat as UTC (do not convert)
    """
    date_offset_index = date_string.find('-')
    date_string = (date_string[:date_offset_index] if
        (date_offset_index != -1) else date_string)
    date = datetime.strptime(date_string, 
        "%a %b %d %Y %H:%M:%S %Z")
    if allday:
        utc = pytz.UTC
        date = utc.localize(date)
    if not allday:
        date = user_timezone.localize(date)
        date = date.astimezone(pytz.utc)
    date = date.replace(second=0) # TODO - temp hack
    return date

@login_required
def createEvent(request):
    """
    Creates a new event mapped to calendar (through attendance). If success,
    returns JSON object with success = true and event ID. Otherwise, return
    JSON object with success = false

    @param POST + AJAX request from client
    @return JSON object (success, eventID)
    """
    if request.is_ajax() and request.method == 'POST':
        obj = request.POST

        # Read in event object
        try:
            title = obj['title']
            location = obj.get('location','')
            allday = obj['allDay']
            allday = get_boolean(allday)
            
            # Get date and adjust timezone offsets
            user_timezone = pytz.timezone(request.user.get_profile().timezone)
            start_date = adjustDateStringToTimeZone(user_timezone=user_timezone, 
                date_string=obj['start'], allday=allday)
            end_date = adjustDateStringToTimeZone(user_timezone=user_timezone, 
                date_string=obj['end'], allday=allday)
            
            color = obj['color'].lower()
            notes = obj.get('notes', '')
        except KeyError:
            message = {'success': False}
            print "Error reading values from event json"
            return HttpResponse(simplejson.dumps(message),
                mimetype='application/json')
                
        # Get repeating details
        try:
            repeating = obj['repeating']
        except KeyError:
            repeating = False
        if repeating:
            try:
                repeatStartDate = adjustDateStringToTimeZone(user_timezone=user_timezone, 
                    date_string=obj['repeatStartDate'], allday=allday)
                repeatEndDateRaw = obj['repeatEndDate']
                if repeatEndDateRaw == "0":
                    repeatEndDate = None
                else:
                    repeatEndDate = adjustDateStringToTimeZone(user_timezone=user_timezone, 
                        date_string=obj['repeatEndDate'], allday=allday)
            except KeyError:
                message = {'success': False}
                print "Error reading start and end dates of repeating event from JSON"
                return HttpResponse(simplejson.dumps(message),
                    mimetype='application/json')

        # Save event
        if repeating:
            newEvent = RepeatingEvent(title=title, location=location, 
                allday=allday, repeating=True, start_date=repeatStartDate, 
                end_date=repeatEndDate, repeat_interval=repeating)
            if repeating == 3 or repeating == 4:
                newEvent.instance_day_of_month = start_date.day
                if repeating == 4:
                    newEvent.instance_month = start_date.month
            # TODO - all day events that span 2 days or more
            newEvent.instance_start_time = start_date.time()
            newEvent.instance_length_in_min = (get_seconds_from_time(
                end_date.time()) - get_seconds_from_time(start_date.time()))/60                  
        else:
            newEvent = Event(title=title, location=location, allday=allday,
                start_date=start_date, end_date=end_date)
        newEvent.save()

        # Create attendance (map event to calendar)
        try:
            calendar = request.user.calendar
        except ObjectDoesNotExist:
            print "Calendar doesn't exist"
            message = {'success': False}
            return HttpResponse(simplejson.dumps(message), 
                mimetype='application/json')
        attendance = Attendance(calendar=calendar, event=newEvent,
            color=color, notes=notes)
        attendance.save()
        message = {'success': True, 'eventID': newEvent.id}
    else:
        message = {'success': False}
    return HttpResponse(simplejson.dumps(message), mimetype='application/json')

@login_required
def deleteEvent(request):
    """
    Delete attendance of user from event. If nobody is attending the event,
    then event gets deleted. If success, returns JSON object with success = true.
    Otherwise, return JSON object with success = false
    
    @param POST + AJAX request from client
    @return JSON object (success)
    """
    if request.is_ajax() and request.method == 'POST':
        obj = request.POST
        # Get event
        try:
            eventID = obj['eventID']
        except KeyError:
            message = {'success': False}
            print "Error reading event id from event json"
            return HttpResponse(simplejson.dumps(message),
                mimetype='application/json')
        try:
            event = Event.objects.get(id=eventID)
        except ObjectDoesNotExist:
            message = {'success': False}
            print "Event doesn't exist in database"
            return HttpResponse(simplejson.dumps(message), 
                mimetype='application/json')
                
        # Get calendar
        try:
            calendar = request.user.calendar
        except ObjectDoesNotExist:
            print "Calendar doesn't exist"
            message = {'success': False}
            return HttpResponse(simplejson.dumps(message), 
                mimetype='application/json')
                
        # Get attendance
        try:
            attendance = Attendance.objects.get(calendar=calendar, event=event)
        except ObjectDoesNotExist:
            print "Attendance doesn't exist"
            message = {'success': False}
            return HttpResponse(simplejson.dumps(message), 
                mimetype='application/json')
        attendance.delete()
        message = {'success': True}
        
        # If no more attendees, delete event
        if event.attendance_set.all().count() == 0:
            event.delete()
    else:
        message = {'success': False}
    return HttpResponse(simplejson.dumps(message), mimetype='application/json')
    
@login_required
def updateEvent(request):
    """
    Updates a current event and attendance dtails, given the JSON object from
    request. If success, returns JSON object with success = true. Otherwise, 
    return JSON object with success = false

    @param POST + AJAX request from client
    @return JSON object (success)
    """
    if request.is_ajax() and request.method == 'POST':
        obj = request.POST
        
        # Get event id
        try:
            eventID = obj['eventID']
        except KeyError:
            message = {'success': False}
            print "Error reading event id from event json"
            return HttpResponse(simplejson.dumps(message), 
                mimetype='application/json')
                
        # Get calendar
        try:
            calendar = request.user.calendar
        except ObjectDoesNotExist:
            print "Calendar doesn't exist"
            message = {'success': False}
            return HttpResponse(simplejson.dumps(message), 
                mimetype='application/json')
                
        # Get event
        try:
            event = Event.objects.get(id=eventID)
        except ObjectDoesNotExist:
            message = {'success': False}
            print "Event doesn't exist in database"
            return HttpResponse(simplejson.dumps(message), 
                mimetype='application/json')
        
        # Get attendance
        try: 
            attendance = Attendance.objects.get(calendar=calendar, event=event)
        except ObjectDoesNotExist:
            message = {'success': False}
            print "Event doesn't exist in database"
            return HttpResponse(simplejson.dumps(message), 
                mimetype='application/json')

        # Update event from request object values
        try:
            alldayKeyExtracted = False
            for key in obj:
                if key == 'eventID': 
                    pass
                elif key == 'title':
                    event.title = obj['title']
                elif key == 'location':
                    event.location = obj.get('location', '')
                elif key == 'allDay' and not alldayKeyExtracted:
                    event.allday = get_boolean(obj['allDay'])
                    alldayKeyExtracted = True
                elif key == 'start':
                    if not alldayKeyExtracted:
                        try:
                            event.allday = get_boolean(obj['allDay'])
                        except KeyError:
                            pass
                        alldayKeyExtracted = True
                    user_timezone = \
                        pytz.timezone(request.user.get_profile().timezone)
                    start_date = adjustDateStringToTimeZone(user_timezone=user_timezone, 
                        date_string=obj['start'], allday=event.allday)
                    event.start_date = start_date
                elif key == 'end':
                    if not alldayKeyExtracted:
                        try:
                            event.allday = get_boolean(obj['allDay'])
                        except KeyError:
                            pass
                        alldayKeyExtracted = True
                    user_timezone = \
                        pytz.timezone(request.user.get_profile().timezone)
                    end_date = adjustDateStringToTimeZone(user_timezone=user_timezone, 
                        date_string=obj['end'], allday=event.allday)
                    event.end_date = end_date
                elif key == 'color':
                    attendance.color = obj['color'].lower()
                elif key == 'notes':
                    attendance.notes = obj['notes']
                else:
                    pass
        except KeyError:
            message = {'success': False}
            print "Error reading values from event json"
            return HttpResponse(simplejson.dumps(message),
                mimetype='application/json')
                
        #Save
        event.save()
        attendance.save()
        
        message = {'success': True}    
    else:
        message = {'success': False}
    return HttpResponse(simplejson.dumps(message), mimetype='application/json')
