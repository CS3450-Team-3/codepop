#!/bin/bash
set -e

echo "Running migrations..."
python manage.py makemigrations
python manage.py migrate

echo "Populating database..."
python manage.py populate_db

echo "Setting up sync test data..."
python manage.py populate_sync_test_data

echo "Starting Django server..."
exec python manage.py runserver 0.0.0.0:9000
