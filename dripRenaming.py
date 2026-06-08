import sys

from pymongo import MongoClient, UpdateMany
from pymongo.errors import PyMongoError


def migrate_review_schema():
    # 1. Connection Configurations
    MONGO_URI = "mongodb://localhost:27017/"
    DB_NAME = "sentipulseLeadGen"
    COLLECTION_NAME = "drip_google_reviews"

    print(f"Connecting to MongoDB at {MONGO_URI}...")
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]

    # 2. Define the exact schema mapping based on your analysis
    # Format: {"current_field_name": "new_field_name"}
    rename_mapping = {
        "date_iso": "date",
        "author": "user",
        "profile_url": "reviewer_profile",
        "likes": "likes_count",
        "avatar_url": "reviewerPhotoUrl",
    }

    # 3. Verify collection has documents before proceeding
    total_docs = collection.count_documents({})
    if total_docs == 0:
        print(f"❌ No documents found in collection '{COLLECTION_NAME}'. Exiting.")
        return

    print(f"Found {total_docs} documents in '{COLLECTION_NAME}'. Starting migration...")

    try:
        # Using update_many with $rename updates all matching documents in a single operation
        # We target documents where at least one of the old keys still exists
        filter_query = {
            "$or": [{old_key: {"$exists": True}} for old_key in rename_mapping]
        }

        update_query = {"$rename": rename_mapping}

        result = collection.update_many(filter_query, update_query)

        print("\n--- Migration Summary ---")
        print(f"✅ Successfully matched documents: {result.matched_count}")
        print(f"✅ Successfully modified documents: {result.modified_count}")
        print("-------------------------")

        # Quick validation check on a single document
        sample_doc = collection.find_one()
        if sample_doc:
            print("\nVerification sample schema (Current Keys):")
            print(list(sample_doc.keys()))

    except PyMongoError as e:
        print(f"❌ An error occurred during migration: {e}", file=sys.stderr)
    finally:
        client.close()
        print("\nDatabase connection closed.")


if __name__ == "__main__":
    migrate_review_schema()
