import os
import time
import json
import logging
import datetime
import pytz
import psycopg2
import gc
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, messaging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("notification_service.log")
    ]
)
logger = logging.getLogger("NotificationService")

# Load environment variables
load_dotenv()

# Database configuration
DB_URL = os.getenv("DATABASE_URL")

# Firebase configuration function
def initialize_firebase():
    try:
        if len(firebase_admin._apps) > 0:
            return firebase_admin.get_app()
        
        service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
        service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        
        cred = None
        if service_account_path and os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
        elif service_account_json:
            # Handle potential escaped newlines in private key
            cert_dict = json.loads(service_account_json)
            if 'private_key' in cert_dict:
                cert_dict['private_key'] = cert_dict['private_key'].replace('\\n', '\n')
            cred = credentials.Certificate(cert_dict)
        else:
             # Try falling back to individual env vars
            project_id = os.getenv("FIREBASE_PROJECT_ID")
            client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
            private_key = os.getenv("FIREBASE_PRIVATE_KEY")
            
            if project_id and client_email and private_key:
                cred = credentials.Certificate({
                    "projectId": project_id,
                    "clientEmail": client_email,
                    "privateKey": private_key.replace('\\n', '\n')
                })

        if not cred:
            raise ValueError("Firebase credentials not found")
            
        return firebase_admin.initialize_app(cred)
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}")
        raise

# Database connection context manager
class DatabaseConnection:
    def __init__(self, db_url):
        self.db_url = db_url
        self.conn = None
        
    def __enter__(self):
        try:
            self.conn = psycopg2.connect(self.db_url, cursor_factory=RealDictCursor)
            return self.conn
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.conn:
            self.conn.close()

# Timezone helpers
def get_current_time_in_timezone(timezone_str):
    """
    Returns current time details for a given timezone string (IANA or offset like +05:30)
    """
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    
    # Handle offset format like "+05:30" or "-04:00"
    if timezone_str and (timezone_str.startswith('+') or timezone_str.startswith('-')) and ':' in timezone_str:
        try:
            sign = 1 if timezone_str.startswith('+') else -1
            parts = timezone_str[1:].split(':')
            hours = int(parts[0])
            minutes = int(parts[1])
            offset = datetime.timedelta(hours=hours, minutes=minutes)
            if sign == -1:
                offset = -offset
                
            local_time = now_utc + offset
            # Create a fixed timezone for this offset
            tz = datetime.timezone(offset)
            return local_time.replace(tzinfo=tz)
        except Exception as e:
            logger.warning(f"Error parsing offset timezone {timezone_str}: {e}")
            # Fallback to UTC
            return now_utc

    # Handle IANA timezone
    try:
        tz = pytz.timezone(timezone_str or 'UTC')
        return now_utc.astimezone(tz)
    except Exception as e:
        logger.warning(f"Invalid timezone {timezone_str}, defaulting to UTC: {e}")
        return now_utc

def is_time_match(user_time, target_time_str):
    """
    Checks if user_time matches target_time_str within a 30 minute window.
    target_time_str is "HH:MM".
    """
    if not target_time_str:
        return False
        
    try:
        target_h, target_m = map(int, target_time_str.split(':'))
        
        user_total_min = user_time.hour * 60 + user_time.minute
        target_total_min = target_h * 60 + target_m
        
        diff = abs(user_total_min - target_total_min)
        return diff <= 30
    except ValueError:
        return False

