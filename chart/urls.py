from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('upload/', views.upload_file, name='upload_file'),
    path('create_chart/', views.create_chart, name='create_chart'),
    path('register/', views.register_view, name='register'),
    path('register/check-username/', views.register_check_username, name='register_check_username'),
    path('register/validate-password/', views.register_validate_password, name='register_validate_password'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.profile_view, name='profile'),
    path('profile/verify-password/', views.verify_current_password, name='verify_current_password'),
    path('profile/check-username/', views.profile_check_username, name='profile_check_username'),
    path('api/user-theme/', views.save_user_ui_theme, name='save_user_ui_theme'),
    path('api/saved-charts/', views.get_saved_charts, name='get_saved_charts'),
    path('api/saved-charts/<int:chart_id>/', views.get_chart_by_id, name='get_chart_by_id'),
]
