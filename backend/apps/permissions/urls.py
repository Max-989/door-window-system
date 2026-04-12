from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"roles", views.RoleViewSet, basename="perm-role")
router.register(r"menus", views.MenuViewSet, basename="perm-menu")
router.register(r"logs", views.PermissionLogViewSet, basename="perm-log")
router.register(r"my-menus", views.MyMenusView, basename="my-menus")
router.register(r"my-permissions", views.MyPermissionsView, basename="my-permissions")

urlpatterns = [
    path("", include(router.urls)),
]
