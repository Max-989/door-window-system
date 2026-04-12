You are a backend architect. Fix the following issue in the Django backend project at C:\workspace\backend.

## Problem
`INSTALLED_APPS` in config/settings.py is missing `django.contrib.auth`, but `AUTH_USER_MODEL` is set to `auth.User`. This causes `ImproperlyConfigured` when trying to query/create users.

## Steps
1. Read C:\workspace\backend\config\settings.py
2. Check INSTALLED_APPS - is `django.contrib.auth` missing?
3. If missing, add `django.contrib.auth` and its dependencies to INSTALLED_APPS:
   - django.contrib.contenttypes
   - django.contrib.auth
4. Check if there's a custom user model defined anywhere (accounts.User, users.User, etc.)
5. If custom user model exists, update AUTH_USER_MODEL to point to it and ensure the app is in INSTALLED_APPS
6. If no custom user model, keep AUTH_USER_MODEL as auth.User and ensure auth is installed
7. Run migrations: `venv\Scripts\python.exe manage.py migrate`
8. Create a superuser for testing: `venv\Scripts\python.exe manage.py createsuperuser --username admin --email admin@test.com --noinput`
9. Test login: `curl -X POST http://127.0.0.1:8000/api/auth/login/ -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}"` (or whatever the login endpoint is)
10. Verify we get a token back

## Important
- Do NOT break existing apps or migrations
- Check the permissions app and other custom apps before making changes
- Report what you changed and the final test result