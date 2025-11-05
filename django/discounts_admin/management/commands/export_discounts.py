import csv
from typing import Optional

from django.core.management.base import BaseCommand, CommandParser

from discounts_admin.models import Discount


class Command(BaseCommand):
    help = "Export discounts to CSV"

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--output",
            "-o",
            dest="output",
            help="Output CSV file path (default: stdout)",
        )

    def handle(self, *args, **options):
        output: Optional[str] = options.get("output")
        fields = [
            "id",
            "name",
            "type",
            "description",
            "channel",
            "priority",
            "stackable",
            "active",
            "start_at",
            "end_at",
            "percent_off",
            "amount_off_cts",
            "currency",
            "bogo_buy_qty",
            "bogo_get_qty",
            "min_subtotal_cts",
            "min_qty",
            "usage_limit_total",
            "usage_limit_per_user",
            "created_at",
            "updated_at",
        ]

        qs = Discount.objects.all().only(*fields)

        if output:
            f = open(output, "w", newline="", encoding="utf-8")
            close = True
        else:
            f = self.stdout
            close = False

        writer = csv.writer(f)
        writer.writerow(fields)
        for d in qs.iterator():
            row = [getattr(d, field) for field in fields]
            writer.writerow(row)

        if close:
            f.close()
