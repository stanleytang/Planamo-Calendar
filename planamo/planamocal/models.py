from datetime import datetime, timedelta
import pytz
from django.db import models
from django.contrib.auth.models import User
from django.db.models.query import QuerySet
from django.db.models.signals import post_save
from django.utils import simplejson, timezone

"""
Unless otherwise stated, all date-related fields are stored in UTC timezone.
"""

# def today():
#     """
#     Returns a tuple of two datetime instances: the beginning of today, and the 
#     end of today.
#     """
#     now = datetime.now()
#     start = datetime.min.replace(year=now.year, month=now.month, day=now.day)
#     end = (start + timedelta(days=1)) - timedelta.resolution
#     return (start, end)
#
# class EventQuerySet(QuerySet):
#     """
#     A very simple ``QuerySet`` subclass which adds only one extra method,
#     ``today``, which returns only those objects whose ``creation_date`` falls
#     within the bounds of today.
#     """
#     def today(self):
#         """
#         Filters down to only those objects whose ``creation_date`` falls within
#         the bounds of today.
#         """
#         return self.filter(creation_date__range=today())
# 
# class EventManager(models.Manager):
#     """
#     A very simple ``Manager`` subclass which returns an ``EventQuerySet``
#     instead of the typical ``QuerySet``.  It also includes a proxy for the extra
#     ``today`` method that is provided by the ``EventQuerySet`` subclass.
#     """
#     def get_query_set(self):
#         return EventQuerySet(self.model)
# 
#     def today(self):
#         return self.get_query_set().today()

class Event(models.Model):
    title = models.CharField(max_length=100)
    location = models.CharField(max_length=100, blank=True)
    allday = models.BooleanField(default=True)
    repeating = models.BooleanField(default=False)
    
    # In regular mode, indicates start and end time of event
    # In repeating mode, indicates start and end date of repeating interval
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True) # null only for repeating event
                                               # that never ends
    
    # objects = EventManager()
    
    def json(self, user):
        # Set up time so that client can display
        event_tz = pytz.timezone(user.get_profile().timezone)
        
        # If all day, ignore timezone offsets
        if self.allday:
            localized_start = self.start_date
            localized_end = self.end_date
        else:
            localized_start = self.start_date.astimezone(event_tz)
            if self.end_date is not None:
                localized_end = self.end_date.astimezone(event_tz)
            else:
                localized_end = None

        return {
            'id': self.id,
            'title': self.title,
            'location': self.location,
            'allDay': self.allday,
            'repeating': self.repeating,
            'start': localized_start.isoformat(),
            'end': (localized_end.isoformat()
                if localized_end is not None else None),
        }
    
    def __unicode__(self):
        return self.title

class RepeatingEvent(Event):
    REPEAT_CHOICES = (
        (1, 'Daily'),
        (2, 'Weekly'),
        (3, 'Monthly'),
        (4, 'Yearly'),
    )
    
    repeat_interval = models.IntegerField(choices=REPEAT_CHOICES)
    instance_start_time = models.TimeField() # stored in user's timezone
    instance_end_time = models.TimeField()   # stored in user's timezone
    
    # TODO implement save method that guarantees event.repeating = True
    
    
class RepeatingEventException(models.Model):
    root_event = models.ForeignKey(RepeatingEvent, related_name='exception_set')
    supposed_start_date = models.DateTimeField()
    exception_event = models.OneToOneField(Event, null=True)
        # null if event exception was a delete
    
        
class Calendar(models.Model):
    owner = models.OneToOneField(User)
    VIEW_CHOICES = (
        ('M', 'Month'),
        ('W', 'Week'),
        ('D', 'Day')
    )
    name = models.CharField(max_length=100)
    events = models.ManyToManyField(Event, through='Attendance')
    # view = models.CharField(max_length=1, choices=VIEW_CHOICES, default='W')
    def __unicode__(self):
        return "%s's calendar" % self.owner.username

class Attendance(models.Model):
    COLOR_CHOICES = (
        ('#ee7000', 'Orange'),
        ('#00ad38', 'Green'),
        ('#f62725', 'Red'),
        ('#006ed5', 'Blue'),
        ('#c744b5', 'Violet'),
        ('#6144aa', 'Indigo'),
    )
    calendar = models.ForeignKey(Calendar)
    event = models.ForeignKey(Event)
    color = models.CharField(max_length=7, choices=COLOR_CHOICES)
    notes = models.CharField(max_length=200, blank=True)
  
    class Meta(object):
        verbose_name_plural = "Attendance"
