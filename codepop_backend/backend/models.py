import uuid7
from django.db import models
from django.contrib.auth.models import AbstractUser, UserManager
from django.contrib.postgres.fields import ArrayField
from django.utils import timezone

class CustomUserManager(UserManager):
    def _create_user(self, username, email, password, **extra_fields):
        user_type = extra_fields.get('user_type', 'customer')
        if extra_fields.get('is_superuser'):
            user_type = extra_fields.get('user_type', 'super_admin')
        elif extra_fields.get('is_staff'):
            user_type = extra_fields.get('user_type', 'store_manager')
        extra_fields.setdefault('user_type', user_type)
        return super()._create_user(username, email, password, **extra_fields)

class CustomUser(AbstractUser):
    USER_TYPE_CHOICES = [
        ('customer', 'Customer'),
        ('store_manager', 'Store Manager'),
        ('logistics_manager', 'Logistics Manager'),
        ('repair_staff', 'Repair Staff'),
        ('admin', 'Admin'),
        ('super_admin', 'Super Admin'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid7.create, editable=False)
    user_type = models.CharField(
        max_length=20,
        choices=USER_TYPE_CHOICES,
        default='customer'
    )
    home_server = models.ForeignKey(
        'ServerRegistry',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='local_users'
    )
    
    objects = CustomUserManager()

    def __str__(self):
        return self.username

class Region(models.Model):
    RegionID = models.AutoField(primary_key=True)
    RegionName = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.RegionName


class ServerRegistry(models.Model):
    ServerID = models.CharField(primary_key=True, max_length=100)
    ServerURL = models.URLField(max_length=255)
    PublicKey = models.TextField()
    Status = models.CharField(max_length=20, default='Active')
    LastSeen = models.DateTimeField(auto_now=True)
    Region = models.ForeignKey(
        'Region',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='servers',
    )
    IsRegionLeader = models.BooleanField(default=False)

    def __str__(self):
        return f"Server {self.ServerID}: {self.ServerURL}"

class MasterList(models.Model):
    UserID = models.UUIDField(primary_key=True, default=uuid7.create, editable=False)
    Username = models.CharField(max_length=150)
    HomeServerID = models.ForeignKey(ServerRegistry, on_delete=models.CASCADE)

    def __str__(self):
        return self.Username

class UserMovement(models.Model):
    MovementID = models.UUIDField(primary_key=True, default=uuid7.create, editable=False)
    UserID = models.UUIDField()
    PreviousServerID = models.ForeignKey(ServerRegistry, related_name='previous_movements', on_delete=models.CASCADE)
    NewServerID = models.ForeignKey(ServerRegistry, related_name='new_movements', on_delete=models.CASCADE)
    Timestamp = models.DateTimeField(default=timezone.now)
    Status = models.CharField(max_length=50) # Initiated, Completed, Failed

    def __str__(self):
        return f"Movement {self.MovementID} for User {self.UserID}"

class Preference(models.Model):
    PreferenceID = models.AutoField(primary_key=True)
    UserID = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    Preference = models.CharField(max_length=100, blank=False, null=False)

    def __str__(self):
        return f'Preference {self.PreferenceID} for User {self.UserID}: {self.Preference}'

class Flavor(models.Model):
    SyrupID = models.AutoField(primary_key=True)
    Name = models.CharField(max_length=255)
    PrimaryFlavor = models.CharField(max_length=100)
    SecondaryFlavor = models.CharField(max_length=100)
    TertiaryFlavor = models.CharField(max_length=100)

    class Meta:
        db_table = 'Flavors'

    def __str__(self):
        return self.Name

class Drink(models.Model):
    DrinkID = models.UUIDField(primary_key=True, default=uuid7.create, editable=False)
    Name = models.CharField(max_length=255)
    SyrupsUsed = ArrayField(models.CharField(max_length=255), blank=True, null=True)
    SodaUsed = ArrayField(models.CharField(max_length=255))
    AddIns = ArrayField(models.CharField(max_length=255), blank=True, null=True)
    Rating = models.FloatField(null=True, blank=True)
    Price = models.FloatField()
    Size = models.CharField(default="16oz", max_length=10)
    Ice = models.CharField(default="regular", max_length=10)
    User_Created = models.BooleanField()
    Favorite = models.ManyToManyField(CustomUser, blank=True, related_name='favorite_drinks')

    def addFavorite(self, userToAdd):
        user = CustomUser.objects.filter(id=userToAdd).first()
        if user:
            self.Favorite.add(user)

    def removeFavorite(self, userToRemove):
        user = CustomUser.objects.filter(id=userToRemove).first()
        if user:
            self.Favorite.remove(user)

    def __str__(self):
        return self.Name

class Inventory(models.Model):
    ITEM_TYPES = [
        ('Soda', 'Soda'),
        ('Syrup', 'Syrup'),
        ('Add In', 'Add In'),
        ('Physical', 'Physical'),
    ]

    InventoryID = models.AutoField(primary_key=True)
    ItemName = models.CharField(max_length=100)
    ItemType = models.CharField(max_length=50, choices=ITEM_TYPES)
    Quantity = models.PositiveIntegerField()
    ThresholdLevel = models.PositiveIntegerField()
    LastUpdated = models.DateTimeField(auto_now=True)

    def is_out_of_stock(self):
        return self.Quantity <= 0

    def __str__(self):
        return f"{self.ItemName} - {self.ItemType} (Qty: {self.Quantity})"

class Notification(models.Model):
    NotificationID = models.AutoField(primary_key=True)
    UserID = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='notifications')
    Message = models.CharField(max_length=500)
    Timestamp = models.DateTimeField(default=timezone.now)
    Type = models.CharField(max_length=50)
    Global = models.BooleanField(default=False)

    def __str__(self):
        return f"Notification for {self.UserID.username}: {self.Message[:50]}"

