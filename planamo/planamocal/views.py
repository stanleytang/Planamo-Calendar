from django.shortcuts import render_to_response, get_object_or_404
from planamocal.models import Calendar, Event, Attendance
from django.http import HttpResponse, Http404
from django.template import RequestContext
from django.utils import simplejson
from datetime import datetime
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.decorators import login_required


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
    Returns all the events associated with that calendar in JSON
    TODO - do you return ALL the events every single time? What if
    the user has tons of events? Maybe only return this months?
    """
    events = Event.objects.filter(attendance__calendar=request.user.calendar)
    data = []
    for event in events:
        attendance = get_object_or_404(Attendance,
            calendar=request.user.calendar, event=event)
        json_object = event.json()
        json_object['color'] = attendance.color
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
            # TODO: Is there a way to loop through Event object attributes?
            title = obj['title']
            location = obj.get('location','')
            allday = obj['allday']
            allday = get_boolean(allday)
            start_date = datetime.strptime(obj['start_date'], 
                "%a, %d %b %Y %H:%M:%S %Z")
            end_date = datetime.strptime(obj['end_date'],
                "%a, %d %b %Y %H:%M:%S %Z")
            color = obj['color'].lower()
                    
        except KeyError:
            message = {'success': False}
            print "Error reading valsues from event json"
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
            color=color)
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
        
        color = None

        # Read in event object
        try:
            # TODO: Is there a way to loop through Event object attributes?
            eventID = obj['eventID']
            title = obj['title']
            location = obj.get('location','')
            allday = obj['allday']
            allday = get_boolean(allday)
            start_date = datetime.strptime(obj['start_date'], 
                "%a, %d %b %Y %H:%M:%S %Z")
            end_date = datetime.strptime(obj['end_date'],
                "%a, %d %b %Y %H:%M:%S %Z")
            color = obj['color'].lower()

        except KeyError:
            #message = {'success': False}
            #print "Error reading valsues from event json"
            #return HttpResponse(simplejson.dumps(message),
                #mimetype='application/json')
            pass

        # Get event
        try:
            event = Event.objects.filter(id=eventID).update(title=title, location=location, allday=allday,
                start_date=start_date, end_date=end_date)
        except ObjectDoesNotExist:
            message = {'success': False}
            print "Event doesn't exist in database"
            return HttpResponse(simplejson.dumps(message), 
                mimetype='application/json')
        
        # Update event
        # TODO - make this more efficient (no need to update values not changed)
       # event.update(title=title, location=location, allday=allday,
        #    start_date=start_date, end_date=end_date)

        # Update attendance
        if not color == None:
            try:
                calendar = request.user.calendar
            except ObjectDoesNotExist:
                print "Calendar doesn't exist"
                message = {'success': False}
                return HttpResponse(simplejson.dumps(message), 
                    mimetype='application/json')
            Attendance.objects.filter(calendar=calendar, event=event).update(color=color)
        message = {'success': True}    
    else:
        message = {'success': False}
    return HttpResponse(simplejson.dumps(message), mimetype='application/json')