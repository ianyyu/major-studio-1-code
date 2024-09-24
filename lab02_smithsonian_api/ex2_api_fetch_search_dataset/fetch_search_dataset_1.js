
const apiKey = "";  // Replace with your actual API key


// Search base URL
const searchBaseURL = "https://api.si.edu/openaccess/api/v1.0/search";

// Constructing the initial search query
const search = "type:edanmdm AND NMNHENTO AND (bee OR moth OR butterfly)";

// Array to store the indexedStructured data
let myArray = [];
let jsonString = '';

// Function to fetch search data
function fetchSearchData(searchTerm) {
    let pageSize = 1000; // Adjust based on API limits
    let totalRecordsNeeded = 30000; // Total number of records you want
    let numberOfPages = Math.ceil(totalRecordsNeeded / pageSize);

    let fetchPromises = []; // Array to collect fetch promises

    // Loop through each page
    for (let i = 0; i < numberOfPages; i++) {
        let start = i * pageSize;
        let rows = pageSize;

        // Adjust 'rows' for the last page if necessary
        if (start + rows > totalRecordsNeeded) {
            rows = totalRecordsNeeded - start;
        }

        // Construct the URL correctly using template literals
        let url = `${searchBaseURL}?api_key=${apiKey}&q=${searchTerm}&start=${start}&rows=${rows}`;
        console.log("Fetching URL:", url);

        // Fetch data and collect the promises
        let fetchPromise = fetchAllData(url);
        fetchPromises.push(fetchPromise);
    }

    // Wait for all fetch operations to complete
    Promise.all(fetchPromises)
        .then(() => {
            // All data has been fetched and processed
            jsonString = JSON.stringify(myArray);
            console.log("Final JSON String:", jsonString);

            // Proceed to download the JSON string
            downloadJSON(jsonString, 'data.json');
        })
        .catch(error => {
            console.log("Error in fetching data:", error);
        });
}

// Fetching all the data listed under our search and pushing them into our array
function fetchAllData(url) {
    return window
        .fetch(url)
        .then(res => res.json())
        .then(data => {
            console.log("Fetched Data:", data);

            if (data.response && data.response.rows) {
                data.response.rows.forEach(function (n) {
                    // Initialize an object to store the extracted data
                    let record = {};

                    // Extract indexedStructured data if available
                    record.indexedStructured = n.content && n.content.indexedStructured ? n.content.indexedStructured : {};

                    // Extract the title
                    record.title = n.title || '';

                    // Extract geoLocation if available
                    record.geoLocation = n.content && n.content.indexedStructured && n.content.indexedStructured.geoLocation ? n.content.indexedStructured.geoLocation : 'unknown';

                    // Skip this record if geoLocation is 'unknown'
                    if (record.geoLocation === 'unknown') {
                        return; // Continue to the next iteration
                    }

                    // Initialize category as 'unknown'
                    record.category = 'unknown';

                    // Extract taxonomic ranks safely
                    let taxOrder = record.indexedStructured.tax_order ? record.indexedStructured.tax_order[0].toLowerCase() : '';
                    let taxFamily = record.indexedStructured.tax_family ? record.indexedStructured.tax_family[0].toLowerCase() : '';

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
                        // Fallback to checking the title
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

// Function to download JSON data
function downloadJSON(jsonString, filename) {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}

// Initiate the data fetch
fetchSearchData(search);

