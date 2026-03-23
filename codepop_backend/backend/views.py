from .models import Preference, Drink, Inventory, Notification, Order, Revenue, CustomUser, MasterList, Flavor, ServerRegistry
from django.shortcuts import get_object_or_404
from django.db import models
from django.utils import timezone
User = CustomUser
from rest_framework.generics import CreateAPIView, ListAPIView, ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser, BasePermission
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework import status, viewsets
from rest_framework.views import APIView, exception_handler
from .serializers import (
    CreateUserSerializer, GetUserSerializer, UserProfileSerializer, 
    PreferenceSerializer, DrinkSerializer, InventorySerializer, 
    NotificationSerializer, OrderSerializer, RevenueSerializer, 
    MasterListSerializer, ServerRegistrySerializer, CustomTokenObtainPairSerializer,
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
from drf_spectacular.utils import extend_schema, OpenApiTypes
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

class IsSuperAdmin(BasePermission):
    """
    Allows access only to super_admin users.
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                request.user.user_type == 'super_admin')

class IsAdmin(BasePermission):
    """
    Allows access to admin and super_admin users.
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                request.user.user_type in ['admin', 'super_admin'])

class IsManager(BasePermission):
    """
    Allows access to store_manager, logistics_manager, repair_staff, admin, and super_admin.
    """
    def has_permission(self, request, view):
        allowed = ['store_manager', 'logistics_manager', 'repair_staff', 'admin', 'super_admin']
        return (request.user and request.user.is_authenticated and 
                request.user.user_type in allowed)
    

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
                        
                        return Response(remote_resp.json(), status=remote_resp.status_code)
                    
                    except requests.RequestException as e:
                        return Response(
                            {"error": "Home server unreachable", "details": str(e)}, 
                            status=status.HTTP_503_SERVICE_UNAVAILABLE
                        )
            except MasterList.DoesNotExist:
                pass 

            raise local_exc

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
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        # Custom logic for creating a drink can go here
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        # Custom logic for updating a drink can go here
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        # Custom logic for deleting a drink can go here
        return super().destroy(request, *args, **kwargs)

class UserPreferenceLookup(ListAPIView):
    serializer_class = PreferenceSerializer
    permission_classes = [IsAuthenticated]

    # Override get_queryset to filter preferences by the provided UserID
    def get_queryset(self):
        user_id = self.kwargs['user_id']  # Retrieve the 'user_id' from the URL
        # Check if the user exists first, and raise a 404 if not
        user = get_object_or_404(User, pk=user_id)
        return Preference.objects.filter(UserID=user_id)
    
from rest_framework import status, viewsets
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
        # Custom logic for creating a drink (optional for customization)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """
        Custom update method to handle updating a drink's fields, favorites, and validation.
        """
        # Retrieve the drink object to be updated
        drink = self.get_object()

        # Use the serializer to validate and update the data
        serializer = self.get_serializer(drink, data=request.data)

        # Validate the data (including Ice and Size field checks)
        serializer.is_valid(raise_exception=True)

        # If valid, update the fields
        # Explicitly update fields from request data if they exist on the drink model
        for field, value in request.data.items():
            if hasattr(drink, field):
                setattr(drink, field, value)

        # Handle adding/removing favorites
        favorite_to_add = request.data.get("addFavorite", [])
        favorite_to_remove = request.data.get("removeFavorite", [])
        
        if favorite_to_add:
            drink.addFavorite(favorite_to_add)
        if favorite_to_remove:
            drink.removeFavorite(favorite_to_remove)

        # Save the updated drink
        drink.save()

        # Return the updated drink data using the serializer
        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        # Custom logic for deleting a drink (optional for customization)
        return super().destroy(request, *args, **kwargs)

class UserDrinksLookup(ListAPIView):
    serializer_class = DrinkSerializer
    permission_classes = [IsAuthenticated]

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

class InventoryReportAPIView(APIView):
    """Generate an inventory report."""
    permission_classes = [IsManager]

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
    permission_classes = [IsManager]

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

        # Handle normal used quantity update (for orders)
        if used_quantity is None or int(used_quantity) <= 0:
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


class NotificationOperations(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user_id = self.request.user.id
        user = get_object_or_404(User, pk=user_id)
        # Filter notifications that are either global or specific to the user
        return Notification.objects.filter(models.Q(Global=True) | models.Q(UserID=user_id))

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
    permission_classes = [AllowAny]

    def patch(self, request, *args, **kwargs):
        order = self.get_object()
        drinks_to_add = request.data.get("AddDrinks", [])
        drinks_to_remove = request.data.get("RemoveDrinks", [])
        
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
        user_id = request.data.get("UserID", None)
        drinks = request.data.get("Drinks", [])
        order_status = request.data.get("OrderStatus", "Pending")
        payment_status = request.data.get("PaymentStatus", "Pending")
        stripe_id = request.data.get("StripeID", None)
        originating_server = request.data.get("OriginatingServer", None)

        # Create a new order
        order_data = {
            "UserID": user_id,
            "OrderStatus": order_status,
            "Drinks": drinks,
            "PaymentStatus": payment_status,
            "StripeID": stripe_id,
            "OriginatingServer": originating_server,
        }

        serializer = self.get_serializer(data=order_data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()

        # Add drinks to the order if provided
        if drinks:
            order.add_drinks(drinks)

        # Return the created order's data
        return Response(self.get_serializer(order).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

class UserOrdersLookup(ListCreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter orders based on the user ID from the URL."""
        user_id = self.kwargs['user_id']
        user = get_object_or_404(User, pk=user_id)
        return Order.objects.filter(UserID=user)

    def perform_create(self, serializer):
        """Associate the new order with the correct user."""
        user_id = self.kwargs['user_id']
        user = get_object_or_404(User, pk=user_id)
        serializer.save(UserID=user)

