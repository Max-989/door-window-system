# -*- coding: utf-8 -*-

"""
warehouse app - 库存操作服务
抽取出入库通用逻辑，消除 HardwareInventoryViewSet 和 AccessoryInventoryViewSet 重复代码
"""

from rest_framework import status

from common.responses import error

from .models import StockRecord


class StockService:
    """库存操作服务"""

    @staticmethod
    def validate_quantity_and_reason(quantity, reason):
        """校验出入库参数"""
        if not quantity or not isinstance(quantity, int) or quantity <= 0:
            return error(
                message="quantity 必须是正整数", code=status.HTTP_400_BAD_REQUEST
            )
        if not reason:
            return error(message="reason 必填", code=status.HTTP_400_BAD_REQUEST)
        return None

    @staticmethod
    def out_stock(
        model_class, item_type, pk, quantity, reason, related_task_id, operator
    ):
        """通用出库操作"""
        from django.db import transaction

        error_response = StockService.validate_quantity_and_reason(quantity, reason)
        if error_response:
            return error_response, None

        with transaction.atomic():
            item = model_class.objects.select_for_update().get(pk=pk)

            if item.current_stock < quantity:
                return (
                    error(
                        message=f"库存不足，当前库存 {item.current_stock}，出库数量 {quantity}",
                        code=status.HTTP_400_BAD_REQUEST,
                    ),
                    None,
                )

            item.current_stock -= quantity
            update_fields = ["current_stock", "updated_at"]

            if hasattr(item, "available_stock"):
                item.available_stock = item.current_stock - getattr(
                    item, "pending_out_quantity", 0
                )
                update_fields.append("available_stock")

            item.save(update_fields=update_fields)

            StockRecord.objects.create(
                item_type=item_type,
                item_id=item.pk,
                record_type="out",
                quantity=quantity,
                reason=reason,
                operator=operator if operator.is_authenticated else None,
                related_task_id=related_task_id or "",
            )

        return None, item

    @staticmethod
    def in_stock(model_class, item_type, pk, quantity, reason, supplier, operator):
        """通用入库操作"""
        error_response = StockService.validate_quantity_and_reason(quantity, reason)
        if error_response:
            return error_response, None

        item = model_class.objects.get(pk=pk)
        item.current_stock += quantity
        update_fields = ["current_stock", "updated_at"]

        if hasattr(item, "available_stock"):
            item.available_stock = item.current_stock - getattr(
                item, "pending_out_quantity", 0
            )
            update_fields.append("available_stock")

        item.save(update_fields=update_fields)

        StockRecord.objects.create(
            item_type=item_type,
            item_id=item.pk,
            record_type="in",
            quantity=quantity,
            reason=reason,
            operator=operator if operator.is_authenticated else None,
            supplier=supplier or "",
        )

        return None, item
