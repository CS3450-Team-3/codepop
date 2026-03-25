from django.core.management.base import BaseCommand
from backend.models import Inventory, Drink, Preference, CustomUser
from backend.setup_helpers import seed_menu_data

User = CustomUser

class Command(BaseCommand):
    help = 'Populates the database with initial data'

    def handle(self, *args, **kwargs):
        # Clear existing data
        self.stdout.write('Clearing existing data...')
        Preference.objects.all().delete()
        Inventory.objects.all().delete()
        Drink.objects.all().delete()
        CustomUser.objects.all().delete()

        # Creating some users
        super_user = User.objects.create_superuser(
            username='super',
            email='supertest@test.com',
            password='password',
            first_name='Lemonjello',
            last_name='Smith'
        )

        staff_user = User.objects.create_user(
            username='staff',
            email='staff@codepop.com',
            password= 'password',
            first_name = 'Orlando',
            is_staff = True,
            is_superuser = False
        )

        user1 = User.objects.create_user(
            username='test',
            email='test@test.com',
            password='password',
            first_name='Orangejello',
            last_name='Smith'
        )

        user2 = User.objects.create_user(
            username='test2',
            email='test@testing.com',
            password='password',
            first_name='Bob',
            last_name='Bobsford'
        )

        # Populate standard inventory and featured drinks
        seed_menu_data()

        # Populating Preferences
        preferences = [
            {'UserID': user1, 'Preference': 'mango'},
            {'UserID': user1, 'Preference': 'strawberry'},
            {'UserID': user1, 'Preference': 'mtn. dew'},
            
            {'UserID': user2, 'Preference': 'peach'},
            {'UserID': user2, 'Preference': 'pumpkin spice'},
            {'UserID': user2, 'Preference': 'dr. pepper'},

            {'UserID': super_user, 'Preference': 'pear'},
            {'UserID': super_user, 'Preference': 'cherry'},
            {'UserID': super_user, 'Preference': 'cupcake'},
            {'UserID': super_user, 'Preference': 'rootbeer'},
        ]
        for pref in preferences:
            Preference.objects.create(**pref)

        self.stdout.write(self.style.SUCCESS('Successfully populated the database.'))
