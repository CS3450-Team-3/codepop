from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from unittest.mock import patch
from .models import Preference, Drink, Inventory, Notification, Order, Revenue, CustomUser
from django.utils import timezone
from datetime import timedelta
import uuid7

User = CustomUser

class PreferenceTests(APITestCase):

    def setUp(self):
        # Create two test users
        self.user1 = User.objects.create_user(username='user1', password='password123')
        self.user2 = User.objects.create_user(username='user2', password='password123')

        # Create tokens for both users
        self.token1 = Token.objects.create(user=self.user1)
        self.token2 = Token.objects.create(user=self.user2)

        # Create preferences for both users
        Preference.objects.create(UserID=self.user1, Preference="mango")
        Preference.objects.create(UserID=self.user2, Preference="peach")

    def authenticate(self, token):
        """Helper method to set up token authentication"""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)  # type: ignore

    def test_get_preferences_for_user1(self):
        # Use token authentication for user1
        self.authenticate(self.token1.key)

        # Make a request to retrieve preferences for user1
        response = self.client.get(f'/backend/users/{self.user1.id}/preferences/')

        # Check that the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that the returned data contains one preference
        self.assertEqual(len(response.data), 1)

        # Check that the preference belongs to user1 and is "Mango"
        self.assertEqual(str(response.data[0]['UserID']), str(self.user1.id))
        self.assertEqual(response.data[0]['Preference'], "mango")

    def test_get_preferences_for_user2(self):
        # Use token authentication for user2
        self.authenticate(self.token2.key)

        # Make a request to retrieve preferences for user2
        response = self.client.get(f'/backend/users/{self.user2.id}/preferences/')

        # Check that the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that the returned data contains one preference
        self.assertEqual(len(response.data), 1)

        # Check that the preference belongs to user2 and is "Peach"
        self.assertEqual(str(response.data[0]['UserID']), str(self.user2.id))
        self.assertEqual(response.data[0]['Preference'], "peach")

    def test_get_preferences_for_non_existent_user(self):
        # Use token authentication for user1
        self.authenticate(self.token1.key)

        # Attempt to retrieve preferences for a non-existent user (using a valid UUID format)
        random_uuid = uuid7.create()
        response = self.client.get(f'/backend/users/{random_uuid}/preferences/')

        # Check that the response status code is 404 Not Found
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_preference(self):
        # Use token authentication for user1
        self.authenticate(self.token1.key)

        # Send a POST request to create a new preference for user1
        data = {'UserID': self.user1.id, 'Preference': "Strawberry"}
        response = self.client.post('/backend/preferences/', data, format='json')

        # Check that the response status code is 201 Created
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check that the preference was created with the correct values
        self.assertEqual(Preference.objects.count(), 3)
        self.assertEqual(Preference.objects.filter(UserID=self.user1).count(), 2)
        self.assertEqual(
            sorted(list(Preference.objects.filter(UserID=self.user1).values_list('Preference', flat=True))),
            sorted(["mango", "strawberry"])
        )

    def test_delete_preference(self):
        # Authenticate the user (user1 in this case)
        self.authenticate(self.token1.key)

        # Send a POST request to create a new preference for user1
        data = {'UserID': self.user1.id, 'Preference': "Strawberry"}
        response = self.client.post('/backend/preferences/', data, format='json')

        # Check that the response status code is 201 Created
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Get the preference object for user1 that we want to delete
        preference = Preference.objects.filter(UserID=self.user1, Preference="strawberry").first()

        # Send a DELETE request to delete the preference
        response = self.client.delete(f'/backend/preferences/{preference.PreferenceID}/')

        # Check that the response status code is 204 No Content, indicating successful deletion
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify that the preference has been deleted from the database
        self.assertEqual(Preference.objects.filter(PreferenceID=preference.PreferenceID).count(), 0)

        # Confirm that only mango is left in the User1 preference database
        self.assertEqual(
            list(Preference.objects.filter(UserID=self.user1).values_list('Preference', flat=True)),
            ["mango"]
        )

    def test_create_preference_with_invalid_value(self):
        # Authenticate the user (user1 in this case)
        self.authenticate(self.token1.key)

        # Send a POST request with an invalid preference value
        data = {'UserID': self.user1.id, 'Preference': "Mountain Dew"}
        response = self.client.post('/backend/preferences/', data, format='json')

        # Check that the response status code is 400 Bad Request
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Check that the correct error message is returned
        self.assertIn("mountain dew is not a valid preference", str(response.data).lower())

