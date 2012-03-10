from django.conf.urls.defaults import patterns, include, url

urlpatterns = patterns('planamocal.views',
		url(r'^$', 'index'),
		url(r'^createEvent/$', 'createEvent'),
)