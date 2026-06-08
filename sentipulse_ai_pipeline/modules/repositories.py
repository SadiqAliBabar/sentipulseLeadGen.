from pymongo import MongoClient
from typing import List, Dict, Any

class BaseRepository:
    def __init__(self, mongo_client: MongoClient, db_name: str, collection_name: str):
        self.client = mongo_client
        self.db = self.client[db_name]
        self.collection = self.db[collection_name]

    def insert_one(self, document: Dict[str, Any]):
        return self.collection.insert_one(document)

    def insert_many(self, documents: List[Dict[str, Any]]):
        if not documents:
            return None
        return self.collection.insert_many(documents)

    def find(self, query: Dict[str, Any], sort_config=None, projection=None):
        cursor = self.collection.find(query, projection)
        if sort_config:
            cursor = cursor.sort(sort_config)
        return list(cursor)

    def find_one(self, query: Dict[str, Any], sort_config=None):
        return self.collection.find_one(query, sort=sort_config)

    def count_documents(self, query: Dict[str, Any]):
        return self.collection.count_documents(query)

    def create_index(self, keys, background: bool = True):
        self.collection.create_index(keys, background=background)

class ReviewRepository(BaseRepository):
    def __init__(self, mongo_client: MongoClient, db_name: str, platform: str):
        collection_name = f"{db_name}_{platform}_reviews"
        super().__init__(mongo_client, db_name, collection_name)

class PipelineLogRepository(BaseRepository):
    def __init__(self, mongo_client: MongoClient, db_name: str):
        collection_name = f"{db_name}_pipeline_logs"
        super().__init__(mongo_client, db_name, collection_name)
