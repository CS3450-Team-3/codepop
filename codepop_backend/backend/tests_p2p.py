from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from unittest.mock import patch
import jwt
from django.conf import settings
from .models import CustomUser, MasterList, ServerRegistry
from .serializers import get_tokens_for_user

class P2PAuthTests(APITestCase):
    def setUp(self):
        # 1. Setup a "Remote" server in our registry (ServerID=100)
        self.remote_server = ServerRegistry.objects.create(
            ServerID=100,
            ServerURL="https://remote-store.com",
            PublicKey="dummy-public-key",
            Status="Active"
        )
        
        # 2. Setup a user who belongs to that remote server
        self.remote_username = "traveler_joe"
        MasterList.objects.create(
            Username=self.remote_username,
            HomeServerID=self.remote_server
        )

    def test_get_tokens_for_user_claims(self):
        """
        Verify that get_tokens_for_user helper injects the required P2P claims.
        """
        user = CustomUser.objects.create_user(username="test_user", password="password")
        user.user_type = 'admin'
        user.save()

        # Test with local server ID set
        with self.settings(LOCAL_SERVER_ID=5):
            tokens = get_tokens_for_user(user)
            payload = jwt.decode(tokens['access'], options={"verify_signature": False})
            
            self.assertEqual(payload['iss'], '5')
            self.assertEqual(payload['user_id'], str(user.id))
            self.assertEqual(payload['username'], user.username)
            self.assertEqual(payload['user_type'], 'admin')
            self.assertEqual(payload['home_server_id'], '5')

    @patch('requests.post')
    def test_proxy_refresh_token(self, mock_post):
        """
        Verify that TokenRefreshView proxies to the Home Server if the token's
        home_server_id is remote.
        """
        # Create a user and a token that claims to be from the remote server
        user = CustomUser.objects.create_user(username="remote_user", password="password")
        user.home_server = self.remote_server
        user.save()

        # Manually create a token with a remote home_server_id
        refresh = RefreshToken.for_user(user)
        refresh['home_server_id'] = str(self.remote_server.ServerID)
        
        # Mock successful proxy response
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            'access': 'new-access-token-from-remote',
            'refresh': 'new-refresh-token-from-remote'
        }

        # Request refresh from local server
        with self.settings(LOCAL_SERVER_ID=1):
            response = self.client.post('/backend/auth/refresh/', {'refresh': str(refresh)})

        # Assertions
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['access'], 'new-access-token-from-remote')
        
        # Verify it called the remote server's refresh endpoint
        expected_url = f"{self.remote_server.ServerURL}/backend/auth/refresh/"
        mock_post.assert_called_once()
        self.assertEqual(mock_post.call_args[0][0], expected_url)

    @patch('requests.post')
    def test_proxy_logout_blacklist(self, mock_post):
        """
        Verify that LogoutView proxies the blacklist request to the Home Server.
        """
        user = CustomUser.objects.create_user(username="logout_user", password="password")
        
        # Create token with remote home_server_id
        refresh = RefreshToken.for_user(user)
        refresh['home_server_id'] = str(self.remote_server.ServerID)
        
        # Authenticate locally
        self.client.force_authenticate(user=user)

        # Mock successful proxy response
        mock_post.return_value.status_code = 200

        with self.settings(LOCAL_SERVER_ID=1):
            response = self.client.post('/backend/auth/logout/', {'refresh': str(refresh)})

        # Assertions
        self.assertEqual(response.status_code, 200)
        
        # Verify it called the remote server's logout endpoint
        expected_url = f"{self.remote_server.ServerURL}/backend/auth/logout/"
        mock_post.assert_called_once()
        self.assertEqual(mock_post.call_args[0][0], expected_url)

    @patch('jwt.decode')
    def test_p2p_authentication_flow(self, mock_jwt_decode):
        """
        Verify that P2PJWTAuthentication correctly validates a remote token
        and creates/updates a local shadow user.
        """
        remote_user_id = "00000000-0000-0000-0000-000000000001"
        payload = {
            'user_id': remote_user_id,
            'username': 'remote_shadow',
            'user_type': 'admin',
            'iss': str(self.remote_server.ServerID),
            'home_server_id': str(self.remote_server.ServerID)
        }

        # Mock jwt.decode:
        # 1st call: unverified decode to get 'iss'
        # 2nd call: verified decode with public key
        mock_jwt_decode.side_effect = [payload, payload]

        # Simulate request with Bearer token
        from rest_framework.test import APIRequestFactory
        from .authentication import P2PJWTAuthentication
        
        factory = APIRequestFactory()
        request = factory.get('/backend/drinks/', HTTP_AUTHORIZATION='Bearer dummy-token')
        
        auth = P2PJWTAuthentication()
        user, auth_payload = auth.authenticate(request)

        # Assertions
        self.assertIsNotNone(user)
        self.assertEqual(user.username, 'remote_shadow')
        self.assertEqual(user.user_type, 'admin')
        self.assertEqual(user.home_server, self.remote_server)
        
        # Verify shadow user persists
        shadow = CustomUser.objects.get(username='remote_shadow')
        self.assertEqual(str(shadow.id), remote_user_id)

    @patch('requests.post')
    def test_proxy_login_flow(self, mock_post):
        """
        Test that when a user is not local, the server proxies the 
        request to the Home Server found in the MasterList.
        """
        # Mock the remote server's successful response
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            'access': 'remote-token',
            'first_name': 'Joe',
            'user_type': 'customer'
        }

        # Attempt to login as the remote user on our "local" server
        login_data = {'username': self.remote_username, 'password': 'password123'}
        
        # We need to mock get_local_server to return something different than remote_server
        with patch('backend.views.get_local_server') as mock_local:
            mock_local.return_value.ServerID = 999
            response = self.client.post('/backend/auth/login/', login_data)

        # ASSERTIONS
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('is_proxy'))
        self.assertEqual(response.data.get('user_type'), 'customer')
        
        # Verify a "shadow" user was created locally
        shadow_user = CustomUser.objects.get(username=self.remote_username)
        self.assertFalse(shadow_user.has_usable_password())
        self.assertEqual(shadow_user.first_name, 'Joe')

    def test_asymmetric_jwt_claims(self):
        """
        Test that locally issued JWTs include the 'iss' (Issuer) claim.
        """
        # Create a local user
        local_user = CustomUser.objects.create_user(username="local_girl", password="password123")
        
        # Ensure LOCAL_SERVER_ID is set for the test
        with self.settings(LOCAL_SERVER_ID=1):
            login_data = {'username': "local_girl", 'password': "password123"}
            response = self.client.post('/backend/auth/login/', login_data)
            
            # Decode token without verification to check claims
            payload = jwt.decode(response.data['access'], options={"verify_signature": False})
            self.assertEqual(payload['iss'], '1')
            self.assertEqual(payload['user_type'], 'customer')

    def test_unregistered_user_fails(self):
        """
        Test that a user who is neither local nor in the MasterList fails.
        """
        login_data = {'username': "ghost_user", 'password': "password123"}
        response = self.client.post('/backend/auth/login/', login_data)
        
        # Should return 401 Unauthorized (standard DRF behavior)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
