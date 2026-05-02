import os
import smtplib
from email.mime.text import MIMEText

import requests


def get_subscriber_emails() -> str:
    """Read subscriber emails from Google Apps Script endpoint."""
    subscriber_url = os.environ.get("SUBSCRIBE_URL", "").strip()
    fallback_email = os.environ.get("MAIL_TO", "").strip()

    if not subscriber_url:
        return fallback_email

    try:
        print("📥 Fetching subscriber emails...")
        response = requests.get(subscriber_url, timeout=10)
        response.raise_for_status()

        email_list = response.text.strip()
        if not email_list:
            print("⚠️ No subscribers found, using MAIL_TO")
            return fallback_email

        subscriber_count = len([e for e in email_list.split(",") if e.strip()])
        print(f"✅ Found {subscriber_count} active subscribers")
        return email_list
    except Exception as e:
        print(f"❌ Error fetching subscribers: {e}")
        print("⚠️ Falling back to MAIL_TO")
        return fallback_email


def send_email(subject: str, html: str) -> None:
    """Send an HTML email to active subscribers."""
    smtp_host = os.environ.get("SMTP_HOST", "").strip()
    # Secret may exist but be empty — getenv default only applies when key is missing.
    smtp_port = int((os.environ.get("SMTP_PORT") or "").strip() or "587")
    smtp_user = os.environ.get("SMTP_USER", "").strip()
    smtp_pass = os.environ.get("SMTP_PASS", "").strip()
    mail_from = os.environ.get("MAIL_FROM", "").strip()
    mail_to = os.environ.get("MAIL_TO", "").strip()

    if not (smtp_host and smtp_user and smtp_pass and mail_from):
        return

    recipient_list = get_subscriber_emails()
    recipients = [x.strip() for x in recipient_list.split(",") if x.strip()]

    if not recipients:
        print("⚠️ No recipients found, skipping email")
        return

    msg = MIMEText(html, "html", "utf-8")
    msg["Subject"] = subject
    msg["From"] = mail_from
    msg["To"] = mail_to or mail_from

    with smtplib.SMTP(smtp_host, smtp_port) as s:
        s.starttls()
        s.login(smtp_user, smtp_pass)
        s.sendmail(mail_from, recipients, msg.as_string())

    print(f"✅ Sent to {len(recipients)} subscribers")
