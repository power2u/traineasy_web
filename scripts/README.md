# Notification Service

This is a standalone Python script designed to run on a VPS to handle user notifications for the TrainEasy Web application.

## 1. Local Testing (Windows)

Since you have Python installed, you can test this script locally before deploying.

### Prerequisites
- Python 3.8+ (You have 3.14.2)
- PostgreSQL database URL (Connection string)
- Firebase Service Account JSON file

### Setup

1.  Open your terminal in this directory:
    ```powershell
    cd w:\PROJECTS\yogesh\traineasy_web\scripts
    ```

2.  Create a virtual environment (Recommended):
    ```powershell
    python -m venv venv
    .\venv\Scripts\activate
    ```

3.  Install dependencies:
    ```powershell
    pip install -r requirements.txt
    ```

4.  Create a `.env` file in the `scripts` folder with your credentials:
    ```ini
    DATABASE_URL="postgresql://user:password@localhost:5432/your_db_name"
    
    FIREBASE_SERVICE_ACCOUNT_JSON='{"type": "service_account", ...}'
    ```

### Running the Test

Run the script manually. It will check for notifications, print logs to the console, and wait.
```powershell
python notification_service.py
```

> **Tip**: To stop the script, press `Ctrl+C`.

---

## 2. Linux VPS Deployment (Ubuntu/Debian)

These steps assume you have SSH access to your VPS.

### Step A: Prepare the Environment

1.  **Update and install Python**:
    ```bash
    sudo apt update
    sudo apt install python3 python3-pip python3-venv git -y
    ```

2.  **Create a directory for the script**:
    ```bash
    mkdir -p /opt/traineasy-notifications
    cd /opt/traineasy-notifications
    ```

3.  **Upload the files**:
    You can use SCP, FileZilla, or Git. Assuming you upload `notification_service.py` and `requirements.txt` to this folder.

### Step B: Install Dependencies

1.  **Create a virtual environment**:
    ```bash
    python3 -m venv venv
    ```

2.  **Activate and Install**:
    ```bash
    source venv/bin/activate
    pip install -r requirements.txt
    ```

### Step C: Configure Environment

Create a `.env` file for production usage:
```bash
nano .env
```
Paste your production variables:
```ini
DATABASE_URL="postgresql://postgres:password@localhost:5432/traindb"
FIREBASE_SERVICE_ACCOUNT_PATH="/opt/traineasy-notifications/firebase-creds.json"
```
*(Make sure to upload your `firebase-creds.json` to the server too!)*

### Step D: Setup Systemd Service (Auto-Start)

1.  **Create the service file**:
    ```bash
    sudo nano /etc/systemd/system/traineasy-notif.service
    ```

2.  **Paste the following configuration**:
    *Adjust paths if you installed somewhere else.*

    ```ini
    [Unit]
    Description=TrainEasy Notification Service
    After=network.target

    [Service]
    # user running the script (usually root or your user)
    User=root
    WorkingDirectory=/opt/traineasy-notifications
    
    # Use the python inside the venv
    ExecStart=/opt/traineasy-notifications/venv/bin/python3 /opt/traineasy-notifications/notification_service.py
    
    # Restart automatically if it crashes
    Restart=always
    RestartSec=10
    
    # Load env vars from the .env file
    EnvironmentFile=/opt/traineasy-notifications/.env

    [Install]
    WantedBy=multi-user.target
    ```

3.  **Start the service**:
    ```bash
    sudo systemctl daemon-reload
    sudo systemctl enable traineasy-notif
    sudo systemctl start traineasy-notif
    ```

4.  **Check Status and Logs**:
    ```bash
    sudo systemctl status traineasy-notif
    # View live logs
    journalctl -u traineasy-notif -f
    ```

## Dokploy Users

If you are using Dokploy:
-   **Database Access**: Ensure your VPS host can access the database. If the DB is in a Dokploy container, map the port (e.g., 5432:5432) in your `docker-compose.yml` or Dokploy settings so `localhost:5432` works from the host script.
-   **Alternative**: You could wrap this script in a Dockerfile and deploy it as a "Worker" or "Application" inside Dokploy instead of running it as a raw system service.

### Dockerfile (Optional for Dokploy)
If you prefer deploying via Dokploy UI:

```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY notification_service.py .
CMD ["python", "notification_service.py"]
```
