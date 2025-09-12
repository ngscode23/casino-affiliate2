#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import os
import sys
import time
import tempfile
import shutil
import platform
from pathlib import Path

import psutil
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# ---------- утилиты ----------

def make_chrome(headless: bool, browser_path: str | None = None, isolated: bool = True) -> tuple[webdriver.Chrome, Path | None]:
    opts = Options()
    if browser_path:
        opts.binary_location = browser_path
    # изолированный профиль, чтобы не трогать твой основной
    user_data_dir = None
    if isolated:
        user_data_dir = Path(tempfile.mkdtemp(prefix="auto_join_profile_"))
        opts.add_argument(f"--user-data-dir={user_data_dir}")
    opts.add_argument("--no-first-run")
    opts.add_argument("--no-default-browser-check")
    opts.add_argument("--disable-notifications")
    opts.add_argument("--lang=ru-RU")
    # микрофон/камера по умолчанию выключены на уровне разрешений
    opts.add_experimental_option("prefs", {
        "profile.default_content_setting_values.media_stream_mic": 2,
        "profile.default_content_setting_values.media_stream_camera": 2,
        "profile.default_content_setting_values.geolocation": 2
    })
    # headless=new поддерживает getUserMedia, но для стабильности лучше не headless
    if headless:
        opts.add_argument("--headless=new")
    # чуть стабильности в контейнерах/CI
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--no-sandbox")

    service = ChromeService(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=opts)
    driver.set_window_size(1280, 900)
    return driver, user_data_dir

def cleanup(driver: webdriver.Chrome, tmpdir: Path | None):
    try:
        driver.quit()
    except Exception:
        pass
    if tmpdir:
        try:
            shutil.rmtree(tmpdir, ignore_errors=True)
        except Exception:
            pass

def wait_and_click(driver: webdriver.Chrome, locators: list[tuple[str, str]], timeout: int = 30) -> bool:
    for by, sel in locators:
        try:
            el = WebDriverWait(driver, timeout).until(EC.element_to_be_clickable((by, sel)))
            el.click()
            return True
        except Exception:
            continue
    return False

def press_shortcuts(driver: webdriver.Chrome, platform: str, mute_mic: bool, mute_cam: bool):
    # глобально фокус на body
    try:
        driver.find_element(By.TAG_NAME, "body").click()
    except Exception:
        pass

    if platform == "meet":
        # Meet: mic Ctrl+D, cam Ctrl+E
        if mute_mic:
            driver.switch_to.active_element.send_keys(Keys.CONTROL, 'd')
            time.sleep(0.3)
        if mute_cam:
            driver.switch_to.active_element.send_keys(Keys.CONTROL, 'e')
            time.sleep(0.3)
    elif platform == "teams":
        # Teams: Ctrl+Shift+M (mute), Ctrl+Shift+O (camera)
        if mute_mic:
            driver.switch_to.active_element.send_keys(Keys.CONTROL, Keys.SHIFT, 'm')
            time.sleep(0.3)
        if mute_cam:
            driver.switch_to.active_element.send_keys(Keys.CONTROL, Keys.SHIFT, 'o')
            time.sleep(0.3)
    elif platform == "zoom":
        # Zoom Web: Alt+A (mute), Alt+V (video) на Windows; на macOS ⌘+Shift+A/V
        is_mac = platform_system() == "Darwin"
        if mute_mic:
            if is_mac:
                driver.switch_to.active_element.send_keys(Keys.COMMAND, Keys.SHIFT, 'a')
            else:
                driver.switch_to.active_element.send_keys(Keys.ALT, 'a')
            time.sleep(0.3)
        if mute_cam:
            if is_mac:
                driver.switch_to.active_element.send_keys(Keys.COMMAND, Keys.SHIFT, 'v')
            else:
                driver.switch_to.active_element.send_keys(Keys.ALT, 'v')
            time.sleep(0.3)

def platform_system():
    return platform.system()

# ---------- площадки ----------

