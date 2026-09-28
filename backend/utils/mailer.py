"""
Transactional email sending.

Uses plain SMTP so it works with Gmail, SendGrid, Postmark, SES, or any
other provider's SMTP endpoint — set the SMTP_* values in .env. If they
aren't set, emails are printed to the console instead of failing, so local
development still works end-to-end without a real mail account.
"""

import logging
import smtplib
from email.mime.text import MIMEText

from config import Config

logger = logging.getLogger("facefind.mailer")


def send_email(to, subject, body):
    if not Config.SMTP_HOST:
        logger.info(
            "[DEV MODE — no SMTP configured] Would send email:\n"
            "  To: %s\n  Subject: %s\n  Body:\n%s",
            to, subject, body,
        )
        return

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = Config.SMTP_FROM or Config.SMTP_USER
    msg["To"] = to

    with smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT) as server:
        server.starttls()
        if Config.SMTP_USER:
            server.login(Config.SMTP_USER, Config.SMTP_PASSWORD)
        server.sendmail(msg["From"], [to], msg.as_string())

    logger.info("Sent email to %s: %s", to, subject)


def send_password_reset_email(to, reset_link):
    send_email(
        to=to,
        subject="Reset your FaceFind password",
        body=(
            "We received a request to reset your FaceFind password.\n\n"
            f"Reset it here: {reset_link}\n\n"
            "This link expires in 1 hour. If you didn't request this, you can "
            "safely ignore this email."
        ),
    )
