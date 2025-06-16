document.addEventListener('DOMContentLoaded', function() {

    

// --- START: Authentication Guard ---

(function() { // Use an IIFE
    // --- MODIFIED: Add homepage paths to publicPages ---
    const publicPages = [
        '/login.html',
        '/signup.html',
        '/index.html', // Add index.html
        '/'            // Add the root path as well
    ];
    // --- END MODIFICATION ---

    const defaultLoggedInPage = '/index.html'; // Where logged-in users go if they hit login/signup
    const loginPage = '/Users/aryan/Desktop/GoDiscover/GoDiscover/frontend/login.html';          // Where logged-out users go if they hit protected pages

    const currentPagePath = window.location.pathname;
    const authToken = localStorage.getItem('authToken');

    // Check if the current page path ends with any of the defined public page paths
    const isPublicPage = publicPages.some(page => currentPagePath.endsWith(page));

    console.log('Auth Guard Check:');
    console.log(' - Current Path:', currentPagePath);
    console.log(' - Auth Token Present:', !!authToken);
    console.log(' - Is Public Page:', isPublicPage);

    if (!isPublicPage && !authToken) {
        // User is NOT logged in and trying to access a PROTECTED page (NOT login, signup, or index)
        console.log('Redirecting to login page (not logged in, accessing protected page).');
        window.location.replace(loginPage);
    } else if ((currentPagePath.endsWith('/login.html') || currentPagePath.endsWith('/signup.html')) && authToken) {
        // User IS logged in and specifically trying to access login or signup page
        console.log('Redirecting to homepage (already logged in, accessing public auth page).');
        window.location.replace(defaultLoggedInPage);
    } else {
        // Access is allowed if:
        // 1. It's a public page (including index.html or /) regardless of login state (unless logged in accessing login/signup)
        // 2. It's a protected page AND the user is logged in
        console.log('Access allowed.');
    }

})(); // Immediately invoke the function

// --- END: Authentication Guard ---

// --- Your existing script.js code continues below ---
// ...
    // --- Mapbox Initialization (Hotels & Restaurants Page Only) ---
    let map = null; // Holds the map instance
    let currentSearchMarkers = []; // Holds markers for search results (hotels/restaurants)
    let userLocationMarker = null; // Holds the marker specifically for the user's current location

    const mapContainer = document.getElementById('live-map'); // Check if the map container exists on this page
    const searchResultsDiv = document.getElementById('search-results'); // Get the results div on the hotels page

    if (mapContainer) { // Only run Mapbox related code if on the hotels-restaurants page
        // !!! --- IMPORTANT: Replace with YOUR ACTUAL Mapbox Access Token --- !!!
        // !!! --- WARNING: Avoid exposing tokens directly in production client-side code --- !!!
        // It's safer to use a backend endpoint to proxy API requests or use token restrictions.
        mapboxgl.accessToken = 'pk.eyJ1IjoiYXJ5YW5hcGkiLCJhIjoiY204eTRodXJjMGFqMTJrcGVtN3l6djltNyJ9.e3BxnAXmHmzvkSd-0uvwPQ'; // <-- REPLACE THIS WITH YOUR TOKEN

        if (!mapboxgl.accessToken || mapboxgl.accessToken.length < 10 || mapboxgl.accessToken === 'YOUR_MAPBOX_ACCESS_TOKEN') {
             console.error("Mapbox Access Token is missing, invalid, or is a placeholder! Please add it in script.js.");
             if (mapContainer) { // Ensure mapContainer exists before updating its content
                 mapContainer.innerHTML = '<p style="color:red; text-align:center; padding-top: 50px;">Map cannot load: Access token missing or invalid.</p>';
             }
        } else {
            try {
                map = new mapboxgl.Map({
                    container: 'live-map',
                    style: 'mapbox://styles/mapbox/streets-v12',
                    center: [78.9629, 20.5937], // Default center: India
                    zoom: 4
                });
                map.addControl(new mapboxgl.NavigationControl());
                 console.log("Mapbox initialized successfully.");

                 // Optional: Add a control to show user location easily
                 // map.addControl(new mapboxgl.GeolocateControl({
                 //     positionOptions: { enableHighAccuracy: true },
                 //     trackUserLocation: true,
                 //     showUserHeading: true
                 // }));

                 // Ensure the map container has a defined height in your CSS (e.g., #live-map { height: 500px; })
                 if (mapContainer && mapContainer.offsetHeight === 0) {
                     console.warn("#live-map element has zero height. Please ensure your CSS gives it a height (e.g., height: 500px;).");
                 }

            } catch (error) {
                 console.error("Error initializing Mapbox:", error);
                 if (mapContainer) {
                    mapContainer.innerHTML = '<p style="color:red; text-align:center; padding-top: 50px;">Map could not be initialized. Check console.</p>';
                 }
                 map = null; // Ensure map is null if init failed
            }
        }

        // --- Hotels & Restaurants Page Specific Logic ---
        const nearbyBtn = document.getElementById('nearby-recommendations-btn');
        const locationInput = document.getElementById('location-search');
        const manualSearchBtn = document.getElementById('manual-search-btn');

        // Event listener for "Use My Current Location" button
        if (nearbyBtn && searchResultsDiv) { // Ensure button and results div exist
            nearbyBtn.addEventListener('click', () => {
                searchResultsDiv.innerHTML = '<p>Getting your location... <i class="fas fa-spinner fa-spin"></i></p>'; // Provide feedback

                if (!navigator.geolocation) {
                    searchResultsDiv.innerHTML = '<p style="color: red;">Geolocation is not supported by this browser.</p>';
                    console.error("Geolocation not supported.");
                    return;
                }

                if (!map) {
                    searchResultsDiv.innerHTML = '<p style="color: red;">Map is not initialized. Cannot use current location.</p>';
                    console.error("Map object is null when trying to get location.");
                    return;
                }

                // Request user's current position
                navigator.geolocation.getCurrentPosition(
                    // --- Success Callback ---
                    (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        const accuracy = position.coords.accuracy; // Get accuracy

                        console.log(`Geolocation success: Lat: ${lat}, Lng: ${lng}, Accuracy: ${accuracy} meters`);

                        // *** THIS IS THE FIX: Interact with the map object ***

                        // 1. Remove any previous user location marker
                        if (userLocationMarker) {
                            userLocationMarker.remove();
                        }

                        // 2. Center the map on the user's location
                        // Adjust zoom based on accuracy if needed, but 14 is usually good.
                        map.flyTo({
                            center: [lng, lat],
                            zoom: 14, // Zoom in closer to the user's location
                            essential: true // This animation is considered essential
                        });

                        // 3. Add a marker at the user's location
                        // Use a different color or icon for user location vs search results
                        userLocationMarker = new mapboxgl.Marker({ color: '#007bff' }) // Blue marker for user location
                            .setLngLat([lng, lat])
                            .setPopup(new mapboxgl.Popup().setHTML(`<h3>Your Location</h3><p>Accuracy: ~${accuracy.toFixed(0)}m</p>`)) // Add popup with accuracy
                            .addTo(map);

                        // 4. Update the search input field (optional)
                        locationInput.value = `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

                        // 5. Update the results area (inform user, perhaps trigger actual nearby search)
                         searchResultsDiv.innerHTML = `<p>Map centered on your location (Accuracy: ~${accuracy.toFixed(0)}m). Fetching nearby places...</p>`;

                        // TODO: Call a function here to fetch nearby hotels and restaurants
                        // fetchNearbyPlaces(lat, lng, 'hotels,restaurants'); // You need to implement fetchNearbyPlaces
                         // For now, let's just simulate:
                         simulateNearbySearch([lng, lat]);


                    },
                    // --- Error Callback ---
                    (error) => {
                        console.error("Error getting location:", error);
                        let message = "Could not get your location. ";
                        switch (error.code) {
                            case error.PERMISSION_DENIED:
                                message += "Please grant location permission in your browser settings.";
                                break;
                            case error.POSITION_UNAVAILABLE:
                                message += "Location information is unavailable.";
                                break;
                            case error.TIMEOUT:
                                message += "The request to get user location timed out.";
                                break;
                            case error.UNKNOWN_ERROR:
                                message += "An unknown error occurred.";
                                break;
                        }
                        searchResultsDiv.innerHTML = `<p style="color: red;">${message}</p>`;
                         // Optional: Clear any previous user marker on error
                         if (userLocationMarker) {
                             userLocationMarker.remove();
                             userLocationMarker = null;
                         }
                    },
                    // --- Options ---
                    {
                        enableHighAccuracy: true, // Request high accuracy
                        timeout: 10000, // 10 seconds timeout
                        maximumAge: 0 // Don't use a cached position older than 0ms
                    }
                );
            });
        } else if (window.location.pathname.includes('hotels-restaurants.html')) {
             // This warning helps debug if the button or results div weren't found
             console.warn("Hotels/Restaurants page elements not fully found (nearbyBtn, searchResultsDiv). Geolocation button may not work.");
        }


        // Event listener for manual search button
        if (manualSearchBtn && locationInput && searchResultsDiv) { // Ensure elements exist
             manualSearchBtn.addEventListener('click', () => {
                const query = locationInput.value.trim();
                if (!query) {
                     searchResultsDiv.innerHTML = `<p>Please enter a location to search.</p>`;
                     return;
                }
                if (!map) {
                    searchResultsDiv.innerHTML = '<p style="color: red;">Map is not initialized. Cannot perform search.</p>';
                    console.error("Map object is null for manual search.");
                    return;
                }

                searchResultsDiv.innerHTML = `<p>Searching for "${query}"... <i class="fas fa-spinner fa-spin"></i></p>`;

                // TODO: Implement Geocoding (converting text query to coordinates)
                // Use Mapbox Geocoding API or another service.
                // Example using Mapbox Geocoding:
                if (mapboxgl.accessToken === 'YOUR_MAPBOX_ACCESS_TOKEN' || !mapboxgl.accessToken || mapboxgl.accessToken.length < 10) {
                     searchResultsDiv.innerHTML = '<p style="color: red;">Cannot perform search: Mapbox access token is missing or invalid.</p>';
                     console.error("Mapbox Access Token missing for Geocoding.");
                     return;
                }

                const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&limit=1`; // Limit to 1 relevant result
                fetch(geocodingUrl)
                    .then(response => {
                        if (!response.ok) {
                            // Attempt to read error body if available, otherwise throw generic error
                            return response.json().catch(() => { throw new Error(`HTTP error! status: ${response.status}`); })
                                .then(errorBody => { throw new Error(`HTTP error! status: ${response.status}, Message: ${errorBody.message || JSON.stringify(errorBody)}`); });
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log("Geocoding API response:", data);
                        if (data.features && data.features.length > 0) {
                            const firstResult = data.features[0];
                            const coords = firstResult.center; // [lng, lat]
                            console.log("Geocoding success:", firstResult);

                            // Center map on the searched location
                            map.flyTo({ center: coords, zoom: 12, essential: true });

                            // Remove previous user marker if it exists
                            if (userLocationMarker) {
                                userLocationMarker.remove();
                                userLocationMarker = null;
                            }

                            // TODO: Now fetch nearby hotels/restaurants around these coords
                             searchResultsDiv.innerHTML = `<p>Map centered on "${firstResult.place_name}". Fetching nearby places...</p>`;
                            // simulateNearbySearch(coords); // Use the simulation with the searched coords

                            // Call your actual fetching function here:
                            // fetchNearbyPlaces(coords[1], coords[0], 'hotels,restaurants');


                        } else {
                            searchResultsDiv.innerHTML = `<p style="color: orange;">Location not found for "${query}". Please try a different query.</p>`;
                            console.warn("Geocoding found no features for:", query);
                            // Keep map at current view or reset to default
                        }
                    })
                    .catch(error => {
                        console.error("Geocoding Error:", error);
                         searchResultsDiv.innerHTML = `<p style="color: red;">Error searching for location: ${error.message}</p>`;
                    });
             });
        } else if (window.location.pathname.includes('hotels-restaurants.html')) {
            console.warn("Hotels/Restaurants page elements not fully found (manualSearchBtn, locationInput, searchResultsDiv). Manual search may not work.");
        }

        // --- Map Helper Functions (for Hotels/Restaurants) ---
        // Clears markers added for search results (hotels/restaurants), NOT the user's location marker
        function clearSearchMarkers() {
            if(!map) return;
            currentSearchMarkers.forEach(marker => marker.remove());
            currentSearchMarkers = [];
        }

        // Function to update map and results list with fetched places
        // This function would be called *after* getting user location or manual search results
        function updateMapWithPlaces(places, centerCoords = null) {
            if (!map) return;
            clearSearchMarkers(); // Clear previous search result markers

            const resultsListHTML = document.createElement('ul');
            resultsListHTML.classList.add('search-results-list'); // Add a class for styling

            if (!places || places.length === 0) {
                 // If no places, maybe recenter or show default view
                 const message = centerCoords ? "<p>No hotels or restaurants found near this location.</p>" : "<p>No search results.</p>";
                 searchResultsDiv.innerHTML = message;
                 map.flyTo({ center: centerCoords || [78.9629, 20.5937], zoom: centerCoords ? 13 : 4 }); // Fly to center if provided, else default
                 return;
            }

            const bounds = new mapboxgl.LngLatBounds();

            places.forEach(place => {
                // Assuming place objects have lat, lon, name, and potentially other info
                // This structure depends entirely on the API you use to fetch places
                // For Mapbox Search API, coordinates are [lng, lat] in place.geometry.coordinates
                // For other APIs, it might be place.lat, place.lon
                let coordinates = null;
                if (place.geometry?.coordinates) { // Example for Mapbox Search API
                    coordinates = place.geometry.coordinates; // [lng, lat]
                } else if (place.lat && place.lon) { // Example for other APIs
                    coordinates = [place.lon, place.lat]; // [lng, lat]
                }

                if (coordinates) {
                    // Example: Use a green marker for places
                    let markerColor = '#34D399';
                    // Sanitize data coming from external API
                    const safeName = place.properties?.name?.replace(/</g, "&lt;").replace(/>/g, "&gt;") ?? place.name?.replace(/</g, "&lt;").replace(/>/g, "&gt;") ?? 'Unnamed Place';
                    const safeAddress = place.properties?.address ?? place.address ?? ''; // Address structure varies by API
                    const safeRating = place.properties?.rating ?? place.rating;

                    // Construct popup HTML (sanitize any data)
                    const popupHTML = `<h4>${safeName}</h4><p>${safeAddress}</p>${safeRating ? `<p>Rating: ${safeRating}</p>` : ''}`;

                    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupHTML);
                    const marker = new mapboxgl.Marker({ color: markerColor }).setLngLat(coordinates).setPopup(popup).addTo(map);

                    currentSearchMarkers.push(marker); // Add to the list of search result markers
                    bounds.extend(coordinates);

                    // Add to results list HTML
                    const listItem = document.createElement('li');
                    listItem.classList.add('search-result-item'); // Add a class for styling
                     listItem.innerHTML = `
                         <strong>${safeName}</strong><br>
                         ${safeAddress} ${safeRating ? `(${safeRating})` : ''}
                     `;
                    resultsListHTML.appendChild(listItem);
                } else {
                    console.warn("Place object is missing coordinates:", place);
                }
            });

            // Fit the map to show all place markers
            if (!bounds.isEmpty()) { map.fitBounds(bounds, { padding: 60 }); }
            else if (centerCoords) {
                 // If no places had valid coords but we have a center, fly to the center
                 map.flyTo({ center: centerCoords, zoom: 14 });
            }

            // Display the list of results
             searchResultsDiv.innerHTML = `<h3>Found ${places.length} nearby places:</h3>`;
             searchResultsDiv.appendChild(resultsListHTML);
             searchResultsDiv.insertAdjacentHTML('beforeend', '<p>Click on a marker on the map for more details.</p>'); // Add instruction

        }

        // --- Simulation of Fetching Nearby Places (Replace with actual API call) ---
        function simulateNearbySearch(centerCoords) {
             console.log("Simulating nearby search around:", centerCoords);
             // In a real app, you would fetch data from an API like Mapbox Search, Google Places, Foursquare, etc.
             // For demonstration, let's create some dummy data near the centerCoords
             const dummyPlaces = [
                 {
                    geometry: { coordinates: [centerCoords[0] + 0.01, centerCoords[1] + 0.005] },
                    properties: { name: 'Simulated Hotel Grand', address: '123 Main St' }
                 },
                 {
                     geometry: { coordinates: [centerCoords[0] - 0.008, centerCoords[1] - 0.003] },
                     properties: { name: 'Simulated Restaurant Bites', address: '456 Oak Ave', rating: 4.5 }
                 },
                  {
                     geometry: { coordinates: [centerCoords[0] + 0.002, centerCoords[1] - 0.009] },
                     properties: { name: 'Simulated Cafe Corner', address: '789 Pine Ln' }
                 }
             ];
             // Call updateMapWithPlaces with the simulated data
             setTimeout(() => { // Simulate network delay
                 updateMapWithPlaces(dummyPlaces, centerCoords);
             }, 1000);
        }
        // --- End Simulation ---

    }
    // --- End Mapbox/Hotels & Restaurants Logic ---


    // --- Function to Update Header UI based on Login State ---
    // This function should ideally be defined outside any specific page check
    function updateHeaderUI() {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const userEmail = localStorage.getItem('userEmail');
        const body = document.body;
        const greetingSpan = document.getElementById('user-greeting');
        const loggedOutLinks = document.querySelectorAll('.auth-link.logged-out');
        const loggedInLinks = document.querySelectorAll('.auth-link.logged-in');


        if (isLoggedIn) {
            loggedOutLinks.forEach(el => el.style.display = 'none');
            loggedInLinks.forEach(el => el.style.display = ''); // Or 'block', 'flex', etc. depending on layout
            if (greetingSpan && userEmail) {
                greetingSpan.textContent = `Hi, ${userEmail.split('@')[0]}!`;
            } else if (greetingSpan) {
                greetingSpan.textContent = `Hi!`;
            }
        } else {
            loggedInLinks.forEach(el => el.style.display = 'none');
            loggedOutLinks.forEach(el => el.style.display = ''); // Or 'block', 'flex', etc.
             if (greetingSpan) {
                greetingSpan.textContent = '';
             }
        }
    }
    // Initial UI Update on Page Load
    updateHeaderUI();


    // --- Homepage Location Prompt ---
    const locationPromptBtn = document.getElementById('location-prompt-btn');
    if (locationPromptBtn) {
        locationPromptBtn.addEventListener('click', function() {
            if (!navigator.geolocation) {
                 alert("Geolocation is not supported by this browser.");
                 console.error("Geolocation not supported.");
                 return;
            }
             alert("Requesting location access..."); // Inform user the prompt is coming
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    alert(`Location Access Granted!\nLat: ${position.coords.latitude.toFixed(4)}, Lon: ${position.coords.longitude.toFixed(4)}\nNearby features enabled.`);
                },
                function(error) {
                    console.error("Geolocation error:", error);
                    let errorMsg = "Location access denied or unavailable.";
                    switch(error.code) {
                        case error.PERMISSION_DENIED: errorMsg = "User denied Geolocation request."; break;
                        case error.POSITION_UNAVAILABLE: errorMsg = "Location information unavailable."; break;
                        case error.TIMEOUT: errorMsg = "Location request timed out."; break;
                        default: errorMsg = "An unknown error occurred."; break;
                    }
                    alert(`Geolocation Error: ${errorMsg}\nNearby features will be limited.`);
                },
                // Request higher accuracy
                { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
            );
        });
    }


    // --- Itinerary Planner Form Submission ---
    const itineraryForm = document.getElementById('itineraryForm');
    const itineraryResultDiv = document.getElementById('itineraryResult');
    if (itineraryForm && itineraryResultDiv) {
        itineraryForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            // Get inputs
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            const guests = document.getElementById('guests').value;
            const destination = document.getElementById('destination').value.trim();
            const interests = document.getElementById('interests').value.trim();
            const travelStyle = document.getElementById('travelStyle').value;
            const budgetRange = document.getElementById('budgetRange').value;

            // Validation
            let errorMessages = [];
            if (!startDate || !endDate) { errorMessages.push("Please select start and end dates."); }
            else if (new Date(endDate) < new Date(startDate)) { errorMessages.push("End date cannot be before start date."); }
            if (!guests || parseInt(guests) < 1) { errorMessages.push("Number of guests must be at least 1."); }
            if (!destination) { errorMessages.push("Please enter a destination."); }


            if (errorMessages.length > 0) {
                itineraryResultDiv.innerHTML = `<p style="color: var(--error-color);">${errorMessages.join('<br>')}</p>`;
                return;
            }

            itineraryResultDiv.innerHTML = '<p>Generating your personalized itinerary... <i class="fas fa-spinner fa-spin"></i></p>';
            const preferences = { startDate, endDate, guests, destination, interests, travelStyle, budgetRange };

            try {
                const backendUrl = 'http://localhost:3000/api/generate-itinerary'; // Ensure port matches backend
                console.log("Sending itinerary request to backend:", preferences);
                const response = await fetch(backendUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(preferences),
                });
                 console.log("Backend response status:", response.status);
                const result = await response.json();
                 console.log("Backend response data:", result);

                if (!response.ok) {
                     // Check if backend sent a specific error message
                     const errorMessage = result.error || `Request failed with status: ${response.status}`;
                     throw new Error(errorMessage);
                }

                if (result.itinerary) {
                    // Basic Markdown-like formatting (includes escaping)
                    const rawText = result.itinerary;
                    const formattedHtml = rawText
                        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") // Basic HTML escaping
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
                        .replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic

                    // Handle lists and paragraphs
                    const lines = formattedHtml.split('\n');
                    let finalHtml = '';
                    let inList = false;

                    lines.forEach(line => {
                        const trimmedLine = line.trim();
                        if (trimmedLine.startsWith('-&amp;nbsp;') || trimmedLine.startsWith('•&amp;nbsp;')) { // Look for list markers (consider escaped &nbsp;)
                             if (!inList) {
                                 finalHtml += '<ul>';
                                 inList = true;
                             }
                            // Remove the marker and add as list item
                             finalHtml += `<li>${trimmedLine.substring(trimmedLine.indexOf('&amp;nbsp;') + 6).trim()}</li>`;
                        } else if (inList) {
                             finalHtml += '</ul>';
                             inList = false;
                             if (trimmedLine) { // If there's content after list, start new paragraph
                                 finalHtml += `<p>${trimmedLine}</p>`;
                             }
                        } else if (trimmedLine) {
                            // Treat non-list consecutive lines as part of the same paragraph or new paragraphs
                             // Simple paragraph break on double newline is harder with split.
                             // Let's just wrap each non-empty line in a paragraph for simplicity, or use <br> for single newlines
                             // Using <br> for single newlines within blocks of text is more common for AI output.
                             finalHtml += `<p>${trimmedLine.replace(/\n/g, '<br>')}</p>`;
                        }
                    });

                    // Close list if still open at the end
                    if (inList) {
                        finalHtml += '</ul>';
                    }


                    itineraryResultDiv.innerHTML = `<h3 color="black">Your Personalized Itinerary</h3><div class="itinerary-content">${finalHtml}</div>`;
                     itineraryResultDiv.scrollIntoView({ behavior: 'smooth' }); // Scroll to results
                } else {
                    itineraryResultDiv.innerHTML = '<p style="color: orange;">Could not generate itinerary. The AI might not have returned a valid plan. Try refining your criteria or destination.</p>';
                }
            } catch (error) {
                console.error("Itinerary Fetch Error:", error);
                itineraryResultDiv.innerHTML = `<p style="color: var(--error-color);">Error generating itinerary: ${error.message || 'An unknown error occurred.'}</p>`;
            }
        });
    } else if (window.location.pathname.includes('itinerary.html')) {
         console.warn("Itinerary page elements not found (itineraryForm or itineraryResultDiv). Itinerary planning will not work.");
    }


    // --- Guest Counter Logic ---
    const guestCounters = document.querySelectorAll('.guest-counter');
    guestCounters.forEach(counter => {
         const minusBtn = counter.querySelector('.guest-btn.minus-btn'); // Added .guest-btn class
         const plusBtn = counter.querySelector('.guest-btn.plus-btn'); // Added .guest-btn class
         const inputField = counter.querySelector('input[type="number"]');
         if (minusBtn && plusBtn && inputField) {
             minusBtn.addEventListener('click', () => {
                 let currentValue = parseInt(inputField.value);
                 const minValue = parseInt(inputField.min || '1');
                 if (currentValue > minValue) inputField.value = currentValue - 1;
             });
             plusBtn.addEventListener('click', () => {
                  let currentValue = parseInt(inputField.value);
                  const maxValue = parseInt(inputField.max || '99');
                  if (currentValue < maxValue) inputField.value = currentValue + 1;
             });
         } else {
             console.warn("Missing elements for a guest counter:", counter);
         }
    });


    // --- Contact Form Logic ---
    const contactForm = document.getElementById('contactForm');
    const formMessageDivContact = document.querySelector('#contact-page #formMessage'); // Specific to contact page
    if (contactForm && formMessageDivContact) {
        contactForm.addEventListener('submit', function(event) {
             event.preventDefault();
             formMessageDivContact.textContent = ''; formMessageDivContact.className = 'form-message'; // Reset
             // Validation...
             const name = document.getElementById('name').value.trim();
             const email = document.getElementById('email').value.trim();
             const subject = document.getElementById('subject').value.trim();
             const message = document.getElementById('message').value.trim();
             const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email regex

             if(!name || !email || !subject || !message) {
                 formMessageDivContact.textContent = "Please fill all fields.";
                 formMessageDivContact.classList.add('error'); return;
             }
             if (!emailRegex.test(email)) {
                 formMessageDivContact.textContent = "Please enter a valid email address.";
                 formMessageDivContact.classList.add('error'); return;
             }

             // --- Simulate form submission ---
             console.log("Contact Form Submitted (Simulated)");
             // In a real application, you would send this data to a backend server here
             // using fetch() or XMLHttpRequest.

             formMessageDivContact.textContent = "Message sent successfully! We'll get back to you soon.";
             formMessageDivContact.classList.add('success');

             // Clear the form
             contactForm.reset();
        });
    } else if (window.location.pathname.includes('contact.html')) {
         console.warn("Contact page elements not found (contactForm or formMessageDivContact). Contact form will not work.");
    }


    // --- Header Auth Button Navigation & Logout ---
    const navList = document.getElementById('nav-list');
    if (navList) {
        navList.addEventListener('click', function(event) {
             const targetLink = event.target.closest('a');
             if (!targetLink) return;
             const linkId = targetLink.id;
             if (linkId === 'login-btn-header') { event.preventDefault(); window.location.href = 'login.html'; }
             else if (linkId === 'signup-btn-header') { event.preventDefault(); window.location.href = 'signup.html'; }
             else if (linkId === 'logout-btn') {
                  event.preventDefault();
                  localStorage.removeItem('isLoggedIn');
                  localStorage.removeItem('userEmail');
                  updateHeaderUI(); // Update header immediately
                  alert("You have been logged out.");
                  // Optional: Redirect after a small delay to show the message
                  setTimeout(() => { window.location.href = 'index.html'; }, 50);
             }
        });
    } else {
         console.warn("Navigation list (#nav-list) not found. Auth buttons might not work correctly.");
    }


    // --- Login Form Handling ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        const messageDiv = loginForm.querySelector('#formMessage');
        const loginButton = loginForm.querySelector('button[type="submit"]');
        if (messageDiv && loginButton) {
            loginForm.addEventListener('submit', function(event) {
                 event.preventDefault();
                 messageDiv.textContent = ''; messageDiv.className = 'form-message'; // Reset

                 const email = document.getElementById('email').value.trim();
                 const password = document.getElementById('password').value.trim();
                 const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                 if (!email || !password) {
                      messageDiv.textContent = 'Please enter both email and password.';
                      messageDiv.classList.add('error'); return;
                 }
                 if (!emailRegex.test(email)) {
                      messageDiv.textContent = 'Please enter a valid email address.';
                      messageDiv.classList.add('error'); return;
                 }

                 // --- Simulate Login Process ---
                 messageDiv.textContent = 'Logging in...';
                 messageDiv.classList.add('info');
                 loginButton.disabled = true; // Disable button during simulation

                 // In a real app, send email/password to your backend for authentication
                 // fetch('/api/login', { method: 'POST', body: JSON.stringify({ email, password }), headers: { 'Content-Type': 'application/json' } })
                 // .then(response => response.json())
                 // .then(data => { ... handle success/failure ... })
                 // .catch(error => { ... handle error ... });

                 setTimeout(() => {
                     // --- SIMULATED SUCCESS ---
                     // In a real app, the backend would return a success status and perhaps user info
                     localStorage.setItem('isLoggedIn', 'true');
                     localStorage.setItem('userEmail', email); // Store email (or username)
                     updateHeaderUI(); // Update header immediately
                     messageDiv.textContent = 'Login successful!';
                     messageDiv.classList.remove('info', 'error');
                     messageDiv.classList.add('success');

                     // Redirect to homepage or dashboard
                     setTimeout(() => { window.location.href = 'index.html'; }, 1000); // Delay redirect

                     // --- SIMULATED FAILURE (Example - uncomment to test failure) ---
                     // messageDiv.textContent = 'Login failed. Invalid credentials.';
                     // messageDiv.classList.remove('info', 'success');
                     // messageDiv.classList.add('error');
                     // loginButton.disabled = false; // Re-enable button on failure

                 }, 1500); // Simulate network delay
            });
        } else if (window.location.pathname.includes('login.html')) {
             console.warn("Login page elements not found (loginForm, messageDiv, or loginButton). Login form will not work.");
        }
    }


    // --- Signup Form Handling ---
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        const messageDiv = signupForm.querySelector('#formMessage');
        const signupButton = signupForm.querySelector('button[type="submit"]');
         if (messageDiv && signupButton) {
            signupForm.addEventListener('submit', function(event) {
                 event.preventDefault();
                 messageDiv.textContent = ''; messageDiv.className = 'form-message'; // Reset

                 const name = document.getElementById('name-signup').value.trim();
                 const email = document.getElementById('email-signup').value.trim();
                 const password = document.getElementById('password-signup').value.trim();
                 const confirmPassword = document.getElementById('confirm-password').value.trim();
                 const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                 if (!name || !email || !password || !confirmPassword) {
                      messageDiv.textContent = 'Please fill in all fields.';
                      messageDiv.classList.add('error'); return;
                 }
                 if (!emailRegex.test(email)) {
                      messageDiv.textContent = 'Please enter a valid email address.';
                      messageDiv.classList.add('error'); return;
                 }
                 if (password !== confirmPassword) {
                      messageDiv.textContent = 'Passwords do not match.';
                      messageDiv.classList.add('error'); return;
                 }
                 if (password.length < 6) { // Basic password policy
                     messageDiv.textContent = 'Password must be at least 6 characters long.';
                     messageDiv.classList.add('error'); return;
                 }

                 // --- Simulate Signup Process ---
                 messageDiv.textContent = 'Creating account...';
                 messageDiv.classList.add('info');
                 signupButton.disabled = true; // Disable button

                 // In a real app, send name/email/password to your backend for user registration
                 // fetch('/api/signup', { method: 'POST', body: JSON.stringify({ name, email, password }), headers: { 'Content-Type': 'application/json' } })
                 // .then(response => response.json())
                 // .then(data => { ... handle success/failure ... })
                 // .catch(error => { ... handle error ... });

                 setTimeout(() => {
                     // --- SIMULATED SUCCESS ---
                     // In a real app, you might auto-login or redirect to login page
                     // For this simulation, we'll redirect to the login page
                     messageDiv.textContent = 'Account created successfully!';
                     messageDiv.classList.remove('info', 'error');
                     messageDiv.classList.add('success');

                     setTimeout(() => { window.location.href = 'login.html'; }, 1500); // Redirect after delay

                     // --- SIMULATED FAILURE (Example - uncomment to test failure) ---
                     // messageDiv.textContent = 'Signup failed. Email already exists.';
                     // messageDiv.classList.remove('info', 'success');
                     // messageDiv.classList.add('error');
                     signupButton.disabled = false; // Re-enable on failure

                 }, 1500); // Simulate network delay
            });
         } else if (window.location.pathname.includes('signup.html')) {
             console.warn("Signup page elements not found (signupForm, messageDiv, or signupButton). Signup form will not work.");
         }
    }

