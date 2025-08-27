import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
import os
from dotenv import load_dotenv

load_dotenv()

def send_shift_notification_email(to_email, user_name, matches):
    """Send email notification about available shifts"""
    try:
        base_url = os.getenv('COOP_BASE_URL', 'https://members.foodcoop.com')
        # SMTP configuration
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', 587))
        smtp_username = os.getenv('SMTP_USERNAME')
        smtp_password = os.getenv('SMTP_PASSWORD')
        from_email = os.getenv('FROM_EMAIL', smtp_username)

        if not all([smtp_username, smtp_password]):
            print("SMTP credentials not configured")
            return False

        # Create message
        msg = MimeMultipart('alternative')
        msg['Subject'] = f'Food Coop Shifts Available - {len(matches)} matches found!'
        msg['From'] = from_email
        msg['To'] = to_email

        # Create HTML content
        html_content = f"""
        <html>
        <body>
            <h2>Hi {user_name}!</h2>
            <p>Great news! We found {len(matches)} shift(s) that match your preferences:</p>
            
            {''.join([
                f'''
                <div style="border: 1px solid #ccc; margin: 10px 0; padding: 15px; border-radius: 5px;">
                    <h3>{match["day"]} {match["date"]}</h3>
                    <p><strong>Time:</strong> {match["shift"]["time"]}</p>
                    <p><strong>Description:</strong> {match["shift"]["description"]}</p>
                    <p><strong>Sign up:</strong> <a href="{match["shift"]["href"]}">Click here to sign up</a></p>
                    <p><em>Matched preference: {match["matched_preference"]["shift_type"]} on {", ".join(match["matched_preference"]["days"])}</em></p>
                </div>
                ''' for match in matches
            ])}
            
            <p>Don't wait too long - these shifts fill up quickly!</p>
            <p>Best,<br>Food Coop Shift Notification System</p>
        </body>
        </html>
        """

        # Create plain text version
        text_content = f"""
Hi {user_name}!

Great news! We found {len(matches)} shift(s) that match your preferences:

{''.join([
    f'''
{match["day"]} {match["date"]}
Time: {match["shift"]["time"]}
Description: {match["shift"]["description"]}  
Sign up: {match["shift"]["href"]}
Matched preference: {match["matched_preference"]["shift_type"]} on {", ".join(match["matched_preference"]["days"])}

''' for match in matches
])}

Don't wait too long - these shifts fill up quickly!

Best,
Food Coop Shift Notification System
        """

        # Attach parts
        text_part = MimeText(text_content, 'plain')
        html_part = MimeText(html_content, 'html')
        msg.attach(text_part)
        msg.attach(html_part)

        # Send email
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(msg)

        print(f"Email sent successfully to {to_email}")
        return True

    except Exception as e:
        print(f"Error sending email to {to_email}: {e}")
        return False