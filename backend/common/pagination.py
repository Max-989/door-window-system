"""
标准分页 - 与前端协议一致
"""
from datetime import datetime, timezone

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "pageSize"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(
            {
                "code": 200,
                "message": "查询成功",
                "data": {
                    "items": data,
                    "total": self.page.paginator.count,
                    "page": self.page.number,
                    "pageSize": self.page_size,
                    "totalPages": self.page.paginator.num_pages,
                },
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            }
        )
