from django.contrib.auth import get_user_model
from django.conf import settings
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Preference, Drink, Inventory, Order, Notification, Revenue, Region, ServerRegistry, MasterList


def get_tokens_for_user(user):
    """
    Generate a RefreshToken for a user, injecting P2P-specific claims (iss, home_server_id).
    This ensures that tokens issued during registration, proxy-login, or normal login
    all have the metadata required for the P2P authentication backend.
    """
    refresh = RefreshToken.for_user(user)

    # Inject custom P2P claims
    refresh['user_type'] = user.user_type
    refresh['username'] = user.username

    # Inject the Issuer (ServerID)
    local_id = getattr(settings, 'LOCAL_SERVER_ID', None)
    if local_id:
        refresh['iss'] = str(local_id)

    # Domain Logic Claim (Who owns this user?)
    if user.home_server:
        refresh['home_server_id'] = str(user.home_server.ServerID)
    elif local_id:
        refresh['home_server_id'] = str(local_id)

    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class CreateUserSerializer(serializers.ModelSerializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True,
                                     style={'input_type': 'password'})

    class Meta:
        model = get_user_model()
        fields = ('username', 'password', 'first_name', 'last_name', 'user_type')
        write_only_fields = ('password')
        read_only_fields = ('is_staff', 'is_superuser', 'is_active',)

    def create(self, validated_data):
        user_type = validated_data.get('user_type', 'customer')
        
        # Determine staff/superuser based on user_type
        if user_type == 'super_admin':
            is_staff = True
            is_superuser = True
        elif user_type in ['admin', 'store_manager', 'logistics_manager', 'repair_staff']:
            is_staff = True
            is_superuser = False
        else:
            is_staff = False
            is_superuser = False

        user = get_user_model().objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            user_type=user_type,
            is_staff=is_staff,
            is_superuser=is_superuser
        )
        return user

class GetUserSerializer(serializers.ModelSerializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True,
                                     style={'input_type': 'password'})

    class Meta:
        model = get_user_model()
        fields = ('id', 'username', 'password', 'first_name', 'last_name', 'is_staff', 'is_superuser', 'user_type')
        write_only_fields = ('password')
        read_only_fields = ('is_staff', 'is_superuser', 'is_active',)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        # We're bypassing SimpleJWT's default signing for P2P-ready asymmetric keys
        # For simplicity in this demo, we can just let simplejwt do its thing 
        # but the real power is in the P2PJWTAuthentication we added.
        
        token = super().get_token(user)

        # Add custom claims
        token['user_type'] = user.user_type
        token['username'] = user.username
        
        # Inject the Issuer (ServerID)
        # This is critical for the P2P authentication backend to lookup the public key
        local_id = getattr(settings, 'LOCAL_SERVER_ID', None)
        if local_id:
            token['iss'] = str(local_id)
        
        # Domain Logic Claim (Who owns this user?)
        if user.home_server:
            token['home_server_id'] = str(user.home_server.ServerID)
        elif local_id:
            # If no HomeServer is set, assume the local server is the home
            token['home_server_id'] = str(local_id)
        
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Add extra response data
        data['user_type'] = self.user.user_type
        data['user_id'] = str(self.user.id)
        data['first_name'] = self.user.first_name
        
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ('id', 'username', 'first_name', 'last_name', 'email', 'user_type', 'home_server')
        read_only_fields = ('id', 'username') # Username usually shouldn't be changeable easily if it's used as unique identifier, but the requirement says "Fetch their full profile (Username, First Name, Last Name, Email)". Let's allow updating first_name, last_name, email.


class PreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Preference
        fields = ['PreferenceID', 'UserID', 'Preference']

    # Custom validation for the Preference field
    def validate_Preference(self, value):
        # Convert the value to lowercase for consistent validation
        value = value.lower()

        # Define the allowed preference values (in lowercase for consistency)
        allowed_preferences = [
            "mtn. dew", "diet mtn. dew", "dr. pepper", "diet dr. pepper", "dr. pepper zero",
            "dr pepper cream soda", "sprite", "sprite zero", "coke", "diet coke", "coke zero",
            "pepsi", "diet pepsi", "rootbeer", "fanta", "big red", "powerade", "lemonade",
            "light lemonade", "coconut", "pineapple", "passion fruit", "mango", "guava", "banana",
            "strawberry", "raspberry", "blackberry", "pomegranate", "cranberry", "grape", "kiwi", 
            "huckleberry", "peach", "watermelon", "green apple", "pear", "cherry", "orange", 
            "blood orange", "grapefruit", "sweetened lime", "lemon", "lime", "vanilla", "cupcake",
            "salted caramel", "chocolate milano", "cinnamon", "choc chip cookie dough", 
            "brown sugar cinnamon", "hazelnut", "white chocolate", "butterscotch", "blue raspberry", 
            "sour", "blue curacao", "bubble gum", "cotton candy", "mojito", "cucumber", "lavender",
            "pumpkin spice", "peppermint", "irish cream", "gingerbread", "butterbrew mix", "cream", 
            "coconut cream", "whip", "lemon wedge", "lime wedge", "french vanilla creamer", "candy",
            "sprinkles", "strawberry puree", "peach puree", "mango puree", "raspberry puree", "candy sprinkles", "chocolate"
        ]

        # Check if the value is in the allowed preferences
        if value not in allowed_preferences:
            raise serializers.ValidationError(f"{value} is not a valid preference. Allowed preferences are: {allowed_preferences}.")

        # Return the lowercase value for saving
        return value
    
class DrinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Drink
        fields = '__all__'

    def validate_Size(self, value):
        value = value.lower()

        allowed_size = ['16oz', '24oz','32oz']

        if value not in allowed_size:
            raise serializers.ValidationError(f"{value} is not a valid drink size. Allowed sizes are: {allowed_size}")
        
        return value
    
    def validate_Ice(self, value):
        value = value.lower()

        if value == "no ice":
            value = 'none'

        allowed_ice = ['none', 'light', 'regular', 'extra']

        if value not in allowed_ice:
            raise serializers.ValidationError(f"{value} is not a valid ice amount. Allowed amounts are: {allowed_ice}")

        return value

class InventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Inventory
        fields = [
            'InventoryID', 'ItemName', 'ItemType', 
            'Quantity', 'ThresholdLevel', 'LastUpdated'
        ]

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

class OrderSerializer(serializers.ModelSerializer):
    Drinks = serializers.PrimaryKeyRelatedField(many=True, queryset=Drink.objects.all())

    class Meta:
        model = Order
        fields = [
            'OrderID', 'UserID', 'OriginatingServer', 'Drinks', 
            'OrderStatus', 'PaymentStatus', 
            'PickupTime', 'CreationTime','LockerCombo',
            'StripeID', 'Synced'
        ]

    def create(self, validated_data):
            drinks = validated_data.pop('Drinks')
            order = Order.objects.create(**validated_data)  # Create the order without drinks
            order.Drinks.set(drinks)  # Set the ManyToMany relationship
            return order

    def validate_Drinks(self, value):
        if not value:
            raise serializers.ValidationError("At least one drink must be included in the order.")
        return value

class RevenueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Revenue
        fields = ['RevenueID', 'OrderID', 'TotalAmount', 'SaleDate', 'Refunded']

    def create(self, validated_data):
        """Override the create method to ensure total amount calculation when a revenue instance is created."""
        revenue_instance = Revenue(**validated_data)
        # Ensure TotalAmount is calculated if not provided in the request data
        if 'TotalAmount' not in validated_data:
            revenue_instance.calculate_total_amount()
        revenue_instance.save()
        return revenue_instance

    def update(self, instance, validated_data):
        """Override update to ensure total amount is recalculated if not provided."""
        instance.OrderID = validated_data.get('OrderID', instance.OrderID)
        instance.SaleDate = validated_data.get('SaleDate', instance.SaleDate)
        instance.Refunded = validated_data.get('Refunded', instance.Refunded)
        
        if 'TotalAmount' in validated_data:
            instance.TotalAmount = validated_data['TotalAmount']
        else:
            instance.calculate_total_amount()
            
        instance.save()
        return instance


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = ['RegionID', 'RegionName']


class ServerRegistrySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServerRegistry
        fields = ['ServerID', 'ServerURL', 'PublicKey', 'Status', 'LastSeen', 'Region', 'IsRegionLeader', 'StoreName']


class MasterListSerializer(serializers.ModelSerializer):
    class Meta:
        model = MasterList
        fields = ['UserID', 'Username', 'HomeServerID']
