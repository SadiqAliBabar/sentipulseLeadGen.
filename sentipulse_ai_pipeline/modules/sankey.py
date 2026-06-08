import sys
from pathlib import Path

# Automatically add the 'src' directory to Python's paths so it can find 'sentipulse'
src_path = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(src_path))

from flask import Flask, request, jsonify
from flask_cors import CORS
from sentipulse_ai_pipeline.modules.review_clustering import RestaurantReviewClustering
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import pandas as pd
import traceback

app = Flask(__name__)
CORS(app)  # type: ignore

@app.route("/")
def index():
    return jsonify({
        "status": "online",
        "message": "Sentipulse Sankey API Server is running.",
        "endpoint": "/api/sankey (POST)"
    })

@app.route("/api/sankey", methods=["POST"])
def get_sankey_data():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing JSON body"}), 400

        # Extract basic fields
        restaurant = data.get("restaurant", "").strip()
        db_name = data.get("db_name", "").strip()
        sentiment = data.get("sentiment", "negative")
        platform = data.get("platform", "").strip()
        branch_name = data.get("branch_name", "").strip()

        start_date_str = data.get("startDate")
        end_date_str = data.get("endDate")

        if not restaurant or not db_name:
            return jsonify({"error": "Missing 'restaurant' or 'db_name' in request body"}), 400

        if not start_date_str or not end_date_str:
            return jsonify({"error": "Missing startDate or endDate"}), 400

        # Validate date format
        try:
            datetime.strptime(start_date_str, "%Y-%m-%d")
            datetime.strptime(end_date_str, "%Y-%m-%d")
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

        # ✅ Create clustering object with client-specific db_name
        clustering = RestaurantReviewClustering(restaurant_name=restaurant, db_name=db_name)

        # ✅ Call clustering function with cleaned filters
        df = clustering.run_multi_aspect_clustering(
            aspects=["food", "service", "price", "ambiance", "others"],
            sentiment=sentiment,
            start_date=start_date_str,
            end_date=end_date_str,
            platform=platform,
            branch_name=branch_name,
            save_output=False,
            hash_inputs=False,
            parallel=True
        )

        # ✅ Handle empty DataFrame
        if df.empty:
            return jsonify([])

        # Sankey visualization mappings
        aspect_mappings = {
            "food": {"label": "Food", "color": "#D82E5E"},
            "service": {"label": "Service", "color": "#515CD6"},
            "price": {"label": "Price", "color": "#E8B501"},
            "ambiance": {"label": "Ambiance", "color": "#D3642C"},
            "others": {"label": "Others", "color": "#8BC63E"},
        }

        flat_results = []
        total_sentiment_reviews = 0

        # Calculate total sentiment reviews
        for aspect_key in aspect_mappings:
            col = f"sent_{aspect_key}_sentiment"
            if col in df.columns:
                count = df[df[col] == sentiment].shape[0]
                total_sentiment_reviews += count

        if total_sentiment_reviews == 0:
            return jsonify([])

        root_node = f"{sentiment.capitalize()}\n{total_sentiment_reviews} | 100.0%"

        for aspect_key, config in aspect_mappings.items():
            sentiment_col = f"sent_{aspect_key}_sentiment"
            cluster_name_col = f"{aspect_key}_{sentiment}_cluster_name"
            aspect_part_col = f"sent_{aspect_key}_part"

            if sentiment_col not in df.columns:
                continue

            aspect_df = df[df[sentiment_col] == sentiment]
            if aspect_df.empty:
                continue

            aspect_count = aspect_df.shape[0]
            aspect_pct = (aspect_count / total_sentiment_reviews) * 100
            aspect_label = config["label"]
            color = config["color"]

            formatted_aspect_label = f"{aspect_label}\n{aspect_count} | {aspect_pct:.1f}%"

            # ✅ LEVEL 1: Root → Aspect (flatten each review as a row)
            for idx, row in aspect_df.iterrows():
                flat_row = {
                    "from": root_node,
                    "to": formatted_aspect_label,
                    "value": aspect_count,
                    "color": color,
                    cluster_name_col: row.get(cluster_name_col, ''),  # ✅ Include cluster name here
                    "review_text": row.get('text', ''),
                    "branch_name": row.get('branch_name', ''),
                    "review_date" : row.get('date', ''),
                    f"sent_{aspect_key}_sentiment": row.get(sentiment_col, ''),
                    f"sent_{aspect_key}_part": row.get(aspect_part_col, ''),
                    "sent_ratings": row.get('sent_ratings', None),
                    "rating": row.get('rating', None),
                    "review_url": row.get('review_url', ''),
                    "sent_platform": row.get('sent_platform', ''),
                    "sent_sentiment": row.get('sent_sentiment', '')
                }
                flat_results.append(flat_row)

            # ✅ LEVEL 2: Aspect → Cluster (flatten each review as a row)
            if cluster_name_col in df.columns:
                cluster_counts = aspect_df[cluster_name_col].value_counts()
                
                for cluster_name, count in cluster_counts.items():
                    if pd.notna(cluster_name):
                        cluster_pct = (count / aspect_count) * 100
                        cluster_label = f"{cluster_name}\n{count} | {cluster_pct:.1f}%"
                        
                        # Get all reviews for this specific cluster
                        cluster_df = aspect_df[aspect_df[cluster_name_col] == cluster_name]
                        
                        for idx, row in cluster_df.iterrows():
                            flat_row = {
                                "from": formatted_aspect_label,
                                "to": cluster_label,
                                "value": int(count),
                                "color": color,
                                # ✅ NO cluster name column here - only in parent node
                            }
                            flat_results.append(flat_row)

        return jsonify(flat_results)
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

def main():
    """Runs the Sankey API server."""
    app.run(host="0.0.0.0", port=8020, debug=False)

if __name__ == "__main__":
    main()
