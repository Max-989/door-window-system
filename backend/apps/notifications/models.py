# -*- coding: utf-8 -*-

from django.db import models

from common.enums import NotificationType


class Notification(models.Model):
    """系统通知"""

    user = models.ForeignKey(
        "users.User", on_delete=models.CASCADE, related_name="notifications"
    )
    type = models.CharField(
        "通知类型",
        max_length=30,
        choices=NotificationType.CHOICES,
        default=NotificationType.SYSTEM,
    )
    title = models.CharField("标题", max_length=200)
    content = models.TextField("内容", blank=True, default="")
    related_id = models.IntegerField("相关业务ID", null=True, blank=True)
    related_type = models.CharField(
        "相关业务类型", max_length=50, blank=True, default=""
    )
    is_read = models.BooleanField("是否已读", default=False)
    read_at = models.DateTimeField("阅读时间", null=True, blank=True)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "notifications"
        verbose_name = "通知"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} -> {self.user}"
