from django.conf.urls.defaults import patterns, include, url

urlpatterns = patterns('planamocal.views',
	url(r'^$', 'index'),
	url(r'^jsonfeed/$', 'jsonfeed'),
	url(r'^createEvent/$', 'createEvent'),
	url(r'^deleteEvent/$', 'deleteEvent'),
	url(r'^updateEvent/$', 'updateEvent'),
)