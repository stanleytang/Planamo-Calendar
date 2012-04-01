from django.shortcuts import render_to_response, get_object_or_404
from planamocal.models import Calendar, Event, Attendance
from django.http import HttpResponse, Http404
from django.template import RequestContext
from django.utils import simplejson
from datetime import datetime
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.decorators import login_required
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
        filter(attendance__calendar=request.user.calendar,
        end_date__gt=start_date, start_date__lt=end_date))
        
    for event in events:
        attendance = get_object_or_404(Attendance,
            calendar=request.user.calendar, event=event)
        json_object = event.json(request.user)
        json_object['color'] = attendance.color
        json_object['notes'] = attendance.notes
        data.append(json_object)
    return HttpResponse(simplejson.dumps(data), mimetype='application/json')

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

        # Save event
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
                    user_timezone = pytz.timezone(request.user.get_profile().timezone)
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
                    user_timezone = pytz.timezone(request.user.get_profile().timezone)
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
