from django.conf.urls.defaults import *
from planamo import settings
from django.views.generic.simple import direct_to_template

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'planamo.views.home', name='home'),
    # url(r'^planamo/', include('planamo.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    url(r'^admin/', include(admin.site.urls)),
    url(r'^cal/', include('planamocal.urls')),
    url(r'^accounts/', include('registration.backends.simple.urls')),
    url(r'^$', direct_to_template,
        { 'template': 'index.html' }, 'index'),
		
    # serving static files - only to be used during development
    # TODO - django does not recommend serving static files off django,
    # instead, use some other web server
    (r'^mymedia/(?P<path>.*)$', 'django.views.static.serve', 
        {'document_root': settings.STATIC_ROOT, 'show_indexes': True}),
)