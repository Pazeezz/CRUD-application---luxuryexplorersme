import time

from django.core.management.base import BaseCommand
from django.db import connections
from django.db.utils import OperationalError


class Command(BaseCommand):
    help = "Wait until the default database is available"

    def handle(self, *args, **options):
        self.stdout.write("Checking database availability...")
        retries = 30
        while retries > 0:
            try:
                connections["default"].cursor().execute("SELECT 1")
                self.stdout.write(self.style.SUCCESS("Database is available."))
                return
            except OperationalError:
                retries -= 1
                time.sleep(1)
        raise OperationalError("Database unavailable after 30 retries.")

