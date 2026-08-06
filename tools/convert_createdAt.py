from pymongo import MongoClient
import os
from datetime import datetime

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://admin:changeme@localhost:27017/BelgoData?authSource=admin')
client = MongoClient(MONGO_URI)
db = client['BelgoData']
col = db['prospects']

cursor = col.find({ 'createdAt': { '$type': 'string' } }, projection=['createdAt'])
updated = 0
for doc in cursor:
    s = doc.get('createdAt')
    try:
        # Python 3.7+ supports fromisoformat for offset-aware strings
        dt = datetime.fromisoformat(s)
    except Exception:
        try:
            # fallback: strip timezone Z and microseconds
            dt = datetime.strptime(s.split('+')[0], '%Y-%m-%dT%H:%M:%S.%f')
        except Exception as e:
            print('Failed parsing', s, '->', e)
            continue

    res = col.update_one({'_id': doc['_id']}, {'$set': {'createdAt': dt}})
    if res.modified_count:
        updated += 1

print('Updated createdAt for', updated, 'documents')
client.close()