# Notification logic
def check_and_send_notifications():
    logger.info("Starting notification check...")
    
    try:
        with DatabaseConnection(DB_URL) as conn:
            with conn.cursor() as cur:
                # Get users with notifications enabled
                cur.execute("""
                    SELECT 
                        id, 
                        full_name, 
                        email,
                        notifications_enabled,
                        meal_reminders_enabled,
                        water_reminders_enabled,
                        weight_reminders_enabled,
                        breakfast_time,
                        snack1_time,
                        lunch_time,
                        snack2_time,
                        dinner_time,
                        timezone,
                        last_active_at
                    FROM user_preferences
                    WHERE notifications_enabled = true
                """)
                # Fetch all users. For very large datasets, consider server-side cursors or pagination.
                users = cur.fetchall()
                logger.info(f"Found {len(users)} users with notifications enabled.")
                
                # Pre-fetch notification templates
                templates = {}
                cur.execute("SELECT notification_type, title, message FROM notification_messages WHERE is_active = true")
                for t in cur.fetchall():
                    templates[t['notification_type']] = t

                for user in users:
                    try:
                        process_user(conn, cur, user, templates)
                    except Exception as e:
                        logger.error(f"Error processing user {user['id']}: {e}")
            
            conn.commit()
            
            # Explicit memory cleanup
            del users
            del templates
            gc.collect()
            
    except Exception as e:
        logger.error(f"Critical error in check_and_send_notifications: {e}")

def process_user(conn, cur, user, templates):
    user_id = user['id']
    timezone = user['timezone'] or 'Asia/Kolkata'
    current_time = get_current_time_in_timezone(timezone)
    time_str = current_time.strftime("%H:%M")
    
    # Use UTC date for DB records to match 'route.ts' and 'meals.ts' behavior
    # This ensures that "Today" in the database is consistent regardless of user timezone
    today_utc = datetime.datetime.now(datetime.timezone.utc)
    today_str = today_utc.strftime("%Y-%m-%d")
    
    # Check login status (active within last 24h)
    logged_in = False
    if user['last_active_at']:
        last_active = user['last_active_at']
        # Ensure last_active is offset-aware or localized
        if last_active.tzinfo is None:
             last_active = pytz.utc.localize(last_active)
        
        if (today_utc - last_active).total_seconds() < 86400: # 24 hours
             logged_in = True

    # --- Meal Reminders ---
    if user['meal_reminders_enabled']:
        process_meal_reminders(conn, cur, user, current_time, today_str, logged_in, templates)

    # --- Water Reminder (12:00) ---
    if user['water_reminders_enabled'] and is_time_match(current_time, '12:00'):
         process_water_reminder(conn, cur, user, current_time, today_str, logged_in, templates)

    # --- Good Morning (07:00) ---
    if is_time_match(current_time, '07:00') and not logged_in:
        process_generic_notification(conn, cur, user, 'good_morning', current_time, today_str, templates)

    # --- Good Night (21:00) ---
    if is_time_match(current_time, '21:00') and not logged_in:
        process_generic_notification(conn, cur, user, 'good_night', current_time, today_str, templates)

    # --- Weekly Measurement (Saturday 19:00) ---
    if user['weight_reminders_enabled']:
        # 5 = Saturday in python weekday() (0=Monday)
        if current_time.weekday() == 5 and is_time_match(current_time, '19:00') and not logged_in:
             process_generic_notification(conn, cur, user, 'weekly_measurement_reminder', current_time, today_str, templates)

