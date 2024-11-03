from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from rest_framework.generics import CreateAPIView, ListAPIView, ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework import status
from rest_framework.views import APIView
from .models import Preference
from .serializers import CreateUserSerializer, PreferenceSerializer
from rest_framework.permissions import IsAuthenticated
import stripe
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from django.views import View #maybe delete these three?
from django.utils.decorators import method_decorator
import json

stripe.api_key = settings.STRIPE_SECRET_KEY

#Custom login to so that it gets a token but also the user's first name and the user id
class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'first_name': user.first_name,
            
        })

#Code to create a user in the database
class CreateUserAPIView(CreateAPIView):
    serializer_class = CreateUserSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        # We create a token than will be used for future auth
        token = Token.objects.create(user=serializer.instance)
        token_data = {"token": token.key}
        return Response(
            {**serializer.data, **token_data},
            status=status.HTTP_201_CREATED,
            headers=headers
        )

class LogoutUserAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # Delete the token to log out the user
        request.user.auth_token.delete()
        return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
    
# List all preferences or create a new preference
class PreferenceListCreateAPIView(ListCreateAPIView):
    queryset = Preference.objects.all()
    serializer_class = PreferenceSerializer

# Retrieve, update, or delete a specific preference by ID
class PreferenceRetrieveUpdateDestroyAPIView(RetrieveUpdateDestroyAPIView):
    queryset = Preference.objects.all()
    serializer_class = PreferenceSerializer
    lookup_field = 'pk'  # 'pk' refers to the primary key, which is PreferenceID
    
# List all preferences for a specific user
class UserPreferenceListAPIView(ListAPIView):
    serializer_class = PreferenceSerializer

    # Override get_queryset to filter preferences by the provided UserID
    def get_queryset(self):
        user_id = self.kwargs['user_id']  # Retrieve the 'user_id' from the URL
        # Check if the user exists first, and raise a 404 if not
        user = get_object_or_404(User, pk=user_id)
        return Preference.objects.filter(UserID=user_id)

@method_decorator(csrf_exempt, name='dispatch')
class StripePaymentIntentView(View):
    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            amount = int(data.get("amount") * 100)  # Stripe uses cents, so multiply dollars by 100
            if amount is None:
                return JsonResponse({'error': 'Amount is required.'}, status=400)

            # Create a new customer
            customer = stripe.Customer.create()

            # Create an ephemeral key for the customer
            ephemeral_key = stripe.EphemeralKey.create(
                customer=customer['id'],
                stripe_version='2024-09-30.acacia',
            )

            # Create a payment intent
            payment_intent = stripe.PaymentIntent.create(
                amount=amount,
                currency='usd',
                customer=customer['id'],
                payment_method_types=['card'],  # Accept only card payments
            )

            # Respond with the required information
            return JsonResponse({
                'paymentIntent': payment_intent.client_secret,
                'ephemeralKey': ephemeral_key.secret,
                'customer': customer.id,
                'publishableKey': 'TODO: get a new publishable stripe key'
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)