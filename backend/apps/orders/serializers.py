"""
orders app - 序列化器
"""
from rest_framework import serializers

from apps.products.models import AlloyProduct, SecurityProduct, WoodProduct

from .models import Order, OrderChangeLog, OrderItem


class OrderBulkImportSerializer(serializers.Serializer):
    file = serializers.FileField(help_text="Excel文件（.xlsx）")


class OrderItemListSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product_type",
            "product_name",
            "product_model",
            "color",
            "quantity",
            "unit_cost_price",
        ]
        read_only_fields = ["id"]


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]
        extra_kwargs = {
            # Bug 1: product_name 和 product_type 在 validate() 中自动填充，不需要客户端传
            "product_name": {"required": False, "allow_blank": True},
            "product_type": {"required": False, "allow_blank": True},
            # Bug 2: 嵌套创建时 order 由父级 OrderCreateSerializer 设置
            "order": {"required": False},
        }

    def validate(self, attrs):
        # Fix 2: partial update — 如果三个产品字段都不在 attrs 中，跳过产品相关校验
        has_product_field = any(
            k in attrs for k in ("wood_product", "alloy_product", "security_product")
        )
        if not has_product_field:
            # partial update, skip product validation
            return attrs

        # 必须提供三种产品之一
        has_product = (
            attrs.get("wood_product")
            or attrs.get("alloy_product")
            or attrs.get("security_product")
        )
        if not has_product:
            raise serializers.ValidationError(
                "必须提供 wood_product / alloy_product / security_product 之一"
            )

        # 自动填充 product_name 和 product_type
        if attrs.get("wood_product"):
            attrs["product_name"] = attrs["wood_product"].name
            attrs.setdefault("product_type", "wood")
        elif attrs.get("alloy_product"):
            attrs["product_name"] = attrs["alloy_product"].name
            attrs.setdefault("product_type", "alloy")
        elif attrs.get("security_product"):
            attrs["product_name"] = attrs["security_product"].name
            attrs.setdefault("product_type", "security")

        # Fix 4: 颜色校验（覆盖所有产品类型）
        product = (
            attrs.get("wood_product")
            or attrs.get("alloy_product")
            or attrs.get("security_product")
        )
        color = attrs.get("color", "")
        if product and color:
            colors_list = []
            if isinstance(product, WoodProduct):
                colors_list = product.colors or []
            elif isinstance(product, AlloyProduct):
                colors_list = product.colors or []
            elif isinstance(product, SecurityProduct):
                colors_list = product.door_colors or []
            if colors_list and color not in colors_list:
                raise serializers.ValidationError(
                    {"color": f'颜色 "{color}" 不在该产品的可选颜色中，可选: {colors_list}'}
                )

        # 自动填充 product_model（如果未提供但有关联产品）
        if not attrs.get("product_model"):
            if attrs.get("wood_product") and attrs["wood_product"].model:
                attrs["product_model"] = attrs["wood_product"].model
            elif attrs.get("security_product") and attrs["security_product"].model:
                attrs["product_model"] = attrs["security_product"].model

        # 自动填充 unit_cost_price（如果未提供但有关联产品）
        if not attrs.get("unit_cost_price") or attrs["unit_cost_price"] == 0:
            if attrs.get("wood_product") and attrs["wood_product"].cost_price:
                attrs["unit_cost_price"] = attrs["wood_product"].cost_price
            elif attrs.get("alloy_product") and attrs["alloy_product"].unit_price:
                attrs["unit_cost_price"] = attrs["alloy_product"].unit_price
            elif attrs.get("security_product"):
                sp = attrs["security_product"]
                if sp.size_type == "standard" and sp.standard_price:
                    attrs["unit_cost_price"] = sp.standard_price
                elif sp.custom_price:
                    attrs["unit_cost_price"] = sp.custom_price

        return attrs


class OrderListSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source="brand.name", read_only=True, default="")
    store_name = serializers.CharField(source="store.name", read_only=True, default="")
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    source_display = serializers.CharField(source="get_source_display", read_only=True)
    order_type_display = serializers.CharField(
        source="get_order_type_display", read_only=True
    )

    class Meta:
        model = Order
        fields = [
            "id",
            "order_no",
            "source",
            "source_display",
            "brand",
            "brand_name",
            "store",
            "store_name",
            "order_type",
            "order_type_display",
            "product_line",
            "customer_name",
            "customer_phone",
            "customer_address",
            "customer_price",
            "cost_price",
            "status",
            "status_display",
            "salesman_name",
            "salesman_phone",
            "created_at",
        ]


class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, required=False)
    order_no = serializers.CharField(read_only=True)  # Auto-generated

    class Meta:
        model = Order
        fields = [
            "id",
            "order_no",
            "source",
            "brand",
            "store",
            "salesperson",
            "branch",
            "order_type",
            "parent_order",
            "customer_name",
            "customer_phone",
            "customer_address",
            "customer_price",
            "product_line",
            "notes",
            "salesman_name",
            "salesman_phone",
            "measurements",
            "items",
        ]
        read_only_fields = ["id", "order_no"]

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        measurements = validated_data.pop("measurements", [])
        # 装企人员自动填入导购信息
        request = self.context.get("request")
        if request and request.user:
            try:
                profile = request.user.profile
                if profile.user_type == "decoration":
                    validated_data.setdefault(
                        "salesman_name", request.user.real_name or ""
                    )
                    validated_data.setdefault(
                        "salesman_phone", request.user.phone or ""
                    )
            except Exception:
                pass
        order = Order.objects.create(**validated_data)
        for item_data in items_data:
            OrderItem.objects.create(order=order, **item_data)
        if measurements:
            order.measurements.set(measurements)
        return order


class OrderUpdateSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, required=False)

    class Meta:
        model = Order
        fields = [
            "brand",
            "store",
            "salesperson",
            "customer_name",
            "customer_phone",
            "customer_address",
            "customer_price",
            "status",
            "notes",
            "items",
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source="brand.name", read_only=True, default="")
    store_name = serializers.CharField(source="store.name", read_only=True, default="")
    salesperson_name = serializers.CharField(
        source="salesperson.name", read_only=True, default=""
    )
    branch_name = serializers.CharField(
        source="branch.name", read_only=True, default=""
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    source_display = serializers.CharField(source="get_source_display", read_only=True)
    items = OrderItemListSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(
        source="created_by.real_name", read_only=True, default=""
    )

    class Meta:
        model = Order
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class OrderChangeLogSerializer(serializers.ModelSerializer):
    operator_name = serializers.CharField(
        source="operator.real_name", read_only=True, default=""
    )

    class Meta:
        model = OrderChangeLog
        fields = "__all__"
        read_only_fields = ["created_at"]
