from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('upload/', views.upload_file, name='upload_file'),
    path('create_chart/', views.create_chart, name='create_chart'),
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.profile_view, name='profile'),
    path('api/saved-charts/', views.get_saved_charts, name='get_saved_charts'),
    path('api/saved-charts/<int:chart_id>/', views.get_chart_by_id, name='get_chart_by_id'),
]
