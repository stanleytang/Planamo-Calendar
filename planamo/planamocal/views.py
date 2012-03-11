# Create your views here.
from django.shortcuts import render_to_response, get_object_or_404
from planamocal.models import Calendar, Event, Attendance
from django.http import HttpResponse, Http404
from django.template import RequestContext
from django.utils import simplejson
from datetime import datetime

def index(request):
	calendar = get_object_or_404(Calendar, pk=1)
	return render_to_response(
		'planamocal/calendar.html',
		{'calendar': calendar},
		context_instance = RequestContext(request)
	)

def jsonfeed(request):
  events = Event.objects.filter(attendance__user__id=1)
  data = [event.json() for event in events]
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

# temp solution
from django.views.decorators.csrf import csrf_exempt
@csrf_exempt
# end temp solution
def createEvent(request):
	if request.is_ajax() and request.method == 'POST':
		obj = request.POST
		try:
		  # TODO: Is there a way to loop through Event object attributes instead?
			title = obj['title']
			location = obj.get('location','')
			allday = obj['allday']
			allday = get_boolean(allday)
			start_date = datetime.strptime(obj['start_date'], 
				"%a, %d %b %Y %H:%M:%S %Z")
			end_date = datetime.strptime(obj['end_date'], 
				"%a, %d %b %Y %H:%M:%S %Z")					
			newEvent = Event(title=title, location=location, allday=allday, 
				start_date=start_date, end_date=end_date)
			newEvent.save()
			
			calendar = get_object_or_404(Calendar, id=1)
			attendance = Attendance(user=calendar, event=newEvent)
			attendance.save()
			message = {'success': True, 'eventID': newEvent.id}
		except KeyError:
			print "Error reading event values from json object"
			message = {'success': False}
		except Http404:
			print "Calendar doesn't exist"
			message = {'success': False}
	else:
		message = {'success': False}
	return HttpResponse(simplejson.dumps(message), mimetype='application/json')