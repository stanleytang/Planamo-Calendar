from datetime import datetime, timedelta
from django.db import models
from django.contrib.auth.models import User
from django.db.models.query import QuerySet
from django.utils import simplejson

def today():
  """
  Returns a tuple of two datetime instances: the beginning of today, and the 
  end of today.
  """
  now = datetime.now()
  start = datetime.min.replace(year=now.year, month=now.month, day=now.day)
  end = (start + timedelta(days=1)) - timedelta.resolution
  return (start, end)

class EventQuerySet(QuerySet):
  """
  A very simple ``QuerySet`` subclass which adds only one extra method,
  ``today``, which returns only those objects whose ``creation_date`` falls
  within the bounds of today.
  """
  def today(self):
    """
    Filters down to only those objects whose ``creation_date`` falls within
    the bounds of today.
    """
    return self.filter(creation_date__range=today())

class EventManager(models.Manager):
  """
  A very simple ``Manager`` subclass which returns an ``EventQuerySet``
  instead of the typical ``QuerySet``.  It also includes a proxy for the extra
  ``today`` method that is provided by the ``EventQuerySet`` subclass.
  """
  def get_query_set(self):
    return EventQuerySet(self.model)

  def today(self):
    return self.get_query_set().today()
		
class Event(models.Model):
	title = models.CharField(max_length=100)
	location = models.CharField(max_length=100, blank=True)
	allday = models.BooleanField(default=True)
	start_date = models.DateTimeField()
	end_date = models.DateTimeField()
	
	objects = EventManager()
	
	def json(self):
	  return {
	    'title': self.title,
	    'location': self.location,
	    'allDay': self.allday,
	    'start': self.start_date.isoformat(),
	    'end': self.end_date.isoformat(),
	  }
	
	def __unicode__(self):
	  return self.title
  
class Calendar(models.Model):
	# owner = models.ForeignKey(User)
	VIEW_CHOICES = (
	    ('M', 'Month'),
	    ('W', 'Week'),
	    ('D', 'Day')
	)
	name = models.CharField(max_length=100)
	events = models.ManyToManyField(Event, through='Attendance')
	# view = models.CharField(max_length=1, choices=VIEW_CHOICES, default='W')
	def __unicode__(self):
		return "Calendar"

class Attendance(models.Model):
  COLOR_CHOICES = (
    ('OR', 'Orange'),
    ('GR', 'Green'),
    ('RE', 'Red'),
    ('BL', 'Blue'),
    ('VI', 'Violet'),
    ('IN', 'Indigo'),
  )
  user = models.ForeignKey(Calendar)
  event = models.ForeignKey(Event)
  # color = models.CharField(max_length=2, choices=COLOR_CHOICES)
  
  class Meta(object):
    verbose_name_plural = "Attendance"