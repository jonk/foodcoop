import requests
import argparse
from datetime import datetime
from bs4 import BeautifulSoup
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import schedule
import time
import json

# Global flag to avoid sending duplicate alerts.
LAST_ALERT_TRIGGERED = False

SHIFT_MAPPING = {
    "GENERAL_MEETING_WORKSLOT": 159,
    "STOCKING": 5
}

def login(session, user, pw):

    # First we gotta find the CSRF token + cookie
    login_url = "https://members.foodcoop.com/services/login/"
    session.get(login_url)
    csrf_token = session.cookies.get("csrftoken")  # Some sites store it in cookies
    login_data = {
        "username": user,
        "password": pw,
        "submit": "Log In",
        "csrfmiddlewaretoken": csrf_token
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
        "Referer": "https://members.foodcoop.com/services/login/",
        "X-CSRFToken": csrf_token
    }

    # Get the session loaded
    session.post(login_url, data=login_data, headers=headers)
    return (login_data, headers)

def send_email(subject, body):
    """
    Sends an email with the specified subject and body.
    Update the email settings below with your credentials.
    """
    # Email configuration – update these with your own details.
    sender_email = "jonk1993@gmail.com"
    receiver_email = "jonk1993@gmail.com"  # Could be the same as sender
    password = ""           # For Gmail, consider using an App Password

    # Set up the MIME message.
    msg = MIMEMultipart()
    msg["From"] = sender_email
    msg["To"] = receiver_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))
    
    try:
        # Connect to the Gmail SMTP server (update if you're using a different provider)
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()  # Secure the connection
        server.login(sender_email, password)
        server.sendmail(sender_email, receiver_email, msg.as_string())
        server.quit()
        print("Email sent successfully.")
    except Exception as e:
        print(f"Failed to send email: {e}")

def found_shifts(shifts):
    return any(day["shifts"] for day in shifts)

def check_shifts(session, login_data, headers, shift_to_check):
    global LAST_ALERT_TRIGGERED
    mapped_shift = SHIFT_MAPPING.get(shift_to_check, SHIFT_MAPPING["GENERAL_MEETING_WORKSLOT"])
    
    # URL of the page to monitor
    today = datetime.now().strftime('%Y-%m-%d')
    base_url = "https://members.foodcoop.com"
    shifts_path = "/services/shifts/"
    shifts_by_day = []

    # check 2 weeks out 
    for i in range(2):
        modifiers = f"{i}/{mapped_shift}/0/"
        url = f"{base_url}{shifts_path}{modifiers}{today}"
        print(url)

        response = session.get(url, data=login_data, headers=headers)

        html_content = response.text
        soup = BeautifulSoup(html_content, 'html.parser')
    
        # Find the main grid container
        grid_container = soup.find("div", class_="grid-container")

        # Find all day columns within the grid container
        columns = grid_container.find_all("div", class_="col") if grid_container else []

        # Loop through each day's shifts
        for col in columns:
            # Extract date
            date_element = col.find("p").find("b")
            date_text = date_element.get_text(strip=True) if date_element else ""

            # Check for "No shifts"
            no_shifts = col.find("p", align="center")
            if no_shifts and "-- No shifts --" in no_shifts.get_text():
                shifts_by_day.append({
                    "day": date_text.split()[0],  # Extract day (e.g., "Sun")
                    "date": date_text.split()[1],  # Extract date (e.g., "3/16/2025")
                    "shifts": []  # No shifts available
                })
                continue  # Skip further processing for this column

            # Extract shift details
            shifts = []
            for shift in col.find_all("a", class_="shift"):
                time_element = shift.find("b")  # Extract the bolded time
                time_text = time_element.get_text(strip=True) if time_element else ""

                # Extract remaining text (excluding time)
                shift_description = shift.get_text(strip=True).replace(time_text, "").strip()

                # Get the link
                href = shift.get("href", "").strip()

                # Store in dictionary format
                shifts.append({
                    "time": time_text,
                    "description": shift_description,
                    "href": f"{base_url}{href}"
                })

            # Store day's shifts
            shifts_by_day.append({
                "day": date_text.split()[0],  # Extract day (e.g., "Mon")
                "date": date_text.split()[1],  # Extract date (e.g., "3/17/2025")
                "shifts": shifts
            })

    if found_shifts(shifts_by_day):
        if not LAST_ALERT_TRIGGERED:
            subject = f"Alert: Found {shift_to_check} shift!"
            body = (json.dumps(shifts_by_day, indent=2))
            send_email(subject, body)
            LAST_ALERT_TRIGGERED = True 
        else:
            print("Alert condition persists, but email already sent.")
    else:
        # Reset the flag if the condition is no longer met.
        print("No shifts found.")
        if LAST_ALERT_TRIGGERED:
            print("Alert condition cleared.")
        LAST_ALERT_TRIGGERED = False


def main():
    parser = argparse.ArgumentParser(description="Check co-op shifts")
    parser.add_argument("username", help="Coop username")
    parser.add_argument("pw", help="Coop password")
    parser.add_argument("--shift", help="which shift to check for")
    args = parser.parse_args()

    session = requests.Session()
    data, headers = login(session, args.username, args.pw)

    # Schedule the check_appointments function to run every minute.
    schedule.every(1).minute.do(lambda: check_shifts(session, data, headers, args.shift))
    
    print("Starting appointment monitor. Press Ctrl+C to stop.")
    while True:
        schedule.run_pending()
        time.sleep(1)

if __name__ == "__main__":
    main()