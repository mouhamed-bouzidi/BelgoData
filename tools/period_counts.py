from pymongo import MongoClient
import os
from datetime import datetime, timedelta

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://admin:changeme@localhost:27017/BelgoData?authSource=admin')
client = MongoClient(MONGO_URI)
db = client['BelgoData']
col = db['prospects']

currentEnd = datetime.utcnow()
currentEnd = currentEnd.replace(hour=23, minute=59, second=59, microsecond=999000)
currentStart = currentEnd - timedelta(days=29)
currentStart = currentStart.replace(hour=0, minute=0, second=0, microsecond=0)

previousEnd = currentStart - timedelta(days=1)
previousEnd = previousEnd.replace(hour=23, minute=59, second=59, microsecond=999000)
previousStart = previousEnd - timedelta(days=29)
previousStart = previousStart.replace(hour=0, minute=0, second=0, microsecond=0)

print('Current period:', currentStart.isoformat(), '->', currentEnd.isoformat())
print('Previous period:', previousStart.isoformat(), '->', previousEnd.isoformat())

def count(filter):
    return col.count_documents(filter)

activeFilter = { 'deleted': { '$ne': True } }

periodMatch = lambda start, end: { **activeFilter, 'createdAt': { '$gte': start, '$lte': end } }

current_total = count(periodMatch(currentStart, currentEnd))
prev_total = count(periodMatch(previousStart, previousEnd))

print('current_total', current_total)
print('previous_total', prev_total)

client.close()