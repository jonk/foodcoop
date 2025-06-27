def check_appointments():
    global last_alert_triggered

    # URL of the page to monitor
    today = datetime.now().strftime('%Y-%m-%d')
    base_url = "https://ort.foodcoop.com/calendar/0/0/0/"
    url = f"{base_url}{today}"

    cookies = {
        'sessionid': '3z02tkfw0s6wli2gzf607yjrnxy8ysi7'
    }
    
    # The target string to look for
    target_string = "-- No appointments --"
    
    try:
        # Fetch the webpage
        response = requests.get(url, cookies=cookies)
        response.raise_for_status()  # Raise an error for bad status codes
    except requests.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return

    html_content = response.text
    soup = BeautifulSoup(html_content, 'html.parser')
    visible_text = soup.get_text()
    count = visible_text.count(target_string)

    print(f"[{datetime.now()}] Found {count} occurrences of '{target_string}'.")

    if count < 7:
        if not last_alert_triggered:
            subject = f"Alert: Appointment Change on {today}"
            body = (f"The string '{target_string}' occurs only {count} times on the page:\n"
                    f"{url}\n\n"
                    f"Time: {datetime.now()}")
            send_email(subject, body)
            last_alert_triggered = True 
        else:
            print("Alert condition persists, but email already sent.")
    else:
        # Reset the flag if the condition is no longer met.
        if last_alert_triggered:
            print("Alert condition cleared.")
        last_alert_triggered = False