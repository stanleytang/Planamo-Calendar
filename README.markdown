1. Install Django version 1.3.1 (https://www.djangoproject.com/download/)
2. Install pytz, a Python timezone-managing package:

        sudo pip install pytz
3. Install django-registration

        sudo pip install django-registration
4. Install PostgreSQL (http://www.postgresql.org/download/) with superuser "postgres" and password "andyfang"
5. To create a local database compatible with the settings.py, be sure to create a database with the name "planamodb"
6. This database is accessible from the command-line:

        psql -U postgres planamodb