def process_meal_reminders(conn, cur, user, current_time, today_str, logged_in, templates):
    meal_reminders = [
        {'type': 'breakfast', 'time': user['breakfast_time'], 'field': 'breakfast'},
        {'type': 'snack1', 'time': user['snack1_time'], 'field': 'snack1'},
        {'type': 'lunch', 'time': user['lunch_time'], 'field': 'lunch'},
        {'type': 'snack2', 'time': user['snack2_time'], 'field': 'snack2'},
        {'type': 'dinner', 'time': user['dinner_time'], 'field': 'dinner'},
    ]
    
    # Get or create meal record
    cur.execute("SELECT * FROM meals WHERE user_id = %s AND date = %s", (user['id'], today_str))
    meal = cur.fetchone()
    
    if not meal:
        cur.execute(
            "INSERT INTO meals (user_id, date) VALUES (%s, %s) RETURNING *",
            (user['id'], today_str)
        )
        meal = cur.fetchone()
        # Don't commit here, we commit at the end of the batch or let the main loop do it. 
        # Actually safer to let main loop commit, but we need the ID. fetchone returns it.

    now_utc = datetime.datetime.now(datetime.timezone.utc)

    for reminder in meal_reminders:
        if not reminder['time']:
            continue
            
        if not is_time_match(current_time, reminder['time']):
            continue

        field_completed = f"{reminder['field']}_completed" # meal table column name (snake_case in DB?)
        # DB schema says map("breakfast_completed") so it is snake_case in DB
        field_notif_sent = f"{reminder['field']}_notification_sent_at"
        
        # Check column names carefully. Prisma schema map says:
        # breakfastCompleted -> breakfast_completed
        # breakfastNotificationSentAt -> breakfast_notification_sent_at
        
        is_completed = meal.get(field_completed, False)
        sent_at = meal.get(field_notif_sent)
        
        recently_sent = False
        if sent_at:
             # Ensure sent_at is aware
            if sent_at.tzinfo is None:
                sent_at = pytz.utc.localize(sent_at)
            if (now_utc - sent_at).total_seconds() < 3600:
                recently_sent = True
        
        if ((not is_completed or not logged_in) and not sent_at and not recently_sent):
            notif_type = f"meal_reminder_{reminder['type']}"
            if send_notification(conn, cur, user, notif_type, templates):
                # Update meal record
                cur.execute(
                    f"UPDATE meals SET {field_notif_sent} = %s WHERE id = %s",
                    (now_utc, meal['id'])
                )
                logger.info(f"Sent {notif_type} to user {user['full_name']}")

def process_water_reminder(conn, cur, user, current_time, today_str, logged_in, templates):
    # Check if sent today
    # notification_logs -> sent_at
    # Logic: sent_at >= today start
    
    # We need a timestamp for start of today in UTC to compare with sent_at (which is Timestamptz)
    # Actually, simpler to just check if sent_at date equals today
    
    # Check existing notification
    cur.execute("""
        SELECT id FROM notification_logs 
        WHERE user_id = %s 
        AND notification_type = 'water_reminder' 
        AND sent_at::date = %s
    """, (user['id'], today_str))
    
    if cur.fetchone():
        return # Already sent
        
    # Check if water logged today
    # water_intake -> created_at
    cur.execute("""
        SELECT id FROM water_intake 
        WHERE user_id = %s 
        AND created_at::date = %s
    """, (user['id'], today_str))
    
    if cur.fetchone():
        return # User logged water
        
    if not logged_in:
        if send_notification(conn, cur, user, 'water_reminder', templates):
            logger.info(f"Sent water_reminder to user {user['full_name']}")

def process_generic_notification(conn, cur, user, notif_type, current_time, today_str, templates):
    # Check if sent today
    cur.execute("""
        SELECT id FROM notification_logs 
        WHERE user_id = %s 
        AND notification_type = %s 
        AND sent_at::date = %s
    """, (user['id'], notif_type, today_str))
    
    if cur.fetchone():
        return

    if send_notification(conn, cur, user, notif_type, templates):
        logger.info(f"Sent {notif_type} to user {user['full_name']}")

