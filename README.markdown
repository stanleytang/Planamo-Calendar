# Changes to FullCalendar API

1. The json feed for event sources has different start/end parameters. Instead
of using UNIX timestamps for the start/end params, the calendar now sends
JavaScript Date.toString() strings instead. This is to allow for compatibility
with a user calendar timezone being different than the local computer timezone.
E.g. cal/jsonfeed?start=1332658800000&end=1333263600000 becomes
cal/jsonfeed?start=Sun+Mar+25+2012+00%3A00%3A00+GMT-0700+(PDT)&end=Sun+Mar+25+2012+00%3A00%3A00+GMT-0700+(PDT)


# Setup

**I. Using virtualenv**

1. If you haven't already, install virtualenv

        pip install virtualenv
2. Within the outmost directory, create a virtualenv

        virtualenv venv --distribute
3. For each terminal session, you need to run

        source venv/bin/activate
4. Once the virtual environment is set up, 


**II. Installing packages with pip**

1. Install pip if you haven't yet
2. (One of the modules requires you to have Mercurial on your computer)
3. Install the required python modules specified in "requirements.txt"

        pip install -r requirements.txt
        
        
**III. Local database installation**

1. Install PostgreSQL (http://www.postgresql.org/download/) with superuser "postgres" and password "andyfang"
2. To create a local database compatible with the settings.py, be sure to create a database with the name "planamodb"
3. This database is accessible from the command-line:

        psql -U postgres planamodb
