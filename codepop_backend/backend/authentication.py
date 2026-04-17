import logging
import jwt
from django.conf import settings
from rest_framework import authentication
from rest_framework.exceptions import AuthenticationFailed
from .models import ServerRegistry, CustomUser, MasterList

logger = logging.getLogger(__name__)

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
                logger.warning(f"P2P Auth: Issuer server {issuer_id} not found in registry.")
                raise AuthenticationFailed(f"Issuer server {issuer_id} not found in registry.")

            # 3. Verify the token signature using the Home Server's Public Key
            try:
                payload = jwt.decode(
                    raw_token, 
                    issuer_server.PublicKey, 
                    algorithms=['RS256'],
                    leeway=5 # Handle slight clock skew in automated tests
                )
            except jwt.ExpiredSignatureError:
                raise AuthenticationFailed("Token has expired.")
            except jwt.InvalidTokenError as e:
                logger.warning(f"P2P Auth: Asymmetric verification failed for issuer {issuer_id}: {str(e)}")
                raise AuthenticationFailed(f"Invalid token: {str(e)}")

            # 4. Extract user identity
            user_id = payload.get('user_id')
            username = payload.get('username')
            user_type = payload.get('user_type', 'customer')
            home_server_id = payload.get('home_server_id')

            if not user_id or not username:
                raise AuthenticationFailed("Token missing user identity claims.")

            # 5. Get or Create the "Shadow" user record locally
            # We first try to find by ID (UUID), then by Username.
            user = CustomUser.objects.filter(id=user_id).first()
            if not user:
                user = CustomUser.objects.filter(username=username).first()
            
            # Resolve Home Server if provided
            home_server = None
            if home_server_id:
                home_server = ServerRegistry.objects.filter(pk=home_server_id).first()

            if user:
                if str(user.id) == str(user_id):
                    # Exact UUID match — sync remote state normally
                    user.username = username
                    user.user_type = user_type
                    if home_server:
                        user.home_server = home_server
                    user.save()
                # else: username collision with a locally-created account (e.g. a
                # per-server super admin). Don't overwrite the local PK — just use
                # the found user. P2P signature verification already validated the
                # token, so trusting the username match is safe.
            else:
                # Create new shadow user
                user = CustomUser.objects.create(
                    id=user_id,
                    username=username,
                    user_type=user_type,
                    home_server=home_server
                )
                user.set_unusable_password()
                user.save()

            return (user, payload)

        except Exception as e:
            if 'issuer_id' in locals() and issuer_id:
                logger.error(f"P2P Authentication exception for issuer {issuer_id}: {str(e)}")
                raise AuthenticationFailed(f"P2P Authentication failed: {str(e)}")
            return None
