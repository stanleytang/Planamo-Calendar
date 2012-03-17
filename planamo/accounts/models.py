from django.db import models
from planamocal.models import Calendar
from django.contrib.auth.models import User
from django.db.models.signals import post_save

class UserProfile(models.Model):
    """
    Extension class for the User model
    """
    user = models.OneToOneField(User)
    
    # calendar = models.ForeignKey(Calendar, null=True)

def create_user_profile(sender, instance, created, **kwargs):
    if created:
        profile, created = UserProfile.objects.get_or_create(user=instance)
        calendar, created = Calendar.objects.get_or_create(owner=instance)
        calendar.name = ("%s's calendar" % instance.username)
        calendar.save()
    
post_save.connect(create_user_profile, sender=User)