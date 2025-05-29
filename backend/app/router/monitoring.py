# router/monitoring.py

import os
import time
import logging
from google.cloud import monitoring_v3

logger = logging.getLogger(__name__)

class CloudMonitoringService:
    def __init__(self):
        """Initialize Google Cloud Monitoring client"""
        try:
            self.monitoring_client = monitoring_v3.MetricServiceClient()
            self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT")
            self.project_name = f"projects/{self.project_id}"
            self.service_name = os.getenv("K_SERVICE", "fastapi-tutor-app")
            self.revision_name = os.getenv("K_REVISION", "unknown")
            self.region = os.getenv("GOOGLE_CLOUD_REGION", "asia-south1")
            logger.info(f"Cloud Monitoring initialized for project: {self.project_id}")
        except Exception as e:
            logger.warning(f"Could not initialize Google Cloud Monitoring: {e}")
            self.monitoring_client = None
            self.project_name = None

    def record_custom_metric(self, metric_name: str, value: float, labels: dict = None):
        """Record custom metric to Google Cloud Monitoring"""
        if not self.monitoring_client or not self.project_name:
            return
        
        try:
            series = monitoring_v3.TimeSeries()
            series.resource.type = "cloud_run_revision"
            series.resource.labels["service_name"] = self.service_name
            series.resource.labels["revision_name"] = self.revision_name
            series.resource.labels["location"] = self.region
            
            series.metric.type = f"custom.googleapis.com/tutor_app/{metric_name}"
            
            # Add custom labels if provided
            if labels:
                for key, value in labels.items():
                    series.metric.labels[key] = str(value)
            
            now = time.time()
            seconds = int(now)
            nanos = int((now - seconds) * 10**9)
            
            interval = monitoring_v3.TimeInterval(
                {"end_time": {"seconds": seconds, "nanos": nanos}}
            )
            
            point = monitoring_v3.Point({
                "interval": interval,
                "value": {"double_value": value}
            })
            
            series.points = [point]
            self.monitoring_client.create_time_series(name=self.project_name, time_series=[series])
        except Exception as e:
            logger.error(f"Failed to record custom metric {metric_name}: {e}")

    def monitor_request(self, method: str, endpoint: str, status_code: int, duration: float):
        """Monitor HTTP requests - this is the main function for middleware"""
        # Request count
        self.record_custom_metric(
            "http_request_count", 
            1, 
            {
                "method": method,
                "endpoint": endpoint,
                "status_code": str(status_code),
                "status_class": f"{status_code // 100}xx"
            }
        )
        
        # Request latency
        self.record_custom_metric(
            "http_request_duration", 
            duration,
            {
                "method": method,
                "endpoint": endpoint
            }
        )
        
        # Error tracking
        if status_code >= 400:
            self.record_custom_metric(
                "http_error_count", 
                1,
                {
                    "method": method,
                    "endpoint": endpoint,
                    "status_code": str(status_code)
                }
            )

# Create global instance
monitoring_service = CloudMonitoringService()

# Simple function to use in middleware
def monitor_request(method: str, endpoint: str, status_code: int, duration: float):
    """Monitor HTTP request - use this in your middleware"""
    monitoring_service.monitor_request(method, endpoint, status_code, duration)