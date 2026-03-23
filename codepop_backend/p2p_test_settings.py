import os

# Import mock_stripe so that when these test settings are loaded, the Stripe API is mocked.
import backend.mock_stripe

from codepop_backend.settings import *

# P2P Test Settings Override
# We MUST use PostgreSQL because the project uses ArrayField,
# which SQLite does not support.

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DATABASE_NAME', 'p2p_test_a'),
        'USER': 'postgres',
        'PASSWORD': 'password',
        'HOST': '127.0.0.1',
        'PORT': '5432',
    }
}

# Ensure we use a predictable Secret Key for tests if not set
SECRET_KEY = os.environ.get('SECRET_KEY', 'p2p-testing-secret-key-123')
STRIPE_WEBHOOK_SECRET = 'mock_webhook_secret_for_p2p'

# Speed up password hashing for tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]
