"""
Management command to seed order history for leaderboard display.

Assigns 3-4 orders (with drinks) to the first customer found, then 1-3 orders
to each remaining customer. Leaderboard score = Count('order__Drinks'), so
every order must have drinks attached.

Usage:
    python manage.py seed_leaderboard_data
"""

import random
import uuid

from django.core.management.base import BaseCommand
from django.utils import timezone

from backend.models import CustomUser, Drink, Order, ServerRegistry


class Command(BaseCommand):
    help = 'Seed order history across customer accounts to populate the leaderboard'

    def handle(self, *args, **options):
        rng = random.Random()

        server = ServerRegistry.objects.first()
        all_drinks = list(Drink.objects.all())

        if not all_drinks:
            self.stderr.write(self.style.ERROR('No drinks found. Run populate_fake_data first.'))
            return

        customers = list(
            CustomUser.objects.filter(user_type='customer', is_active=True)
        )
        if not customers:
            self.stderr.write(self.style.ERROR('No customer users found. Run populate_fake_data first.'))
            return

        stripe_counter = int(uuid.uuid4().hex[:8], 16)

        def make_orders(user, count):
            for _ in range(count):
                nonlocal stripe_counter
                days_ago = rng.randint(0, 30)
                order_time = timezone.now() - timezone.timedelta(
                    days=days_ago, hours=rng.randint(0, 23), minutes=rng.randint(0, 59)
                )
                stripe_id = f'pi_lb_{stripe_counter:010x}'
                stripe_counter += 1

                order = Order.objects.create(
                    UserID=user,
                    OriginatingServer=server,
                    OrderStatus='Completed',
                    PaymentStatus='Paid',
                    PickupTime=order_time + timezone.timedelta(minutes=rng.randint(10, 40)),
                    LockerCombo=rng.randint(1000, 9999),
                    StripeID=stripe_id,
                    Synced=True,
                )
                Order.objects.filter(pk=order.pk).update(CreationTime=order_time)
                num_drinks = rng.randint(1, 3)
                order.Drinks.set(rng.sample(all_drinks, min(num_drinks, len(all_drinks))))
            return count

        total_orders = 0

        # Primary customer: 3-4 orders
        primary = customers[0]
        primary_count = rng.randint(3, 4)
        make_orders(primary, primary_count)
        total_orders += primary_count
        self.stdout.write(f'  {primary.username}: {primary_count} orders')

        # Remaining customers: 1-3 orders each
        for user in customers[1:]:
            count = rng.randint(1, 3)
            make_orders(user, count)
            total_orders += count
            self.stdout.write(f'  {user.username}: {count} orders')

        self.stdout.write(self.style.SUCCESS(
            f'\nDone! {total_orders} leaderboard orders created across {len(customers)} customers.'
        ))
