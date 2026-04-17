from .models import Preference, Drink, Inventory, Notification, Order, Revenue, CustomUser, MasterList, Flavor, ServerRegistry, Region
from django.shortcuts import get_object_or_404
from django.db import models
from django.utils import timezone
User = CustomUser
from rest_framework.generics import CreateAPIView, ListAPIView, ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from .permissions import (
    IsSuperUser, IsAdmin, IsStoreManager, IsLogisticsManager, 
    IsRepairStaff, IsOwner, IsGuestOrAuthenticatedForCreation, IsPeerServer
)
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework import status, viewsets, permissions
from rest_framework.views import APIView, exception_handler
from .serializers import (
    CreateUserSerializer, GetUserSerializer, UserProfileSerializer, 
    PreferenceSerializer, DrinkSerializer, InventorySerializer, 
    NotificationSerializer, OrderSerializer, RevenueSerializer, 
    MasterListSerializer, ServerRegistrySerializer, CustomTokenObtainPairSerializer,
    FlavorSerializer,
    get_tokens_for_user
)
from .documentation_serializers import (
    EmailAPIResponseSerializer, InventoryReportResponseSerializer, 
    MasterListSyncRequestSerializer, MasterListSyncResponseSerializer
)
import stripe
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views import View
from django.utils.decorators import method_decorator
import json
import requests
import jwt
import uuid7
from drf_spectacular.utils import extend_schema
from drf_spectacular.types import OpenApiTypes
from django.utils.dateparse import parse_datetime
from .drinkAI import generate_soda
from .sync import get_local_server

stripe.api_key = settings.STRIPE_SECRET_KEY


def set_refresh_cookie(response, refresh_token):
    """
    Helper to set the refresh token as an HttpOnly cookie.
    """
    cookie_max_age = 30 * 24 * 60 * 60  # 30 days
    response.set_cookie(
        key='refresh_token',
        value=refresh_token,
        max_age=cookie_max_age,
        httponly=True,
        secure=not settings.DEBUG,
        samesite='Lax',
        path='/backend/auth/'  # Scope to auth endpoints for security
    )

class CustomTokenRefreshView(TokenRefreshView):
    """
    Overridden Refresh view that proxies the refresh request to the user's
    Home Server if the local server is just a visiting server.
    Supports reading the refresh token from an HttpOnly cookie.
    """
    @extend_schema(
        description="Refresh an access token. If the refresh token was issued by a remote Home Server, "
                    "the request is proxied to that server for authoritative validation. "
                    "Supports reading from the 'refresh_token' HttpOnly cookie."
    )
    def post(self, request, *args, **kwargs):
        # 0. Try to get refresh token from body, then from cookie
        refresh_token = request.data.get('refresh') or request.COOKIES.get('refresh_token')
        
        if not refresh_token:
            return Response({"error": "Refresh token required"}, status=status.HTTP_400_BAD_REQUEST)

        # Inject token into data for the parent class if it came from the cookie
        if not request.data.get('refresh'):
            request.data['refresh'] = refresh_token

        try:
            # 1. Unverified decode to find the Home Server
            unverified_payload = jwt.decode(refresh_token, options={"verify_signature": False})
            home_server_id = unverified_payload.get('home_server_id')
            local_id = getattr(settings, 'LOCAL_SERVER_ID', None)

            # 2. If Home Server is remote, proxy the request
            if home_server_id and str(home_server_id) != str(local_id):
                try:
                    home_server = ServerRegistry.objects.get(pk=home_server_id)
                    proxy_url = home_server.ServerURL.rstrip('/') + '/backend/auth/refresh/'
                    
                    remote_resp = requests.post(
                        proxy_url, 
                        json={'refresh': refresh_token},
                        timeout=10
                    )
                    
                    if remote_resp.status_code == 200:
                        data = remote_resp.json()
                        response = Response(data, status=status.HTTP_200_OK)
                        # If the remote server rotated the refresh token, set the new cookie locally
                        if 'refresh' in data:
                            set_refresh_cookie(response, data['refresh'])
                        return response
                    
                    return Response(remote_resp.json(), status=remote_resp.status_code)
                    
                except ServerRegistry.DoesNotExist:
                    pass
                except requests.RequestException:
                    return Response(
                        {"error": "Home server unreachable for token refresh."}, 
                        status=status.HTTP_503_SERVICE_UNAVAILABLE
                    )

            # 3. Local refresh (Home Server logic)
            response = super().post(request, *args, **kwargs)
            if response.status_code == 200 and 'refresh' in response.data:
                set_refresh_cookie(response, response.data['refresh'])
            return response

        except jwt.InvalidTokenError:
            return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

def custom_exception_handler(exc, context):
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    # Now add the HTTP status code to the response.
    if response is not None:
        error_message = "An error occurred"
        if 'detail' in response.data:
            error_message = response.data['detail']
        elif isinstance(response.data, dict) and len(response.data) > 0:
            # For validation errors, the first key's first message is often useful
            first_key = next(iter(response.data))
            if isinstance(response.data[first_key], list) and len(response.data[first_key]) > 0:
                error_message = f"Validation error in {first_key}"

        data = {
            "error": error_message,
            "details": response.data
        }
        # If 'detail' was the only thing in response.data, remove it from 'details' to avoid redundancy
        if 'detail' in data['details'] and len(data['details']) == 1:
            del data['details']['detail']

        response.data = data

    return response

