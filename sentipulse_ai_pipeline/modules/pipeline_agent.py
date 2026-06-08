"""
modules/pipeline_agent.py — Post-pipeline monitoring & email agent

Triggered automatically at the end of pipeline.py after all clients are
processed. Reads {brand_db}_pipeline_logs (structured run summaries) and
{brand_db}_pipeline_events (diagnostic events) for the current run_id,
builds a structured per-client HTML report, and dispatches it via SMTP
with a CSV attachment of the combined log history for each client.
"""

import os
import smtplib
import tempfile
import pandas as pd
from datetime import datetime
from zoneinfo import ZoneInfo
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List

from dotenv import load_dotenv
from pymongo import MongoClient

from sentipulse_ai_pipeline.modules.config import Config

load_dotenv(override=True)

_karachi_tz = ZoneInfo("Asia/Karachi")

# Platforms that are pipeline-internal sentinels, not real per-branch entries
_SENTINEL_PLATFORMS = {"all_platforms", "sentiment"}


def _log(level: str, msg: str):
    ts = datetime.now(_karachi_tz).strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")


# ── Agent ─────────────────────────────────────────────────────────────────────

class PipelineAgent:
    """
    Post-pipeline monitoring agent.

    Reads pipeline logs for a given run_id across all active client databases,
    aggregates stats per client → platform → branch, and sends a structured
    HTML email report.

    Two collections are queried per client:
      - {brand_db}_pipeline_logs   — structured per-branch/platform summaries
      - {brand_db}_pipeline_events — diagnostic events (info/warning/error)
    """

    def __init__(self, mongo_uri: str, run_id: str):
        self.mongo_uri      = mongo_uri
        self.run_id         = run_id
        self.client         = MongoClient(mongo_uri)
        self.smtp_server    = Config.SMTP_SERVER
        self.smtp_port      = Config.SMTP_PORT
        self.email_user     = Config.EMAIL_USER
        self.email_pass     = Config.EMAIL_PASS
        self.email_recipient = Config.EMAIL_RECIPIENT

    def run(self):
        _log("INFO", f"{Config.BOT_NAME} (Pipeline Agent) activating for Run ID: {self.run_id}")
        try:
            summary = self._aggregate_run_stats()

            if not summary["clients"]:
                _log("WARN", "No pipeline logs found for this run. Agent standing down.")
                return

            self._send_email(summary)
            _log("INFO", f"{Config.BOT_NAME} (Pipeline Agent) mission complete.")
        except Exception as exc:
            _log("ERROR", f"Pipeline Agent encountered an unhandled error: {exc}")
        finally:
            self.client.close()

    # ── Aggregation ──────────────────────────────────────────────────────────

    def _aggregate_run_stats(self) -> Dict[str, Any]:
        """
        Reads {brand_db}_pipeline_logs (summaries) and {brand_db}_pipeline_events
        (diagnostic events) for the current run_id across all active clients.

        Returns:
          clients[brand_name] = {
            "db": str,
            "total_inserted": int,
            "total_processed": int,
            "has_failures": bool,
            "platforms": {
              platform_name: {
                "inserted": int,
                "processed": int,
                "branches": [
                  {"branch": str, "inserted": int, "processed": int,
                   "status": str, "headline": str, "duration_seconds": float}
                ]
              }
            },
            "system_logs": [{"timestamp", "level", "platform", "msg"}, ...]
          }
        """
        from sentipulse_ai_pipeline.modules.utils import brandname_to_snake_case

        summary: Dict[str, Any] = {
            "run_id":         self.run_id,
            "run_time":       datetime.now(_karachi_tz),
            "total_clients":  0,
            "total_inserted": 0,
            "total_processed": 0,
            "has_failures":   False,
            "clients":        {},
        }

        try:
            client_docs  = self.client[Config.CENTRAL_DB_NAME][Config.CLIENTS_COLLECTION].find(
                {"isActive": True}
            )
            # Fetch once outside the loop — admin query, no need to repeat per client
            existing_dbs = set(self.client.list_database_names())

            for doc in client_docs:
                brand_name = doc.get("brandName") or doc.get("brandname") or doc.get("name", "Unknown")
                # Use the same function as pipeline.py to guarantee identical DB names
                db_snake  = brandname_to_snake_case(brand_name)
                db_pascal = "".join(brand_name.split())
                brand_db  = db_snake if db_snake in existing_dbs else db_pascal

                db_instance          = self.client[brand_db]
                existing_collections = db_instance.list_collection_names()

                log_col   = f"{brand_db}_pipeline_logs"
                event_col = f"{brand_db}_pipeline_events"

                summary_logs = (
                    list(db_instance[log_col].find({"run_id": self.run_id}))
                    if log_col in existing_collections else []
                )
                event_logs = (
                    list(db_instance[event_col].find({"run_id": self.run_id}))
                    if event_col in existing_collections else []
                )

                if not summary_logs and not event_logs:
                    continue

                summary["total_clients"] += 1
                client_entry: Dict[str, Any] = {
                    "db":              brand_db,
                    "total_inserted":  0,
                    "total_processed": 0,
                    "has_failures":    False,
                    "platforms":       {},
                    "system_logs":     [],
                }

                # ── Process structured summary logs ──────────────────────────
                # Only entries with a real platform name (not sentinel values) count
                # toward inserted/processed totals.
                for entry in summary_logs:
                    platform = entry.get("platform", "Unknown")
                    branch   = entry.get("branch", "")
                    status   = entry.get("status", "unknown")
                    stats    = entry.get("stats", {})
                    inserted  = stats.get("reviews_inserted", 0)
                    processed = stats.get("new_reviews_to_process", 0)
                    duration  = stats.get("duration_seconds", 0.0)
                    headline  = entry.get("headline", "")

                    if status in ("failure", "error"):
                        summary["has_failures"]        = True
                        client_entry["has_failures"]   = True

                    # Count stats only for real per-branch platform entries
                    if platform not in _SENTINEL_PLATFORMS and status in ("success", "partial"):
                        summary["total_inserted"]        += inserted
                        summary["total_processed"]       += processed
                        client_entry["total_inserted"]   += inserted
                        client_entry["total_processed"]  += processed

                        if platform not in client_entry["platforms"]:
                            client_entry["platforms"][platform] = {
                                "inserted":  0,
                                "processed": 0,
                                "branches":  [],
                            }

                        p = client_entry["platforms"][platform]
                        p["inserted"]  += inserted
                        p["processed"] += processed
                        p["branches"].append({
                            "branch":           branch,
                            "inserted":         inserted,
                            "processed":        processed,
                            "status":           status,
                            "headline":         headline,
                            "duration_seconds": duration,
                        })

                # ── Process diagnostic event logs ────────────────────────────
                for entry in event_logs:
                    ts_raw   = entry.get("timestamp", "")
                    # ISO format: "2025-01-15T14:30:45+05:00" → chars [11:19] = "14:30:45"
                    ts_short = ts_raw[11:19] if len(ts_raw) >= 19 else ts_raw
                    client_entry["system_logs"].append({
                        "timestamp": ts_short,
                        "level":     entry.get("log_type", entry.get("status", "info")),
                        "platform":  entry.get("platform", "system"),
                        "msg":       entry.get("message", ""),
                    })

                summary["clients"][brand_name] = client_entry

        except Exception as exc:
            _log("ERROR", f"Error aggregating pipeline stats: {exc}")

        return summary

    # ── HTML builder ─────────────────────────────────────────────────────────

    def _build_email_html(self, summary: Dict[str, Any]) -> str:
        now      = summary["run_time"]
        date_str = now.strftime("%B %d, %Y")
        time_str = now.strftime("%I:%M %p")

        has_failures  = summary["has_failures"]
        any_inserted  = summary["total_inserted"] > 0

        if has_failures:
            status_text  = "FAILED"
            status_color = "#d9534f"
            status_icon  = "&#10060;"
        elif any_inserted:
            status_text  = "SUCCESSFUL"
            status_color = "#28a745"
            status_icon  = "&#9989;"
        else:
            status_text  = "COMPLETED — NO NEW REVIEWS PROCESSED"
            status_color = "#f0ad4e"
            status_icon  = "&#9989;"

        total_clients  = summary["total_clients"]
        total_inserted = summary["total_inserted"]
        total_processed = summary["total_processed"]
        total_skipped  = total_processed - total_inserted

        # ── Client summary rows ──────────────────────────────────────────────
        client_summary_rows = ""
        for c_name, c_data in summary["clients"].items():
            c_skipped  = c_data["total_processed"] - c_data["total_inserted"]
            row_color  = "#fff0f0" if c_data["has_failures"] else "#fff"
            client_summary_rows += f"""
                <tr style="background:{row_color};">
                  <td style="padding:9px 14px;border-bottom:1px solid #eee;font-weight:bold;">{c_name}</td>
                  <td style="padding:9px 14px;border-bottom:1px solid #eee;text-align:center;
                             font-weight:bold;color:{status_color};">{c_data['total_inserted']}</td>
                  <td style="padding:9px 14px;border-bottom:1px solid #eee;text-align:center;">{c_data['total_processed']}</td>
                  <td style="padding:9px 14px;border-bottom:1px solid #eee;text-align:center;color:#888;">{c_skipped}</td>
                  <td style="padding:9px 14px;border-bottom:1px solid #eee;text-align:center;">
                    {'&#10060; FAILED' if c_data['has_failures'] else '&#9989; OK'}
                  </td>
                </tr>"""

        # ── Per-client detailed breakdown ────────────────────────────────────
        client_detail_sections = ""
        for c_name, c_data in summary["clients"].items():
            platform_blocks = ""
            for p_name, p_data in c_data["platforms"].items():
                branch_rows = ""
                for br in p_data["branches"]:
                    br_status   = br.get("status", "")
                    br_inserted = br.get("inserted", 0)
                    br_processed = br.get("processed", 0)
                    br_skipped  = br_processed - br_inserted
                    br_duration = br.get("duration_seconds", 0.0)

                    if br_status == "failure":
                        icon, icon_color, row_bg = "&#10060;", "#d9534f", "#fff8f8"
                    elif br_status == "skipped":
                        icon, icon_color, row_bg = "&#8212;", "#999", "#fafafa"
                    elif br_inserted > 0:
                        icon, icon_color, row_bg = "&#9989;", "#28a745", "#fff"
                    else:
                        icon, icon_color, row_bg = "&#8212;", "#999", "#fafafa"

                    branch_label = br.get("branch") or "<em>—</em>"
                    branch_rows += f"""
                        <tr style="background:{row_bg};">
                          <td style="padding:7px 12px 7px 28px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#444;">{branch_label}</td>
                          <td style="padding:7px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:12px;font-weight:bold;color:{icon_color};">{br_inserted}</td>
                          <td style="padding:7px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:12px;">{br_processed}</td>
                          <td style="padding:7px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:12px;color:#888;">{br_skipped}</td>
                          <td style="padding:7px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:12px;color:#aaa;">{br_duration}s</td>
                          <td style="padding:7px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:13px;color:{icon_color};">{icon}</td>
                        </tr>"""

                p_skipped = p_data["processed"] - p_data["inserted"]
                platform_blocks += f"""
                  <tr style="background:#f3f3f3;">
                    <td style="padding:8px 12px;font-weight:bold;font-size:13px;border-bottom:1px solid #ddd;border-top:2px solid #ccc;">{p_name}</td>
                    <td style="padding:8px 12px;text-align:center;font-weight:bold;color:{status_color};border-bottom:1px solid #ddd;border-top:2px solid #ccc;">{p_data['inserted']}</td>
                    <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #ddd;border-top:2px solid #ccc;">{p_data['processed']}</td>
                    <td style="padding:8px 12px;text-align:center;color:#888;border-bottom:1px solid #ddd;border-top:2px solid #ccc;">{p_skipped}</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #ddd;border-top:2px solid #ccc;" colspan="2"></td>
                  </tr>
                  {branch_rows}"""

            client_detail_sections += f"""
            <div style="margin:24px 0 8px;padding:10px 14px;background:#f7f7f7;
                        border-left:4px solid {status_color};border-radius:0 4px 4px 0;">
              <span style="font-size:15px;font-weight:bold;color:#333;">{c_name}</span>
              <span style="font-size:12px;color:#888;margin-left:10px;">DB: {c_data['db']}</span>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:6px;">
              <thead>
                <tr style="background:#ececec;">
                  <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #ccc;">Platform / Branch</th>
                  <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #ccc;">Inserted</th>
                  <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #ccc;">Processed</th>
                  <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #ccc;">Duplicates</th>
                  <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #ccc;">Duration</th>
                  <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #ccc;">Status</th>
                </tr>
              </thead>
              <tbody>{platform_blocks}</tbody>
            </table>"""

            # ── Diagnostic events section ────────────────────────────────────
            sys_logs = c_data.get("system_logs", [])
            if sys_logs:
                log_rows = ""
                for log in sys_logs[-20:]:
                    level = log["level"]
                    if level == "error":
                        color = "#d9534f"
                    elif level in ("warning", "warn"):
                        color = "#f0ad4e"
                    else:
                        color = "#777"
                    log_rows += f"""
                        <tr>
                          <td style="padding:4px 8px;font-family:monospace;font-size:11px;color:#999;width:70px;">{log['timestamp']}</td>
                          <td style="padding:4px 8px;font-size:11px;color:{color};width:60px;font-weight:bold;">{level.upper()}</td>
                          <td style="padding:4px 8px;font-size:11px;color:#555;">[{log['platform']}] {log['msg']}</td>
                        </tr>"""

                client_detail_sections += f"""
                <div style="margin:10px 0 20px;padding:12px;background:#fdfdfd;border:1px solid #eee;border-radius:4px;">
                  <div style="font-size:12px;font-weight:bold;color:#666;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">
                    Diagnostic Events
                  </div>
                  <table style="width:100%;border-collapse:collapse;">{log_rows}</table>
                  <div style="margin-top:8px;font-size:10px;color:#aaa;font-style:italic;">
                    Showing latest {min(len(sys_logs), 20)} of {len(sys_logs)} events. Full history in the CSV attachment.
                  </div>
                </div>"""

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;color:#333;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 10px;">
  <tr><td>
    <table width="700" cellpadding="0" cellspacing="0" align="center"
           style="background:#fff;border-radius:8px;overflow:hidden;
                  box-shadow:0 2px 8px rgba(0,0,0,.1);max-width:100%;">

      <!-- Header -->
      <tr>
        <td style="background:{status_color};padding:20px 28px;">
          <h2 style="margin:0;color:#fff;font-size:20px;">
            {status_icon} {Config.PRODUCT_NAME} Pipeline Report &mdash; {status_text}
          </h2>
          <p style="margin:6px 0 0;color:rgba(255,255,255,.85);font-size:12px;">
            {date_str} &nbsp;at&nbsp; {time_str}
            &nbsp;&nbsp;|&nbsp;&nbsp;
            Run ID: <code style="font-size:11px;">{summary['run_id']}</code>
          </p>
        </td>
      </tr>

      <!-- Body -->
      <tr><td style="padding:28px 28px 16px;">

        <p style="margin:0 0 16px;">Dear <strong>{Config.EMAIL_SALUTATION}</strong>,</p>

        <p style="margin:0 0 14px;line-height:1.6;">
          The <strong>{Config.PRODUCT_NAME} Sentiment Pipeline</strong> completed on
          <strong>{date_str}</strong> at <strong>{time_str}</strong>.
          Below is your automated run summary from the <strong>{Config.BOT_NAME}</strong>.
        </p>

        <!-- Top-level KPIs -->
        <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
          <tr>
            <td style="width:33%;padding:14px;background:#f9f9f9;border:1px solid #eee;border-radius:6px;text-align:center;">
              <div style="font-size:26px;font-weight:bold;color:{status_color};">{total_inserted}</div>
              <div style="font-size:11px;color:#888;margin-top:4px;">Reviews Inserted</div>
            </td>
            <td style="width:6px;"></td>
            <td style="width:33%;padding:14px;background:#f9f9f9;border:1px solid #eee;border-radius:6px;text-align:center;">
              <div style="font-size:26px;font-weight:bold;color:#555;">{total_processed}</div>
              <div style="font-size:11px;color:#888;margin-top:4px;">Total Processed</div>
            </td>
            <td style="width:6px;"></td>
            <td style="width:33%;padding:14px;background:#f9f9f9;border:1px solid #eee;border-radius:6px;text-align:center;">
              <div style="font-size:26px;font-weight:bold;color:#aaa;">{total_clients}</div>
              <div style="font-size:11px;color:#888;margin-top:4px;">Active Clients</div>
            </td>
          </tr>
        </table>

        <hr style="border:none;border-top:1px solid #eee;margin:0 0 20px;">

        <!-- Client Overview Table -->
        <h3 style="margin:0 0 10px;font-size:15px;color:#444;">Client Overview</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:28px;">
          <thead>
            <tr style="background:#f7f7f7;">
              <th style="padding:9px 14px;text-align:left;border-bottom:2px solid #ddd;">Client</th>
              <th style="padding:9px 14px;text-align:center;border-bottom:2px solid #ddd;">Inserted</th>
              <th style="padding:9px 14px;text-align:center;border-bottom:2px solid #ddd;">Processed</th>
              <th style="padding:9px 14px;text-align:center;border-bottom:2px solid #ddd;">Duplicates</th>
              <th style="padding:9px 14px;text-align:center;border-bottom:2px solid #ddd;">Status</th>
            </tr>
          </thead>
          <tbody>{client_summary_rows}</tbody>
        </table>

        <!-- Per-Client Detail -->
        <h3 style="margin:0 0 6px;font-size:15px;color:#444;">Per-Client Platform &amp; Branch Breakdown</h3>
        {client_detail_sections}

        <hr style="border:none;border-top:1px solid #eee;margin:24px 0 18px;">

        <!-- Dedup Summary -->
        <h3 style="margin:0 0 10px;font-size:15px;color:#444;">Deduplication Summary</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
          <tr style="background:#f7f7f7;">
            <td style="padding:9px 14px;border-bottom:1px solid #eee;font-weight:bold;">Total Reviews Processed (all clients &amp; platforms)</td>
            <td style="padding:9px 14px;border-bottom:1px solid #eee;text-align:center;">{total_processed}</td>
          </tr>
          <tr>
            <td style="padding:9px 14px;border-bottom:1px solid #eee;font-weight:bold;color:#888;">Duplicates Skipped (already in DB)</td>
            <td style="padding:9px 14px;border-bottom:1px solid #eee;text-align:center;color:#888;">{total_skipped}</td>
          </tr>
          <tr style="background:#f0fff4;">
            <td style="padding:9px 14px;font-weight:bold;color:{status_color};">New Reviews Stored After Deduplication</td>
            <td style="padding:9px 14px;text-align:center;font-weight:bold;color:{status_color};">{total_inserted}</td>
          </tr>
        </table>

        <!-- Attachments note -->
        <div style="background:#f9f9f9;border-left:3px solid {status_color};
                    padding:12px 16px;border-radius:0 4px 4px 0;margin-bottom:24px;font-size:12px;color:#555;">
          <strong>Attached files:</strong><br>
          &bull; <em>Client</em>_PIPELINE_LOGS.csv &mdash; Combined summary + event log history
        </div>

        <hr style="border:none;border-top:1px solid #eee;margin:0 0 18px;">

        <p style="margin:0 0 2px;">Best regards,</p>
        <p style="margin:0;font-weight:bold;font-size:15px;">{Config.BOT_NAME}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#aaa;">
          {Config.PRODUCT_NAME} Automated Monitoring &nbsp;&bull;&nbsp; {Config.OPERATOR_WEBSITE}
        </p>

      </td></tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f7f7f7;padding:12px 28px;text-align:center;font-size:11px;color:#aaa;border-top:1px solid #eee;">
          This is an automated email. Please do not reply directly to this message.
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>"""
        return html

    # ── CSV export ───────────────────────────────────────────────────────────

    def _export_to_csv(self, summary: Dict[str, Any]) -> List[Dict[str, str]]:
        """Export combined summary logs + diagnostic events for this run_id per client as CSV."""
        attachments = []
        run_filter  = {"run_id": self.run_id}
        for c_name, c_data in summary["clients"].items():
            db = c_data["db"]
            try:
                summary_docs = list(self.client[db][f"{db}_pipeline_logs"].find(run_filter))
                event_docs   = []
                try:
                    event_docs = list(self.client[db][f"{db}_pipeline_events"].find(run_filter))
                except Exception:
                    pass

                all_docs = summary_docs + event_docs
                if not all_docs:
                    continue

                df = pd.DataFrame(all_docs).drop(columns=["_id"], errors="ignore")
                # Sort chronologically so the CSV is readable top-to-bottom
                if "timestamp" in df.columns:
                    df = df.sort_values("timestamp", ignore_index=True)

                tmp = tempfile.NamedTemporaryFile(suffix=".csv", delete=False)
                df.to_csv(tmp.name, index=False)
                attachments.append({
                    "name": f"{c_name}_PIPELINE_LOGS.csv",
                    "path": tmp.name,
                })
            except Exception as exc:
                _log("ERROR", f"Failed to export logs for {c_name}: {exc}")

        return attachments

    # ── Email dispatch ───────────────────────────────────────────────────────

    def _send_email(self, summary: Dict[str, Any]):
        if not self.email_pass or not self.email_user:
            _log("WARN", "Email credentials missing. Skipping email dispatch.")
            return

        has_failures  = summary["has_failures"]
        any_inserted  = summary["total_inserted"] > 0
        status_symbol = "❌" if has_failures else "✅"
        status_text   = (
            "Failed"          if has_failures
            else ("Successful" if any_inserted else "No New Reviews")
        )
        human_time = summary["run_time"].strftime("%Y-%m-%d %H:%M")
        subject    = (
            f"{status_symbol} {Config.PRODUCT_NAME} Pipeline — "
            f"{status_text} | {human_time}"
        )

        msg          = MIMEMultipart("mixed")
        msg["From"]  = f"{Config.BOT_NAME} <{self.email_user}>"
        msg["To"]    = self.email_recipient or self.email_user
        msg["Subject"] = subject

        msg.attach(MIMEText(self._build_email_html(summary), "html", "utf-8"))

        for att in self._export_to_csv(summary):
            try:
                with open(att["path"], "rb") as f:
                    part = MIMEBase("application", "octet-stream")
                    part.set_payload(f.read())
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition", f'attachment; filename="{att["name"]}"'
                )
                msg.attach(part)
            except Exception as exc:
                _log("ERROR", f"Failed to attach {att['name']}: {exc}")
            finally:
                try:
                    os.remove(att["path"])
                except Exception:
                    pass

        try:
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.email_user, self.email_pass)
                server.send_message(msg)
            _log("INFO", "Pipeline report email dispatched successfully.")
        except Exception as exc:
            _log("ERROR", f"Failed to send email: {exc}")
