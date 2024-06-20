import React, { useState } from 'react';
import axios from 'axios';
import { getDistance } from 'geolib';

const parseCoords = (coordinateString) => {
  const [latitude, longitude] = coordinateString.trim().split(',');

  return {
    latitude: parseFloat(latitude.trim()),
    longitude: parseFloat(longitude.trim())
  };
};

const calcDist = (myLocation, restaurantLocation) => {

  myLocation = parseCoords(myLocation);
  restaurantLocation = parseCoords(restaurantLocation);

  return getDistance(
    myLocation,
    restaurantLocation
  ) / 1000;
}

const SearchBox = () => {
  const [query, setQuery] = useState('');
  const [coordinates, setCoordinates] = useState('');
  const [results, setResults] = useState([]);
  const [localResults, setLocalResults] = useState([]);
  const [otherResults, setOtherResults] = useState([]);

  const handleSearch = async (event) => {
    event.preventDefault();

    try {
      const response = await axios.post('http://localhost:9200/icomida/_search', 
        {
          "query": {
            "function_score": {
              "query": {
                "multi_match": {
                  "query": query,
                  "fields": [
                    "restaurant_name^5",
                    "city^4",
                    "cuisines^3"
                  ]
                }
              },
              "boost_mode": "multiply",
              "functions": [
                {
                  "field_value_factor": {
                    "field": "aggregate_rating",
                    "factor": 3,
                    "modifier": "linear"
                  }
                },
                {
                  "field_value_factor": {
                    "field": "price_range",
                    "factor": 1.5,
                    "modifier": "linear"
                  }
                },
                {
                  "field_value_factor": {
                    "field": "votes",
                    "factor": 2,
                    "modifier": "log1p"
                  }
                },
                {
                  "gauss": {
                    "coordinates": {
                      "origin": coordinates,
                      "scale": "2km",
                      "offset": "0km",
                      "decay": 0.5
                    }
                  }
                }
              ]
            }
          }
        }
        
      );

      "boosts": {
            "aggregate_rating": {
              "type": "functional",
              "function": "linear",
              "operation": "multiply",
              "factor": 3
            },
            "price_range": {
              "type": "functional",
              "function": "linear",
              "operation": "multiply",
              "factor": 1.5
            },
            "votes": {
              "type": "functional",
              "function": "logarithmic",
              "operation": "multiply",
              "factor": 2
            }
          },
          "coordinates": {
              "type": "proximity",
              "function": "exponential",
              "center": coordinates,
              "factor": 2
            },

"query": {
            "multi_match": {
              "query": query,
              "fields": [
                "restaurant_name^5",
                "city^4",
                "cuisines^3"
              ]
            }
          },
          "boosts": {
            "aggregate_rating": {
              "type": "functional",
              "function": "linear",
              "operation": "multiply",
              "factor": 3
            },
            "price_range": {
              "type": "functional",
              "function": "linear",
              "operation": "multiply",
              "factor": 1.5
            },
            "votes": {
              "type": "functional",
              "function": "logarithmic",
              "operation": "multiply",
              "factor": 2
            }
          },
          "coordinates": {
              "type": "proximity",
              "function": "exponential",
              "center": coordinates,
              "factor": 2
          },
        }

      const allResults = response.data.hits.hits;
      const localResults = [];
      const otherResults = [];

      allResults.forEach(result => {
        const distance = calcDist(coordinates, result._source.coordinates);
        if (distance <= 2) {
          localResults.push(result);
        } else {
          otherResults.push(result);
        }
      });

      setLocalResults(localResults);
      setOtherResults(otherResults);
      setResults(allResults);
    } catch (error) {
      console.error('Erro ao realizar a busca', error);
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Digite o termo de pesquisa"
        />
        <input
          type="text"
          value={coordinates}
          onChange={(e) => setCoordinates(e.target.value)}
          placeholder="Sua localização"
        />
        <button type="submit">Buscar</button>
      </form>
      <div className="results">
        {localResults.length > 0 && (
          <div className="local-results">
            <h2>Encontrados por aqui</h2>
            {localResults.map((result) => (
              <div key={result._id} className="result-item">
                <h3>{result._source.restaurant_name}</h3>
                <p>⭐ {result._source.aggregate_rating} • {result._source.cuisines} • {calcDist(coordinates, result._source.coordinates).toFixed(1)} km</p>
                <p>{result._source.currency} {result._source.average_cost_for_two}</p>
              </div>
            ))}
          </div>
        )}
        <div className="other-results">
          <h2>Você também pode gostar</h2>
          {otherResults.map((result) => (
            <div key={result._id} className="result-item">
              <h3>{result._source.restaurant_name}</h3>
              <p>⭐ {result._source.aggregate_rating} • {result._source.cuisines} • {calcDist(coordinates, result._source.coordinates).toFixed(1)} km</p>
              <p>{result._source.currency} {result._source.average_cost_for_two}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchBox;
