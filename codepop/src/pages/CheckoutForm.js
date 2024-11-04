import { useState } from 'react';
import { Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { BASE_URL } from '../../ip_address';

export default function CheckoutForm(totalPrice) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  const fetchPaymentSheetParams = async () => {
    const response = await fetch(`${BASE_URL}/backend/create-payment-intent/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: totalPrice }), // amount in cents
    });
    const { paymentIntent, ephemeralKey, customer } = await response.json();
    return { paymentIntent, ephemeralKey, customer };
  };

  const initializePaymentSheet = async () => {
    const { paymentIntent, ephemeralKey, customer } = await fetchPaymentSheetParams();
    const { error } = await initPaymentSheet({
      merchantDisplayName: "Example, Inc.",
      customerId: customer,
      customerEphemeralKeySecret: ephemeralKey,
      paymentIntentClientSecret: paymentIntent,
      allowsDelayedPaymentMethods: true,
    });
    if (!error) setLoading(true);
    else Alert.alert("Error", error.message);
  };

  const openPaymentSheet = async () => {
    const { error } = await presentPaymentSheet();
    if (error) Alert.alert(`Error code: ${error.code}`, error.message);
    else Alert.alert('Success', 'Your order is confirmed!');
  };

  return { initializePaymentSheet, openPaymentSheet, loading };
}