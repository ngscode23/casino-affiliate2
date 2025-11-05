import os
from pathlib import Path

import dj_database_url
from django.utils.translation import gettext_lazy as _
try:
    # Auto-load environment from django/.env if present
    from dotenv import load_dotenv  # type: ignore
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except Exception:
    pass


BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-insecure-secret-key")

DEBUG = os.environ.get("DJANGO_DEBUG", "").lower() in {"1", "true", "yes", "on"}

ALLOWED_HOSTS = [h for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",") if h]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Discounts admin app
    "discounts_admin",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "discounts_admin_project.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "discounts_admin_project.wsgi.application"


# Database
DATABASE_URL = os.environ.get("DATABASE_URL", "")
DATABASES = {
    "default": dj_database_url.parse(
        DATABASE_URL,
        conn_max_age=600,
        ssl_require=True,
    )
}

# Ensure statement_timeout and search_path are set; preserve any existing OPTIONS
db_options = DATABASES["default"].setdefault("OPTIONS", {})
# Add psql options string for statement_timeout and search_path
extra_options = "-c statement_timeout=5000 -c search_path=discounts,public"
if db_options.get("options"):
    db_options["options"] = f"{db_options['options']} {extra_options}"
else:
    db_options["options"] = extra_options


# Internationalization
LANGUAGE_CODE = os.environ.get("DJANGO_LANGUAGE", "ru")
TIME_ZONE = os.environ.get("TZ", "UTC")
USE_I18N = True
USE_TZ = True

LANGUAGES = [
    ("en", _("English")),
    ("ru", _("Russian")),
]

LOCALE_PATHS = [str(BASE_DIR / "locale")]


# Static files
STATIC_URL = "static/"
STATIC_ROOT = str(BASE_DIR / "staticfiles")


# Feature flag: safe editing
ADMIN_SAFE_EDIT = bool(os.environ.get("ADMIN_SAFE_EDIT", ""))


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