// --- START: AviationStack Flight Search Logic ---
// Ensure this code runs after the DOM is loaded, or place it within a DOMContentLoaded event listener if needed.

// --- HTML Element References ---
const flightForm = document.getElementById('flightForm');
const flightResultsDiv = document.getElementById('flightResults');
const flightDepartureInput = document.getElementById('departure');
const flightDestinationInput = document.getElementById('destination-flight');
const flightDepartureDateInput = document.getElementById('departureDate');

// --- City Name to IATA Code Mapping ---
// *** Add more cities and their primary airport IATA codes to this map as needed. ***
// Keys should be lowercase for case-insensitive lookup.
const cityIataMap = {
        // --- Provided Originals (India) ---
        'delhi': 'DEL',                 // Indira Gandhi International Airport
        'mumbai': 'BOM',                // Chhatrapati Shivaji Maharaj International Airport
        'bangalore': 'BLR',             // Kempegowda International Airport
        'chennai': 'MAA',               // Chennai International Airport
        'kolkata': 'CCU',               // Netaji Subhas Chandra Bose International Airport
        'hyderabad': 'HYD',             // Rajiv Gandhi International Airport
        'ahmedabad': 'AMD',             // Sardar Vallabhbhai Patel International Airport
        'pune': 'PNQ',                  // Pune Airport
        'jaipur': 'JAI',                // Jaipur International Airport
        'lucknow': 'LKO',               // Chaudhary Charan Singh International Airport
        'kochi': 'COK',                 // Cochin International Airport (Kochi/Ernakulam)
        'goa': 'GOI',                   // Dabolim Airport (Primary/Older Goa Airport)
        // 'goa-manohar': 'GOX',        // Manohar International Airport (Mopa, New Goa) - Add if needed
        'guwahati': 'GAU',              // Lokpriya Gopinath Bordoloi International Airport
        'thiruvananthapuram': 'TRV',    // Trivandrum International Airport
        'bhubaneswar': 'BBI',           // Biju Patnaik International Airport
        'nagpur': 'NAG',                // Dr. Babasaheb Ambedkar International Airport
        'indore': 'IDR',                // Devi Ahilya Bai Holkar Airport
        'visakhapatnam': 'VTZ',         // Visakhapatnam Airport
        'patna': 'PAT',                 // Jay Prakash Narayan Airport
        'coimbatore': 'CJB',            // Coimbatore International Airport
        'amritsar': 'ATQ',              // Sri Guru Ram Dass Jee International Airport
        'chandigarh': 'IXC',            // Chandigarh International Airport
        'surat': 'STV',                 // Surat Airport
        'vadodara': 'BDQ',              // Vadodara Airport
        'varanasi': 'VNS',              // Lal Bahadur Shastri Airport
        'srinagar': 'SXR',              // Sheikh ul-Alam International Airport
        'ranchi': 'IXR',                // Birsa Munda Airport
        'raipur': 'RPR',                // Swami Vivekananda Airport
        'madurai': 'IXM',               // Madurai Airport
        'jodhpur': 'JDH',               // Jodhpur Airport
        'leh': 'IXL',                   // Kushok Bakula Rimpochee Airport
        'udaipur': 'UDR',               // Maharana Pratap Airport
        'tiruchirappalli': 'TRZ',       // Tiruchirappalli International Airport
        'bagdogra': 'IXB',              // Bagdogra Airport (Siliguri)
        'mangalore': 'IXE',             // Mangalore International Airport
        'kozhikode': 'CCJ',             // Calicut International Airport
        'aurangabad': 'IXU',            // Aurangabad Airport
        'bhopal': 'BHO',                // Raja Bhoj Airport
        'vijayawada': 'VGA',            // Vijayawada Airport
        'agartala': 'IXA',              // Maharaja Bir Bikram Airport
        'imphal': 'IMF',                // Imphal Airport
        'dehradun': 'DED',              // Jolly Grant Airport
        'rajkot': 'RAJ',                // Rajkot Airport (New one uses HSR, check if needed)
        'port blair': 'IXZ',            // Veer Savarkar International Airport
        'dibrugarh': 'DIB',             // Dibrugarh Airport
        'jammu': 'IXJ',                 // Jammu Airport
        'silchar': 'IXS',               // Silchar Airport
        'hubli': 'HBX',                 // Hubballi Airport
        'nashik': 'ISK',                // Nashik Airport
        'tirupati': 'TIR',              // Tirupati Airport
        'allahabad': 'IXD',             // Prayagraj Airport (Allahabad)
        'prayagraj': 'IXD',             // Prayagraj Airport (Allahabad)
        'gorakhpur': 'GOP',             // Gorakhpur Airport
        'gwalior': 'GWL',               // Gwalior Airport
        'mysore': 'MYQ',                // Mysore Airport
        'jabalpur': 'JLR',              // Jabalpur Airport
        'kannur': 'CNN',                // Kannur International Airport
        'shirdi': 'SAG',                // Shirdi Airport
        'belgaum': 'IXG',               // Belgaum Airport (Belagavi)
        'belagavi': 'IXG',              // Belagavi Airport (Belgaum)
        'tuticorin': 'TCR',             // Tuticorin Airport
        'pondicherry': 'PNY',           // Pondicherry Airport
        'salem': 'SXV',                 // Salem Airport
        'shimla': 'SLV',                // Shimla Airport
        'kullu': 'KUU',                 // Kullu–Manali Airport (Bhuntar)
        'bhuntar': 'KUU',               // Kullu–Manali Airport (Bhuntar)
        'dharamshala': 'DHM',           // Kangra Airport (Gaggal, Dharamshala)
        'kangra': 'DHM',                // Kangra Airport (Gaggal, Dharamshala)
        'gaggal': 'DHM',                // Kangra Airport (Gaggal, Dharamshala)
        'tezpur': 'TEZ',                // Tezpur Airport
        'dimapur': 'DMU',               // Dimapur Airport
        'aizawl': 'AJL',                // Lengpui Airport (Aizawl)
        'shillong': 'SHL',              // Shillong Airport (Umroi)
        'pasighat': 'IXT',              // Pasighat Airport
        'latur': 'LTU',                 // Latur Airport
        'nanded': 'NDC',                // Nanded Airport
        'kolhapur': 'KLH',              // Kolhapur Airport
        'kandla': 'IXY',                // Kandla Airport (Gandhidham)
        'gandhidham': 'IXY',            // Kandla Airport (Gandhidham)
        'porbandar': 'PBD',             // Porbandar Airport
        'diu': 'DIU',                   // Diu Airport
        'jaisalmer': 'JSA',             // Jaisalmer Airport
        'bikaner': 'BKB',               // Bikaner Airport (Nal)
        'agra': 'AGR',                  // Agra Airport (Kheria)
        'khajuraho': 'HJR',             // Khajuraho Airport
        'satna': 'TNI',                 // Satna Airport
        'bilaspur': 'PAB',              // Bilaspur Airport (Bilasa Devi Kevat)
        'jagdalpur': 'JGB',             // Jagdalpur Airport
        'agatti': 'AGX',                // Agatti Aerodrome (Lakshadweep)
        'darbhanga': 'DBR',             // Darbhanga Airport
        'gaya': 'GAY',                  // Gaya Airport
        'cuddapah': 'CDP',              // Kadapa Airport (Cuddapah)
        'kadapa': 'CDP',                // Kadapa Airport (Cuddapah)
        'rajahmundry': 'RJA',           // Rajahmundry Airport
        'kurnool': 'KJB',               // Kurnool Airport (Orvakal)
        'vidyanagar': 'VDY',            // Vidyanagar Airport (Jindal, near Hampi)
        'jalgaon': 'JLG',               // Jalgaon Airport
        'kanpur': 'KNU',                // Kanpur Airport (Chakeri)
        'ludhiana': 'LUH',              // Ludhiana Airport (Sahnewal)
        'pathankot': 'IXP',             // Pathankot Airport
        'adamapur': 'AIP',              // Adampur Airport (Jalandhar)
        'jalandhar': 'AIP',             // Adampur Airport (Jalandhar)
        'bhavnagar': 'BHU',             // Bhavnagar Airport
        'jamnagar': 'JGA',              // Jamnagar Airport
        'bhuj': 'BHJ',                  // Bhuj Airport
        'pasco': 'IXT',                 // Pasighat Airport (Duplicate entry, keeping one)
        'lilabari': 'IXI',              // Lilabari Airport (North Lakhimpur)
        'jorhat': 'JRH',                // Jorhat Airport (Rowriah)
        'pakhyong': 'PYG',              // Pakyong Airport (Sikkim)
        'jharsuguda': 'JRG',            // Veer Surendra Sai Airport (Jharsuguda)
        'kishangarh': 'KQH',            // Kishangarh Airport (Ajmer)
        'ajmer': 'KQH',                 // Kishangarh Airport (Ajmer)
        'durgapur': 'RDP',              // Kazi Nazrul Islam Airport (Andal, Durgapur)
        'andal': 'RDP',                 // Kazi Nazrul Islam Airport (Andal, Durgapur)
        'bidar': 'IXX',                 // Bidar Airport (Tentative code, verify)
        'rupsi': 'RUP',                 // Rupsi Airport
        'bareilly': 'BEK',              // Bareilly Airport
        'kushinagar': 'KBK',            // Kushinagar International Airport
        'sindhudurg': 'SDW',            // Sindhudurg Airport (Chipi)
        'itanagar': 'HGI',              // Donyi Polo Airport, Itanagar (Hollongi)
    
    
        // --- Non-Indian examples (keep if needed for testing) ---
        'new york': 'JFK',
        'london': 'LHR',
        'paris': 'CDG',
        'tokyo': 'HND',
        'dubai': 'DXB',
        'san francisco': 'SFO',
        'dallas': 'DFW',
        'brussels': 'BRU',
    
};

