import os
from django.db.models.signals import post_delete
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Receipt
from .models import Profile
from .models import User

@receiver(post_delete, sender=Receipt)
def delete_receipt_file(sender, instance, **kwargs):
    print(f"🧹 삭제 시그널 호출됨: {instance.image.path}")

    if instance.image and instance.image.path:
        if os.path.isfile(instance.image.path):
            os.remove(instance.image.path)
            print("✅ 파일 삭제됨")
        else:
            print("⚠️ 파일이 존재하지 않음")

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)