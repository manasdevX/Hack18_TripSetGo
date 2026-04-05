import logging
from datetime import datetime, timedelta, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.models.trip import Trip
from app.models.notification import Notification

logger = logging.getLogger(__name__)

# Note: In a real distributed deployment you'd use a Background Task Queue like Celery.
# For local dev and this feature demonstration, APScheduler runs within the process.
scheduler = AsyncIOScheduler()

async def check_upcoming_trips():
    """Runs periodically to check if trips are starting soon."""
    logger.info("Running scheduled trip reminder check...")
    db: Session = SessionLocal()
    try:
        # We want trips starting between Tomorrow and Day after tomorrow
        now = datetime.now(timezone.utc).date()
        target_date = now + timedelta(days=1)
        
        # Grab trips starting tomorrow
        upcoming_trips = db.query(Trip).filter(
            Trip.start_date == target_date
        ).all()

        from app.main import sio  # Import here to avoid circular dependencies

        for trip in upcoming_trips:
            # Check if we already notified for this trip
            existing_notif = db.query(Notification).filter(
                Notification.user_id == trip.user_id,
                Notification.reference_id == str(trip.id),
                Notification.type == "trip_reminder"
            ).first()

            if not existing_notif:
                # Create notification
                notif = Notification(
                    user_id=trip.user_id,
                    title="Upcoming Trip Reminder!",
                    message=f"Your trip to {trip.destination} is starting tomorrow!",
                    type="trip_reminder",
                    reference_id=str(trip.id)
                )
                db.add(notif)
                db.commit()
                db.refresh(notif)

                # Send email logic (will just inject dummy print if external service unavailable)
                # In production you'd integrate the actual email service.
                from app.services.email_service import send_email_async
                from app.models.user import User
                user = db.query(User).filter(User.id == trip.user_id).first()
                if user:
                    # In real logic you'd await an async email send method
                    # send_email_async(user.email, "Upcoming Trip!", notif.message)
                    logger.info(f"Sending Email to {user.email}: {notif.message}")

                # Emit over socket.io
                notification_payload = {
                    "id": str(notif.id),
                    "title": notif.title,
                    "message": notif.message,
                    "type": notif.type,
                    "created_at": notif.created_at.isoformat()
                }
                
                await sio.emit(
                    "new_notification", 
                    notification_payload,
                    room=str(trip.user_id)
                )

    except Exception as e:
        logger.error(f"Error checking upcoming trips: {e}")
    finally:
        db.close()

def start_scheduler():
    scheduler.add_job(check_upcoming_trips, 'interval', minutes=10) # Checks every 10 min
    scheduler.start()
    logger.info("Notification scheduler started.")
