"""
Management command to populate each store's database with rich fake data:
  - Multiple users (customers, store managers, logistics/repair staff)
  - Store-specific drink menus with unique featured drinks
  - Varying inventory stock levels
  - Order history (Completed/Cancelled) with revenue records
  - Pending / Processing orders
  - User preferences and notifications

Usage:
    python manage.py populate_fake_data
    python manage.py populate_fake_data --clear   # wipe existing data first
"""

import random
import uuid
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from backend.models import (
    CustomUser, Preference, Inventory, Drink, Order, Revenue, Notification, ServerRegistry
)
from backend.setup_helpers import seed_menu_data

# ---------------------------------------------------------------------------
# Static data pools
# ---------------------------------------------------------------------------

FIRST_NAMES = [
    'Ava', 'Ben', 'Cara', 'Diego', 'Elena', 'Felix', 'Grace', 'Hiro',
    'Isla', 'Jax', 'Kira', 'Leo', 'Mila', 'Nate', 'Olivia', 'Pedro',
    'Quinn', 'Rosa', 'Sam', 'Tara', 'Uma', 'Vince', 'Wendy', 'Xander',
    'Yara', 'Zoe',
]
LAST_NAMES = [
    'Adams', 'Baker', 'Clark', 'Davis', 'Evans', 'Foster', 'Garcia',
    'Harris', 'Ingram', 'Johnson', 'King', 'Lopez', 'Moore', 'Nelson',
    'Owens', 'Parker', 'Quinn', 'Reed', 'Scott', 'Taylor', 'Upton',
    'Vance', 'Walsh', 'Xavier', 'Young', 'Zhang',
]