// --- Helper Function: Get IATA from City Name ---
function getIataFromCity(cityName) {
    if (!cityName) return null;
    const normalizedCityName = cityName.trim().toLowerCase();
    return cityIataMap[normalizedCityName]; // Returns IATA code or undefined if not found
}

// --- Helper Regex: Validate IATA Format ---
const iataRegex = /^[A-Z]{3}$/; // Matches exactly 3 uppercase letters

// --- Main Flight Search Logic ---
// Check if all required elements and Axios are available before adding the event listener
if (flightForm && flightResultsDiv && flightDepartureInput && flightDestinationInput && flightDepartureDateInput) {

    if (typeof axios === 'undefined') {
        // Display error if Axios is not loaded
        console.error("Axios library not found. Make sure it is included via CDN in flights.html before script.js.");
        if (flightResultsDiv) { // Check if div exists before writing to it
             flightResultsDiv.innerHTML = `<p style="color: var(--error-color);">Required library (axios) not loaded. Check console.</p>`;
        }
    } else {
        // Add the event listener only if elements and Axios are ready
        flightForm.addEventListener('submit', async function(event) {
            event.preventDefault(); // Prevent default form submission
            flightResultsDiv.innerHTML = '<p>Searching flight schedules... <i class="fas fa-spinner fa-spin"></i></p>'; // Show loading indicator

            // 1. Get raw input values
            const departureValue = flightDepartureInput.value.trim();
            const arrivalValue = flightDestinationInput.value.trim();
            const departureDateValue = flightDepartureDateInput.value; // Assumes YYYY-MM-DD format

            // 2. Validate Date
            if (!departureDateValue) {
                flightResultsDiv.innerHTML = '<p style="color: var(--error-color);">Please select a departure date.</p>';
                return;
            }

            // 3. Determine Departure IATA
            let departureIata = getIataFromCity(departureValue);
            if (!departureIata) { // If not found in city map
                if (iataRegex.test(departureValue.toUpperCase())) { // Check if input is IATA format
                    departureIata = departureValue.toUpperCase();
                } else { // Invalid input
                    flightResultsDiv.innerHTML = `<p style="color: var(--error-color);">Invalid Departure: "${departureValue}". Please enter a recognized city or a 3-letter airport code (e.g., Delhi or DEL).</p>`;
                    return;
                }
            }

            // 4. Determine Arrival IATA
            let arrivalIata = getIataFromCity(arrivalValue);
            if (!arrivalIata) { // If not found in city map
                if (iataRegex.test(arrivalValue.toUpperCase())) { // Check if input is IATA format
                    arrivalIata = arrivalValue.toUpperCase();
                } else { // Invalid input
                    flightResultsDiv.innerHTML = `<p style="color: var(--error-color);">Invalid Destination: "${arrivalValue}". Please enter a recognized city or a 3-letter airport code (e.g., Mumbai or BOM).</p>`;
                    return;
                }
            }

            // 5. Proceed with API Call if IATA codes are valid
            if (departureIata && arrivalIata) {
                console.log(`Searching flights from IATA: ${departureIata} to IATA: ${arrivalIata} on ${departureDateValue}`);

                // --- AviationStack API Integration ---
                // !!! --- IMPORTANT: Replace with YOUR ACTUAL AviationStack API key --- !!!
                const apiKey = '1d274e095db4a1898337529c2585e4b8'; // <-- REPLACE THIS! (Keep it secure)

                // Basic check if the key looks like a placeholder
                // if ( apiKey === '1d274e095db4a1898337529c2585e4b8' || !apiKey || apiKey.length < 10) {
                //     flightResultsDiv.innerHTML = '<p style="color: red;">Flight search failed: API Key is missing or invalid.</p>';
                //     console.error("AviationStack API Key is missing or invalid. Please replace 'YOUR_AVIATIONSTACK_API_KEY' in script.js.");
                //     return; // Stop execution
                // }

                // Construct API URL (using http as per documentation example, consider https if available on your plan)
                const apiUrl = `http://api.aviationstack.com/v1/flights`;
                const params = {
                     access_key: apiKey,
                     dep_iata: departureIata,
                     arr_iata: arrivalIata,
                    //  flight_date: departureDateValue,
                     limit: 100 // Request up to 100 results (adjust as needed)
                 };

                console.log("Calling AviationStack API:", apiUrl, "with params:", params);

                try {
                    // Make the API request using Axios
                    const response = await axios.get(apiUrl, { params }); // Pass params object to Axios

                    console.log("AviationStack Flight Data Received:", response.data);

                    // Display results using the dedicated function
                    displayFlightResults(response.data);

                } catch (error) {
                    // Handle API errors (network, server, etc.)
                    console.error("AviationStack API Error (Axios):", error);
                    let errorMsg = 'An error occurred while fetching flight data.';

                    if (error.response) { // Server responded with an error status (4xx, 5xx)
                        console.error("API Error Response Data:", error.response.data);
                        const apiError = error.response.data?.error; // Check for aviationstack's specific error structure
                        errorMsg = `API Error (${error.response.status}): ${apiError?.message || apiError?.code || error.message}`;
                    } else if (error.request) { // Request was made but no response received
                        errorMsg = 'Network error: Could not connect to the flight server.';
                    } else { // Other setup errors
                        errorMsg = `Request Error: ${error.message}`;
                    }
                    flightResultsDiv.innerHTML = `<p style="color: var(--error-color);">${errorMsg}</p>`;
                }
            }
        }); // End of addEventListener
    } // End of Axios check

} else {
    // Log a warning if elements aren't found (helps debugging if search doesn't work)
     // Only log if we are likely on the flights page to avoid console noise on other pages
     if (window.location.pathname.includes('flights')) { // Adjust 'flights' if your page name is different
         console.warn("One or more flight search elements (form, inputs, results div) not found. Flight search functionality inactive.");
     }
}

