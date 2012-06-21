from django import forms
from registration.forms import RegistrationForm

class UserRegistrationForm(RegistrationForm):
    TIMEZONE_CHOICES = (
        ('EST/EDT', 'America/New York'),
        ('CST/CDT', 'America/Chicago'),
        ('MST/MDT', 'America/Denver'),
        ('MST',     'America/Phoenix'),
        ('PST/PDT', 'America/Los Angeles'),
        ('AST/ADT', 'America/Anchorage'),
        ('HST/HDT', 'America/Adak'),
        ('HST',     'Pacific/Honolulu'),
        ('UTC',     'UTC'),
    )
    
    # TODO have timzone set by offset rather than name
    timezone = forms.ChoiceField(choices=TIMEZONE_CHOICES)
    # This is linked with functionality in static/js/accounts/registration.js