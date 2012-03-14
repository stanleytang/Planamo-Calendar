**Using virtualenv**

1. If you haven't already, install virtualenv

        sudo pip install virtualenv
2. Within the outmost directory, create a virtualenv

        virtualenv venv --distribute
3. For each terminal session, you need to run

        source venv/bin/activate


**Without virtualenv**

1. Install Django version 1.3.1 (https://www.djangoproject.com/download/)
2. Install pytz, a Python timezone-managing package:

        sudo pip install pytz
3. Install django-registration

        sudo pip install django-registration
4. Install PostgreSQL (http://www.postgresql.org/download/) with superuser "postgres" and password "andyfang"
5. To create a local database compatible with the settings.py, be sure to create a database with the name "planamodb"
6. This database is accessible from the command-line:

        psql -U postgres planamodb
