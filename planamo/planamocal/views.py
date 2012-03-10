# Create your views here.
from django.shortcuts import render_to_response, get_object_or_404
from planamocal.models import Calendar
from django.http import HttpResponse, HttpResponseRedirect

def index(request):
	calendar = get_object_or_404(Calendar, pk=1)
	return render_to_response(
		'planamocal/index.html',
		{'calendar': calendar},
	)
	
from django.views.decorators.csrf import csrf_exempt #temp solution
@csrf_exempt #temp solution
def createEvent(request):
	if request.is_ajax():
		if request.method == 'GET':
			message = "This is an XHR GET request"
	  	elif request.method == 'POST':
	  		message = "This is an XHR POST request"
	    	# Here we can access the POST data
	else:
		message = "No XHR"
	return HttpResponse(message)