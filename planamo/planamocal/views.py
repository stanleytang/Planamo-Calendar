# Create your views here.
from django.shortcuts import render_to_response, get_object_or_404
from planamocal.models import Calendar, Event
from django.http import HttpResponse
from django.template import RequestContext
from django.utils import simplejson

def index(request):
	calendar = get_object_or_404(Calendar, pk=1)
	return render_to_response(
		'planamocal/calendar.html',
		{'calendar': calendar},
		context_instance = RequestContext(request)
	)
	
# temp solution
from django.views.decorators.csrf import csrf_exempt
@csrf_exempt
# end temp solution
def createEvent(request):
	if request.is_ajax():
		if request.method == 'POST':
			obj = request.POST
			newEvent = Event(name=obj['title'],)
			newEvent.save()
			message = {'success': True, 'event': newEvent}
	else:
		message = {'success': False}
	return HttpResponse(simplejson.dumps(message), mimetype='application/json')