def join_google_meet(driver: webdriver.Chrome, url: str, display_name: str | None, mute_mic: bool, mute_cam: bool, timeout_join: int) -> None:
    driver.get(url)

    # если требуется логин/SSO — Selenium тут бессилен без твоих куки. Можно использовать не изолированный профиль.
    # Попытка нажать "Продолжить без микрофона/камеры" если всплыло окно разрешений
    time.sleep(2)

    # иногда Meet показывает предварительный экран с кнопкой "Присоединиться сейчас" / "Join now"
    locators_join = [
        (By.XPATH, "//span[contains(., 'Присоединиться сейчас')]/ancestor::button"),
        (By.XPATH, "//span[contains(., 'Join now')]/ancestor::button"),
        (By.CSS_SELECTOR, "button[jsname][data-mdc-dialog-action], div[role='button'][data-is-muted]"),  # запасной
    ]

    # для надежности попробуем выключить микрофон/камеру ещё до входа, если есть кнопки на прешоу
    locators_mic = [
        (By.CSS_SELECTOR, "div[role='button'][aria-label*='микроф'][aria-pressed], div[aria-label*='microphone'][aria-pressed]"),
        (By.XPATH, "//div[@role='button' and contains(translate(@aria-label,'MICROPHONEмикрофон','microphoneмикрофон'),'микроф')]")
    ]
    locators_cam = [
        (By.CSS_SELECTOR, "div[role='button'][aria-label*='камера'][aria-pressed], div[aria-label*='camera'][aria-pressed]"),
        (By.XPATH, "//div[@role='button' and contains(translate(@aria-label,'CAMERAкамера','cameraкамера'),'камера')]")
    ]

    # имя в поле, если требуется
    if display_name:
        try:
            name_field = WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='text']")))
            name_field.clear()
            name_field.send_keys(display_name)
        except Exception:
            pass

    # прешоу mute
    if mute_mic:
        wait_and_click(driver, locators_mic, timeout=2)
    if mute_cam:
        wait_and_click(driver, locators_cam, timeout=2)

    # join
    ok = wait_and_click(driver, locators_join, timeout=timeout_join)
    if not ok:
        raise RuntimeError("Не нашёл кнопку 'Присоединиться' на Google Meet")

    # финальная страховка: шорткаты
    press_shortcuts(driver, "meet", mute_mic, mute_cam)

def join_zoom_web(driver: webdriver.Chrome, url: str, display_name: str | None, password: str | None, mute_mic: bool, mute_cam: bool, timeout_join: int) -> None:
    # Нормальный веб-клиент Zoom: https://zoom.us/wc/join/{MEETING_ID}
    # Если дали обычную https://zoom.us/j/{id}?pwd=... — редиректнёт на wc
    driver.get(url)
    time.sleep(2)

    # "Join from Your Browser"
    wait_and_click(driver, [
        (By.XPATH, "//a[contains(., 'Join from your browser')]"),
        (By.XPATH, "//a[contains(., 'Join from Your Browser')]"),
        (By.XPATH, "//a[contains(., 'Войти через браузер')]"),
    ], timeout=8)

    # имя
    if display_name:
        try:
            name_input = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input#inputname, input[name='username']"))
            )
            name_input.clear()
            name_input.send_keys(display_name)
        except Exception:
            pass

    # пароль, если есть
    if password:
        try:
            pwd_input = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input#inputpasscode, input[name='password']"))
            )
            pwd_input.clear()
            pwd_input.send_keys(password)
        except Exception:
            pass

    # галочка "Я не робот" может убить автоматизацию, увы.

    # кнопка Join
    clicked = wait_and_click(driver, [
        (By.CSS_SELECTOR, "button.preview-join-button, button.joinWindowBtn"),
        (By.XPATH, "//button[contains(., 'Join') or contains(., 'Войти') or contains(., 'Присоединиться')]")
    ], timeout=timeout_join)
    if not clicked:
        raise RuntimeError("Не нашёл кнопку Join в Zoom Web")

    # анти-эхо: выключить микрофон/видео
    press_shortcuts(driver, "zoom", mute_mic, mute_cam)

