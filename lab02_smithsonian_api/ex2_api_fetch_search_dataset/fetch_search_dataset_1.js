const apiKey = "WSSUafNbcTDwq9gQGRr2mNmRd6Sv0DvTejH3vSmt";  

// Search base URL
const searchBaseURL = "https://api.si.edu/openaccess/api/v1.0/search";

// Constructing the initial search query
const search = `type:edanmdm AND NMNHENTO AND (bee OR moth OR butterfly)`;

// Array to store the indexedStructured data
let myArray = [];

// String to hold the stringified JSON data
let jsonString = '';

// Fetches an array of terms based on term category
// function fetchSearchData(searchTerm) {
//     // Set pageSize to 8000
//     let pageSize = 100;
    
//     // Modify the URL to include 'rows=8000' to fetch up to 8000 results
//     let url = searchBaseURL + "?api_key=" + apiKey + "&q=" + searchTerm + `&rows=${pageSize}`;
//     console.log("Fetching URL:", url);
    
//     window
//     .fetch(url)
//     .then(res => res.json())
//     .then(data => {
//         console.log("Initial Data:", data);

//         // Check if there are any results
//         if (data.response && data.response.rowCount > 0) {
//             // Directly fetch data using the constructed URL
//             fetchAllData(url);
//         } else {
//             console.log("No results found for the given search term.");
//         }
//     })
//     .catch(error => {
//         console.log("Error fetching search data:", error);
//     });
// }

function fetchSearchData(searchTerm) {
  // Set pageSize to the maximum allowed by the API (e.g., 1000)
  let pageSize = 1000; // You can adjust this to the actual maximum if it's different
  let totalRecordsNeeded = 8000; // The total number of records you want
  let numberOfPages = Math.ceil(totalRecordsNeeded / pageSize);

  // Loop through each page
  for (let i = 0; i < numberOfPages; i++) {
      let start = i * pageSize;
      let rows = pageSize;

      // Adjust 'rows' for the last page if totalRecordsNeeded is not a multiple of pageSize
      if (start + rows > totalRecordsNeeded) {
          rows = totalRecordsNeeded - start;
      }

      // Modify the URL to include 'start' and 'rows' parameters
      let url = searchBaseURL + "?api_key=" + apiKey + "&q=" + searchTerm + `&start=${start}&rows=${rows}`;
      console.log("Fetching URL:", url);

      // Fetch data using the existing fetchAllData function
      fetchAllData(url);
  }
}



// Fetching all the data listed under our search and pushing them into our array
function fetchAllData(url) {
    window
        .fetch(url)
        .then(res => res.json())
        .then(data => {
            console.log("Fetched Data:", data);

            if (data.response && data.response.rows) {
                data.response.rows.forEach(function (n) {
                    // Initialize an object to store the extracted data
                    let record = {};

                    // Extract indexedStructured data
                    if (n.content && n.content.indexedStructured) {
                        record.indexedStructured = n.content.indexedStructured;
                    } else {
                        record.indexedStructured = {};
                    }

                    // Extract the title
                    record.title = n.title || '';

                    // Initialize category as unknown
                    record.category = 'unknown';

                    // Extract taxonomic ranks
                    let taxOrder = '';
                    let taxFamily = '';
                    let taxGenus = '';
                    let taxSpecies = '';

                    if (record.indexedStructured.tax_order) {
                        taxOrder = record.indexedStructured.tax_order[0].toLowerCase();
                    }

                    if (record.indexedStructured.tax_family) {
                        taxFamily = record.indexedStructured.tax_family[0].toLowerCase();
                    }

                    if (record.indexedStructured.tax_genus) {
                        taxGenus = record.indexedStructured.tax_genus[0].toLowerCase();
                    }

                    if (record.indexedStructured.tax_species) {
                        taxSpecies = record.indexedStructured.tax_species[0].toLowerCase();
                    }

                    // Classification logic
                    if (taxOrder === 'hymenoptera') {
                        if (isBeeFamily(taxFamily)) {
                            record.category = 'bee';
                        } else {
                            record.category = 'other hymenoptera';
                        }
                    } else if (taxOrder === 'lepidoptera') {
                        if (isButterflyFamily(taxFamily)) {
                            record.category = 'butterfly';
                        } else {
                            record.category = 'moth';
                        }
                    } else {
                        // Check if title contains keywords as a fallback
                        let titleLower = record.title.toLowerCase();
                        if (titleLower.includes('bee')) {
                            record.category = 'bee';
                        } else if (titleLower.includes('butterfly')) {
                            record.category = 'butterfly';
                        } else if (titleLower.includes('moth')) {
                            record.category = 'moth';
                        }
                    }

                    // Push the record into myArray
                    myArray.push(record);
                });

                jsonString = JSON.stringify(myArray); // Convert myArray to JSON string
                console.log("Data Array with Categories:", myArray); // Log the array of data with categories
            } else {
                console.log("No rows found in response.");
            }
        })
        .catch(error => {
            console.log("Error fetching all data:", error);
        });
}

// Helper function to determine if a family is that of bees
function isBeeFamily(family) {
    const beeFamilies = [
        'apidae',       // Honey bees, bumblebees
        'halictidae',   // Sweat bees
        'megachilidae', // Leafcutter bees, mason bees
        'andrenidae',   // Mining bees
        'colletidae',   // Plasterer bees
        'melittidae',   // Melittid bees
        'stenotritidae' // Stenotritid bees
        // Add other bee families as needed
    ];

    return beeFamilies.includes(family);
}

// Helper function to determine if a family is that of butterflies
function isButterflyFamily(family) {
    const butterflyFamilies = [
        'papilionidae',  // Swallowtails
        'pieridae',      // Whites and Sulphurs
        'nymphalidae',   // Brush-footed butterflies
        'lycaenidae',    // Blues, Coppers, and Hairstreaks
        'hesperiidae',   // Skippers
        'riodinidae',    // Metalmarks
        // Add other butterfly families as needed
    ];

    return butterflyFamilies.includes(family);
}

// Initiate the data fetch with the modified code
fetchSearchData(search);
