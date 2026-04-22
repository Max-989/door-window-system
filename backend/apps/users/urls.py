"""
users app - URL配置
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"branches", views.BranchViewSet)
router.register(r"users", views.UserViewSet, basename="user")
router.register(r"roles", views.RoleViewSet)
router.register(r"permissions", views.PermissionViewSet)
router.register(r"pending", views.PendingUserViewSet, basename="pending-user")

urlpatterns = [
    # 登录与用户信息
    path("login/", views.login_view, name="login"),
    path("token/refresh/", views.token_refresh_view, name="token-refresh"),
    path("me/", views.me_view, name="me"),
    # 注册接口
    path("register/decoration/", views.register_decoration, name="register-decoration"),
    path("register/staff/", views.register_staff, name="register-staff"),
    # 密码重置
    path("reset-password/", views.reset_password, name="reset-password"),
    # 角色确认
    path("confirm-role/", views.confirm_role, name="confirm-role"),
    # ViewSet 路由
    path("", include(router.urls)),
]
