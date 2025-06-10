from django.contrib import admin
from .models import Profile, UploadedFile, SavedChart

admin.site.register(Profile)
admin.site.register(UploadedFile)
admin.site.register(SavedChart)
