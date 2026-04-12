"""
orders app - 信号处理
订单状态变更自动同步到流转仓
"""
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from common.enums import OrderStatus

from .models import Order


@receiver(post_save, sender=Order)
def sync_order_to_warehouse(sender, instance, **kwargs):
    """
    当订单状态变更为 shipped（已生产/已发货）时，自动创建流转仓记录。
    当订单状态再次变更时，更新流转仓记录的 order_status。

    注意：无论 Order 是通过 ViewSet 还是手动 save() 更新，只要状态变化就会触发同步。
    """
    from apps.warehouse.models import WarehouseProduct

    # 如果是创建（新记录），跳过
    # 注意：虽然通常 create 时 Order 还没有 items，但通过嵌套序列化器创建时可能已有 items
    # 所以这里跳过 create，依赖后续的 status 更新来触发同步
    if kwargs.get("created"):
        return

    order = instance
    order_status = order.status

    # 当订单状态变更为"已生产"时，自动创建流转仓记录
    if order_status == OrderStatus.PRODUCED:
        # 使用事务 + get_or_create 确保原子性，防止并发重复创建
        with transaction.atomic():
            # 从订单 items 汇总产品信息
            items = order.items.all()
            if items.exists():
                product_types = list(
                    items.values_list("product_type", flat=True).distinct()
                )
                product_models = ", ".join(
                    set(item.product_model for item in items if item.product_model)
                )
                total_quantity = sum(item.quantity for item in items)
            else:
                product_types = [order.product_line] if order.product_line else []
                product_models = ""
                total_quantity = 0

            main_product_type = (
                product_types[0] if product_types else (order.product_line or "")
            )

            # get_or_create 确保同一订单只有一条 auto_generated 记录
            wp, created = WarehouseProduct.objects.get_or_create(
                order=order,
                auto_generated=True,
                defaults={
                    "order_no": order.order_no,
                    "order_status": order_status,
                    "product_type": main_product_type,
                    "product_model": product_models,
                    "quantity": total_quantity,
                    "city": order.city if hasattr(order, "city") and order.city else "",
                },
            )

            if not created:
                # 记录已存在，更新 order_status
                wp.order_status = order_status
                wp.save(update_fields=["order_status", "updated_at"])
    else:
        # 订单状态变更为其他状态时，更新流转仓记录的 order_status
        WarehouseProduct.objects.filter(order=order, auto_generated=True).update(
            order_status=order_status
        )
