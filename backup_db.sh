#!/bin/bash

# --- CONFIGURATION ---
BACKUP_DIR="/root/backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="eltafawook_db_$TIMESTAMP.sql.gz"
# The name of your database container
CONTAINER_NAME="root-db-1"
# Your DB user
DB_USER="eltafawook_user" 
# Your DB Name
DB_NAME="eltafawook_db"
# Rclone Remote Name (what you named it in Step 2)
RCLONE_REMOTE="gdrive:Backups/Eltafawook"

# 1. Create backup dir if not exists
mkdir -p $BACKUP_DIR

# 2. Dump the database inside the container and compress it on the fly
echo "Creating backup: $FILENAME..."
docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_DIR/$FILENAME"

# 3. Upload to Google Drive
echo "Uploading to Google Drive..."
rclone copy "$BACKUP_DIR/$FILENAME" "$RCLONE_REMOTE"

# 4. Remove local file (to save server space)
rm "$BACKUP_DIR/$FILENAME"

# 5. (Optional) Delete backups on Cloud older than 30 days
rclone delete --min-age 30d "$RCLONE_REMOTE"

echo "Backup Complete!"
