# Create your views here.
from django.shortcuts import render_to_response, get_object_or_404
from planamocal.models import Calendar, Event
from django.http import HttpResponse
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
  return HttpResponse(simplejson.dumps(data),
   mimetype='application/json')
  

# temp solution
from django.views.decorators.csrf import csrf_exempt
@csrf_exempt
# end temp solution
def createEvent(request):
	if request.is_ajax():
		if request.method == 'POST':
			obj = request.POST
			
			#TODO - validate objects
			try:
				title = obj['title']
				location = obj.get('location','')
				allday = obj['allday']
				start_date = datetime.strptime(obj['start_date'], 
					"%a, %d %b %Y %H:%M:%S %Z")
				end_date = datetime.strptime(obj['end_date'], 
					"%a, %d %b %Y %H:%M:%S %Z")
			except KeyError:
				message = {'success': False}
			
			newEvent = Event(title=title, location=location, allday=allday, 
				start_date=start_date, end_date=end_date)
			newEvent.save()
			message = {'success': True, 'eventID': newEvent.id}
	else:
		message = {'success': False}
	return HttpResponse(simplejson.dumps(message), mimetype='application/json')