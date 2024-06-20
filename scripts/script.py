import pandas as pd
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk

client = Elasticsearch('http://elasticsearch:9200')

PATH = "restaurants.csv"
INDEX_NAME = "to_com_fome"
MAX_ANALYZED_OFFSET = 2000000

def generator(df, index_name, limit = None):

    if limit is not None:
        df = df.head(limit)

    replace_values = {
        "Bras�_lia": "Brasília",
        "S��o": "São"
    }

    df = df.replace(replace_values, regex = True)

    df['Coordinates'] = df.apply(lambda row: f"{row['Latitude']}, {row['Longitude']}")

    df = df.to_dict(orient='records')

    for c, line in enumerate(df):
        yield {
            '_index': index_name,
            '_id': line.get("RestaurantID", None),
            '_source': {
                'RestaurantName': line.get('RestaurantName', ''),
                'City': line.get('City', ''),
                'Address': line.get('Address', ''),
                'Coordinates': line.get('Coordinates', ''),
                'Cuisines': line.get('Cuisines', ''),
                'HasOnlinedelivery': line.get('HasOnlinedelivery', ''),
                'Isdeliveringnow': line.get('Isdeliveringnow', ''),
                'Aggregaterating': line.get('Aggregaterating', ''),
                'Ratingcolor': line.get('Ratingcolor', ''),
                'Ratingtext': line.get('Ratingtext', ''),
                'Votes': line.get('Votes', '')
            }
        }


def adjust_index_settings(client, index_name, max_analyzed_offset):
    client.indices.close(index=index_name)

    settings = {
        "index": {
            "highlight.max_analyzed_offset": max_analyzed_offset
        }
    }
    client.indices.put_settings(index = index_name, body = settings)

    client.indices.open(index=index_name)

df = pd.read_csv(PATH)

data_generator = generator(df, INDEX_NAME)

bulk(client, data_generator)

adjust_index_settings(client, INDEX_NAME, MAX_ANALYZED_OFFSET)