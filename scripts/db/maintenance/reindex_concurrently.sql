\set ON_ERROR_STOP on

reindex (concurrently) index public.automation_jobs_job_status_run_after_idx;
reindex (concurrently) index public.media_processing_jobs_job_status_run_after_idx;
reindex (concurrently) index public.ai_inference_jobs_job_status_run_after_idx;
reindex (concurrently) index public.webhook_deliveries_delivery_status_idx;

