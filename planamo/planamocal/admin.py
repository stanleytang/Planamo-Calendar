from planamocal.models import Calendar, Event, Attendance, UserProfile
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
admin.site.register(Attendance)
admin.site.register(UserProfile)