// --- Function to Display Flight Results ---
// (This function takes the data from the API response and renders it in the HTML)
// --- Function to Display Flight Results in a Table ---
function displayFlightResults(aviationStackData) {
    // Ensure results div exists
    if (!flightResultsDiv) return;

    flightResultsDiv.innerHTML = ''; // Clear previous results or loading message

    const flights = aviationStackData?.data; // Flight data is usually in the 'data' array
    const apiError = aviationStackData?.error; // Check for API-level errors returned in the JSON
    const pagination = aviationStackData?.pagination;

    // 1. Handle API-specific errors first
    if (apiError) {
        flightResultsDiv.innerHTML = `<p style="color: var(--error-color);">API Error: ${apiError.message || apiError.code || 'Unknown error from AviationStack'}</p>`;
        console.error("AviationStack returned an error object:", apiError);
        return;
    }

    // 2. Handle successful response but no flights found
    if (!flights || !Array.isArray(flights) || flights.length === 0) {
         if (pagination && pagination.total === 0) {
             flightResultsDiv.innerHTML = "<p>No scheduled flights found for the selected criteria.</p>";
         } else {
             flightResultsDiv.innerHTML = "<p>No flight data available or response format was unexpected.</p>";
             console.warn("Received response but no valid flight data found:", aviationStackData);
         }
        return;
    }

    // 3. Create the table structure
    flightResultsDiv.innerHTML = `<h3>Flight Schedules Found:</h3>`; // Title for results

    const table = document.createElement('table');
    table.classList.add('flights-table'); // Add a class for styling

    // Create Table Header (thead)
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    const headers = ['Airline', 'Flight No.', 'From', 'Dep Time', 'To', 'Arr Time', 'Status'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });

    // Create Table Body (tbody)
    const tbody = table.createTBody();

    // 4. Populate table rows with flight data
    flights.forEach(flight => {
        const row = tbody.insertRow();

        // Safely extract data using optional chaining (?.) and nullish coalescing (??)
        const airlineName = flight.airline?.name ?? 'N/A';
        const flightNumber = flight.flight?.iata ?? flight.flight?.number ?? 'N/A';
        const depIata = flight.departure?.iata ?? 'N/A';
        const arrIata = flight.arrival?.iata ?? 'N/A';
        const status = flight.flight_status ?? 'Scheduled'; // Default to Scheduled if null

        // Format scheduled times (handle potential errors during Date parsing)
        let depTime = 'N/A';
        if (flight.departure?.scheduled) {
            try {
                // Format time as HH:MM (24-hour) using browser's locale settings
                depTime = new Date(flight.departure.scheduled).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            } catch (e) {
                console.error("Failed to parse departure time:", flight.departure.scheduled, e);
                depTime = 'Invalid Date'; // Indicate if parsing failed
            }
        }

        let arrTime = 'N/A';
        if (flight.arrival?.scheduled) {
            try {
                 // Format time as HH:MM (24-hour) using browser's locale settings
                arrTime = new Date(flight.arrival.scheduled).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            } catch (e) {
                console.error("Failed to parse arrival time:", flight.arrival.scheduled, e);
                arrTime = 'Invalid Date'; // Indicate if parsing failed
            }
        }

        // Add cells to the row in the correct order
        row.insertCell().textContent = airlineName;
        row.insertCell().textContent = flightNumber;
        row.insertCell().textContent = depIata;
        row.insertCell().textContent = depTime;
        row.insertCell().textContent = arrIata;
        row.insertCell().textContent = arrTime;
        row.insertCell().textContent = status.charAt(0).toUpperCase() + status.slice(1); // Capitalize status

    });

    flightResultsDiv.appendChild(table); // Add the complete table to the results div

    // 5. Add pagination info if available
    if (pagination) {
        const pageInfo = document.createElement('p');
        pageInfo.classList.add('pagination-info'); // Add class for styling
        pageInfo.textContent = `Showing ${pagination.count} of ${pagination.total} results.`;
        flightResultsDiv.appendChild(pageInfo);
    }
}