# Each tuple: (Name, SyrupsUsed, SodaUsed, AddIns, Price)
STORE_DRINKS = {
    'w1': [
        ('Pacific Sunset', ['Mango', 'Passion Fruit', 'Orange'], ['Sprite'], ['Mango Puree'], 4.75),
        ('Portland Fog', ['Lavender', 'Vanilla', 'Blue Curacao'], ['Sprite Zero'], ['Cream'], 5.25),
        ('Cascade Rush', ['Raspberry', 'Kiwi'], ['Mtn. Dew'], ['Lime Wedge'], 3.75),
        ('Rain City Chill', ['Cucumber', 'Mojito', 'Sweetened Lime'], ['Sprite'], ['Lemon Wedge'], 4.25),
        ('Mt. Hood Mist', ['Huckleberry', 'Blueberry', 'Blackberry'], ['Lemonade'], ['Whip'], 4.50),
    ],
    'w2': [
        ('Pearl District Pop', ['Coconut', 'Pineapple', 'Vanilla'], ['Coke'], ['Coconut Cream'], 5.00),
        ('Willamette Whirl', ['Peach', 'Strawberry'], ['Fanta'], ['Peach Puree'], 3.99),
        ('Burnside Bliss', ['Salted Caramel', 'Brown Sugar Cinnamon'], ['Dr. Pepper'], ['Whip'], 4.50),
        ('Hawthorne Haze', ['Blue Raspberry', 'Cotton Candy', 'Bubble Gum'], ['Pepsi'], ['Candy Sprinkles'], 3.75),
        ('Forest Park Fizz', ['Green Apple', 'Kiwi', 'Sour'], ['Sprite Zero'], ['Lime Wedge'], 4.25),
    ],
    'w3': [
        ('Space Needle Sip', ['Blue Curacao', 'Grape', 'Lavender'], ['Sprite'], ['Candy Sprinkles'], 5.50),
        ('Pike Place Pop', ['Cranberry', 'Pomegranate', 'Raspberry'], ['Coke Zero'], ['Raspberry Puree'], 4.75),
        ('Emerald Elixir', ['Cucumber', 'Watermelon', 'Kiwi'], ['Sprite Zero'], ['Lime Wedge'], 4.25),
        ('Puget Sound Punch', ['Mango', 'Pineapple', 'Passion Fruit'], ['Lemonade'], ['Mango Puree'], 4.99),
        ('Rainier Rush', ['Huckleberry', 'Cherry', 'Blackberry'], ['Big Red'], ['Whip'], 4.50),
    ],
    'e1': [
        ('Brooklyn Bridge Brew', ['Salted Caramel', 'Hazelnut', 'Vanilla'], ['Dr Pepper Cream Soda'], ['Cream'], 5.75),
        ('Times Square Twist', ['Cotton Candy', 'Bubble Gum', 'Blue Raspberry'], ['Pepsi'], ['Candy Sprinkles'], 4.25),
        ('Central Park Cooler', ['Watermelon', 'Strawberry', 'Lemon Lime'], ['Sprite'], ['Strawberry Puree'], 4.50),
        ('Manhattan Midnight', ['Chocolate', 'Irish Cream', 'White Chocolate'], ['Coke'], ['Whip'], 5.99),
        ('Hudson Horizon', ['Grapefruit', 'Blood Orange', 'Orange'], ['Fanta'], ['Lemon Wedge'], 4.00),
    ],
    'e2': [
        ('Fifth Ave Fizz', ['Pomegranate', 'Cherry', 'Cranberry'], ['Coke Zero'], ['Raspberry Puree'], 4.75),
        ('SoHo Sunrise', ['Peach', 'Mango', 'Guava'], ['Sprite'], ['Peach Puree'], 4.50),
        ('Village Vibe', ['Lavender', 'Blueberry', 'Pear'], ['Sprite Zero'], ['Cream'], 5.00),
        ('Bronx Bomb', ['Grape', 'Blue Raspberry', 'Sour'], ['Mtn. Dew'], ['Lime Wedge'], 3.75),
        ('Harlem Haze', ['Pumpkin Spice', 'Brown Sugar Cinnamon', 'Vanilla'], ['Dr. Pepper'], ['Whip'], 5.25),
    ],
    'e3': [
        ('Boston Common Cooler', ['Cranberry', 'Grapefruit', 'Pomegranate'], ['Lemonade'], ['Lemon Wedge'], 4.50),
        ('Freedom Trail Fizz', ['Strawberry', 'Raspberry', 'Cherry'], ['Fanta'], ['Strawberry Puree'], 4.25),
        ('Fenway Freeze', ['Blueberry', 'Blackberry', 'Grape'], ['Sprite Zero'], ['Whip'], 4.75),
        ('Harbor Highlight', ['Coconut', 'Pineapple', 'Passion Fruit'], ['Sprite'], ['Coconut Cream'], 5.00),
        ('Beacon Hill Blend', ['Salted Caramel', 'White Chocolate', 'Hazelnut'], ['Coke'], ['Cream'], 5.50),
    ],
    'm1': [
        ('Mile High Mix', ['Blue Curacao', 'Blue Raspberry', 'Grape'], ['Pepsi'], ['Candy Sprinkles'], 4.25),
        ('Rocky Mountain Rush', ['Watermelon', 'Kiwi', 'Green Apple'], ['Sprite'], ['Lime Wedge'], 4.50),
        ('Denver Dusk', ['Lavender', 'Vanilla', 'Peach'], ['Lemonade'], ['Cream'], 5.25),
        ('Front Range Fizz', ['Huckleberry', 'Raspberry', 'Blackberry'], ['Big Red'], ['Raspberry Puree'], 4.75),
        ('Colfax Chill', ['Chocolate', 'Salted Caramel', 'Butterscotch'], ['Dr. Pepper'], ['Whip'], 5.99),
    ],
    'm2': [
        ('LoDo Lemonade', ['Strawberry', 'Lemon Lime', 'Sour'], ['Lemonade'], ['Strawberry Puree'], 4.00),
        ('Larimer Loop', ['Cotton Candy', 'Bubble Gum', 'Vanilla'], ['Sprite Zero'], ['Candy Sprinkles'], 3.75),
        ('Cherry Creek Cruise', ['Cherry', 'Cranberry', 'Blood Orange'], ['Coke Zero'], ['Lemon Wedge'], 4.25),
        ('Capitol Hill Cooler', ['Gingerbread', 'Peppermint', 'White Chocolate'], ['Dr Pepper Cream Soda'], ['Whip'], 5.50),
        ('Wash Park Wave', ['Mango', 'Passion Fruit', 'Guava'], ['Fanta'], ['Mango Puree'], 4.75),
    ],
    'm3': [
        ('Salt Flats Slush', ['Watermelon', 'Strawberry', 'Raspberry'], ['Sprite'], ['Strawberry Puree'], 4.25),
        ('Temple Square Twist', ['Vanilla', 'Peach', 'Pear'], ['Sprite Zero'], ['Cream'], 4.75),
        ('Wasatch Wave', ['Huckleberry', 'Blueberry', 'Blackberry'], ['Lemonade'], ['Whip'], 4.50),
        ('Bonneville Blast', ['Pineapple', 'Coconut', 'Mango'], ['Coke'], ['Coconut Cream'], 5.00),
        ('Jordan River Juice', ['Green Apple', 'Kiwi', 'Cucumber'], ['Sprite Zero'], ['Lime Wedge'], 4.25),
    ],
}

