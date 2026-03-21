from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from unittest.mock import patch
import jwt
from django.conf import settings
from .models import CustomUser, MasterList, ServerRegistry

class P2PAuthTests(APITestCase):
    def setUp(self):
        # 1. Setup a "Remote" server in our registry
        self.remote_server = ServerRegistry.objects.create(
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