class DrinkTests(APITestCase):

    def setUp(self):
        # Create two test users
        self.user1 = User.objects.create_user(username='user1', password='password123')
        self.user2 = User.objects.create_user(username='user2', password='password123')

        # Create tokens for both users
        self.token1 = Token.objects.create(user=self.user1)
        self.token2 = Token.objects.create(user=self.user2)

        # Create sample drinks
        drink1 = Drink.objects.create(Name="Cola Vanilla", SodaUsed=["Cola"], SyrupsUsed=["Vanilla"], Ice="Regular", Size="24oz", User_Created=False, Price=1.99)
        drink2 = Drink.objects.create(Name="Lemonade Mint", SodaUsed=["Lemonade"], AddIns=["Mint"], Ice="None", Size="16oz", User_Created=False, Price=2.50)
        drink3 = Drink.objects.create(Name="Custom Cherry Soda", SodaUsed=["Cherry Soda"], Ice="Light", Size="32oz", User_Created=True, Price=3.50)

        # Add users to the Favorite field
        drink1.Favorite.add(self.user1)
        drink2.Favorite.add(self.user2)
        drink3.Favorite.add(self.user2)


    def authenticate(self, token):
        """Helper method to set up token authentication"""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)  # type: ignore

    def test_get_drinks_for_user_created_false(self):
        """Test that only drinks where User_Created=False are listed"""
        self.authenticate(self.token1.key)
        response = self.client.get('/backend/drinks/')
        
        # Check that the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that only drinks with User_Created=False are returned
        self.assertEqual(len(response.data), 2)
        for drink in response.data:
            self.assertFalse(drink['User_Created'])

    def test_create_new_drink(self):
        """Test creating a new drink for the logged-in user with Ice and Size"""
        self.authenticate(self.token1.key)

        # Data for the new dirty soda (drink)
        data = {
            "Name": "Strawberry Soda",
            "SodaUsed": ["Strawberry Soda"],
            "SyrupsUsed": ["Vanilla"],
            "Ice": "Light",
            "Size": "32oz",
            "User_Created": False,
            "Price": 2.99
        }

        # Send a POST request to create the new drink
        response = self.client.post('/backend/drinks/', data, format='json')

        # Check that the response status code is 201 Created
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Retrieve the created drink and check its details
        drink = Drink.objects.get(Name="Strawberry Soda")
        self.assertEqual(drink.Price, 2.99)
        self.assertEqual(drink.Ice, "light")
        self.assertEqual(drink.Size, "32oz")

        # Add the user as a favorite
        drink.Favorite.add(self.user1)

        # Verify favorites
        self.assertIn(self.user1, drink.Favorite.all())


    def test_update_existing_drink(self):
        """Test updating the price of an existing drink, and set Ice and Size"""
        self.authenticate(self.token1.key)

        # Retrieve a drink to update
        drink = Drink.objects.filter(User_Created=False).first()

        # Data for updating the drink
        data = {
            "Name": drink.Name,
            "SodaUsed": drink.SodaUsed,
            "SyrupsUsed": drink.SyrupsUsed,
            "Ice": "none",
            "Size": "16oz",
            "Price": 4.50,
            "User_Created": drink.User_Created
        }

        # Send a PUT request to update the drink
        response = self.client.put(f'/backend/drinks/{drink.DrinkID}/', data, format='json')

        # Check that the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Refresh the drink
        drink.refresh_from_db()

        # Assert updates
        self.assertEqual(drink.Price, 4.50)
        self.assertEqual(drink.Ice, "none")
        self.assertEqual(drink.Size, "16oz")

        # Add to favorites
        drink.Favorite.add(self.user1)
        self.assertIn(self.user1, drink.Favorite.all())

    def test_delete_drink(self):
        """Test deleting a drink"""
        self.authenticate(self.token1.key)

        # Get a drink to delete
        drink = Drink.objects.filter(Favorite=self.user1).first()

        # Send a DELETE request to delete the drink
        response = self.client.delete(f'/backend/drinks/{drink.DrinkID}/')

        # Check response
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Drink.objects.filter(DrinkID=drink.DrinkID).count(), 0)

    def test_create_drink_without_auth(self):
        """Test creating a drink without being authenticated (should succeed based on AllowAny)"""
        data = {
            "Name": "Unauthorized Drink",
            "SodaUsed": ["Cola"],
            "User_Created": False,
            "Price": 2.00,
            "Ice": "Regular",
            "Size": "24oz"
        }

        # Send a POST request without authentication
        response = self.client.post('/backend/drinks/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_get_drinks_for_specific_user(self):
        """Test retrieving drinks based on a specific user's favorites"""
        self.authenticate(self.token2.key)
        response = self.client.get(f'/backend/users/{self.user2.id}/drinks/')
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        drink_names = [drink['Name'] for drink in response.data]
        self.assertIn("Lemonade Mint", drink_names)
        self.assertIn("Custom Cherry Soda", drink_names)

    def test_create_drink_with_invalid_ice_size(self):
        """Test creating a drink with invalid Ice and Size fields."""
        self.authenticate(self.token1.key)
        data = {
            "Name": "Invalid Drink",
            "SodaUsed": ["Cola"],
            "Ice": "Extra Heavy",
            "Size": "Super Large",
            "User_Created": True,
            "Price": 2.00
        }
        response = self.client.post('/backend/drinks/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Ice", response.data)
        self.assertIn("Size", response.data)

class InventoryTests(APITestCase):

    def setUp(self):
        self.user1 = User.objects.create_user(username='user1', password='password123')
        self.token1 = Token.objects.create(user=self.user1)
        Inventory.objects.create(ItemName="Coke", ItemType="Soda", Quantity=10, ThresholdLevel=2)
        Inventory.objects.create(ItemName="Syrup A", ItemType="Syrup", Quantity=0, ThresholdLevel=5)
        Inventory.objects.create(ItemName="Cup", ItemType="Physical", Quantity=50, ThresholdLevel=10)

    def authenticate(self, token):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)  # type: ignore

    def test_get_inventory_list(self):
        self.authenticate(self.token1.key)
        response = self.client.get('/backend/inventory/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_get_inventory_report(self):
        self.authenticate(self.token1.key)
        response = self.client.get('/backend/inventory/report/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item_names = [item['ItemName'] for item in response.data['inventory_items']]
        self.assertIn("Coke", item_names)

    def test_update_inventory_success(self):
        self.authenticate(self.token1.key)
        coke = Inventory.objects.get(ItemName="Coke")
        data = {'used_quantity': 5}
        response = self.client.patch(f'/backend/inventory/{coke.pk}/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        coke.refresh_from_db()
        self.assertEqual(coke.Quantity, 5)

class NotificationTests(APITestCase):

    def setUp(self):
        self.user1 = User.objects.create_user(username='user1', password='password123')
        self.user2 = User.objects.create_user(username='user2', password='password123')
        self.token1 = Token.objects.create(user=self.user1)
        self.token2 = Token.objects.create(user=self.user2)

        self.notification1 = Notification.objects.create(
            UserID=self.user1,
            Message="User1 notification",
            Timestamp=timezone.now() - timedelta(days=2),
            Type="info",
            Global=True
        )

    def authenticate(self, token):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)  # type: ignore

    def test_list_notifications(self):
        self.authenticate(self.token1.key)
        response = self.client.get('/backend/notifications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

class OrderTests(APITestCase):

    def setUp(self):
        self.user1 = User.objects.create_user(username='user1', password='password123')
        self.token1 = Token.objects.create(user=self.user1)
        self.drink1 = Drink.objects.create(Name="Cola Vanilla", SodaUsed=["Cola"], SyrupsUsed=["Vanilla"], User_Created=False, Price=1.99)

    def authenticate(self, token):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)  # type: ignore

    def test_create_order(self):
        self.authenticate(self.token1.key)
        data = {
            "UserID": self.user1.id,
            "Drinks": [self.drink1.DrinkID],
            "OrderStatus": "Pending",
            "PaymentStatus": "Pending",
            "StripeID": "dummy_stripe_id"
        }
        response = self.client.post('/backend/orders/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.count(), 1)

    def test_get_order(self):
        self.authenticate(self.token1.key)
        order = Order.objects.create(UserID=self.user1, OrderStatus="Pending", PaymentStatus="Pending")
        order.Drinks.add(self.drink1)
        response = self.client.get(f'/backend/orders/{order.OrderID}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(response.data['OrderID']), str(order.OrderID))

class RevenueTests(APITestCase):

    def setUp(self):
        self.user1 = User.objects.create_user(username='user1', password='password123')
        self.token1 = Token.objects.create(user=self.user1)
        self.drink1 = Drink.objects.create(Name="Cola Vanilla", SodaUsed=["Cola"], SyrupsUsed=["Vanilla"], User_Created=False, Price=1.99)
        self.order = Order.objects.create(UserID=self.user1, OrderStatus="Pending", PaymentStatus="Pending")
        self.order.Drinks.add(self.drink1)

    def authenticate(self, token):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)  # type: ignore

    def test_create_revenue(self):
        self.authenticate(self.token1.key)
        data = {
            "OrderID": self.order.OrderID,
        }
        response = self.client.post('/backend/revenues/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        revenue = Revenue.objects.first()
        self.assertEqual(revenue.OrderID, self.order)
        self.assertEqual(revenue.TotalAmount, 1.99)