FLAVOR_PREFERENCES = [
    'mango', 'strawberry', 'raspberry', 'peach', 'coconut', 'vanilla',
    'cherry', 'watermelon', 'lemonade', 'blueberry', 'pineapple', 'grape',
    'sour', 'chocolate', 'lavender', 'huckleberry', 'green apple', 'kiwi',
]

SODA_PREFERENCES = [
    'mtn. dew', 'dr. pepper', 'sprite', 'coke', 'pepsi', 'rootbeer',
    'fanta', 'big red', 'lemonade',
]

NOTIFICATION_TEMPLATES = [
    ('Your order is ready for pickup!', 'order_ready'),
    ('Your order has been placed successfully.', 'order_placed'),
    ('Welcome to CodePop! Explore our menu.', 'welcome'),
    ('New drinks added to our menu this week.', 'menu_update'),
    ('Low inventory alert: restock needed soon.', 'inventory_alert'),
    ('Your favorite drink is back in stock!', 'restock'),
    ('Special promotion: 10% off your next order.', 'promotion'),
    ('Thank you for your recent order!', 'feedback_request'),
]

# Inventory stock ranges keyed by store — some low, some high, some depleted
STOCK_PROFILES = {
    'w1':  {'soda': (80, 150), 'syrup': (40, 120), 'addin': (30, 100), 'phys': (200, 500)},
    'w2':  {'soda': (20, 60),  'syrup': (10, 50),  'addin': (5, 40),   'phys': (50, 150)},  # low stock
    'w3':  {'soda': (60, 120), 'syrup': (30, 90),  'addin': (20, 70),  'phys': (150, 350)},
    'e1':  {'soda': (100, 200),'syrup': (60, 150), 'addin': (50, 120), 'phys': (300, 600)},  # high stock
    'e2':  {'soda': (0, 30),   'syrup': (0, 20),   'addin': (0, 15),   'phys': (20, 80)},   # critically low
    'e3':  {'soda': (50, 100), 'syrup': (25, 75),  'addin': (15, 60),  'phys': (100, 250)},
    'm1':  {'soda': (70, 130), 'syrup': (35, 100), 'addin': (25, 80),  'phys': (175, 400)},
    'm2':  {'soda': (90, 160), 'syrup': (50, 130), 'addin': (40, 110), 'phys': (250, 550)},
    'm3':  {'soda': (10, 45),  'syrup': (5, 35),   'addin': (0, 25),   'phys': (30, 100)},  # low stock
}


