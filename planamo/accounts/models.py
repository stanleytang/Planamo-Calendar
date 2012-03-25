from django.db import models
from planamocal.models import Calendar
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from registration.signals import user_registered
from accounts.forms import UserRegistrationForm

class UserProfile(models.Model):
    """
    Extension class for the User model
    """
    TIMEZONE_CHOICES = (
        ('America/New_York',    'America/New York'),
        ('America/Chicago',     'America/Chicago'),
        ('America/Denver',      'America/Denver'),
        ('America/Phoenix',     'America/Phoenix'),
        ('America/Los_Angeles', 'America/Los Angeles'),
        ('America/Anchorage',   'America/Anchorage'),
        ('America/Adak',        'America/Adak'),
        ('Pacific/Honolulu',    'Pacific/Honolulu'),
    )
    user = models.OneToOneField(User)
    timezone = models.CharField(max_length=30, default='America/New_York',
        choices=TIMEZONE_CHOICES)

def create_user_profile(sender, instance, created, **kwargs):
    if created:
        profile, created = UserProfile.objects.get_or_create(user=instance)
        calendar, created = Calendar.objects.get_or_create(owner=instance)
        calendar.name = ("%s's calendar" % instance.username)
        calendar.save()
    
post_save.connect(create_user_profile, sender=User)

def user_created(sender, user, request, **kwargs):
    # maps the browser timezone names to timezones 'pytz' module understands
    NAME_TO_TZ = {
        'EST/EDT' : 'America/New_York',
        'CST/CDT' : 'America/Chicago',
        'MST/MDT' : 'America/Denver',
        'MST'     : 'America/Phoenix',
        'PST/PDT' : 'America/Los_Angeles',
        'AST/ADT' : 'America/Anchorage',
        'HST/HDT' : 'America/Adak',
        'HST'     : 'Pacific/Honolulu',
        'UTC'     : 'UTC',
    }
    
    form = UserRegistrationForm(request.POST)
    try:
        data = UserProfile.objects.get(user=user)
        data.timezone = NAME_TO_TZ[form.data["timezone"]]
        data.save()
    except:
        pass

user_registered.connect(user_created)