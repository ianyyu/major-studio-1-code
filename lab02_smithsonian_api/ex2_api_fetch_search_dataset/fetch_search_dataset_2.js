const apiKey = "dd8pcOamWX5XvNyOALOumgEppI7gy5R5mtLM0QfW";

// search base URL
const searchBaseURL = "https://api.si.edu/openaccess/api/v1.0/search";

// constructing the search query based on your API query
const search =`online_visual_material:true AND type:edanmdm AND NMNHENTO+bee`;

// array that will hold the results
let myArray = [];

// string that will hold the stringified JSON data
let jsonString = '';

// Function to fetch the initial search data
function fetchSearchData(searchTerm) {
    let url = searchBaseURL + "?api_key=" + apiKey + "&q=" + searchTerm;
    console.log(url);
    window
    .fetch(url)
    .then(res => res.json())
    .then(data => {
      console.log(data);
      
      // Adjust page size and number of queries based on row count
      let pageSize = 1000;
      let numberOfQueries = Math.ceil(data.response.rowCount / pageSize);
      console.log(numberOfQueries);

      for(let i = 0; i < numberOfQueries; i++) {
        let searchAllURL;
        if (i == (numberOfQueries - 1)) {
          searchAllURL = url + `&start=${i * pageSize}&rows=${data.response.rowCount - (i * pageSize)}`;
        } else {
          searchAllURL = url + `&start=${i * pageSize}&rows=${pageSize}`;
        }
        console.log(searchAllURL);
        fetchAllData(searchAllURL);
      }
    })
    .catch(error => {
      console.log(error);
    })
}

// Function to add objects to the array and parse out the country, state, and locality
function addObject(n) {
  // Initialize variables to store geolocation info
  let country = "";
  let state = "";
  let locality = "";

  // Check if geolocation exists and extract the relevant fields
  if (n.content && n.content.indexedStructured && n.content.indexedStructured.geoLocation) {
    n.content.indexedStructured.geoLocation.forEach(location => {
      if (location.L2 && location.L2.type === "Country") {
        country = location.L2.content;
      }
      if (location.L3 && location.L3.type === "State") {
        state = location.L3.content;
      }
      if (location.Other && location.Other.type === "Locality") {
        locality = location.Other.content;
      }
    });
  }

  // Add the extracted geolocation and other relevant information to the object
  myArray.push({
    id: n.id,
    title: n.title,
    country: country,
    state: state,
    locality: locality,
    // You can include other fields as needed
  });
}

// Call this function to start the process
fetchSearchData(search);