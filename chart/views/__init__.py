"""Представления приложения chart."""

from .api import get_chart_by_id, get_saved_charts
from .auth_views import (
    login_view,
    logout_view,
    register_check_username,
    register_validate_password,
    register_view,
)
from .charts import create_chart, index, upload_file
from .profile_views import (
    profile_check_username,
    profile_view,
    save_user_ui_theme,
    verify_current_password,
)

__all__ = [
    "index",
    "upload_file",
    "create_chart",
    "register_view",
    "register_check_username",
    "register_validate_password",
    "login_view",
    "logout_view",
    "profile_view",
    "verify_current_password",
    "profile_check_username",
    "save_user_ui_theme",
    "get_saved_charts",
    "get_chart_by_id",
]