class Command(BaseCommand):
    help = 'Populate this store database with realistic fake data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--store-key', required=True,
            choices=list(STORE_DRINKS.keys()),
            help='Store identifier (e.g. w1, e2, m3) — determines menu and seeds RNG'
        )
        parser.add_argument(
            '--clear', action='store_true',
            help='Delete non-superuser data before seeding'
        )

    def handle(self, *args, **options):
        store_key = options['store_key']
        self.stdout.write(f'Store key: {store_key}')

        # Each store key produces a unique RNG sequence → distinct randomized data
        rng = random.Random(store_key)

        server = ServerRegistry.objects.first()

        if options['clear']:
            self.stdout.write('Clearing existing data...')
            Revenue.objects.all().delete()
            Order.objects.all().delete()
            Notification.objects.all().delete()
            Preference.objects.all().delete()
            Inventory.objects.all().delete()
            Drink.objects.all().delete()
            CustomUser.objects.filter(is_superuser=False).delete()

        stock = STOCK_PROFILES[store_key]

        # ------------------------------------------------------------------
        # 1. Seed base inventory + featured drinks
        # ------------------------------------------------------------------
        self.stdout.write('Seeding base menu data...')
        seed_menu_data()

        # Vary inventory quantities for this store
        items = list(Inventory.objects.all())
        for item in items:
            t = item.ItemType
            if t == 'Soda':
                item.Quantity = rng.randint(*stock['soda'])
            elif t == 'Syrup':
                item.Quantity = rng.randint(*stock['syrup'])
            elif t == 'Add In':
                item.Quantity = rng.randint(*stock['addin'])
            elif t == 'Physical':
                item.Quantity = rng.randint(*stock['phys'])
            item.ThresholdLevel = rng.randint(10, 30)
        Inventory.objects.bulk_update(items, ['Quantity', 'ThresholdLevel'])
        self.stdout.write('  Inventory stock levels randomised.')

        # ------------------------------------------------------------------
        # 2. Add store-specific drinks to menu
        # ------------------------------------------------------------------
        store_drink_objects = []
        for name, syrups, sodas, addins, price in STORE_DRINKS[store_key]:
            obj, _ = Drink.objects.get_or_create(
                Name=name,
                defaults={
                    'SyrupsUsed': syrups,
                    'SodaUsed': sodas,
                    'AddIns': addins,
                    'Price': price,
                    'Rating': round(rng.uniform(3.5, 5.0), 1),
                    'User_Created': False,
                }
            )
            store_drink_objects.append(obj)
        all_drinks = list(Drink.objects.all())
        self.stdout.write(f'  {len(store_drink_objects)} store-specific drinks added.')

        # ------------------------------------------------------------------
        # 3. Create users
        # ------------------------------------------------------------------
        self.stdout.write('Creating users...')
        used_usernames = set(CustomUser.objects.values_list('username', flat=True))
        store_tag = store_key  # e.g. 'w1'

        def make_username(first, last):
            base = f'{first.lower()}.{last.lower()}.{store_tag}'
            candidate = base
            n = 2
            while candidate in used_usernames:
                candidate = f'{base}{n}'
                n += 1
            used_usernames.add(candidate)
            return candidate

        # Store manager
        mgr_first = rng.choice(FIRST_NAMES)
        mgr_last = rng.choice(LAST_NAMES)
        manager = CustomUser.objects.create_user(
            username=make_username(mgr_first, mgr_last),
            email=f'manager.{store_tag}@codepop.com',
            password='password',
            first_name=mgr_first,
            last_name=mgr_last,
            is_staff=True,
            user_type='store_manager',
            home_server=server,
        )

        # Logistics manager
        log_first, log_last = rng.choice(FIRST_NAMES), rng.choice(LAST_NAMES)
        logistics = CustomUser.objects.create_user(
            username=make_username(log_first, log_last),
            email=f'logistics.{store_tag}@codepop.com',
            password='password',
            first_name=log_first,
            last_name=log_last,
            is_staff=True,
            user_type='logistics_manager',
            home_server=server,
        )

        # Repair staff
        rep_first, rep_last = rng.choice(FIRST_NAMES), rng.choice(LAST_NAMES)
        repair = CustomUser.objects.create_user(
            username=make_username(rep_first, rep_last),
            email=f'repair.{store_tag}@codepop.com',
            password='password',
            first_name=rep_first,
            last_name=rep_last,
            is_staff=True,
            user_type='repair_staff',
            home_server=server,
        )

        # Customers (8–12 per store)
        num_customers = rng.randint(8, 12)
        customers = []
        for _ in range(num_customers):
            fn, ln = rng.choice(FIRST_NAMES), rng.choice(LAST_NAMES)
            user = CustomUser.objects.create_user(
                username=make_username(fn, ln),
                email=f'{fn.lower()}.{ln.lower()}.{store_tag}@example.com',
                password='password',
                first_name=fn,
                last_name=ln,
                user_type='customer',
                home_server=server,
            )
            customers.append(user)

        all_users = customers + [manager, logistics, repair]
        self.stdout.write(f'  Created {len(all_users)} users ({num_customers} customers + 3 staff).')

        # ------------------------------------------------------------------
        # 4. Preferences
        # ------------------------------------------------------------------
        prefs_pool = FLAVOR_PREFERENCES + SODA_PREFERENCES
        for user in customers:
            n = rng.randint(2, 5)
            chosen = rng.sample(prefs_pool, n)
            for p in chosen:
                Preference.objects.get_or_create(UserID=user, Preference=p)
        self.stdout.write('  Preferences seeded.')

        # ------------------------------------------------------------------
        # 5. Historical orders + revenue (30–80 per store)
        # ------------------------------------------------------------------
        self.stdout.write('Creating order history...')
        num_historical = rng.randint(30, 80)
        stripe_counter = int(uuid.uuid4().hex[:8], 16)
        orders_created = 0
        revenue_created = 0

        for _ in range(num_historical):
            customer = rng.choice(customers)
            days_ago = rng.randint(1, 180)
            order_time = timezone.now() - timedelta(days=days_ago, hours=rng.randint(0, 23))
            pickup_offset = timedelta(minutes=rng.randint(10, 45))
            status = rng.choices(['Completed', 'Cancelled'], weights=[85, 15])[0]
            pay_status = 'Paid' if status == 'Completed' else rng.choice(['Failed', 'Paid'])

            stripe_id = f'pi_{store_tag}_{stripe_counter:010x}'
            stripe_counter += 1

            order = Order.objects.create(
                UserID=customer,
                OriginatingServer=server,
                OrderStatus=status,
                PaymentStatus=pay_status,
                PickupTime=order_time + pickup_offset,
                LockerCombo=rng.randint(1000, 9999),
                StripeID=stripe_id,
                Synced=True,
            )
            # Manually set CreationTime (auto_now_add prevents setting via create)
            Order.objects.filter(pk=order.pk).update(CreationTime=order_time)

            num_drinks = rng.randint(1, 4)
            selected = rng.sample(all_drinks, min(num_drinks, len(all_drinks)))
            order.Drinks.set(selected)
            orders_created += 1

            if status == 'Completed':
                rev = Revenue.objects.create(OrderID=order)
                rev.calculate_total_amount()
                rev.save()
                # Small chance of refund
                if rng.random() < 0.05:
                    rev.Refunded = True
                    rev.save()
                revenue_created += 1

        self.stdout.write(f'  {orders_created} historical orders, {revenue_created} revenue records.')

        # ------------------------------------------------------------------
        # 6. Pending / Processing orders
        # ------------------------------------------------------------------
        self.stdout.write('Creating active orders...')
        num_active = rng.randint(3, 8)
        for _ in range(num_active):
            customer = rng.choice(customers)
            status = rng.choice(['Pending', 'Processing'])
            stripe_id = f'pi_{store_tag}_{stripe_counter:010x}'
            stripe_counter += 1

            order = Order.objects.create(
                UserID=customer,
                OriginatingServer=server,
                OrderStatus=status,
                PaymentStatus='Pending',
                PickupTime=timezone.now() + timedelta(minutes=rng.randint(5, 30)),
                LockerCombo=rng.randint(1000, 9999),
                StripeID=stripe_id,
                Synced=False,
            )
            num_drinks = rng.randint(1, 3)
            selected = rng.sample(all_drinks, min(num_drinks, len(all_drinks)))
            order.Drinks.set(selected)

        self.stdout.write(f'  {num_active} active (Pending/Processing) orders.')

        # ------------------------------------------------------------------
        # 7. Notifications
        # ------------------------------------------------------------------
        self.stdout.write('Creating notifications...')
        notif_count = 0
        for user in customers:
            n = rng.randint(1, 4)
            for _ in range(n):
                msg, ntype = rng.choice(NOTIFICATION_TEMPLATES)
                days_ago = rng.randint(0, 30)
                ts = timezone.now() - timedelta(days=days_ago, hours=rng.randint(0, 23))
                Notification.objects.create(
                    UserID=user,
                    Message=msg,
                    Timestamp=ts,
                    Type=ntype,
                    Global=False,
                )
                notif_count += 1
        # One global notification from manager
        Notification.objects.create(
            UserID=manager,
            Message=f'Welcome to {server.StoreName if server else "CodePop"}! Check out our new seasonal menu.',
            Timestamp=timezone.now() - timedelta(days=1),
            Type='announcement',
            Global=True,
        )
        notif_count += 1
        self.stdout.write(f'  {notif_count} notifications created.')

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        total_rev = sum(
            r.TotalAmount for r in Revenue.objects.all() if r.TotalAmount
        )
        self.stdout.write(self.style.SUCCESS(
            f'\nDone! Store {store_key} seeded:\n'
            f'  Users      : {CustomUser.objects.count()}\n'
            f'  Drinks     : {Drink.objects.count()}\n'
            f'  Inventory  : {Inventory.objects.count()} items\n'
            f'  Orders     : {Order.objects.count()} total\n'
            f'  Revenue    : ${total_rev:,.2f}\n'
            f'  Notifs     : {Notification.objects.count()}\n'
        ))
