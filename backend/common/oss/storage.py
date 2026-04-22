"""
OSS Storage utility
"""

import uuid

import oss2
from django.conf import settings


class OSSStorage:
    def __init__(self):
        if settings.OSS_ACCESS_KEY_ID and settings.OSS_ACCESS_KEY_SECRET:
            self.auth = oss2.Auth(
                settings.OSS_ACCESS_KEY_ID, settings.OSS_ACCESS_KEY_SECRET
            )
            self.bucket = oss2.Bucket(
                self.auth, settings.OSS_ENDPOINT, settings.OSS_BUCKET_NAME
            )
        else:
            self.bucket = None

    def upload(self, file, directory="uploads"):
        if not self.bucket:
            # Fallback: save locally
            import os

            path = os.path.join(
                settings.MEDIA_ROOT, directory, uuid.uuid4().hex, file.name
            )
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "wb+") as f:
                for chunk in file.chunks():
                    f.write(chunk)
            return settings.MEDIA_URL + path.replace(
                str(settings.MEDIA_ROOT), ""
            ).replace("\\", "/")

        filename = f"{directory}/{uuid.uuid4().hex}/{file.name}"
        self.bucket.put_object(filename, file.read())
        return f"https://{settings.OSS_BUCKET_NAME}.{settings.OSS_ENDPOINT}/{filename}"

    def delete(self, key):
        if self.bucket:
            self.bucket.delete_object(key)
