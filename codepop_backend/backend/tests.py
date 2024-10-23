from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token  # Import for token authentication
from .models import Preference, Inventory

class PreferenceTests(TestCase):
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

        # Set up the API client
        self.client = APIClient()

    def authenticate(self, token):
        """Helper method to set up token authentication"""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)

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
        self.assertEqual(response.data[0]['UserID'], self.user1.id)
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
        self.assertEqual(response.data[0]['UserID'], self.user2.id)
        self.assertEqual(response.data[0]['Preference'], "peach")

    def test_get_preferences_for_non_existent_user(self):
        # Use token authentication for user1
        self.authenticate(self.token1.key)

        # Attempt to retrieve preferences for a non-existent user
        response = self.client.get('/backend/users/999/preferences/')

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
        self.assertEqual(Preference.objects.count(), 3)  # There should now be 3 preferences in total
        self.assertEqual(Preference.objects.filter(UserID=self.user1).count(), 2)  # Two preferences for user1
        self.assertEqual(
            list(Preference.objects.filter(UserID=self.user1).values_list('Preference', flat=True)),
            ["mango", "strawberry"]
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
        preference = Preference.objects.filter(UserID=self.user1).first()

        # Send a DELETE request to delete the preference
        response = self.client.delete(f'/backend/preferences/{preference.PreferenceID}/')

        # Check that the response status code is 204 No Content, indicating successful deletion
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify that the preference has been deleted from the database using the correct field name (PreferenceID)
        self.assertEqual(Preference.objects.filter(PreferenceID=preference.PreferenceID).count(), 0)

        # Confirm that only Strawberry is left in the User1 preference database
        self.assertEqual(
            list(Preference.objects.filter(UserID=self.user1).values_list('Preference', flat=True)),
            ["strawberry"]
        )

    def test_create_preference_with_invalid_value(self):
        # Authenticate the user (user1 in this case)
        self.authenticate(self.token1.key)

        # Send a POST request with an invalid preference value
        data = {'UserID': self.user1.id, 'Preference': "Mountain Dew"}  # Invalid value (should be "Mtn. Dew")
        response = self.client.post('/backend/preferences/', data, format='json')

        # Check that the response status code is 400 Bad Request
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Check that the correct error message is returned (ensure the invalid value is mentioned)
        self.assertIn("mountain dew is not a valid preference", str(response.data))


class InventoryTests(TestCase):
    def setUp(self):
        # Create two test users
        self.user1 = User.objects.create_user(username='user1', password='password123')
        self.user2 = User.objects.create_user(username='user2', password='password123')

        # Create tokens for both users
        self.token1 = Token.objects.create(user=self.user1)
        self.token2 = Token.objects.create(user=self.user2)

        # Create inventory items
        Inventory.objects.create(ItemName="Coke", ItemType="Soda", Quantity=10, ThresholdLevel=2)
        Inventory.objects.create(ItemName="Syrup A", ItemType="Syrup", Quantity=0, ThresholdLevel=5)
        Inventory.objects.create(ItemName="Cup", ItemType="Physical", Quantity=50, ThresholdLevel=10)

        # Set up the API client
        self.client = APIClient()

    def authenticate(self, token):
        """Helper method to set up token authentication"""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)

    def test_get_inventory_list(self):
        # Use token authentication for user1
        self.authenticate(self.token1.key)

        # Make a request to retrieve the inventory list
        response = self.client.get('/backend/inventory/')

        # Check that the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that the returned data contains the items that are not out of stock
        self.assertEqual(len(response.data), 2)  # There should be 2 items in stock (Coke and Cup)
        self.assertTrue(any(item['ItemName'] == "Coke" for item in response.data))
        self.assertTrue(any(item['ItemName'] == "Cup" for item in response.data))

    def test_get_inventory_report(self):
        # Use token authentication for user1
        self.authenticate(self.token1.key)

        # Make a request to retrieve the inventory report
        response = self.client.get('/backend/inventory/report/')

        # Check that the response status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that the report contains the correct items
        item_names = [item['ItemName'] for item in response.data['inventory_items']]
        self.assertIn("Coke", item_names)
        self.assertIn("Syrup A", item_names)
        self.assertIn("Cup", item_names)

    def test_update_inventory_success(self):
        # Authenticate the user
        self.authenticate(self.token1.key)

        # Use the correct item ID (for Coke, which was created in setUp)
        coke = Inventory.objects.get(ItemName="Coke")

        # Send a PATCH request to reduce the quantity by 5
        data = {'used_quantity': 5}
        response = self.client.patch(f'/backend/inventory/{coke.pk}/', data, format='json')

        # Assert the status code is 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify the quantity is updated correctly
        coke.refresh_from_db()
        self.assertEqual(coke.Quantity, 5)


    def test_update_inventory_out_of_stock(self):
        self.authenticate(self.token1.key)

        # Use the correct ID for Syrup A (out of stock)
        syrup = Inventory.objects.get(ItemName="Syrup A")

        # Attempt to use 1 unit (should fail)
        data = {'used_quantity': 1}
        response = self.client.patch(f'/backend/inventory/{syrup.pk}/', data, format='json')

        # Assert 400 Bad Request with appropriate error
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], "'Syrup A' is already out of stock.")


    def test_update_inventory_insufficient_stock(self):
        self.authenticate(self.token1.key)

        # Use the correct ID for Coke
        coke = Inventory.objects.get(ItemName="Coke")

        # Attempt to use more than available (20 units)
        data = {'used_quantity': 20}
        response = self.client.patch(f'/backend/inventory/{coke.pk}/', data, format='json')

        # Assert 400 Bad Request with appropriate error
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], "Not enough stock available for 'Coke'.")


    def test_update_inventory_low_stock_warning(self):
        self.authenticate(self.token1.key)

        # Use the correct ID for Coke
        coke = Inventory.objects.get(ItemName="Coke")

        # Use 8 units, leaving only 2 (threshold level)
        data = {'used_quantity': 8}
        response = self.client.patch(f'/backend/inventory/{coke.pk}/', data, format='json')

        # Assert 200 OK with warning
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('warning', response.data)
        self.assertEqual(response.data['warning'], "'Coke' stock is below the threshold level.")

    def test_update_inventory_non_existent_item(self):
        # Use token authentication for user1
        self.authenticate(self.token1.key)

        # Send a PATCH request to update a non-existent inventory item
        data = {'used_quantity': 5}
        response = self.client.patch('/backend/inventory/999/', data, format='json')

        # Check that the response status code is 404 Not Found
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
