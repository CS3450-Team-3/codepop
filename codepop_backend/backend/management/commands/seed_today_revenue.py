"""
Management command to inject randomized revenue data for today into a store database.

Creates 8–20 completed orders placed throughout today (business hours 8am–10pm),
each with 1–3 drinks and a corresponding Revenue record.

Usage:
    python manage.py seed_today_revenue --store-key w1
"""

import random
import uuid
from datetime import date, datetime, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from backend.models import CustomUser, Drink, Order, Revenue, ServerRegistry


class Command(BaseCommand):
    help = "Seed today's revenue with randomized completed orders for a given store"

    def add_arguments(self, parser):
        parser.add_argument(
            '--store-key', required=True,
            choices=['w1', 'w2', 'w3', 'e1', 'e2', 'e3', 'm1', 'm2', 'm3'],
            help='Store identifier (e.g. w1, e2, m3)',
        )
        parser.add_argument(
            '--count', type=int, default=None,
            help='Number of orders to create (default: random 8–20)',
        )

    def handle(self, *args, **options):
        store_key = options['store_key']
        rng = random.Random()  # unseeded — different each run

        server = ServerRegistry.objects.first()

        customers = list(
            CustomUser.objects.filter(user_type='customer', is_active=True)
        )
        all_drinks = list(Drink.objects.all())

        if not customers:
            self.stderr.write(self.style.ERROR(
                'No customers found. Run populate_fake_data first.'
            ))
            return
        if not all_drinks:
            self.stderr.write(self.style.ERROR(
                'No drinks found. Run populate_fake_data first.'
            ))
            return

        num_orders = options['count'] or rng.randint(8, 20)
        today = date.today()
        # Business hours: 8am–10pm
        day_start = datetime(today.year, today.month, today.day, 8, 0, 0)
        day_end = datetime(today.year, today.month, today.day, 22, 0, 0)
        day_seconds = int((day_end - day_start).total_seconds())

        stripe_counter = int(uuid.uuid4().hex[:8], 16)
        orders_created = 0
        revenue_created = 0

        for _ in range(num_orders):
            customer = rng.choice(customers)
            offset_secs = rng.randint(0, day_seconds)
            order_time = timezone.make_aware(day_start + timedelta(seconds=offset_secs))
            pickup_time = order_time + timedelta(minutes=rng.randint(10, 40))

            stripe_id = f'pi_{store_key}_today_{stripe_counter:010x}'
            stripe_counter += 1

            order = Order.objects.create(
                UserID=customer,
                OriginatingServer=server,
                OrderStatus='Completed',
                PaymentStatus='Paid',
                PickupTime=pickup_time,
                LockerCombo=rng.randint(1000, 9999),
                StripeID=stripe_id,
                Synced=True,
            )
            Order.objects.filter(pk=order.pk).update(CreationTime=order_time)

            num_drinks = rng.randint(1, 3)
            selected = rng.sample(all_drinks, min(num_drinks, len(all_drinks)))
            order.Drinks.set(selected)
            orders_created += 1

            rev = Revenue(
                OrderID=order,
                SaleDate=order_time,
                TotalAmount=order.calculate_total(),
                Refunded=rng.random() < 0.05,
            )
            rev.save()
            revenue_created += 1

        today_revenue = sum(
            r.TotalAmount
            for r in Revenue.objects.filter(SaleDate__date=today)
            if r.TotalAmount
        )
        self.stdout.write(self.style.SUCCESS(
            f"Store {store_key} — added {orders_created} orders / "
            f"{revenue_created} revenue records for {today}. "
            f"Today's total revenue: ${today_revenue:,.2f}"
        ))
