import json

class MockStripe:
    class Customer:
        @staticmethod
        def create(*args, **kwargs):
            return {'id': 'cus_mock123'}

    class EphemeralKey:
        @staticmethod
        def create(*args, **kwargs):
            class MockKey:
                secret = 'ek_mock_123'
            return MockKey()

    class PaymentIntent:
        @staticmethod
        def create(*args, **kwargs):
            class MockIntent:
                id = 'pi_mock_123'
                client_secret = 'pi_mock_123_secret'
            return MockIntent()

    class error:
        class StripeError(Exception):
            pass
        class SignatureVerificationError(Exception):
            pass

    class Webhook:
        @staticmethod
        def construct_event(payload, sig_header, secret, **kwargs):
            if sig_header != 'mock_signature_for_testing':
                class SignatureVerificationError(Exception):
                    pass
                raise SignatureVerificationError("Invalid signature")
            
            # Use json to parse byte strings if they are passed
            if isinstance(payload, bytes):
                payload = json.loads(payload.decode('utf-8'))
            elif isinstance(payload, str):
                payload = json.loads(payload)
                
            return payload

# Replace the stripe module when we run p2p tests
import sys
sys.modules['stripe'] = MockStripe
