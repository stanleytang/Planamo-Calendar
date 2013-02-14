from datetime import datetime
import calendar
import pytz

def append_repeating_json(data, event, attendance, user, interval, timestamp):
    """
    HELPER FUNCTION
    This function appends an event JSON object to the given JSON data list
    """
    repeating_event = event.repeatingevent
    user_timezone = pytz.timezone(user.get_profile().timezone)
    length = repeating_event.instance_length_in_min * 60
    json_object = event.json(user)
    json_object['repeatStartDate'] = json_object['start']
    json_object['repeatEndDate'] = json_object['end']
    json_object['start'] = (datetime.
        fromtimestamp(timestamp, pytz.utc).
        astimezone(user_timezone).isoformat())
    json_object['end'] = (datetime.
        fromtimestamp(timestamp+length, pytz.utc).
        astimezone(user_timezone).isoformat())
    json_object['repeating'] = interval
    json_object['color'] = attendance.color
    json_object['notes'] = attendance.notes
    data.append(json_object)

def json_repeating_events_fixed(**kwarg):
    """
    Function used to create event JSON objects for a repeating event
    whose repeat interval is constant (e.g. daily/weekly)
    """
    event = kwarg['event']
    start_date = kwarg['start_date']
    end_date = kwarg['end_date']
    user = kwarg['user']
    data = kwarg['data']
    attd = kwarg['attendance']
    
    user_timezone = pytz.timezone(user.get_profile().timezone)
    repeating_event = event.repeatingevent
    print repeating_event
    interval = repeating_event.repeat_interval
    

    if interval == 1:
        FIXED_INTERVAL = 3600*24 # seconds in a day 
    elif interval == 2:
        FIXED_INTERVAL = 3600*24*7 # seconds in a week
    
    event_start_ts = calendar.timegm(event.start_date.
        utctimetuple())
    request_start_ts = calendar.timegm(start_date.utctimetuple())
    request_end_ts = calendar.timegm(end_date.utctimetuple()) 
    
    # get the first renderable timestamp
    rendered_event_ts = event_start_ts
    while rendered_event_ts < request_start_ts:
        rendered_event_ts += FIXED_INTERVAL
    
    # add event JSON objects to data until the end timestamp
    # (end of rendering, or repeating [whichever comes first])
    if event.end_date is None:
        end_ts = request_end_ts
    else:
        event_end_ts = calendar.timegm(event.end_date.
            utctimetuple())
        end_ts = min(event_end_ts, request_end_ts)
    exceptions = repeating_event.event_exception_set.all()
    exceptions_ts = []
    for exception in exceptions:
        exceptions_ts.append(calendar.timegm(exception.supposed_start_date.
            utctimetuple()))
    exceptions_ts = set(exceptions_ts)
    while rendered_event_ts <= end_ts:
        if rendered_event_ts in exceptions_ts:
            rendered_event_ts += FIXED_INTERVAL
            continue
    
        append_repeating_json(data, event, attd, user, interval,
            rendered_event_ts)    
        rendered_event_ts += FIXED_INTERVAL
        
def json_repeating_events_notfixed(**kwarg):
    """
    Function used to create event JSON objects for repeating event whose repeat
    interval is not fixed (e.g. monthly, yearly)
    """
    event = kwarg['event']
    user = kwarg['user']
    data = kwarg['data']
    start_date = kwarg['start_date']
    end_date = kwarg['end_date']
    attd = kwarg['attendance']
    
    user_timezone = pytz.timezone(user.get_profile().timezone)
    repeating_event = event.repeatingevent
    interval = repeating_event.repeat_interval

    event_start = event.start_date.astimezone(user_timezone)
    year = event_start.year
    month = event_start.month
    day = event_start.day
    hour = event_start.hour
    minute = event_start.minute
    
    if event.end_date is None:
        end = end_date
    else:
        end = min(event.end_date, end_date)
    end = end.astimezone(user_timezone)
    rendered_event_datetime = event.start_date
    
    while rendered_event_datetime < start_date:
        if interval == 3:
            month += 1
            if month > 12:
                month = 1
                year += 1
        elif interval == 4:
            year += 1
        try:
            attempt = datetime(year, month, day, hour, 
                minute, 0, 0, user_timezone)
        except TypeError:
            continue
        rendered_event_datetime = attempt
    
    while rendered_event_datetime <= end:
        try:
            attempt = datetime(year, month, day, hour, 
                minute, 0, 0, user_timezone)
        except TypeError:
            continue
        if attempt > end:
            break
        rendered_event_datetime = attempt
        append_repeating_json(data, event, attd, user, interval,
            calendar.timegm(rendered_event_datetime.utctimetuple()))
        if interval == 3:
            month += 1
            if month > 12:
                month = 1
                year += 1
        elif interval == 4:
            year += 1

def get_boolean(value):
    """
    HELPER FUNCTION
    Converts a String into a Boolean value
    """
    if value == 'False' or value == 'false':
        value = False
    elif value:
        value = True
    else:
        value = False
    return value
    
def adjustDateStringToTimeZone(user_timezone, date_string, allday):
    """
    HELPER FUNCTION
    Converts a date string into a datetime object with adjusted timezone
    to UTC time and seconds to zero.
    
    All-Day Events Exception: if event is allday, treat as UTC (do not convert)
    """
    date_offset_index = date_string.find('-')
    date_string = (date_string[:date_offset_index] if
        (date_offset_index != -1) else date_string)
    date = datetime.strptime(date_string, 
        "%a %b %d %Y %H:%M:%S %Z")
    if allday:
        utc = pytz.UTC
        date = utc.localize(date)
    if not allday:
        date = user_timezone.localize(date)
        date = date.astimezone(pytz.utc)
    date = date.replace(second=0) # TODO - temp hack
    return date
