from pymongo import MongoClient
import os

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://admin:changeme@localhost:27017/BelgoData?authSource=admin')
client = MongoClient(MONGO_URI)
db = client['BelgoData']
col = db['prospects']

# sample one doc
sample = col.find_one({})
print('Sample createdAt (raw):', sample.get('createdAt'))
print('Type:', type(sample.get('createdAt')))

# find min and max createdAt values if stored as dates
try:
    pipeline = [
        { '$match': { 'createdAt': { '$exists': True } } },
        { '$group': { '_id': None, 'min': { '$min': '$createdAt' }, 'max': { '$max': '$createdAt' }, 'count': { '$sum': 1 } } }
    ]
    res = list(col.aggregate(pipeline))
    print('Aggregate min/max/count:', res)
except Exception as e:
    print('Aggregate error:', e)

client.close()