# Constants for pricing. Easily customizable from this point.
PRICING = {
    'sizes': {
        '16oz': 2.00,
        '24oz': 2.50,
        '32oz': 3.00,
        '44oz': 3.50,
        'default': 2.00
    },
    'syrup_price_per_pump': 0.50,
    'addin_price_per_item': 0.75
}

def calculate_order_total(order):
    total = 0.0
    for drink in order.Drinks.all():
        size_str = str(drink.Size).lower().strip()
        base_price = PRICING['sizes'].get(size_str, PRICING['sizes']['default'])
        
        syrups_cost = len(drink.SyrupsUsed) * PRICING['syrup_price_per_pump'] if drink.SyrupsUsed else 0.0
        addins_cost = len(drink.AddIns) * PRICING['addin_price_per_item'] if drink.AddIns else 0.0
        
        drink_total = base_price + syrups_cost + addins_cost
        
        # Update the drink's saved price so it reflects the real calculation
        if drink.Price != drink_total:
            drink.Price = drink_total
            drink.save(update_fields=['Price'])
            
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
                    # Override the frontend's amount to ensure correctness
                    amount_val = calculate_order_total(order)
                except Order.DoesNotExist:
                    print(f"Order {order_id} not found during PaymentIntent creation.")

            if amount_val is None or amount_val <= 0:
                return JsonResponse({'error': 'A valid amount or valid order_id is required.'}, status=400)
            
            amount = int(amount_val * 100)  # Stripe uses cents, so multiply dollars by 100

            # Mock check: if STRIPE_SECRET_KEY is the default "TODO", use dummy data
            if settings.STRIPE_SECRET_KEY == 'TODO: get a new secret stripe key' or settings.STRIPE_SECRET_KEY == 'TODO':
                print("Using MOCK Stripe for PaymentIntent creation.")
                # Ensure format is pi_<id>_secret_<secret> to pass frontend regex validation
                mock_id = str(uuid7.create())
                mock_secret = str(uuid7.create())
                mock_pi_id = f"pi_{mock_id}"
                
                if order:
                    order.StripeID = mock_pi_id
                    order.save(update_fields=['StripeID'])
                
                return JsonResponse({
                    'paymentIntent': f"{mock_pi_id}_secret_{mock_secret}",
                    'ephemeralKey': f"ek_test_{mock_id}",
                    'customer': f"cus_{mock_id}",
                    'publishableKey': 'pk_test_51... (use a real pk_test key if possible)'
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
    
class UserOperations(viewsets.ModelViewSet):
    permission_classes = [IsSuperAdmin]
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

            data = json.loads(request.body)
            edits = data.get('edits', {})

            username = edits.get("username", None)
            first_name = edits.get("firstName", None)
            last_name = edits.get("lastName", None)
            password = edits.get("password", None)
            role = edits.get("role", None)

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
    permission_classes = [AllowAny]

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
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.backends import default_backend
        
        try:
            local_server = get_local_server()
            
            # Derive Public Key from the Private Key in settings
            private_key = serialization.load_pem_private_key(
                settings.PRIVATE_KEY.encode('utf-8'),
                password=None,
                backend=default_backend()
            )
            public_key = private_key.public_key()
            public_pem = public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            ).decode('utf-8')

            return Response({
                "ServerID": local_server.ServerID,
                "ServerURL": local_server.ServerURL,
                "PublicKey": public_pem,
                "Region": local_server.Region.RegionID if local_server.Region else None
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": "Discovery failed", "details": str(e)}, status=500)

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
    def get(self, *args, **kwargs):
        return super().get(*args, **kwargs)

    @extend_schema(
        description="Update the profile details (first name, last name, email) of the authenticated user.",
        request=UserProfileSerializer,
        responses={200: UserProfileSerializer}
    )
    def patch(self, *args, **kwargs):
        return super().patch(*args, **kwargs)

    @extend_schema(exclude=True) # Hide PUT if you only want to support PATCH
    def put(self, *args, **kwargs):
        return super().put(*args, **kwargs)

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
        return [IsAdminUser()]

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
                
                if int(backend_total * 100) == stripe_amount:
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

