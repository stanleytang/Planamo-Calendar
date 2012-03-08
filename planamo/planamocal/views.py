# Create your views here.
from django.shortcuts import render_to_response, get_object_or_404
from planamocal.models import Calendar

def index(request):
	calendar = get_object_or_404(Calendar, pk=1)
	return render_to_response(
		'planamocal/index.html',
		{'calendar': calendar},
	)