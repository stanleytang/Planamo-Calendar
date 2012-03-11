from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class Calendar(models.Model):
	
	
	def __unicode__(self):
			return "Calendar"
			
class Event(models.Model):
	#calendar = models.ForeignKey(Calendar)
	name = models.CharField(max_length=100)
	location = models.CharField(max_length=100)
