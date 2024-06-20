import pandas as pd
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk

client = Elasticsearch('http://elasticsearch:9200')

PATH = "restaurants.csv"
INDEX_NAME = "icomida"
MAX_ANALYZED_OFFSET = 2000000

def generator(df, index_name, limit = None):

    if limit is not None:
        df = df.head(limit)

    replace_values = {
        "Bras�_lia": "Brasília",
        "S��o": "São",
        "Indian Rupees(Rs.)": "Rs.",
        "Emirati Diram(AED)": "AED",
        "Dollar($)": "$",
        "Brazilian Real(R$)": "R$"
    }

    df = df.replace(replace_values, regex = True)

    df['Coordinates'] = df.apply(lambda row: f"{row.Latitude}, {row.Longitude}", axis = 1)

    df = df.drop(['CountryCode', 'Address', 'Locality', "LocalityVerbose", 'Longitude', 'Latitude', 'HasTableBooking', 'HasOnlineDelivery', 'IsDeliveringNow', 'SwitchToOrderMenu', 'RatingText', "RatingColor"], axis = 1)
    
    df = df.dropna()

    df = df.to_dict(orient='records')

    for c, line in enumerate(df):
        yield {
            '_index': index_name,
            '_id': line.get("RestaurantID", None),
            '_source': {
                'restaurant_name': line.get('RestaurantName', ''),
                'city': line.get('City', ''),
                'coordinates': line.get('Coordinates', ''),
                'cuisines': line.get('Cuisines', ''),
                'average_cost_for_two': line.get('AverageCostForTwo', ''),
                'currency': line.get('Currency', ''),
                'price_range': line.get('PriceRange', ''),
                'aggregate_rating': line.get('AggregateRating', ''),
                'votes': line.get('Votes')
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