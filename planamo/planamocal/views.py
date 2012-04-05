from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponse
from django.template import RequestContext
from django.utils import simplejson
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from datetime import timedelta
import calendar
import pytz
from planamocal.models import Calendar , Event, Attendance, RepeatingEvent
from planamocal.utils import adjustDateStringToTimeZone, get_boolean
from planamocal.utils import json_repeating_events_fixed
from planamocal.utils import json_repeating_events_notfixed

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
        attendance__calendar=request.user.calendar, start_date__lt=end_date))
        
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
                
            # If end date is before start date (i.e. some sort of error), 
            # default to 60 mins
            if calendar.timegm(end_date.utctimetuple()) < calendar.timegm(start_date.utctimetuple()):
                end_date = start_date + timedelta(hours=1)
                print "A newly created event has defaulted end time to 60 mins"
            
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
            newEvent.instance_start_time = start_date.time()
            newEvent.instance_length_in_min = (calendar.timegm(end_date.utctimetuple())
                - calendar.timegm(start_date.utctimetuple()))/60              
        else:
            newEvent = Event(title=title, location=location, allday=allday,
                start_date=start_date, end_date=end_date)
        newEvent.save()

        # Create attendance (map event to calendar)
        try:
            userCalendar = request.user.calendar
        except ObjectDoesNotExist:
            print "Calendar doesn't exist"
            message = {'success': False}
            return HttpResponse(simplejson.dumps(message), 
                mimetype='application/json')
        attendance = Attendance(calendar=userCalendar, event=newEvent,
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
            userCalendar = request.user.calendar
        except ObjectDoesNotExist:
            print "Calendar doesn't exist"
            message = {'success': False}
            return HttpResponse(simplejson.dumps(message), 
                mimetype='application/json')
                
        # Get attendance
        try:
            attendance = Attendance.objects.get(calendar=userCalendar, event=event)
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
            userCalendar = request.user.calendar
        except ObjectDoesNotExist:
            print "Calendar doesn't exist"
            message = {'success': False}
            return HttpResponse(simplejson.dumps(message), 
                mimetype='application/json')
                
        # Get event
        try:
            event = Event.objects.get(id=eventID)
            if event.repeating:
                event = event.repeatingevent
        except ObjectDoesNotExist:
            message = {'success': False}
            print "Event doesn't exist in database"
            return HttpResponse(simplejson.dumps(message), 
                mimetype='application/json')
        
        # Get attendance
        try: 
            attendance = Attendance.objects.get(calendar=userCalendar, event=event)
        except ObjectDoesNotExist:
            message = {'success': False}
            print "Event doesn't exist in database"
            return HttpResponse(simplejson.dumps(message), 
                mimetype='application/json')
        
        #TODO - exceptions, setting repeat to none (is this even possible?)    
                
        # Get all day and repeating first to update start/end times
        try:
            allday = obj['allDay']
            event.allday = get_boolean(allday)
        except KeyError:
            pass
        try:
            repeating = obj['repeating']
            if not repeating == 0:
                if not event.repeating:
                    instance_length_in_min = (calendar.timegm(event.end_date.utctimetuple())
                        - calendar.timegm(event.start_date.utctimetuple()))/60
                    
                    event = RepeatingEvent(event_ptr=event, title=event.title, 
                        location=event.location, allday=event.allday, 
                        instance_start_time=event.start_date.time(), 
                        instance_length_in_min=instance_length_in_min, 
                        repeating=True, repeat_interval=repeating)
                else:
                    event.repeat_interval=repeating
        except KeyError:
            pass 
            
        # If repeating event, update start and end times simultaneoulsy
        if event.repeating:
            # Assumes that if changes are being made to the times for repeating
            # revents, the POST request object passes in the start and/or end
            # times of the first event instance in the repeat series (since if
            # it is in the middle of the series, that automatically become
            # the first event in the series by "breaking off")
            try:
                startDateObj = obj['start']
                user_timezone = \
                    pytz.timezone(request.user.get_profile().timezone)
                instance_start_date = adjustDateStringToTimeZone(user_timezone=user_timezone, 
                    date_string=startDateObj, allday=event.allday)
            except KeyError:
                instance_start_date = event.start_date
                
            event.instance_start_time = instance_start_date.time()
            event.start_date = instance_start_date
            
            try:        
                endDateObj = obj['end']
                user_timezone = \
                    pytz.timezone(request.user.get_profile().timezone)
                instance_end_date = adjustDateStringToTimeZone(user_timezone=user_timezone, 
                    date_string=endDateObj, allday=event.allday)
            except KeyError:
                instance_end_date = instance_start_date + timedelta(minutes=event.instance_length_in_min)    
                
            if calendar.timegm(instance_end_date.utctimetuple()) < calendar.timegm(instance_start_date.utctimetuple()):
                instance_end_date = instance_start_date + timedelta(hours=1)
                print "A newly created event has defaulted end time to 60 mins"
                    
            event.instance_length_in_min = (calendar.timegm(instance_end_date.utctimetuple())
                - calendar.timegm(instance_start_date.utctimetuple()))/60
        
        print event.start_date
        print event.instance_length_in_min
            
        # Get rest of values from reuqest object
        try:
            for key in obj:
                if key == 'eventID': 
                    pass
                elif key == 'title':
                    event.title = obj['title']
                elif key == 'location':
                    event.location = obj.get('location', '')
                elif key == 'end':
                    if not event.repeating:
                        user_timezone = \
                            pytz.timezone(request.user.get_profile().timezone)
                        end_date = adjustDateStringToTimeZone(user_timezone=user_timezone, 
                            date_string=obj['end'], allday=event.allday)
                        event.end_date = end_date
                elif key == 'start':
                    if not event.repeating:
                        user_timezone = \
                            pytz.timezone(request.user.get_profile().timezone)
                        start_date = adjustDateStringToTimeZone(user_timezone=user_timezone, 
                            date_string=obj['start'], allday=event.allday)
                        event.start_date = start_date
                elif key == 'repeatStartDate':
                    if event.repeating:
                        user_timezone = \
                            pytz.timezone(request.user.get_profile().timezone)
                        repeatStartDate = adjustDateStringToTimeZone(user_timezone=user_timezone, 
                            date_string=obj['repeatStartDate'], allday=event.allday)
                        event.start_date = repeatStartDate
                elif key == 'repeatEndDate':
                    if event.repeating:
                        repeatEndDateRaw = obj['repeatEndDate']
                        if repeatEndDateRaw == "0":
                            repeatEndDate = None
                        else:
                            user_timezone = \
                                pytz.timezone(request.user.get_profile().timezone)
                            repeatEndDate = adjustDateStringToTimeZone(user_timezone=user_timezone, 
                                date_string=obj['repeatEndDate'], allday=event.allday)
                            event.end_date = repeatEndDate
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

    
@login_required
def splitRepeatingEvents(request):
    """
    Split one repeating event series into two, given the JSON object from request
    that indicates the old start time (i.e. repeat end date for first event series),
    the new start time (i.e. repeat start date for the second event series), the
    new end time (i.e. to calculate event instance length) and all day boolean (to
    check whether or not the new event series has changed to allday).
    
    This function is called when a repeating event (that is not the first instance
    in the repeating series) is changed such that the user want all future events 
    to be changed as well

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
            newEvent = RepeatingEvent.objects.get(id=eventID)
        except ObjectDoesNotExist:
            message = {'success': False}
            print "Event doesn't exist in database"
            return HttpResponse(simplejson.dumps(message), 
                mimetype='application/json')
                
        # Get values from request object
        user_timezone = pytz.timezone(request.user.get_profile().timezone)
        try:
            allday = obj['allDay']
            allday = get_boolean(allday)
            
            oldStart = obj['oldStart']
            oldStart = adjustDateStringToTimeZone(user_timezone=user_timezone, 
                date_string=oldStart, allday=newEvent.allday)
                
            newStart = obj['newStart']
            newStart = adjustDateStringToTimeZone(user_timezone=user_timezone, 
                date_string=newStart, allday=allday)
                
            newEnd = obj['newEnd']
            newEnd = adjustDateStringToTimeZone(user_timezone=user_timezone, 
                date_string=newEnd, allday=allday)
        except KeyError:
            message = {'success': False}
            print "Error reading event start dates from event json"
            return HttpResponse(simplejson.dumps(message),
                mimetype='application/json')
                
        # Get current attendance object
        # TODO - do this for each user attending event    
        try:
            userCalendar = request.user.calendar
        except ObjectDoesNotExist:
            print "Calendar doesn't exist"
            message = {'success': False}
            return HttpResponse(simplejson.dumps(message), 
                mimetype='application/json')
        try:
            attendance = Attendance.objects.get(calendar=userCalendar, event=newEvent)
        except ObjectDoesNotExist:
            print "Attendance doesn't exist"
            message = {'success': False}
            return HttpResponse(simplejson.dumps(message), 
                mimetype='application/json')
        
        # Create old event
        if newEvent.repeating == 1:
            oldRepeatEndDate = oldStart - timedelta(days=1)
        elif newEvent.repeating == 2:
            oldRepeatEndDate = oldStart - timedelta(days=7)
        elif newEvent.repeating == 3:
            oldRepeatEndDate = oldStart - timedelta(months=1)
        else:
            oldRepeatEndDate = oldStart - timedelta(years=1)
        oldEvent = RepeatingEvent(title=newEvent.title, location=newEvent.location,
            allday=newEvent.allday, repeating=True, start_date=newEvent.start_date,
            end_date=oldRepeatEndDate, repeat_interval=newEvent.repeating)
        oldEvent.instance_start_time = newEvent.instance_start_time
        oldEvent.instance_length_in_min = newEvent.instance_length_in_min
        oldEvent.save()
        
        # Update new event
        newEvent.start_date = newStart
        if not newEvent.allday:
            newStart.replace(hour=12, minute=0)
            newEnd.replace(hour=13, minute=0)
        newEvent.allday = allday
        newEvent.instance_start_date = newStart.time()
        newEvent.instance_length_in_min = (calendar.timegm(newEnd.utctimetuple())
            - calendar.timegm(newStart.utctimetuple()))/60
        newEvent.save()

        # Map user to old event
        # TODO - do this for each user attending event
        oldAttendance = Attendance(calendar=userCalendar, event=oldEvent, color=attendance.color,
            notes=attendance.notes)
        oldAttendance.save()
                
        message = {'success': True}
    else:
        message = {'success': False}
    return HttpResponse(simplejson.dumps(message), mimetype='application/json')