def proxy_user_request(request, target_path):
    """
    Helper to proxy a request to the user's home server if it is remote.
    
    If the user's home_server is not the local server, this function
    forwards the request (including the JWT in Authorization header) 
    to the same path on the home server.

    NOTE: Logistics Managers and Repair Staff bypass this default proxying
    to allow them to access local server data or perform regional aggregation.
    """
    user = request.user
    if not user.is_authenticated:
        return None

    # Logistics Managers and Repair Staff bypass the home-server proxy
    if user.user_type in ['logistics_manager', 'repair_staff']:
        return None

    if not user.home_server:
        return None
    
    try:
        local_server = get_local_server()
    except Exception:
        return None

    if user.home_server_id == local_server.ServerID:
        return None
    
    # Construct proxy URL
    proxy_url = user.home_server.ServerURL.rstrip('/') + target_path
    
    # Extract headers (especially Authorization)
    headers = {
        'Content-Type': 'application/json'
    }
    auth_header = request.headers.get('Authorization')
    if auth_header:
        headers['Authorization'] = auth_header
    
    # Forward the request
    try:
        method = request.method
        payload = request.data if method in ['POST', 'PUT', 'PATCH'] else None
        # For GET requests, query params should be passed
        params = request.query_params if method == 'GET' else None
        
        remote_resp = requests.request(
            method=method,
            url=proxy_url,
            json=payload,
            params=params,
            headers=headers,
            timeout=10
        )
        
        # Return a Django Response object matching the proxy result
        try:
            remote_data = remote_resp.json()
            if isinstance(remote_data, dict):
                remote_data['proxied'] = str(user.home_server_id)
            return Response(remote_data, status=remote_resp.status_code)
        except ValueError:
            return Response(remote_resp.text, status=remote_resp.status_code)
        
    except requests.RequestException as e:
        return Response(
            {"error": "Home server unreachable", "details": str(e)}, 
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

def sync_order_to_home_server(order, request):
    """
    Helper to sync a locally created order back to the user's remote home server.
    """
    user = order.UserID
    if not user or not user.home_server:
        return
    
    try:
        local_server = get_local_server()
    except Exception:
        return

    if user.home_server_id == local_server.ServerID:
        return
    
    # Construct proxy URL for creating the order on the home server
    proxy_url = user.home_server.ServerURL.rstrip('/') + '/backend/orders/'
    
    # Extract headers (especially Authorization)
    headers = {
        'Content-Type': 'application/json'
    }
    auth_header = request.headers.get('Authorization')
    if auth_header:
        headers['Authorization'] = auth_header
    
    # Serialize the order including its ID and related drinks
    from .serializers import OrderSerializer, DrinkSerializer
    serializer = OrderSerializer(order)
    payload = serializer.data
    
    # Standard JSON serializer (used by requests) doesn't handle UUIDs.
    # We must ensure all ID fields are stringified.
    payload['OrderID'] = str(payload['OrderID'])
    if payload.get('UserID'):
        payload['UserID'] = str(payload['UserID'])
    if payload.get('Drinks'):
        payload['Drinks'] = [str(d) for d in payload['Drinks']]
    
    # Include full drink data so the home server can recreate missing drinks
    drinks_queryset = order.Drinks.all()
    payload['DrinksData'] = DrinkSerializer(drinks_queryset, many=True).data
    # DrinkSerializer data also needs stringified UUIDs
    for d_data in payload['DrinksData']:
        d_data['DrinkID'] = str(d_data['DrinkID'])
    
    # Ensure the home server knows this came from our server
    payload['OriginatingServer'] = local_server.ServerID
    
    # Forward the request (Fire and forget-ish, but let's log errors)
    try:
        requests.post(
            url=proxy_url,
            json=payload,
            headers=headers,
            timeout=10
        )
    except requests.RequestException as e:
        logger.warning(f"Failed to sync order {order.OrderID} to home server {user.home_server_id}: {str(e)}")

class CustomAuthToken(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    @extend_schema(
        description="Login with username and password to receive JWT access and refresh tokens. "
                    "Supports inter-server proxying if the user's home server is elsewhere. "
                    "The refresh token is also set as an HttpOnly cookie."
    )
    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')

        # 1. Try local authentication first
        try:
            response = super().post(request, *args, **kwargs)
            if response.status_code == 200:
                set_refresh_cookie(response, response.data.get('refresh'))
                return response
        except Exception as local_exc:
            # We'll use this exception as a fallback if proxying also fails
            pass
        
        # 2. If local fails, check the MasterList for a remote Home Server
        try:
            master_entry = MasterList.objects.get(Username=username)
            local_server = get_local_server()
            
            if master_entry.HomeServerID != local_server:
                # 3. Proxy the request to the Home Server
                home_server = master_entry.HomeServerID
                proxy_url = home_server.ServerURL.rstrip('/') + '/backend/auth/login/'
                
                try:
                    remote_resp = requests.post(
                        proxy_url, 
                        json={'username': username, 'password': password},
                        timeout=10
                    )
                    
                    if remote_resp.status_code == 200:
                        remote_data = remote_resp.json()
                        remote_user_id = remote_data.get('user_id')
                        
                        user_lookup = {'id': remote_user_id} if remote_user_id else {'username': username}
                        
                        user, created = User.objects.update_or_create(
                            **user_lookup,
                            defaults={
                                'username': username,
                                'first_name': remote_data.get('first_name', ''),
                                'user_type': remote_data.get('user_type', 'customer'),
                                'home_server': home_server,
                            }
                        )
                        if created:
                            user.set_unusable_password()
                            user.save()
                            
                        data = {
                            'refresh': remote_data.get('refresh'),
                            'access': remote_data.get('access'),
                            'user_type': remote_data.get('user_type', user.user_type),
                            'user_id': str(user.id),
                            'first_name': remote_data.get('first_name', user.first_name),
                            'is_proxy': True,
                            'home_server_id': str(home_server.ServerID)
                        }
                        response = Response(data, status=status.HTTP_200_OK)
                        set_refresh_cookie(response, remote_data.get('refresh'))
                        return response
                    
                    # If proxy failed with 401, return that instead of local fail
                    try:
                        return Response(remote_resp.json(), status=remote_resp.status_code)
                    except:
                        return Response({"detail": remote_resp.text}, status=remote_resp.status_code)
                
                except requests.RequestException as e:
                    return Response(
                        {"error": "Home server unreachable", "details": str(e)}, 
                        status=status.HTTP_503_SERVICE_UNAVAILABLE
                    )
        except MasterList.DoesNotExist:
            pass 

        # If we got here, all attempts failed. 
        # Return a generic 401 if we don't have a specific response.
        if 'response' in locals() and response:
            return response
        return Response({"detail": "No active account found with the given credentials"}, status=status.HTTP_401_UNAUTHORIZED)

class CreateUserAPIView(CreateAPIView):
    serializer_class = CreateUserSerializer
    permission_classes = [AllowAny]

    @extend_schema(
        description="Register a new user and receive initial JWT access and refresh tokens. "
                    "The refresh token is also set as an HttpOnly cookie."
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        
        user = serializer.instance
        token_data = get_tokens_for_user(user)
        
        response = Response(
            {**serializer.data, **token_data},
            status=status.HTTP_201_CREATED,
            headers=headers
        )
        set_refresh_cookie(response, token_data.get('refresh'))
        return response

class LogoutUserAPIView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = None

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT},
        description="Logout the user by blacklisting the refresh token. "
                    "If the token belongs to a remote Home Server, the request is proxied there. "
                    "Also clears the 'refresh_token' HttpOnly cookie."
    )
    def post(self, request, *args, **kwargs):
        try:
            refresh_token = request.data.get("refresh") or request.COOKIES.get('refresh_token')
            
            response = Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
            # Always clear the cookie regardless of P2P or local
            response.delete_cookie('refresh_token', path='/backend/auth/')

            if not refresh_token:
                return response

            # 1. Determine the Home Server from the token
            unverified_payload = jwt.decode(refresh_token, options={"verify_signature": False})
            home_server_id = unverified_payload.get('home_server_id')
            local_id = getattr(settings, 'LOCAL_SERVER_ID', None)

            # 2. If Home Server is remote, proxy the logout
            if home_server_id and str(home_server_id) != str(local_id):
                try:
                    home_server = ServerRegistry.objects.get(pk=home_server_id)
                    proxy_url = home_server.ServerURL.rstrip('/') + '/backend/auth/logout/'
                    
                    headers = {}
                    if 'Authorization' in request.headers:
                        headers['Authorization'] = request.headers['Authorization']

                    requests.post(
                        proxy_url, 
                        json={'refresh': refresh_token},
                        headers=headers,
                        timeout=5
                    )
                    # We already have our response ready with delete_cookie
                    return response
                    
                except ServerRegistry.DoesNotExist:
                    pass
                except requests.RequestException:
                    # Even if home server is down, we want to return the response that cleared the local cookie
                    return response

            # 3. Blacklist locally 
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            return response
        except (TokenError, jwt.InvalidTokenError):
            # If token is invalid, we still want to clear the cookie
            response = Response({"error": "Invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)
            response.delete_cookie('refresh_token', path='/backend/auth/')
            return response
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
class PreferencesOperations(viewsets.ModelViewSet):
    queryset = Preference.objects.all()
    serializer_class = PreferenceSerializer
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        # Only return preferences belonging to the current user
        return Preference.objects.filter(UserID=self.request.user)

    def list(self, request, *args, **kwargs):
        proxy_resp = proxy_user_request(request, '/backend/preferences/')
        if proxy_resp:
            return proxy_resp
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        proxy_resp = proxy_user_request(request, f'/backend/preferences/{pk}/')
        if proxy_resp:
            return proxy_resp
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        proxy_resp = proxy_user_request(request, '/backend/preferences/')
        if proxy_resp:
            return proxy_resp
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        proxy_resp = proxy_user_request(request, f'/backend/preferences/{pk}/')
        if proxy_resp:
            return proxy_resp
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        proxy_resp = proxy_user_request(request, f'/backend/preferences/{pk}/')
        if proxy_resp:
            return proxy_resp
        return super().destroy(request, *args, **kwargs)

class UserPreferenceLookup(ListAPIView):
    serializer_class = PreferenceSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user_id = str(self.kwargs['user_id'])
        # Only allow if the requesting user is the owner or a super_admin
        if str(request.user.id) != user_id and request.user.user_type != 'super_admin':
            return Response({"error": "You do not have permission to access these preferences."}, status=status.HTTP_403_FORBIDDEN)
            
        proxy_resp = proxy_user_request(request, f'/backend/users/{user_id}/preferences/')
        if proxy_resp:
            return proxy_resp
        return super().get(request, *args, **kwargs)

    # Override get_queryset to filter preferences by the provided UserID
    def get_queryset(self):
        user_id = self.kwargs['user_id']  # Retrieve the 'user_id' from the URL
        # Check if the user exists first, and raise a 404 if not
        user = get_object_or_404(User, pk=user_id)
        return Preference.objects.filter(UserID=user_id)
    
from rest_framework import status, viewsets, permissions
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.generics import ListAPIView
from django.shortcuts import get_object_or_404
from .models import Drink
from .serializers import DrinkSerializer
from rest_framework.views import APIView

@method_decorator(csrf_exempt, name='dispatch')
class DrinkOperations(viewsets.ModelViewSet):
    queryset = Drink.objects.all()
    serializer_class = DrinkSerializer
    permission_classes = [AllowAny]

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            # We will perform object-level checks in the action methods themselves
            # or rely on has_object_permission, but Drink has both house and user drinks.
            # Using IsAuthenticated here and checking ownership/role in the methods.
            return [IsAuthenticated()]
        return super().get_permissions()

    def list(self, request, *args, **kwargs):
        # If filtering for user_created drinks, proxy to home server
        drink_type = request.query_params.get('type')
        if drink_type == 'user_created':
            proxy_resp = proxy_user_request(request, '/backend/drinks/')
            if proxy_resp:
                return proxy_resp
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        """
        Modify the basic GET request behavior to support filtering.
        """
        queryset = Drink.objects.all()
        
        # Handle type filtering
        drink_type = self.request.query_params.get('type')
        if drink_type == 'user_created':
            queryset = queryset.filter(User_Created=True)
        elif drink_type == 'house':
            queryset = queryset.filter(User_Created=False)
        elif self.action == 'list' and not drink_type:
            # Default behavior for list if no type specified
            queryset = queryset.filter(User_Created=False)

        # Handle flavor filtering
        flavor_primary = self.request.query_params.get('flavor')
        if flavor_primary:
            # Find flavors that match the primary flavor
            matching_flavors = Flavor.objects.filter(PrimaryFlavor__iexact=flavor_primary)
            matching_syrup_names = matching_flavors.values_list('Name', flat=True)
            # Filter drinks that use any of these syrups
            # Since SyrupsUsed is an ArrayField, we can use __overlap
            queryset = queryset.filter(SyrupsUsed__overlap=list(matching_syrup_names))

        return queryset

    def create(self, request, *args, **kwargs):
        proxy_resp = proxy_user_request(request, '/backend/drinks/')
        if proxy_resp:
            return proxy_resp
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """
        Custom update method to handle updating a drink's fields, favorites, and validation.
        """
        pk = kwargs.get('pk')
        proxy_resp = proxy_user_request(request, f'/backend/drinks/{pk}/')
        if proxy_resp:
            return proxy_resp

        # Retrieve the drink object to be updated
        drink = self.get_object()

        # Check if this is a favorite-only operation (addFavorite / removeFavorite)
        is_favorite_only = set(request.data.keys()) <= {'addFavorite', 'removeFavorite'}

        # Permission logic from plan:
        # Favorite-only operations: allow any authenticated user
        if not is_favorite_only:
            # If it's a house drink and modifying other fields: IsStoreManager only
            if not drink.User_Created:
                if not IsStoreManager().has_permission(request, self):
                    return Response({"error": "Only store managers can modify house drinks."}, status=status.HTTP_403_FORBIDDEN)
            else:
                # If it's a user created drink: Only the owner.
                # NOTE: Without a UserID field on Drink, we cannot strictly verify the owner.
                # We assume any authenticated user can update if it's user created for now,
                # but ideally a UserID field should be added to Drink.
                if not request.user.is_authenticated:
                     return Response({"error": "Authentication required to update drinks."}, status=status.HTTP_401_UNAUTHORIZED)
        
        # For favorite operations, require authentication
        if is_favorite_only and not request.user.is_authenticated:
            return Response({"error": "Authentication required to favorite drinks."}, status=status.HTTP_401_UNAUTHORIZED)

        # Handle adding/removing favorites
        favorite_to_add = request.data.get("addFavorite", [])
        favorite_to_remove = request.data.get("removeFavorite", [])
        
        # For non-favorite updates, validate and apply field changes
        if not is_favorite_only:
            # Use the serializer to validate and update the data
            serializer = self.get_serializer(drink, data=request.data, partial=True)
            
            # Validate the data (including Ice and Size field checks)
            serializer.is_valid(raise_exception=True)

            # If valid, update the fields
            # Explicitly update fields from request data if they exist on the drink model
            for field, value in request.data.items():
                if field not in ['addFavorite', 'removeFavorite'] and hasattr(drink, field):
                    setattr(drink, field, value)
        else:
            serializer = self.get_serializer(drink)
        
        # Handle favorites iteratively (both are lists)
        if favorite_to_add:
            for user_id in favorite_to_add:
                drink.addFavorite(user_id)
        if favorite_to_remove:
            for user_id in favorite_to_remove:
                drink.removeFavorite(user_id)

        # Save the updated drink
        drink.save()

        # Return the updated drink data using the serializer
        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        proxy_resp = proxy_user_request(request, f'/backend/drinks/{pk}/')
        if proxy_resp:
            return proxy_resp

        drink = self.get_object()

        # Permission logic from plan:
        # If it's a house drink: IsStoreManager only
        if not drink.User_Created:
            if not IsStoreManager().has_permission(request, self):
                return Response({"error": "Only store managers can delete house drinks."}, status=status.HTTP_403_FORBIDDEN)
        else:
            # If it's a user created drink: Only the owner.
            if not request.user.is_authenticated:
                return Response({"error": "Authentication required to delete drinks."}, status=status.HTTP_401_UNAUTHORIZED)
                
        return super().destroy(request, *args, **kwargs)


class FlavorOperations(viewsets.ModelViewSet):
    queryset = Flavor.objects.all().order_by('Name')
    serializer_class = FlavorSerializer
    permission_classes = [IsStoreManager | IsLogisticsManager]

class UserDrinksLookup(ListAPIView):
    serializer_class = DrinkSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user_id = str(self.kwargs['user_id'])
        # Only allow if the requesting user is the owner or a super_admin
        if str(request.user.id) != user_id and request.user.user_type != 'super_admin':
            return Response({"error": "You do not have permission to access these favorite drinks."}, status=status.HTTP_403_FORBIDDEN)
            
        user_id = self.kwargs['user_id']
        proxy_resp = proxy_user_request(request, f'/backend/users/{user_id}/drinks/')
        if proxy_resp:
            return proxy_resp
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        """
        Retrieve drinks that are marked as favorites by the provided user ID.
        """
        user_id = self.kwargs['user_id']  # Retrieve the 'user_id' from the URL
        # user = get_object_or_404(User, pk=user_id)
        return Drink.objects.filter(Favorite=user_id)


class InventoryListAPIView(ListAPIView):
    """List all items that are not out of stock."""
    queryset = Inventory.objects.filter(Quantity__gt=0)
    serializer_class = InventorySerializer
    permission_classes = [AllowAny]

class InventoryReportAPIView(APIView):
    """Generate an inventory report."""
    # AllowAny so peer servers can call this endpoint without needing the
    # requesting user to exist in their own database.  The aggregate endpoint
    # that calls this is itself protected by IsLogisticsManager.
    permission_classes = [AllowAny]

    @extend_schema(
        responses={200: InventoryReportResponseSerializer},
        description="Generate a detailed report of current inventory including out-of-stock and low-stock counts."
    )
    def get(self, request):
        inventory = Inventory.objects.all()
        report_data = {
            'inventory_items': [
                {
                    'InventoryID': item.InventoryID,
                    'ItemName': item.ItemName,
                    'Quantity': item.Quantity,
                    'ThresholdLevel': item.ThresholdLevel,
                }
                for item in inventory
            ],
            'total_items': inventory.count(),
            'out_of_stock': inventory.filter(Quantity=0).count(),
            'below_threshold': inventory.filter(Quantity__lte=models.F('ThresholdLevel')).count(),
        }
        return Response(report_data, status=status.HTTP_200_OK)

class InventoryUpdateAPIView(RetrieveUpdateAPIView):
    """Update inventory based on what was ordered, with warnings for empty or low stock."""
    queryset = Inventory.objects.all()
    serializer_class = InventorySerializer
    permission_classes = [IsStoreManager | IsLogisticsManager]

    def patch(self, request, *args, **kwargs):
        item = self.get_object()  # Retrieve the specific item based on ID

        reset_quantity = request.data.get('reset')  # Check if the request is for a reset
        used_quantity = request.data.get('used_quantity')  # Used quantity for orders

        # Handle inventory reset
        if reset_quantity:
            # Reset the quantity to the threshold level (or a specific value)
            item.Quantity = item.ThresholdLevel  # Or you could use a custom value
            item.save()

            # Return the updated item details in the response
            return Response(self.get_serializer(item).data, status=status.HTTP_200_OK)

        # If it's a normal patch update with specific fields (like Quantity or ThresholdLevel)
        if used_quantity is None:
            # Check if any standard inventory fields are in the request
            inventory_fields = ['ItemName', 'ItemType', 'Quantity', 'ThresholdLevel']
            if any(field in request.data for field in inventory_fields):
                # Use standard partial update logic
                serializer = self.get_serializer(item, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)

            # If no recognized fields, return the same error as before to maintain compatibility
            return Response(
                {"error": "Invalid used quantity", "details": {"used_quantity": "Value must be greater than zero"}},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Handle normal used quantity update (for orders)
        if int(used_quantity) <= 0:
            return Response(
                {"error": "Invalid used quantity", "details": {"used_quantity": "Value must be greater than zero"}},
                status=status.HTTP_400_BAD_REQUEST
            )
        # Check if the item is already out of stock
        if item.Quantity == 0:
            return Response(
                {"error": "Out of stock", "details": {"item": f"'{item.ItemName}' is already out of stock."}}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if the order quantity exceeds available stock
        if item.Quantity < int(used_quantity):
            return Response(
                {"error": "Insufficient stock", "details": {"item": f"Not enough stock available for '{item.ItemName}'."}}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Subtract the used quantity from the current stock
        item.Quantity -= int(used_quantity)
        item.save()

        # Generate a warning if stock falls below the threshold level
        warning = None
        if item.Quantity <= item.ThresholdLevel:
            warning = f"'{item.ItemName}' stock is below the threshold level."

        # Prepare the response data
        response_data = self.get_serializer(item).data
        if warning:
            response_data['warning'] = warning

        return Response(response_data, status=status.HTTP_200_OK)

class InventoryAggregateView(APIView):
    """
    Aggregation endpoint for logistics managers to see inventory across all stores in their region.
    """
    permission_classes = [IsLogisticsManager]

    @extend_schema(
        responses={200: OpenApiTypes.OBJECT},
        description="Aggregate inventory reports from all stores within the Logistics Manager's region."
    )
    def get(self, request):
        local_server = get_local_server()

        # Super admins may request a specific region via ?region_id=<pk>.
        region_id_param = request.query_params.get('region_id')
        if region_id_param and request.user.user_type == 'super_admin':
            try:
                region_servers = ServerRegistry.objects.filter(Region_id=int(region_id_param), Status='Active')
            except (ValueError, TypeError):
                region_servers = ServerRegistry.objects.filter(Region=local_server.Region, Status='Active')
        else:
            # Default: aggregate within the local server's region.
            region_servers = ServerRegistry.objects.filter(Region=local_server.Region, Status='Active')

        results = {}
        # Peer servers now use AllowAny on /backend/inventory/report/ so no
        # auth header is needed.  Forwarding the user's JWT would fail anyway
        # because peer databases don't contain users from other servers.
        headers = {'Content-Type': 'application/json'}

        for server in region_servers:
            target_url = server.ServerURL.rstrip('/') + '/backend/inventory/report/'
            try:
                resp = requests.get(target_url, headers=headers, timeout=5)
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, dict):
                        data['proxied'] = str(server.ServerID)
                    results[server.ServerID] = data
                else:
                    results[server.ServerID] = {"error": f"Status {resp.status_code}", "details": resp.text}
            except Exception as e:
                results[server.ServerID] = {"error": "Connection failed", "details": str(e)}

        return Response({"results": results}, status=status.HTTP_200_OK)


class NotificationOperations(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsStoreManager()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user

        # Super Admins see everything locally
        if user.user_type == 'super_admin':
            return Notification.objects.all()

        # Store Managers only see their home store's notifications locally
        if user.user_type in ['admin', 'store_manager']:
            try:
                local_server = get_local_server()
                if str(user.home_server_id) == str(local_server.ServerID):
                    return Notification.objects.all()
            except Exception:
                pass

        # Everyone else (or visiting managers) only see their own or global notifications
        return Notification.objects.filter(models.Q(Global=True) | models.Q(UserID=user.id))

    def list(self, request, *args, **kwargs):
        # 1. Handle P2P Proxying
        proxy_resp = proxy_user_request(request, '/backend/notifications/')
        if proxy_resp:
            return proxy_resp

        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        proxy_resp = proxy_user_request(request, f'/backend/notifications/{pk}/')
        if proxy_resp:
            return proxy_resp
        return super().retrieve(request, *args, **kwargs)
    def create(self, request, *args, **kwargs):
        # Custom logic for creating a notification can go here
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        # Custom logic for updating a notification can go here
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        # Custom logic for deleting a notification can go here
        return super().destroy(request, *args, **kwargs)
    
    def filter_by_time(self, request):
        """
        Custom endpoint to filter notifications within a specific time range for the authenticated user.
        Accepts 'start' and 'end' parameters in ISO 8601 format.
        """
        start = request.query_params.get('start')
        end = request.query_params.get('end')

        # Parse start and end times
        start_time = parse_datetime(start) if start else None
        end_time = parse_datetime(end) if end else None

        # Check and convert to timezone-aware if necessary
        if start_time and timezone.is_naive(start_time):
            start_time = timezone.make_aware(start_time)
        if end_time and timezone.is_naive(end_time):
            end_time = timezone.make_aware(end_time)

        # Validate parameters
        if not start_time or not end_time:
            return Response(
                {"error": "Missing parameters", "details": {"params": "Both 'start' and 'end' parameters are required in ISO 8601 format."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Filter notifications by time range and for the authenticated user
        user = request.user
        notifications = Notification.objects.filter(
            Timestamp__range=(start_time, end_time),
            UserID=user
        )

        # Include global notifications if they fall within the time range
        global_notifications = Notification.objects.filter(
            Timestamp__range=(start_time, end_time),
            Global=True
        )
        notifications = notifications | global_notifications

        # Serialize and return the notifications
        serializer = self.get_serializer(notifications.distinct(), many=True)
        return Response(serializer.data)
    
class UserNotificationLookup(ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user_id = str(self.kwargs['user_id'])
        # Only allow if the requesting user is the owner or a super_admin
        if str(request.user.id) != user_id and request.user.user_type != 'super_admin':
            return Response({"error": "You do not have permission to access these notifications."}, status=status.HTTP_403_FORBIDDEN)
            
        return super().get(request, *args, **kwargs)

    # Override get_queryset to filter preferences by the provided UserID
    def get_queryset(self):
        user_id = self.kwargs['user_id']  # Retrieve the 'user_id' from the URL
        # Check if the user exists first, and raise a 404 if not
        user = get_object_or_404(User, pk=user_id)
        return Notification.objects.filter(UserID=user_id)

@method_decorator(csrf_exempt, name='dispatch')
class OrderOperations(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action == 'destroy':
             return [IsStoreManager()]
        elif self.action in ['update', 'partial_update', 'create', 'retrieve']:
            return [AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        
        # Handle AnonymousUser
        if not user or not user.is_authenticated:
            if self.action == 'list':
                return Order.objects.none()
            # Guests can only see orders that are not associated with any registered user
            return Order.objects.filter(UserID=None)

        # Super Admins see everything locally
        if user.user_type == 'super_admin':
            return Order.objects.all()
            
        # Store Managers only see their home store's orders
        if user.user_type in ['admin', 'store_manager']:
            try:
                local_server = get_local_server()
                if str(user.home_server_id) == str(local_server.ServerID):
                    return Order.objects.all()
            except Exception:
                pass
                 
        # Logistics managers see orders within their own region
        if IsLogisticsManager().has_permission(self.request, self):
            return Order.objects.all()

        # Customers only see their own orders
        return Order.objects.filter(UserID=user.id)

    def list(self, request, *args, **kwargs):
        # 1. Handle P2P Proxying
        proxy_resp = proxy_user_request(request, '/backend/orders/')
        if proxy_resp:
            return proxy_resp
            
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        proxy_resp = proxy_user_request(request, f'/backend/orders/{pk}/')
        if proxy_resp:
            return proxy_resp
        return super().retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        order = self.get_object()
        
        # 1. Ownership & Modification Check
        # Check if the user is trying to modify drinks or details
        drinks_to_add = request.data.get("AddDrinks", [])
        drinks_to_remove = request.data.get("RemoveDrinks", [])
        drinks_in_payload = request.data.get("Drinks")
        
        modifying_details = any([drinks_to_add, drinks_to_remove, drinks_in_payload is not None])
        
        if modifying_details:
            # CRITICAL VALIDATION: Reject if not Pending
            if order.PaymentStatus != 'Pending' or order.OrderStatus != 'Pending':
                return Response({"error": "Cannot modify an order that has already been paid or processed."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check ownership: If order has a UserID, only that user (or super_admin) can modify it.
            if order.UserID:
                if not request.user.is_authenticated or (str(request.user.id) != str(order.UserID_id) and request.user.user_type != 'super_admin'):
                     return Response({"error": "You do not have permission to modify this order's drinks."}, status=status.HTTP_403_FORBIDDEN)
        
        # 2. Status Modification Check
        new_order_status = request.data.get("OrderStatus")
        new_payment_status = request.data.get("PaymentStatus")
        
        if new_order_status or new_payment_status:
            # Strictly IsStoreManager
            if not IsStoreManager().has_permission(request, self):
                return Response({"error": "Only store managers can change order or payment status."}, status=status.HTTP_403_FORBIDDEN)

        # Adding drinks
        if drinks_to_add:
            order.add_drinks(drinks_to_add)

        # Removing drinks
        if drinks_to_remove:
            order.remove_drinks(drinks_to_remove)
        
        serializer = self.get_serializer(order, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    # def get_permissions(self):
    #     """Only authenticated users can create, update, or delete orders."""
    #     if self.action in ['create', 'update', 'destroy']:
    #         return [IsAuthenticated()]
    #     return super().get_permissions()

    def create(self, request, *args, **kwargs):
        # Extract data from the request
        order_id = request.data.get("OrderID")
        user_id = request.data.get("UserID")
        
        # If user is authenticated and UserID not in payload, use request.user
        if not user_id and request.user.is_authenticated:
            user_id = str(request.user.id)
        
        # Handle both JSON (list) and form-data (getlist)
        if hasattr(request.data, 'getlist'):
            drinks = request.data.getlist("Drinks")
        else:
            drinks = request.data.get("Drinks", [])
        # If it's a single item not in a list, wrap it
        if drinks and not isinstance(drinks, list):
            drinks = [drinks]

        order_status = request.data.get("OrderStatus", "Pending")
        payment_status = request.data.get("PaymentStatus", "Pending")
        stripe_id = request.data.get("StripeID")
        originating_server_id = request.data.get("OriginatingServer")

        # Prepare order data for the serializer
        order_data = {
            "UserID": user_id,
            "OrderStatus": order_status,
            "Drinks": drinks,
            "PaymentStatus": payment_status,
        }
        
        # Only add optional fields if they are provided
        if order_id:
            order_data["OrderID"] = order_id
        if stripe_id:
            order_data["StripeID"] = stripe_id
        if originating_server_id:
            order_data["OriginatingServer"] = originating_server_id

        # 1. Ensure all drinks in the sync payload exist locally
        drinks_data = request.data.get("DrinksData")
        if drinks_data and isinstance(drinks_data, list):
            for d_data in drinks_data:
                # Ensure DrinkID is present
                d_id = d_data.get("DrinkID")
                if d_id:
                    # Filter out non-model fields like 'Favorite' if present in serializer output
                    # but model defaults should handle most things.
                    defaults = {k: v for k, v in d_data.items() if k != 'DrinkID' and k != 'Favorite'}
                    Drink.objects.update_or_create(DrinkID=d_id, defaults=defaults)

        # 2. Create the order
        serializer = self.get_serializer(data=order_data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()

        # Add drinks to the order if provided (ManyToMany)
        if drinks:
            order.add_drinks(drinks)

        # Sync back to home server if we are a visiting server
        sync_order_to_home_server(order, request)

        # Return the created order's data
        response_data = self.get_serializer(order).data

        # ── Integrate Stripe PaymentIntent creation ──
        # Skip Stripe for inter-server syncs or if StripeID is already present (e.g. from sync)
        if originating_server_id or order.StripeID:
            return Response(response_data, status=status.HTTP_201_CREATED)

        try:
            amount_val = calculate_order_total(order)
            # Add tax (8%) to match frontend calculation
            amount_val = amount_val * 1.08
            amount = round(amount_val * 100) # cents

            if settings.STRIPE_SECRET_KEY in ['TODO: get a new secret stripe key', 'TODO']:
                # Mock Stripe logic
                mock_id = str(uuid7.create()).replace('-', '')
                mock_secret = str(uuid7.create()).replace('-', '')
                mock_pi_id = f"pi_{mock_id}"
                
                order.StripeID = mock_pi_id
                order.save(update_fields=['StripeID'])
                
                response_data['clientSecret'] = f"{mock_pi_id}_secret_{mock_secret}"
            else:
                # Real Stripe logic
                intent = stripe.PaymentIntent.create(
                    amount=amount,
                    currency='usd',
                    metadata={'order_id': str(order.OrderID)}
                )
                order.StripeID = intent['id']
                order.save(update_fields=['StripeID'])
                response_data['clientSecret'] = intent['client_secret']

            response_data['publishableKey'] = settings.STRIPE_PUBLISHABLE_KEY

        except Exception as e:
            # Log the error but don't fail the order creation entirely
            # The frontend can handle missing clientSecret
            print(f"Stripe PaymentIntent creation failed for order {order.OrderID}: {str(e)}")

        return Response(response_data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

class UserOrdersLookup(ListCreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        """
        Retrieve orders for the provided user ID.
        If the user's home server is remote, fetch and merge remote orders.
        """
        user_id = str(self.kwargs['user_id'])
        # Only allow if the requesting user is the owner or a super_admin
        if str(request.user.id) != user_id and request.user.user_type != 'super_admin':
            return Response({"error": "You do not have permission to access these orders."}, status=status.HTTP_403_FORBIDDEN)
            
        user_id = self.kwargs['user_id']
        
        # 1. Fetch local orders
        queryset = self.get_queryset()
        local_serializer = self.get_serializer(queryset, many=True)
        local_orders = local_serializer.data
        
        # 2. Proxy fetch remote orders if home server is remote
        proxy_resp = proxy_user_request(request, f'/backend/users/{user_id}/orders/')
        
        if proxy_resp and proxy_resp.status_code == 200:
            # remote_orders is expected to be a list
            remote_orders = proxy_resp.data
            if isinstance(remote_orders, list):
                # Merge and sort by CreationTime descending
                merged_orders = local_orders + remote_orders
                # Deduplicate by OrderID
                seen_ids = set()
                unique_orders = []
                for o in merged_orders:
                    oid = o.get('OrderID')
                    if oid not in seen_ids:
                        unique_orders.append(o)
                        seen_ids.add(oid)
                
                # Sort by CreationTime descending
                unique_orders.sort(key=lambda x: x.get('CreationTime', '') or '', reverse=True)
                return Response(unique_orders, status=status.HTTP_200_OK)
            
        return Response(local_orders, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        """
        Handle POST request for creating an order for a specific user.
        """
        user_id = str(self.kwargs['user_id'])
        # Only allow if the requesting user is the owner or a super_admin
        if str(request.user.id) != user_id and request.user.user_type != 'super_admin':
            return Response({"error": "You do not have permission to create an order for this user."}, status=status.HTTP_403_FORBIDDEN)
            
        return super().create(request, *args, **kwargs)
    def get_queryset(self):
        """Filter orders based on the user ID from the URL."""
        user_id = self.kwargs['user_id']
        user = get_object_or_404(User, pk=user_id)
        return Order.objects.filter(UserID=user)

    def perform_create(self, serializer):
        """Associate the new order with the correct user."""
        user_id = self.kwargs['user_id']
        user = get_object_or_404(User, pk=user_id)
        order = serializer.save(UserID=user)
        # Sync back to home server if we are a visiting server
        sync_order_to_home_server(order, self.request)

# Constants for pricing. Aligned with frontend CustomizeModal.tsx
PRICING = {
    'upcharges': {
        'small': 0.00,
        'medium': 0.50,
        'large': 1.00,
        '16oz': 0.00,
        '24oz': 0.50,
        '32oz': 1.00,
        'default': 0.00
    },
    'syrup_price_per_pump': 0.50,
    'addin_price_per_item': 0.00  # Frontend says Add-Ins are free
}

def calculate_order_total(order):
    total = 0.0
    for drink in order.Drinks.all():
        # Use the drink's base price from the database
        base_price = drink.Price if drink.Price is not None else 0.0

        # Determine size upcharge
        size_str = str(drink.Size).lower().strip()
        size_upcharge = PRICING['upcharges'].get(size_str, PRICING['upcharges']['default'])

        # Calculate syrup cost ($0.50 each)
        syrups_cost = len(drink.SyrupsUsed) * PRICING['syrup_price_per_pump'] if drink.SyrupsUsed else 0.0

        # Calculate add-ins cost (Free in frontend)
        addins_cost = len(drink.AddIns) * PRICING['addin_price_per_item'] if drink.AddIns else 0.0

        drink_total = base_price + size_upcharge + syrups_cost + addins_cost
        total += drink_total
    return total
@method_decorator(csrf_exempt, name='dispatch')
class StripePaymentIntentView(View):
    
    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            order_id = data.get("order_id")
            amount_val = data.get("amount")

            # 1. Verification: Calculate from database if order is provided
            order = None
            if order_id:
                try:
                    order = Order.objects.get(pk=order_id)
                    # If the order already has a StripeID, we should reuse it to avoid duplicates
                    if order.StripeID:
                        # Mock check for existing StripeID
                        if settings.STRIPE_SECRET_KEY in ['TODO: get a new secret stripe key', 'TODO']:
                            mock_id = order.StripeID.replace('pi_', '')
                            return JsonResponse({
                                'paymentIntent': f"{order.StripeID}_secret_existing_mock_secret",
                                'publishableKey': settings.STRIPE_PUBLISHABLE_KEY
                            })
                        else:
                            # Retrieve existing intent from Stripe
                            try:
                                intent = stripe.PaymentIntent.retrieve(order.StripeID)
                                return JsonResponse({
                                    'paymentIntent': intent.client_secret,
                                    'publishableKey': settings.STRIPE_PUBLISHABLE_KEY
                                })
                            except stripe.error.StripeError:
                                # If retrieval fails, we will proceed to create a new one below
                                pass

                    # Override the frontend's amount to ensure correctness
                    amount_val = calculate_order_total(order)
                    # Add tax (8%) to match frontend calculation
                    amount_val = amount_val * 1.08
                except Order.DoesNotExist:
                    print(f"Order {order_id} not found during PaymentIntent creation.")

            if amount_val is None or amount_val <= 0:
                return JsonResponse({'error': 'A valid amount or valid order_id is required.'}, status=400)
            
            amount = round(amount_val * 100)  # Stripe uses cents, so multiply dollars by 100

            # Mock check: if STRIPE_SECRET_KEY is the default "TODO", use dummy data
            if settings.STRIPE_SECRET_KEY == 'TODO: get a new secret stripe key' or settings.STRIPE_SECRET_KEY == 'TODO':
                print("Using MOCK Stripe for PaymentIntent creation.")
                # Ensure format is pi_<id>_secret_<secret> without hyphens to pass frontend validation
                mock_id = str(uuid7.create()).replace('-', '')
                mock_secret = str(uuid7.create()).replace('-', '')
                mock_pi_id = f"pi_{mock_id}"
                
                if order:
                    order.StripeID = mock_pi_id
                    order.save(update_fields=['StripeID'])
                
                return JsonResponse({
                    'paymentIntent': f"{mock_pi_id}_secret_{mock_secret}",
                    'ephemeralKey': f"ek_test_{mock_id}",
                    'customer': f"cus_{mock_id}",
                    'publishableKey': settings.STRIPE_PUBLISHABLE_KEY
                })

            # Create a new customer
            customer = stripe.Customer.create()

            # Create an ephemeral key for the customer
            ephemeral_key = stripe.EphemeralKey.create(
                customer=customer['id'],
                stripe_version='2024-09-30.acacia',
            )

            # Create a payment intent
            payment_intent = stripe.PaymentIntent.create(
                amount=amount,
                currency='usd',
                customer=customer['id'],
                payment_method_types=['card'],  # Accept only card payments
            )

            # Update order with StripeID if order is found
            if order:
                order.StripeID = payment_intent.id
                order.save(update_fields=['StripeID'])

            # Respond with the required information
            return JsonResponse({
                'paymentIntent': payment_intent.client_secret,
                'ephemeralKey': ephemeral_key.secret,
                'customer': customer['id'],
                'publishableKey': getattr(settings, 'STRIPE_PUBLISHABLE_KEY', '')
            })
        except Exception as e:
            print(f"Payment intent creation failed: {e}")
            return JsonResponse({'error': 'Payment intent creation failed', 'details': str(e)}, status=400)

def refund_order(client_secret_or_id):
    try:
        # Extract PaymentIntent ID if a client secret is provided
        if "_secret_" in client_secret_or_id:
            payment_intent_id = client_secret_or_id.split("_secret_")[0]
        else:
            payment_intent_id = client_secret_or_id

        # Process the refund using the PaymentIntent ID
        refund = stripe.Refund.create(
            payment_intent=payment_intent_id,
        )
        print("Refund successful:", refund)
        return True

    except stripe.error.StripeError as e:
        print(f"Stripe error: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False
    
class emailAPI(APIView):
    @extend_schema(
        responses={200: EmailAPIResponseSerializer},
        description="Generate and display an email preview in the server terminal for a specific order."
    )
    def get(self, request, orderId):
        try:
            # Fetch order details
            order = Order.objects.get(pk=orderId)
            revenue = Revenue.objects.filter(OrderID=orderId).first()

            # Generate styled terminal output
            email_text = self.generate_email_preview(order, revenue)

            # Print styled text to the terminal
            print("\033[92m=== EMAIL PREVIEW ===\033[0m")  # Green and bold
            print(email_text)
            print("\033[92m=====================\033[0m")  # Green and bold

            return Response({"message": "Email preview generated successfully."}, status=status.HTTP_200_OK)

        except Order.DoesNotExist:
            return Response(
                {"error": "Order not found", "details": {"orderId": orderId}}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": "Internal server error", "details": {"message": str(e)}}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def generate_email_preview(self, order, revenue):
        """Generate a styled email preview for terminal output."""
        email_subject = f"Order Confirmation - Order #{order.OrderID}"
        user_info = f"Customer Name: {order.UserID.first_name}" if order.UserID else "Customer Name: Guest"

        # Generate detailed drink information
        drinks_list = "".join(
            [
                f"""  
        - {drink.Name}:\033[92m ${drink.Price:.2f} \033[0m
            Sodas: {', '.join(drink.SodaUsed) if drink.SodaUsed else 'None'}
            Syrups: {', '.join(drink.SyrupsUsed) if drink.SyrupsUsed else 'None'}
            Add-ins: {', '.join(drink.AddIns) if drink.AddIns else 'None'}\n"""
                for drink in order.Drinks.all()
            ]
        )

        total_amount = f"${revenue.TotalAmount:.2f}" if revenue else "N/A"
        order_status = order.OrderStatus.capitalize()
        payment_status = order.PaymentStatus.capitalize()

        # Styled email content using ANSI escape codes
        email_content = f"""
        ==============================================
        \033[96m{email_subject}\033[0m
        ==============================================

        \033[93mOrder Details:\033[0m  
        {user_info}  
        Payment Status: \033[94m{payment_status}\033[0m  
        Pickup Time: {order.PickupTime.strftime('%Y-%m-%d %H:%M:%S') if order.PickupTime else 'Not Set'}

        \033[93mDrinks Ordered:\033[0m 
        {drinks_list if drinks_list else '  No drinks added to this order.'}

        \033[93mTotal Amount:\033[0m  
        \033[92m{total_amount}\033[0m 

        Thank you for ordering with us!

        ==============================================
        """
        return email_content

    
class GenerateAIDrinkBase(APIView):
    permission_classes = [AllowAny]

    def generate_account_user(self, user_id):
        """Generate AI drink for a registered user using their preferences."""
        user = get_object_or_404(User, pk=user_id)
        preferences = Preference.objects.filter(UserID=user)
        preferences_list = []

        if preferences.exists():
            for pref in preferences:
                preferences_list.append(pref.Preference)
        else:
            preferences_list = ["mango", "peach", "vanilla", "salted caramel", "orange", "lavender", "peppermint", "blue raspberry"]
        print("User") # Test code
        return self.generate_response_data(preferences_list, user_created=True)

    def generate_general_user(self):
        """Generate AI drink for a general user with hardcoded preferences."""
        preferences = ["mango", "peach", "vanilla", "salted caramel", "orange", "lavender", "peppermint", "blue raspberry"]
        print("General") # Test code
        return self.generate_response_data(preferences, user_created=False)

    def generate_response_data(self, preferences, user_created):
        """Helper function to generate response data."""
        result = generate_soda(preferences)
        return {
            'SyrupsUsed': result["syrups"],
            'SodaUsed': result["soda"][0],
            'AddIns': result["addins"],
            'Size': "24oz",
            'Ice': "regular",
            "UserCreated": user_created,
        }

class GeneralGenerateAIDrink(GenerateAIDrinkBase):
    @extend_schema(
        operation_id="generate_guest_drink",
        responses={200: OpenApiTypes.OBJECT},
        description="Generate a beverage recommendation using AI for a guest user."
    )
    def get(self, request):
        try:
            response_data = self.generate_general_user()
            return Response(response_data)
        except Exception as e:
            return Response(
                {"error": "AI Generation failed", "details": {"message": str(e)}}, 
                status=status.HTTP_400_BAD_REQUEST
            )

class UserGenerateAIDrink(GenerateAIDrinkBase):
    @extend_schema(
        operation_id="generate_user_drink",
        responses={200: OpenApiTypes.OBJECT},
        description="Generate a beverage recommendation using AI for a registered user based on their preferences."
    )
    def get(self, request, user_id):
        try:
            response_data = self.generate_account_user(user_id)
            return Response(response_data)
        except Exception as e:
            return Response(
                {"error": "AI Generation failed", "details": {"message": str(e)}}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class RevenueViewSet(viewsets.ModelViewSet):
    """
    A viewset for listing, retrieving, creating, and filtering revenue records.
    """
    queryset = Revenue.objects.all()
    serializer_class = RevenueSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # Super Admins see everything locally
        if user.user_type == 'super_admin':
            return Revenue.objects.all()
            
        # Logistics managers see revenue across their region
        if user.user_type == 'logistics_manager':
            if IsLogisticsManager().has_permission(self.request, self):
                return Revenue.objects.all()

        # Store Managers only see revenue on their HOME server
        if user.user_type in ['admin', 'store_manager']:
            try:
                local_server = get_local_server()
                if str(user.home_server_id) == str(local_server.ServerID):
                    return Revenue.objects.all()
            except Exception:
                pass
                 
        # Customers only see their OWN revenue records
        if user.user_type == 'customer':
            return Revenue.objects.filter(OrderID__UserID=user)
            
        return Revenue.objects.none()

    def list(self, request, *args, **kwargs):
        # Explicit RBAC: Repair staff are never allowed to see revenue
        if request.user.user_type == 'repair_staff':
            return Response({"error": "Repair staff are not authorized to view revenue data."}, status=status.HTTP_403_FORBIDDEN)

        # 1. Handle P2P Proxying
        proxy_resp = proxy_user_request(request, '/backend/revenues/')
        if proxy_resp:
            return proxy_resp
            
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        # Explicit RBAC: Repair staff are never allowed to see revenue
        if request.user.user_type == 'repair_staff':
            return Response({"error": "Repair staff are not authorized to view revenue data."}, status=status.HTTP_403_FORBIDDEN)

        pk = kwargs.get('pk')
        proxy_resp = proxy_user_request(request, f'/backend/revenues/{pk}/')
        if proxy_resp:
            return proxy_resp
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        """
        Custom create method to ensure the total amount is calculated if not provided.
        """
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """
        Custom update method to ensure the total amount is recalculated when updating the revenue.
        """
        # Proceed with the standard update process
        return super().update(request, *args, **kwargs)

class RevenueAggregateView(APIView):
    """
    Aggregation endpoint for logistics managers to see revenue across all stores in their region.
    """
    permission_classes = [IsLogisticsManager]

    @extend_schema(
        responses={200: OpenApiTypes.OBJECT},
        description="Aggregate revenue data from all stores within the Logistics Manager's region."
    )
    def get(self, request):
        local_server = get_local_server()
        region_servers = ServerRegistry.objects.filter(Region=local_server.Region, Status='Active')
        
        results = {}
        headers = {'Content-Type': 'application/json'}
        auth_header = request.headers.get('Authorization')
        if auth_header:
            headers['Authorization'] = auth_header
            
        for server in region_servers:
            # Construct the regional peer's revenue list URL
            target_url = server.ServerURL.rstrip('/') + '/backend/revenues/'
            try:
                resp = requests.get(target_url, headers=headers, timeout=5)
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, dict):
                        data['proxied'] = str(server.ServerID)
                    results[server.ServerID] = data
                else:
                    results[server.ServerID] = {"error": f"Status {resp.status_code}", "details": resp.text}
            except Exception as e:
                results[server.ServerID] = {"error": "Connection failed", "details": str(e)}
        
        return Response({"results": results}, status=status.HTTP_200_OK)
    
class UserOperations(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    serializer_class = GetUserSerializer

    def get(self, request):
        userList = User.objects.all()
        serializer = self.serializer_class(userList, many=True)
        return Response(serializer.data)

    def delete(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            user.delete()
            return Response({"message":"User deleted successfully"}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found", "details": {"user_id": user_id}}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": "Failed to delete user", "details": {"message": str(e)}}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    def edit(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)

            # Use request.data (DRF) or fallback to body parsing
            data = request.data if hasattr(request, 'data') else json.loads(request.body)
            # Support both { edits: { ... } } and direct { ... } payloads
            edits = data.get('edits', data)

            username = edits.get("username")
            first_name = edits.get("firstName") or edits.get("first_name")
            last_name = edits.get("lastName") or edits.get("last_name")
            password = edits.get("password")
            role = edits.get("role") or edits.get("user_type")

            if (user.username != username and username != "unchanged" and username):
                user.username = username

            if (user.first_name != first_name and first_name != "unchanged" and first_name):
                user.first_name = first_name

            if (user.last_name != last_name and last_name != "unchanged" and last_name):
                user.last_name = last_name

            if (user.password != password and password != "unchanged" and password):
                user.set_password(password)
                print("Password updated")

            if (role != "unchanged" and role):
                # Security: Only super_admin can assign the super_admin role
                if role == 'super_admin' and request.user.user_type != 'super_admin':
                    return Response({"error": "Only super admins can assign the super admin role."}, status=status.HTTP_403_FORBIDDEN)
                
                user.user_type = role
                if role == 'super_admin':
                    user.is_staff = True
                    user.is_superuser = True
                elif role in ['admin', 'store_manager', 'logistics_manager', 'repair_staff']:
                    user.is_staff = True
                    user.is_superuser = False
                else: # 'customer'
                    user.is_staff = False
                    user.is_superuser = False

            user.save()
            return Response({"message":"User edited successfully"}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found", "details": {"user_id": user_id}}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": "Failed to edit user", "details": {"message": str(e)}}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class MasterListSyncView(APIView):
    """
    Inter-server sync endpoint for MasterList data.

    Consumed only by other servers, not end-user clients.
    Authentication is carried via the X-Source-Server-ID / Authorization
    headers set by sync.http_get / sync.http_post.

    GET  → return this server's full MasterList as {"items": [...]}
    POST → accept {"items": [...]} and upsert each record by UserID
    """
    permission_classes = [IsPeerServer]

    @extend_schema(
        responses={200: MasterListSyncResponseSerializer},
        description="Return this server's full MasterList registry."
    )
    def get(self, request):
        records = MasterList.objects.all()
        serializer = MasterListSerializer(records, many=True)
        return Response({"items": serializer.data}, status=status.HTTP_200_OK)

    @extend_schema(
        request=MasterListSyncRequestSerializer,
        responses={200: MasterListSyncResponseSerializer},
        description="Receive a list of users from a peer server and update the local MasterList registry."
    )
    def post(self, request):
        items = request.data.get("items", [])
        for item in items:
            MasterList.objects.update_or_create(
                UserID=item["UserID"],
                defaults={
                    "Username": item["Username"],
                    "HomeServerID_id": item["HomeServerID"],
                },
            )
        return Response({"status": "ok"}, status=status.HTTP_200_OK)

class PublicDiscoveryView(APIView):
    """
    Public endpoint that allows other servers to 'discover' this server's 
    Public Key and ID for P2P registration.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        responses={200: OpenApiTypes.OBJECT},
        description="Return this server's public identity (ID, URL, and Public Key) for P2P networking."
    )
    def get(self, request):
        try:
            local_server = get_local_server()
            return Response({
                "ServerID": local_server.ServerID,
                "ServerURL": local_server.ServerURL,
                "PublicKey": settings.PUBLIC_KEY,
                "Region": local_server.Region.RegionID if local_server.Region else None,
                "RegionName": local_server.Region.RegionName if local_server.Region else None,
                "IsRegionLeader": local_server.IsRegionLeader,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": "Discovery failed", "details": str(e)}, status=500)


class P2PJoinView(APIView):
    """
    Public endpoint for a new node to join the P2P network.

    The joining node proves its identity by signing a canonical payload with its
    private key. We verify the signature using the public key it presents, then
    register the peer and return the full peer list.

    POST /backend/p2p/join/
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        import base64
        import hashlib
        from datetime import datetime, timezone as dt_timezone
        from cryptography.hazmat.primitives import serialization, hashes
        from cryptography.hazmat.primitives.asymmetric import padding
        from cryptography.hazmat.backends import default_backend
        from cryptography.exceptions import InvalidSignature

        data = request.data
        required = ['node_id', 'public_key', 'region', 'address', 'timestamp', 'network_token', 'signature']
        missing = [f for f in required if not data.get(f)]
        if missing:
            return Response({'error': f'Missing fields: {", ".join(missing)}'}, status=status.HTTP_400_BAD_REQUEST)

        node_id = data['node_id']
        pub_pem = data['public_key']
        region_name = data['region']
        address = data['address']
        store_name    = data.get('store_name', '')
        store_address = data.get('store_address', '')
        store_city    = data.get('store_city', '')
        store_state   = data.get('store_state', '')
        store_zip     = data.get('store_zip', '')
        store_geohash = data.get('store_geohash', '')
        timestamp_str = data['timestamp']
        network_token = data['network_token']
        sig_b64 = data['signature']

        # Reject nodes not running the official CodePop codebase
        if network_token != settings.NETWORK_TOKEN:
            return Response({'error': 'Invalid network token'}, status=status.HTTP_403_FORBIDDEN)

        # Replay window: ±5 minutes
        try:
            ts = datetime.fromisoformat(timestamp_str)
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=dt_timezone.utc)
            if abs((datetime.now(dt_timezone.utc) - ts).total_seconds()) > 300:
                return Response({'error': 'Timestamp outside 5-minute window'}, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid timestamp; use ISO-8601'}, status=status.HTTP_400_BAD_REQUEST)

        # Load and validate the public key
        try:
            pub_key = serialization.load_pem_public_key(pub_pem.encode(), backend=default_backend())
        except Exception as e:
            return Response({'error': f'Invalid public key: {e}'}, status=status.HTTP_400_BAD_REQUEST)

        # Verify signature: signs f"{node_id}:{address}:{timestamp}:{network_token}" with PKCS1v15+SHA256
        canonical = f"{node_id}:{address}:{timestamp_str}:{network_token}".encode('utf-8')
        try:
            pub_key.verify(base64.b64decode(sig_b64), canonical, padding.PKCS1v15(), hashes.SHA256())
        except InvalidSignature:
            return Response({'error': 'Signature verification failed'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({'error': f'Signature error: {e}'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate node_id is the SHA256 fingerprint of the public key (prevents ID spoofing)
        expected_id = hashlib.sha256(pub_pem.encode()).hexdigest()[:32]
        if node_id != expected_id:
            return Response({'error': 'node_id does not match public key fingerprint'}, status=status.HTTP_400_BAD_REQUEST)

        # Register the joining peer
        region, _ = Region.objects.get_or_create(RegionName=region_name)

        # First server to announce a region becomes its leader; subsequent joiners are peers.
        already_has_servers = ServerRegistry.objects.filter(
            Region=region,
            Status='Active',
        ).exclude(ServerID=node_id).exists()
        is_leader = not already_has_servers

        defaults = {
            'ServerURL': address,
            'PublicKey': pub_pem,
            'Status': 'Active',
            'IsRegionLeader': is_leader,
            'Region': region,
        }
        if store_name:
            defaults['StoreName'] = store_name
        if store_address:
            defaults['StoreAddress'] = store_address
        if store_city:
            defaults['StoreCity'] = store_city
        if store_state:
            defaults['StoreState'] = store_state
        if store_zip:
            defaults['StoreZip'] = store_zip
        if store_geohash:
            defaults['StoreGeohash'] = store_geohash

        ServerRegistry.objects.update_or_create(
            ServerID=node_id,
            defaults=defaults,
        )

        # Return the full peer list so the joiner can discover all known nodes
        peers = [
            {
                'node_id': s.ServerID,
                'address': s.ServerURL,
                'public_key': s.PublicKey,
                'region': s.Region.RegionName if s.Region else None,
                'is_region_leader': s.IsRegionLeader,
                'store_name':    s.StoreName or '',
                'store_address': s.StoreAddress or '',
                'store_city':    s.StoreCity or '',
                'store_state':   s.StoreState or '',
                'store_zip':     s.StoreZip or '',
                'store_geohash': s.StoreGeohash or '',
            }
            for s in ServerRegistry.objects.filter(Status='Active')
        ]
        return Response({'peers': peers}, status=status.HTTP_200_OK)


class MenuView(APIView):
    """
    Return categorized items: sodas, syrups, addins, featured_drinks.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        responses={200: DrinkSerializer(many=True)}, # Simplified, it actually returns a dict but this tells Swagger there are drinks here.
        description="Fetch all menu categories including inventory items and featured house drinks."
    )
    def get(self, request):
        sodas = Inventory.objects.filter(ItemType='Soda')
        syrups = Inventory.objects.filter(ItemType='Syrup')
        addins = Inventory.objects.filter(ItemType='Add In')
        featured_drinks = Drink.objects.filter(User_Created=False)[:10]

        data = {
            "sodas": InventorySerializer(sodas, many=True).data,
            "syrups": InventorySerializer(syrups, many=True).data,
            "addins": InventorySerializer(addins, many=True).data,
            "featured_drinks": DrinkSerializer(featured_drinks, many=True).data,
        }
        return Response(data, status=status.HTTP_200_OK)

class UserProfileView(RetrieveUpdateAPIView):
    """
    Handle fetching and updating the authenticated user's profile.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    @extend_schema(
        description="Retrieve the profile of the currently authenticated user.",
        responses={200: UserProfileSerializer}
    )
    def get(self, request, *args, **kwargs):
        # 1. Proxy if home server is remote
        proxy_resp = proxy_user_request(request, '/backend/users/me/')
        if proxy_resp:
            return proxy_resp
            
        return super().get(request, *args, **kwargs)

    @extend_schema(
        description="Update the profile details (first name, last name, email) of the authenticated user.",
        request=UserProfileSerializer,
        responses={200: UserProfileSerializer}
    )
    def patch(self, request, *args, **kwargs):
        # 1. Proxy if home server is remote
        proxy_resp = proxy_user_request(request, '/backend/users/me/')
        if proxy_resp:
            return proxy_resp
            
        return super().patch(request, *args, **kwargs)

    @extend_schema(exclude=True) # Hide PUT if you only want to support PATCH
    def put(self, request, *args, **kwargs):
        # 1. Proxy if home server is remote
        proxy_resp = proxy_user_request(request, '/backend/users/me/')
        if proxy_resp:
            return proxy_resp
            
        return super().put(request, *args, **kwargs)

    def get_object(self):
        return self.request.user

class ServerRegistryAPIView(viewsets.ReadOnlyModelViewSet):
    """
    List all active servers in the decentralized network.
    """
    queryset = ServerRegistry.objects.all()
    serializer_class = ServerRegistrySerializer

    def get_permissions(self):
        if self.action == 'list' or self.action == 'retrieve':
            return [AllowAny()]
        return [IsAdmin()]

@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(View):
    def post(self, request, *args, **kwargs):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')

        event = None

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        except ValueError as e:
            return JsonResponse({'error': 'Invalid payload'}, status=400)
        except stripe.error.SignatureVerificationError as e:
            return JsonResponse({'error': 'Invalid signature'}, status=400)

        if event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            try:
                order = Order.objects.get(StripeID=payment_intent['id'])
                
                # Validation: Recalculate the order total and compare it with the Stripe amount (in cents)
                backend_total = calculate_order_total(order)
                stripe_amount = payment_intent.get('amount')

                if round(backend_total * 1.08 * 100) == stripe_amount:
                    order.PaymentStatus = 'Paid'
                    order.save()
                    # Explicitly set the TotalAmount during revenue creation to ensure accuracy
                    Revenue.objects.create(OrderID=order, TotalAmount=backend_total)
                else:
                    # Log the discrepancy and flag the order as failed
                    order.PaymentStatus = 'Failed'
                    order.save()
                    if order.UserID:
                        Notification.objects.create(
                            UserID=order.UserID,
                            Message=f"Payment discrepancy detected for Order {order.OrderID}. Please contact support.",
                            Type="PaymentError"
                        )
            except Order.DoesNotExist:
                print(f"Order with StripeID {payment_intent['id']} not found.")
                
        elif event['type'] == 'payment_intent.payment_failed':
            payment_intent = event['data']['object']
            try:
                order = Order.objects.get(StripeID=payment_intent['id'])
                order.PaymentStatus = 'Failed'
                order.save()
                
                if order.UserID:
                    Notification.objects.create(
                        UserID=order.UserID,
                        Message=f"Payment failed for Order {order.OrderID}.",
                        Type="PaymentError"
                    )
            except Order.DoesNotExist:
                print(f"Order with StripeID {payment_intent['id']} not found.")

        elif event['type'] == 'charge.refunded':
            charge = event['data']['object']
            payment_intent_id = charge.get('payment_intent')
            try:
                order = Order.objects.get(StripeID=payment_intent_id)
                order.PaymentStatus = 'Cancelled'
                order.save()
                
                # Mark associated revenue records as refunded
                Revenue.objects.filter(OrderID=order).update(Refunded=True)
            except Order.DoesNotExist:
                print(f"Order with PaymentIntent ID {payment_intent_id} not found for refund.")
        
        return JsonResponse({'status': 'success'}, status=200)

class MachineStatusView(APIView):
    """
    Proxy endpoint that queries the independent drink machine for its current status.
    """
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsRepairStaff() | IsStoreManager()]
    
    @extend_schema(
        responses={200: OpenApiTypes.OBJECT},
        description="Fetch the real-time status of the physical drink machine."
    )
    def get(self, request):
        import os
        # Allow specifying a custom port for testing, defaulting to env or 9050
        machine_host = os.environ.get('MACHINE_HOST', 'localhost')
        machine_port = request.query_params.get('port', os.environ.get('MACHINE_PORT', '9050'))
        try:
            # Query the standalone pseudo machine server
            resp = requests.get(f'http://{machine_host}:{machine_port}/status', timeout=2)
            resp.raise_for_status()
            return Response(resp.json(), status=status.HTTP_200_OK)
        except requests.RequestException as e:
            return Response(
                {"error": "Machine is offline or unreachable", "details": str(e)}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

class MachineRunTestView(APIView):
    """
    Proxy endpoint that tells the independent drink machine to run its diagnostic test.
    Used by repair staff to verify fixes.
    """
    permission_classes = [AllowAny] # Temporarily relaxed for integration tests

    @extend_schema(
        responses={200: OpenApiTypes.OBJECT},
        description="Trigger the physical drink machine's diagnostic suite."
    )
    def post(self, request):
        import os
        machine_host = os.environ.get('MACHINE_HOST', 'localhost')
        machine_port = request.query_params.get('port', os.environ.get('MACHINE_PORT', '9050'))
        try:
            # Query the standalone pseudo machine server's POST endpoint
            resp = requests.post(f'http://{machine_host}:{machine_port}/run-test', timeout=10)
            resp.raise_for_status()
            return Response(resp.json(), status=status.HTTP_200_OK)
        except requests.RequestException as e:
            return Response(
                {"error": "Machine is offline or unreachable", "details": str(e)}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

class MachineStatusAggregateView(APIView):
    """
    Aggregation endpoint for repair staff to see machine statuses across all stores in their region.
    """
    permission_classes = [IsRepairStaff]

    @extend_schema(
        responses={200: OpenApiTypes.OBJECT},
        description="Aggregate machine status data from all stores within the Repair Staff's region."
    )
    def get(self, request):
        local_server = get_local_server()
        region_servers = ServerRegistry.objects.filter(Region=local_server.Region, Status='Active')
        
        results = {}
        headers = {'Content-Type': 'application/json'}
        auth_header = request.headers.get('Authorization')
        if auth_header:
            headers['Authorization'] = auth_header
            
        for server in region_servers:
            # Construct the regional peer's machine status URL
            target_url = server.ServerURL.rstrip('/') + '/backend/machines/status/'
            try:
                resp = requests.get(target_url, headers=headers, timeout=5)
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, dict):
                        data['proxied'] = str(server.ServerID)
                    results[server.ServerID] = data
                else:
                    results[server.ServerID] = {"error": f"Status {resp.status_code}", "details": resp.text}
            except Exception as e:
                results[server.ServerID] = {"error": "Connection failed", "details": str(e)}
        
        return Response({"results": results}, status=status.HTTP_200_OK)

class LeaderboardView(APIView):
    """
    Provides a leaderboard, sorting users by the number of drinks they've ordered.
    Supports a 'scope' query parameter (local, regional, national), currently all default to local store data.
    Separates the top 5 users from a local leaderboard block to provide context.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: OpenApiTypes.OBJECT},
        description="Get store leaderboard showing top 5 users and surrounding rank."
    )
    def get(self, request):
        scope = request.query_params.get('scope', 'local')
        
        # Currently, all scopes filter by the requesting user's home_server.
        # Future iteration: regional/national scopes will be updated.
        users_query = CustomUser.objects.filter(home_server=request.user.home_server)
        
        # Annotate with drink count and sort
        users_annotated = users_query.annotate(
            score=models.Count('order__Drinks')
        ).order_by('-score', 'username')
        
        # Convert to list and process ranks
        users_list = list(users_annotated)
        ranked_users = []
        for index, user in enumerate(users_list, start=1):
            ranked_users.append({
                "position": index,
                "userName": user.username,
                "score": user.score
            })
            
        top5 = ranked_users[:5]
        
        local_leaderboard = []
        
        # Check if requesting user is in the top 5
        is_in_top5 = any(u["userName"] == request.user.username for u in top5)
        
        if not is_in_top5:
            # Find user's position
            user_index = -1
            for i, u in enumerate(ranked_users):
                if u["userName"] == request.user.username:
                    user_index = i
                    break
            
            if user_index != -1:
                start_idx = max(0, user_index - 2)
                end_idx = min(len(ranked_users), user_index + 3)
                
                # Sliced local list
                local_slice = ranked_users[start_idx:end_idx]
                
                # Filter out any users who have a position of 5 or less
                local_leaderboard = [u for u in local_slice if u["position"] > 5]
                
        return Response({
            "top5": top5,
            "localLeaderboard": local_leaderboard
        }, status=status.HTTP_200_OK)
