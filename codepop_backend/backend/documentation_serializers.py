from rest_framework import serializers

class ChatbotRequestSerializer(serializers.Serializer):
    message = serializers.CharField(help_text="User message to the chatbot")
    wrong_drink_phase = serializers.CharField(required=False, allow_blank=True)
    refund_phase = serializers.CharField(required=False, allow_blank=True)
    order_num = serializers.CharField(required=False, allow_blank=True)
    drink_nums = serializers.CharField(required=False, allow_blank=True)

class ChatbotResponseSerializer(serializers.Serializer):
    responses = serializers.JSONField(help_text="Chatbot responses")
    wrong_drink_phase = serializers.CharField()
    refund_phase = serializers.CharField()
    order_num = serializers.CharField()
    drink_nums = serializers.CharField()

class EmailAPIResponseSerializer(serializers.Serializer):
    message = serializers.CharField()

class InventoryReportItemSerializer(serializers.Serializer):
    InventoryID = serializers.IntegerField()
    ItemName = serializers.CharField()
    Quantity = serializers.IntegerField()
    ThresholdLevel = serializers.IntegerField()

class InventoryReportResponseSerializer(serializers.Serializer):
    inventory_items = InventoryReportItemSerializer(many=True)
    total_items = serializers.IntegerField()
    out_of_stock = serializers.IntegerField()
    below_threshold = serializers.IntegerField()

class MasterListSyncItemSerializer(serializers.Serializer):
    UserID = serializers.IntegerField()
    Username = serializers.CharField()
    HomeServerID = serializers.IntegerField()

class MasterListSyncRequestSerializer(serializers.Serializer):
    items = MasterListSyncItemSerializer(many=True)

class MasterListSyncResponseSerializer(serializers.Serializer):
    status = serializers.CharField()

class SimpleStatusSerializer(serializers.Serializer):
    status = serializers.CharField()
    detail = serializers.CharField(required=False)
