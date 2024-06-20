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
  );
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
      const response = await axios.post('http://localhost:9200/iComida/_search', 
        {
          "query": query,
          "search_fields": {
            "RestaurantName": {
              "weight": 5
            },
            "City": {
              "weight": 1.5
            },
            "Cuisines": {
              "weight": 3
            }
          },
          "boosts": {
            "Coordinates": {
              "type": "proximity",
              "function": "exponential",
              "center": coordinates,
              "factor": 2
            },
            "AggregateRating": {
              "type": "functional",
              "function": "linear",
              "operation": "multiply",
              "factor": 3
            },
            "PriceRange": {
              "type": "functional",
              "function": "linear",
              "operation": "multiply",
              "factor": 1.5
            },
            "Votes": {
              "type": "functional",
              "function": "logarithmic",
              "operation": "multiply",
              "factor": 2
            }
          }
        }
      );

      const results = response.data.hits.hits;
      const localResults = [];
      const otherResults = [];

      results.forEach(result => {
        const distance = calcDist(coordinates, result._source.Coordinates);
        if (distance <= 2) {
          localResults.push(result);
        } else {
          results.push(result);
        }
      });

      setLocalResults(localResults);
      setOtherResults(otherResults);
      setResults(results);
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
                <h3>{result._source.RestaurantName}</h3>
                <p>⭐ {result._source.AggregateRating} • {result._source.Cuisines} • {calcDist(coordinates, result._source.Coordinates).toFixed(1)} km</p>
                <p>{result._source.Currency} {result._source.AverageCostForTwo}</p>
              </div>
            ))}
          </div>
        )}
        <div className="other-results">
          <h2>Você também pode gostar</h2>
          {otherResults.map((result) => (
            <div key={result._id} className="result-item">
              <h3>{result._source.RestaurantName}</h3>
              <p>⭐ {result._source.AggregateRating} • {result._source.Cuisines} • {calcDist(coordinates, result._source.Coordinates).toFixed(1)} km</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchBox;