class Order(models.Model):
    ORDER_STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Processing', 'Processing'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Paid', 'Paid'),
        ('Failed', 'Failed'),
        ('Remade', 'Remade')
    ]

    OrderID = models.UUIDField(primary_key=True, default=uuid7.create, editable=False)
    UserID = models.ForeignKey(CustomUser, on_delete=models.CASCADE, null=True)
    OriginatingServer = models.ForeignKey(ServerRegistry, on_delete=models.CASCADE, null=True, blank=True)
    Drinks = models.ManyToManyField(Drink)
    OrderStatus = models.CharField(max_length=50, choices=ORDER_STATUS_CHOICES, default='Pending')
    PaymentStatus = models.CharField(max_length=50, choices=PAYMENT_STATUS_CHOICES, default='Pending')
    PickupTime = models.DateTimeField(null=True, blank=True)
    CreationTime = models.DateTimeField(auto_now_add=True)
    LockerCombo = models.BigIntegerField(null=True, blank=True)
    StripeID = models.CharField(max_length=255, unique=True, null=True, blank=True)
    Synced = models.BooleanField(default=False)

    def add_drinks(self, drink_ids):
        for drink_id in drink_ids:
            try:
                drink = Drink.objects.get(DrinkID=drink_id)
                self.Drinks.add(drink)
            except Drink.DoesNotExist:
                pass
        self.save()

    def remove_drinks(self, drink_ids):
        for drink_id in drink_ids:
            try:
                drink = Drink.objects.get(DrinkID=drink_id)
                self.Drinks.remove(drink)
            except Drink.DoesNotExist:
                pass
        self.save()

    def __str__(self):
        return f"Order {self.OrderID} by User {self.UserID}"

class Revenue(models.Model):
    RevenueID = models.UUIDField(primary_key=True, default=uuid7.create, editable=False)
    OrderID = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='revenues')
    TotalAmount = models.FloatField(null=True, blank=True)
    SaleDate = models.DateTimeField(default=timezone.now)
    Refunded = models.BooleanField(default=False)

    def calculate_total_amount(self):
        """Calculate the total revenue for the order by summing the price of each drink."""
        try:
            total = sum(drink.Price for drink in self.OrderID.Drinks.all())
            self.TotalAmount = total
            return total
        except Exception:
            self.TotalAmount = 0.0
            return 0.0

    def save(self, *args, **kwargs):
        """Override the save method to automatically calculate the total amount if not set."""
        if self.TotalAmount is None:
            # We need to save first if we haven't yet, so that the M2M relationship in calculate_total_amount works
            if not self.pk:
                super(Revenue, self).save(*args, **kwargs)
            self.calculate_total_amount()
        super(Revenue, self).save(*args, **kwargs)

    def __str__(self):
        return f"Revenue {self.RevenueID} for Order {self.OrderID}: ${self.TotalAmount:.2f}"
