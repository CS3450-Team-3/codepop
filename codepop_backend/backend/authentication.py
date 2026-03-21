import jwt
from django.conf import settings
from rest_framework import authentication
from rest_framework.exceptions import AuthenticationFailed
from .models import ServerRegistry, CustomUser, MasterList

class P2PJWTAuthentication(authentication.BaseAuthentication):
    """
    Custom authentication backend that supports asymmetrically signed JWTs.
    
    Any server in the network can verify a JWT issued by any other server
    by looking up the issuer's Public Key in the ServerRegistry.
    """

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        raw_token = auth_header.split(' ')[1]

        try:
            # 1. Decode the token header WITHOUT verification to identify the issuer
            unverified_payload = jwt.decode(raw_token, options={"verify_signature": False})
            issuer_id = unverified_payload.get('iss')
            
            if not issuer_id:
                return None # Fallback to local auth or fail

            # 2. Look up the Issuer (Home Server) in the Registry
            try:
                issuer_server = ServerRegistry.objects.get(pk=issuer_id)
            except ServerRegistry.DoesNotExist:
                raise AuthenticationFailed(f"Issuer server {issuer_id} not found in registry.")

            # 3. Verify the token signature using the Home Server's Public Key
            # We assume the Public Key is stored in PEM format in the database
            try:
                payload = jwt.decode(
                    raw_token, 
                    issuer_server.PublicKey, 
                    algorithms=['RS256']
                )
            except jwt.ExpiredSignatureError:
                raise AuthenticationFailed("Token has expired.")
            except jwt.InvalidTokenError as e:
                raise AuthenticationFailed(f"Invalid token: {str(e)}")

            # 4. Extract user identity
            user_id = payload.get('user_id')
            username = payload.get('username')
            user_type = payload.get('user_type', 'customer')

            if not user_id or not username:
                raise AuthenticationFailed("Token missing user identity claims.")

            # 5. Get or Create the "Shadow" user record locally
            # This ensures we have a valid User object for foreign keys (Orders, etc.)
            # but we never store the sensitive password hash.
            user, created = CustomUser.objects.update_or_create(
                id=user_id,
                defaults={
                    'username': username,
                    'user_type': user_type,
                }
            )

            if created:
                user.set_unusable_password()
                user.save()

            return (user, payload)

        except Exception as e:
            # If asymmetric verification fails, we don't raise an error immediately
            # so that other authentication backends (like local) can try.
            # However, if it looked like a P2P token, we should be strict.
            if 'iss' in locals() and issuer_id:
                raise AuthenticationFailed(f"P2P Authentication failed: {str(e)}")
            return None
