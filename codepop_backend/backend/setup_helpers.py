import requests
from backend.models import Inventory, Drink


def is_configured() -> bool:
    """Return True if a super_admin user already exists (server has been set up)."""
    from backend.models import CustomUser
    return CustomUser.objects.filter(user_type='super_admin').exists()


def seed_menu_data():
    """
    Seed standard inventory items and featured drinks.
    Idempotent — uses get_or_create so it is safe to call multiple times.
    """
    sodas = [
        'Mtn. Dew', 'Diet Mtn. Dew', 'Dr. Pepper', 'Diet Dr. Pepper', 'Dr. Pepper Zero',
        'Dr Pepper Cream Soda', 'Sprite', 'Sprite Zero', 'Coke', 'Diet Coke', 'Coke Zero',
        'Pepsi', 'Diet Pepsi', 'Rootbeer', 'Fanta', 'Big Red', 'Powerade', 'Lemonade', 'Light Lemonade',
    ]
    syrups = [
        'Coconut', 'Pineapple', 'Strawberry', 'Raspberry', 'Blackberry', 'Blue Curacao', 'Passion Fruit',
        'Vanilla', 'Pomegranate', 'Peach', 'Grapefruit', 'Green Apple', 'Pear', 'Cherry', 'Cupcake',
        'Orange', 'Blood Orange', 'Mango', 'Cranberry', 'Blue Raspberry', 'Grape', 'Sour', 'Kiwi',
        'Chocolate', 'Milano', 'Huckleberry', 'Sweetened Lime', 'Mojito', 'Lemon Lime', 'Cinnamon',
        'Watermelon', 'Guava', 'Banana', 'Lavender', 'Cucumber', 'Salted Caramel', 'Choc Chip Cookie Dough',
        'Brown Sugar Cinnamon', 'Hazelnut', 'Pumpkin Spice', 'Peppermint', 'Irish Cream', 'Gingerbread',
        'White Chocolate', 'Butterscotch', 'Bubble Gum', 'Cotton Candy', 'Butterbrew Mix',
    ]
    add_ins = [
        'Cream', 'Coconut Cream', 'Whip', 'Lemon Wedge', 'Lime Wedge', 'French Vanilla Creamer',
        'Candy Sprinkles', 'Strawberry Puree', 'Peach Puree', 'Mango Puree', 'Raspberry Puree',
    ]
    physical_items = ['Large Cups', 'Med Cups', 'Small Cups', 'Large Lids', 'Small Lids', 'Straws']

    for name in sodas:
        Inventory.objects.get_or_create(
            ItemName=name, ItemType='Soda',
            defaults={'Quantity': 100, 'ThresholdLevel': 20},
        )
    for name in syrups:
        Inventory.objects.get_or_create(
            ItemName=name, ItemType='Syrup',
            defaults={'Quantity': 100, 'ThresholdLevel': 20},
        )
    for name in add_ins:
        Inventory.objects.get_or_create(
            ItemName=name, ItemType='Add In',
            defaults={'Quantity': 100, 'ThresholdLevel': 20},
        )
    for name in physical_items:
        Inventory.objects.get_or_create(
            ItemName=name, ItemType='Physical',
            defaults={'Quantity': 100, 'ThresholdLevel': 20},
        )

    featured_drinks = [
        {
            'Name': 'Coke Float',
            'SyrupsUsed': ['Vanilla'],
            'SodaUsed': ['Coke'],
            'AddIns': ['Cream'],
            'Price': 5.99,
            'User_Created': False,
        },
        {
            'Name': 'Seasonal Depression',
            'SyrupsUsed': ['Cinnamon', 'Chocolate', 'Pumpkin Spice', 'Cucumber'],
            'SodaUsed': ['Rootbeer'],
            'AddIns': ['Candy Sprinkles'],
            'Rating': 0.0,
            'Price': 4.99,
            'User_Created': False,
        },
        {
            'Name': "I've Heard It Both Ways",
            'SyrupsUsed': ['Pineapple', 'Bubble Gum', 'Cotton Candy'],
            'SodaUsed': ['Dr. Pepper'],
            'AddIns': ['Lime Wedge'],
            'Price': 2.50,
            'User_Created': False,
        },
        {
            'Name': 'Fall Girlie',
            'SyrupsUsed': ['Pumpkin Spice', 'Salted Caramel'],
            'SodaUsed': ['Dr. Pepper'],
            'AddIns': ['Whip', 'Candy Sprinkles'],
            'Price': 2.50,
            'User_Created': False,
        },
        {
            'Name': 'Red Rizz',
            'SyrupsUsed': ['Peach', 'Cranberry'],
            'SodaUsed': ['Big Red'],
            'AddIns': ['Peach Puree'],
            'Price': 2.50,
            'User_Created': False,
        },
        {
            'Name': '#Lemons',
            'SyrupsUsed': ['Huckleberry'],
            'SodaUsed': ['Lemonade'],
            'AddIns': [],
            'Price': 2.50,
            'User_Created': False,
        },
    ]
    for drink in featured_drinks:
        Drink.objects.get_or_create(Name=drink['Name'], defaults=drink)


def fetch_peer_discovery(peer_url: str) -> dict:
    """
    Call a peer server's /backend/p2p/discover/ endpoint and return the JSON payload.
    Raises requests.RequestException on network errors.
    """
    url = peer_url.rstrip('/') + '/backend/p2p/discover/'
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    return response.json()