def send_notification(conn, cur, user, notif_type, templates):
    """
    Sends notification via Firebase and logs it.
    """
    user_id = user['id']
    
    # Get FCM tokens
    cur.execute("SELECT token FROM fcm_tokens WHERE user_id = %s", (user_id,))
    tokens = [r['token'] for r in cur.fetchall()]
    
    if not tokens:
        return False
        
    # Prepare Content
    template = templates.get(notif_type)
    title = "Train Easy"
    body = "Time for your notification!"
    
    if template:
        title = template['title']
        body = template['message']
        
        # Personalize
        display_name = user['full_name'].split(' ')[0] if user['full_name'] else 'there'
        title = title.replace('{name}', display_name)
        body = body.replace('{name}', display_name)
        
    # Determine URL
    url_path = '/dashboard'
    if 'meal' in notif_type: url_path = '/meals'
    elif 'water' in notif_type: url_path = '/water'
    elif 'weight' in notif_type or 'measurement' in notif_type: url_path = '/weight'
    
    # Send via Firebase
    unique_tokens = list(set(tokens))
    message = messaging.MulticastMessage(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data={
            'type': notif_type,
            'date': datetime.datetime.now().strftime("%Y-%m-%d"),
            'url': url_path
        },
        tokens=unique_tokens,
        android=messaging.AndroidConfig(priority='high', ttl=7200000), # 2 hours
        webpush=messaging.WebpushConfig(headers={'TTL': '7200'})
    )
    
    try:
        response = messaging.send_multicast(message)
        
        # Log success
        if response.success_count > 0:
            cur.execute("""
                INSERT INTO notification_logs 
                (user_id, notification_type, title, body, sent_at, status, metadata)
                VALUES (%s, %s, %s, %s, NOW(), 'sent', %s)
            """, (
                user_id, 
                notif_type, 
                title, 
                body, 
                json.dumps({
                    'success_count': response.success_count, 
                    'failure_count': response.failure_count,
                    'url_path': url_path
                })
            ))
            
        # Cleanup invalid tokens
        if response.failure_count > 0:
            invalid_tokens = []
            for idx, resp in enumerate(response.responses):
                if not resp.success:
                    err_code = resp.exception.code
                    if err_code in ['messaging/registration-token-not-registered', 
                                    'messaging/invalid-registration-token', 
                                    'messaging/invalid-argument']:
                        invalid_tokens.append(unique_tokens[idx])
            
            if invalid_tokens:
                cur.execute("DELETE FROM fcm_tokens WHERE token = ANY(%s) AND user_id = %s", (invalid_tokens, user_id))
                logger.info(f"Cleaned up {len(invalid_tokens)} invalid tokens for user {user['full_name']}")

        return response.success_count > 0

    except Exception as e:
        logger.error(f"Firebase send error for {user['full_name']}: {e}")
        return False

def send_startup_test_notification():
    logger.info("Attempting to send startup test notification...")
    try:
        with DatabaseConnection(DB_URL) as conn:
            with conn.cursor() as cur:
                # Try to find an admin user first, then any user with a token
                # We prioritize admin to avoid spamming real users if this is prod data
                cur.execute("""
                    SELECT up.id, up.full_name, ft.token 
                    FROM user_preferences up 
                    JOIN fcm_tokens ft ON up.id = ft.user_id 
                    WHERE up.role = 'admin' 
                    ORDER BY ft.updated_at DESC LIMIT 1
                """)
                user = cur.fetchone()
                
                if not user:
                    # Fallback to any user if no admin (likely dev environment)
                    cur.execute("""
                        SELECT up.id, up.full_name, ft.token 
                        FROM user_preferences up 
                        JOIN fcm_tokens ft ON up.id = ft.user_id 
                        ORDER BY ft.updated_at DESC LIMIT 1
                    """)
                    user = cur.fetchone()
                
                if user:
                    message = messaging.Message(
                        notification=messaging.Notification(
                            title="Service Started",
                            body=f"Notification Service is running. Time: {datetime.datetime.now().strftime('%H:%M:%S')}",
                        ),
                        token=user['token']
                    )
                    messaging.send(message)
                    logger.info(f"Startup test notification sent to {user['full_name']}")
                else:
                    logger.warning("No FCM tokens found to send test notification.")
    except Exception as e:
        logger.error(f"Failed to send startup notification: {e}")

if __name__ == "__main__":
    logger.info("Initializing Notification Service...")
    try:
        initialize_firebase()
        logger.info("Firebase Initialized.")
        
        # Send test notification on startup
        send_startup_test_notification()
        
        while True:
            start_time = time.time()
            check_and_send_notifications()
            elapsed = time.time() - start_time
            
            # Sleep for remainder of minute
            sleep_time = max(0, 60 - elapsed)
            logger.info(f"Cycle complete in {elapsed:.2f}s. Sleeping for {sleep_time:.2f}s...")
            time.sleep(sleep_time)
            
    except KeyboardInterrupt:
        logger.info("Service shutting down...")
    except Exception as e:
        logger.critical(f"Fatal Service Error: {e}", exc_info=True)
