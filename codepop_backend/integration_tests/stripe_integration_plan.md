# P2P Integration Test Plan for Ordering & Stripe Webhooks

## Objective
Update the `codepop_backend/integration_tests/full_p2p_automated_test.py` script to include a new test section that verifies an end-to-end user order creation and payment flow via Stripe PaymentIntents and Webhooks.

## Implementation Steps
1. Increment `SECTION_TOTAL` from 8 to 9 at the top of the file.
2. In the `main` loop, after test section 8, add section 9: **TESTING ORDER CREATION AND PAYMENT INTEGRATION**.
3. **Step 1: Get User Info and Tokens**
   - Ensure we have a valid `access_token` and `user_id` for a customer (e.g., using `new_guy_bob` created in Section 8, or `traveler_bob`).
4. **Step 2: Create a Drink & Order**
   - Post to `/backend/drinks/` to create a test drink.
   - Post to `/backend/orders/` to create a `Pending` order for the user with the new drink.
   - Verify the `Order` returns with a generated `OrderID`.
5. **Step 3: Create Payment Intent**
   - Make a `POST` request to `/backend/create-payment-intent/` passing the `order_id` and the `access_token`.
   - Verify the response contains `client_secret` and `publishableKey`.
   - Verify via a `GET` request to `/backend/orders/{order_id}/` that the order now has a `StripeID` attached.
6. **Step 4: Simulate Stripe Webhook**
   - Manually construct a `payment_intent.succeeded` event JSON payload containing the assigned `StripeID`.
   - Generate a valid HMAC signature for the payload using the `STRIPE_WEBHOOK_SECRET` from the environment (or a hardcoded test secret matching what the test server uses).
   - `POST` the payload to `/backend/stripe/webhook/` with the generated signature in the `Stripe-Signature` header.
7. **Step 5: Verify Order Fulfillment**
   - `GET` the order and assert `PaymentStatus` is now `Paid`.
   - Optionally query `/backend/revenues/` to assert that a `Revenue` record was generated for the order.

## Considerations
We do not want to actually hit the real Stripe API in the automated P2P tests. We should mock the `stripe` package in the `p2p_test_settings.py` or use a dummy webhook signature generation. Since `full_p2p_automated_test.py` tests the running application via HTTP requests over local ports, mocking Python packages inside the running Django server requires some special configuration (like `unittest.mock.patch` doesn't work across processes). The easiest way to handle the webhook part is to figure out the mock secret, sign it, and send it, while the `create-payment-intent` might actually hit Stripe if real keys are present. Alternatively, we might mock Stripe via a Django middleware or a custom view override strictly in `p2p_test_settings.py`. Let's inspect `p2p_test_settings.py` first.
