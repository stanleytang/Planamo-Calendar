from planamocal.models import Calendar, Event, RepeatingEvent
from planamocal.models import RepeatingEventException, Attendance
from django.contrib import admin

# class ChoiceInline(admin.StackedInline):
#     model = Choice
#     extra = 3
# 
# class PollAdmin(admin.ModelAdmin):
#     fieldsets = [
#         (None,               {'fields': ['question']}),
#         ('Date information', {'fields': ['pub_date'], 'classes': ['collapse']}),
#     ]
#     inlines = [ChoiceInline]

admin.site.register(Calendar)
admin.site.register(Event)
admin.site.register(RepeatingEvent)
admin.site.register(RepeatingEventException)
admin.site.register(Attendance)