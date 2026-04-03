from rest_framework import permissions
from .models import ServerRegistry, CustomUser
from .sync import get_local_server
import logging

logger = logging.getLogger(__name__)

class IsSuperUser(permissions.BasePermission):
    """
    Grants unrestricted global access across all endpoints.
    Bypasses all geographic restrictions.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.user_type == 'super_admin'

class IsAdmin(permissions.BasePermission):
    """
    Allows managing local user accounts.
    Restricted to the admin's own store.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.user_type == 'super_admin':
            return True
        
        if request.user.user_type != 'admin':
            return False
            
        try:
            local_server = get_local_server()
            return request.user.home_server_id == local_server.ServerID
        except Exception:
            return False

class IsStoreManager(permissions.BasePermission):
    """
    Used for daily operational endpoints (orders, house drinks, local notifications).
    Restricted strictly to the manager's own store.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.user_type == 'super_admin':
            return True
        
        if request.user.user_type not in ['admin', 'store_manager']:
            return False
            
        try:
            local_server = get_local_server()
            return request.user.home_server_id == local_server.ServerID
        except Exception:
            return False

class IsLogisticsManager(permissions.BasePermission):
    """
    Allows accessing inventory management and sales/revenue data.
    Restricted to stores within their own region.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.user_type == 'super_admin':
            return True
        
        if request.user.user_type != 'logistics_manager':
            return False
            
        try:
            local_server = get_local_server()
            # Check if user's home server region matches local server region
            if not request.user.home_server or not request.user.home_server.Region:
                return False
            if not local_server.Region:
                return False
            return request.user.home_server.Region_id == local_server.Region_id
        except Exception:
            return False

class IsRepairStaff(permissions.BasePermission):
    """
    Grants access to view real-time machine statuses and trigger diagnostic tests.
    Restricted to machines located at stores within their own region.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.user_type == 'super_admin':
            return True
        
        if request.user.user_type != 'repair_staff':
            return False
            
        try:
            local_server = get_local_server()
            if not request.user.home_server or not request.user.home_server.Region:
                return False
            if not local_server.Region:
                return False
            return request.user.home_server.Region_id == local_server.Region_id
        except Exception:
            return False

class IsOwner(permissions.BasePermission):
    """
    Allows access only if the object's UserID matches the request.user.
    Also supports Revenue objects by checking the linked Order's owner.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # Check if the object has a UserID attribute (could be a ForeignKey or UUID)
        obj_user = getattr(obj, 'UserID', None)
        if obj_user is None:
            # Fallback for models that might use 'user' instead of 'UserID'
            obj_user = getattr(obj, 'user', None)
            
        # Support Revenue -> Order -> UserID
        if obj_user is None and hasattr(obj, 'OrderID'):
            order = getattr(obj, 'OrderID')
            if order:
                obj_user = getattr(order, 'UserID', None)

        if obj_user is None:
            return False
            
        # Handle cases where UserID is a ForeignKey (CustomUser instance) or UUID
        if isinstance(obj_user, CustomUser):
            return obj_user.id == request.user.id
        return str(obj_user) == str(request.user.id)

class IsGuestOrAuthenticatedForCreation(permissions.BasePermission):
    """
    Allows POST (creation) for any user.
    For GET (retrieve specific), if the UUID is known, allow guests (handled in view usually).
    For GET (list), restrict to Store Managers, or restrict to the user's own items.
    """
    def has_permission(self, request, view):
        if request.method == 'POST':
            return True
        
        # For other methods, we typically want them authenticated
        # but retrieve (GET with ID) might be allowed for guests in specific views (Orders)
        return request.user and request.user.is_authenticated

class IsPeerServer(permissions.BasePermission):
    """
    Validates inter-server authentication token for P2P sync.
    Checks for 'Server-Token <ServerID>:<Fingerprint>' in Authorization header.
    """
    def has_permission(self, request, view):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Server-Token '):
            return False
        
        try:
            token = auth_header.split(' ')[1]
            server_id, fingerprint = token.split(':')
            
            server = ServerRegistry.objects.get(ServerID=server_id)
            # Standardize: remove ALL whitespace (newlines, spaces) from the PEM
            clean_pubkey = "".join(server.PublicKey.split())
            server_fingerprint = clean_pubkey[:64]
            
            # Also clean the incoming fingerprint just in case
            fingerprint = "".join(fingerprint.split())
            
            return fingerprint == server_fingerprint
        except (ValueError, ServerRegistry.DoesNotExist):
            return False