// --- END: AviationStack Flight Search Logic ---

}); // End of DOMContentLoaded listener

/*db*/
// Add this towards the end of your script.js or within a DOMContentLoaded listener

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const loginForm = document.getElementById('loginForm');
    const formMessageDiv = document.getElementById('formMessage'); // Shared message div

    // --- Helper to display form messages ---
    const showMessage = (message, isError = false) => {
        if (formMessageDiv) {
            formMessageDiv.textContent = message;
            formMessageDiv.style.display = 'block';
            formMessageDiv.style.color = isError ? 'var(--error-color, red)' : 'var(--success-color, green)';
            formMessageDiv.style.backgroundColor = isError ? '#ffebee' : '#e8f5e9';
            formMessageDiv.style.border = `1px solid ${isError ? 'var(--error-color, red)' : 'var(--success-color, green)'}`;
            formMessageDiv.style.padding = '10px';
            formMessageDiv.style.marginBottom = '15px';
            formMessageDiv.style.borderRadius = '4px';
        } else {
            // Fallback if message div isn't present on the page
            alert(message);
        }
    };

    // --- Helper to clear form messages ---
    const clearMessage = () => {
        if (formMessageDiv) {
            formMessageDiv.textContent = '';
            formMessageDiv.style.display = 'none';
        }
    };

    // --- SIGNUP FORM SUBMISSION ---
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent default HTML form submission
            clearMessage(); // Clear previous messages

            const nameInput = document.getElementById('name');
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const confirmPasswordInput = document.getElementById('confirmPassword');

            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // Frontend Validation
            if (!name || !email || !password || !confirmPassword) {
                showMessage('Please fill in all fields.', true);
                return;
            }
            if (password !== confirmPassword) {
                showMessage('Passwords do not match.', true);
                return;
            }
             if (password.length < 6) {
                 showMessage('Password must be at least 6 characters long.', true);
                 return;
             }


            try {
                // Send data to backend API endpoint
                const response = await fetch('http://localhost:3000/api/auth/signup', { // Use your backend server URL/port
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name, email, password }),
                });

                const data = await response.json(); // Parse the JSON response from the server

                if (response.ok && data.success) {
                    showMessage(data.message || 'Signup successful! Redirecting to login...', false);
                    // Optionally clear the form
                    signupForm.reset();
                    // Redirect to login page after a short delay
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000); // 2 seconds delay
                } else {
                    // Show error message from the backend
                    showMessage(data.message || 'Signup failed. Please try again.', true);
                }

            } catch (error) {
                console.error('Signup Fetch Error:', error);
                showMessage('An error occurred during signup. Please check your connection and try again.', true);
            }
        });
    }

    // --- LOGIN FORM SUBMISSION ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearMessage();

            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            // Frontend Validation
            if (!email || !password) {
                showMessage('Please enter both email and password.', true);
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/auth/login', { // Use your backend server URL/port
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    showMessage(data.message || 'Login successful! Redirecting...', false);

                    // --- Store JWT and User Info ---
                    if (data.token) {
                        localStorage.setItem('authToken', data.token); // Store token
                    }
                    if (data.user) {
                         localStorage.setItem('userInfo', JSON.stringify(data.user)); // Store user info (name, email, id)
                    }

                    loginForm.reset();
                    // Redirect to the home page or dashboard after login
                     setTimeout(() => {
                         window.location.href = 'index.html'; // Redirect to home page
                     }, 1500); // 1.5 seconds delay

                } else {
                    showMessage(data.message || 'Login failed. Please check your credentials.', true);
                }

            } catch (error) {
                console.error('Login Fetch Error:', error);
                showMessage('An error occurred during login. Please check your connection and try again.', true);
            }
        });
    }

    // --- UPDATE NAVBAR BASED ON LOGIN STATE (Run on every page load) ---
    const updateNavbar = () => {
        const token = localStorage.getItem('authToken');
        const userInfoString = localStorage.getItem('userInfo');
        const loggedOutLinks = document.querySelectorAll('.auth-link.logged-out');
        const loggedInLinks = document.querySelectorAll('.auth-link.logged-in');
        const userGreetingSpan = document.getElementById('user-greeting');
        const logoutBtn = document.getElementById('logout-btn');

        if (token && userInfoString) {
            // User is logged in
            try {
                 const userInfo = JSON.parse(userInfoString);
                 if (userGreetingSpan) {
                     userGreetingSpan.textContent = `Hi, ${userInfo.name || 'User'}`; // Display user's name
                 }
            } catch(e) { console.error("Error parsing user info", e); /* Handle potential JSON parse error */}

            loggedOutLinks.forEach(link => link.style.display = 'none');
            loggedInLinks.forEach(link => link.style.display = 'list-item'); // Or 'block'/'inline' depending on layout

            // Add logout functionality
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    // Clear stored token and user info
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userInfo');
                    // Update navbar immediately
                    updateNavbar();
                    // Optionally redirect to home or login page
                    window.location.href = 'index.html';
                });
            }

        } else {
            // User is logged out
            loggedOutLinks.forEach(link => link.style.display = 'list-item'); // Or 'block'/'inline'
            loggedInLinks.forEach(link => link.style.display = 'none');
        }
    };

    updateNavbar(); // Call function on page load to set initial state

}); // End of DOMContentLoaded