def join_teams_web(driver: webdriver.Chrome, url: str, display_name: str | None, mute_mic: bool, mute_cam: bool, timeout_join: int) -> None:
    driver.get(url)

    # частый баннер "Войти в вебе Windows/Mac"
    wait_and_click(driver, [
        (By.XPATH, "//a[contains(., 'Продолжить в браузере') or contains(., 'Continue on this browser')]"),
        (By.XPATH, "//button[contains(., 'Continue on this browser')]"),
    ], timeout=8)

    # имя гостя
    if display_name:
        try:
            name_input = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input#username, input[name='username'], input[type='text']"))
            )
            name_input.clear()
            name_input.send_keys(display_name)
        except Exception:
            pass

    # выключить микрофон/камеру до входа, если кнопки доступны
    if mute_mic:
        wait_and_click(driver, [
            (By.CSS_SELECTOR, "button[aria-label*='microphone'][aria-pressed]"),
            (By.XPATH, "//button[contains(@aria-label,'микроф') or contains(@aria-label,'microphone')]")
        ], timeout=3)
    if mute_cam:
        wait_and_click(driver, [
            (By.CSS_SELECTOR, "button[aria-label*='camera'][aria-pressed]"),
            (By.XPATH, "//button[contains(@aria-label,'камера') or contains(@aria-label,'camera')]")
        ], timeout=3)

    # join
    ok = wait_and_click(driver, [
        (By.XPATH, "//button[contains(., 'Join now') or contains(., 'Присоединиться сейчас')]"),
        (By.CSS_SELECTOR, "button[data-tid='prejoin-join-button']"),
    ], timeout=timeout_join)
    if not ok:
        raise RuntimeError("Не нашёл кнопку Join в Teams Web")

    press_shortcuts(driver, "teams", mute_mic, mute_cam)

# ---------- main ----------

def detect_platform(url: str) -> str:
    u = url.lower()
    if "meet.google.com" in u:
        return "meet"
    if "zoom.us" in u or "zoom.com" in u:
        return "zoom"
    if "teams.microsoft.com" in u or "teams.live.com" in u:
        return "teams"
    # fallback — считаем браузерным
    return "meet"

def main():
    p = argparse.ArgumentParser(description="Auto-join + auto-leave для Zoom/Meet/Teams (Selenium)")
    p.add_argument("url", help="Ссылка приглашения")
    p.add_argument("--platform", choices=["auto","meet","zoom","teams"], default="auto", help="Площадка (auto попытается угадать)")
    p.add_argument("--minutes", type=float, default=None, help="Сколько минут оставаться в звонке")
    p.add_argument("--seconds", type=int, default=None, help="Сколько секунд оставаться")
    p.add_argument("--name", default=None, help="Отображаемое имя для гостевого входа")
    p.add_argument("--password", default=None, help="Пароль встречи (Zoom Web)")
    p.add_argument("--mute-mic", action="store_true", help="Выключить микрофон")
    p.add_argument("--mute-cam", action="store_true", help="Выключить камеру")
    p.add_argument("--headless", action="store_true", help="Запуск без окна (может ломать доступ к камере/микрофону)")
    p.add_argument("--browser-path", default=None, help="Путь к Chrome/Edge, если нужно указать явно")
    p.add_argument("--timeout-join", type=int, default=60, help="Секунд ждать кнопку Join")

    args = p.parse_args()
    if args.minutes is None and args.seconds is None:
        print("Укажи --minutes или --seconds", file=sys.stderr)
        sys.exit(2)
    duration = (int(args.minutes * 60) if args.minutes else 0) + (args.seconds or 0)
    if duration <= 0:
        print("Длительность должна быть > 0", file=sys.stderr)
        sys.exit(2)

    platform_name = args.platform if args.platform != "auto" else detect_platform(args.url)

    driver, tmpdir = make_chrome(headless=args.headless, browser_path=args.browser_path, isolated=True)
    try:
        if platform_name == "meet":
            join_google_meet(driver, args.url, args.name, args.mute_mic, args.mute_cam, args.timeout_join)
        elif platform_name == "zoom":
            join_zoom_web(driver, args.url, args.name, args.password, args.mute_mic, args.mute_cam, args.timeout_join)
        elif platform_name == "teams":
            join_teams_web(driver, args.url, args.name, args.mute_mic, args.mute_cam, args.timeout_join)
        else:
            raise RuntimeError(f"Неизвестная платформа: {platform_name}")

        # сидим на созвоне
        time.sleep(duration)

    except Exception as e:
        print(f"Ошибка: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        cleanup(driver, tmpdir)
    print("Готово. Автоматически вышел из звонка.")

if __name__ == "__main__":
    main()

    # Google Meet, войти гостем, выключить микрофон и камеру, подождать 8 минут


