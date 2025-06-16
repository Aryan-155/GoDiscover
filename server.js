// server.js (TESTING VERSION - Hotels/Restaurants Code Commented Out)

require('dotenv').config(); // Load environment variables first
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const mongoose = require('mongoose'); // <-- ADD THIS LINE
// --- H&R CODE COMMENTED OUT ---
// const fetch = require('node-fetch'); // Or use axios: const axios = require('axios');
// --- END H&R CODE COMMENTED OUT ---
const authRoutes = require('./routes/auth');
const app = express();
const port = process.env.PORT || 3000; // Use port from .env or default

// --- Middleware ---
app.use(cors()); // Enable CORS for requests from frontend
app.use(express.json()); // Parse JSON request bodies

// --- Database Connection ---
const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
             console.error("\nFATAL ERROR: MONGODB_URI is not set in the .env file.\nPlease check your .env file configuration.\n");
             process.exit(1); // Exit if DB connection string is missing
        }
        await mongoose.connect(mongoUri);
        console.log('MongoDB Connected successfully.');
    } catch (err) {
        console.error('MongoDB Connection Error:', err.message);
        // Exit process with failure if DB connection fails
        process.exit(1);
    }
};
connectDB(); // Call the function to connect to the database on server start

// --- Google AI Configuration ---
const googleApiKey = process.env.GOOGLE_API_KEY;
if (!googleApiKey) {
  console.error("\nFATAL ERROR: GOOGLE_API_KEY is not set in the .env file.\n" +
                "Please create a .env file in the backend directory with:\n" +
                "GOOGLE_API_KEY=YourActualGoogleAiStudioApiKeyHere\n");
  process.exit(1); // Exit if API key is missing
}
const genAI = new GoogleGenerativeAI(googleApiKey);

// Safety Settings for Google AI (Adjust thresholds if needed)
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];
app.use('/api/auth', authRoutes);
// --- Itinerary Generation Endpoint ---
app.post('/api/generate-itinerary', async (req, res) => {
    const { startDate, endDate, guests, destination, interests, travelStyle, budgetRange } = req.body;

    // Basic Input Validation
    if (!startDate || !endDate || !guests) {
        return res.status(400).json({ error: 'Missing required fields: startDate, endDate, guests are required.' });
    }
    if (isNaN(parseInt(guests)) || parseInt(guests) <= 0) {
        return res.status(400).json({ error: 'Number of guests must be a positive number.' });
    }
    try {
        if (new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({ error: 'End date cannot be before start date.' });
        }
    } catch(e) {
         return res.status(400).json({ error: 'Invalid date format provided.' });
    }


    console.log('[Itinerary] Received request:', req.body);
    // Construct the Prompt for Gemini
    const prompt = `
        Create a personalized travel itinerary for a trip in India based on the following details:
        - Start Date: ${startDate}
        - End Date: ${endDate}
        - Number of Guests: ${guests}
        ${destination ? `- Specific Destination Requested: ${destination}` : '- No specific destination requested; suggest based on interests.'}
        - Interests: ${interests || 'General sightseeing'}
        - Travel Style: ${travelStyle || 'Moderate'}
        - Budget Range (INR per person, approximate total trip): ${budgetRange || 'Not specified'}

        Instructions for the itinerary:
        1. Provide a detailed day-by-day plan from the start date to the end date.
        2. For each day, suggest: A primary location (city/area), specific activities or sights (mention 2-3 distinct options), and relevant restaurant/food types (e.g., 'local street food', 'fine dining', 'cafe').
        3. ${destination
            ? `**Strongly prioritize the requested destination: ${destination}.** Structure the entire itinerary around this location and potentially relevant nearby areas fitting the duration and interests. If the destination is broad (like 'Rajasthan'), suggest a feasible route within that region.`
            : `Suggest one or two suitable primary destinations in India based on the interests, budget, and duration. Then build the itinerary around the suggested destination(s).`
        }
        4. Ensure suggestions align with interests, style, and budget. Consider travel time between locations if suggesting multiple places.
        5. Format the output clearly using markdown (e.g., use **Day X: [Date] - [Location]** for headings, use bullet points (-) for activities and food).
        6. Ensure the plan is feasible within the given dates.
        7. Do not include introductory remarks like "Here is your itinerary:" or concluding remarks. Just provide the plan itself, starting directly with Day 1.
    `;

    try {
        const model = genAI.getGenerativeModel({
            // *** USE A VALID MODEL NAME ***
            model: "gemini-2.0-flash", // Or "gemini-1.5-flash-latest"
            safetySettings
        });

        console.log('[Itinerary] Sending prompt to Google AI...');
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const itineraryText = response.text();
        console.log('[Itinerary] Received response from Google AI.');

        // Check for blocked content or empty response
        if (!itineraryText) {
            if (response.promptFeedback?.blockReason) {
               const blockReason = response.promptFeedback.blockReason;
               console.error("[Itinerary] Gemini request blocked:", blockReason);
               console.error("[Itinerary] Safety Ratings:", response.candidates?.[0]?.safetyRatings);
               throw new Error(`Content generation blocked due to safety settings: ${blockReason}. Try adjusting your request.`);
            }
             throw new Error("Google AI returned an empty response.");
        }

        res.json({ itinerary: itineraryText });

    } catch (error) {
        console.error("[Itinerary] Error calling Google AI API:", error); // Log the specific error
        res.status(500).json({ error: `Failed to generate itinerary. ${error.message.includes('safety settings') ? error.message : 'Please check server logs.'}` });
    }
});


// --- Hotels & Restaurants ---

// --- H&R CODE COMMENTED OUT ---

// Helper: Geocode using Nominatim
async function geocodeLocation(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    console.log(`[Geocoding] Requesting: ${url}`);
    try {
        const response = await fetch(url, {
            headers: {
                // !!! IMPORTANT: REPLACE with your app info/email for Nominatim Policy !!!
                'User-Agent': 'GoDiscoverApp/1.0 (Node.js Backend; contact: your.email@example.com)'
            }
        });
        if (!response.ok) {
            throw new Error(`Nominatim request failed: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (data && data.length > 0) {
            console.log(`[Geocoding] Found: ${data[0].display_name}`);
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon),
                displayName: data[0].display_name
            };
        } else {
            console.log(`[Geocoding] No results for query: "${query}"`);
            return null;
        }
    } catch (error) {
        console.error("[Geocoding] Error:", error.message);
        throw new Error(`Geocoding failed: ${error.message}`);
    }
}

// Helper: Query Overpass API
async function queryOverpass(latitude, longitude, radiusMeters = 5000) { // Default 5km
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const query = `
        [out:json][timeout:30];
        (
          node["amenity"~"^(restaurant|cafe|fast_food|pub|bar)$"](around:${radiusMeters},${latitude},${longitude});
          node["tourism"~"^(hotel|guest_house|motel|hostel|chalet|alpine_hut)$"](around:${radiusMeters},${latitude},${longitude});
        );
        out body; >; out skel qt;
    `;
    console.log(`[Overpass] Querying around ${latitude}, ${longitude} (radius ${radiusMeters}m)`);

    try {
        const response = await fetch(overpassUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `data=${encodeURIComponent(query)}`
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Overpass] API Error Response:", errorText.substring(0, 500));
            throw new Error(`Overpass API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const places = data.elements
            .filter(el => el.type === 'node' && el.tags && el.tags.name)
            .map(el => ({
                id: el.id, name: el.tags.name,
                type: el.tags.tourism || el.tags.amenity || 'other',
                cuisine: el.tags.cuisine, website: el.tags.website || el.tags["contact:website"],
                phone: el.tags.phone || el.tags["contact:phone"],
                lat: el.lat, lon: el.lon, tags: el.tags
            }))
            .filter((place, index, self) => index === self.findIndex((p) => (p.name === place.name && p.lat === place.lat && p.lon === place.lon)));

        console.log(`[Overpass] Found ${places.length} unique named places.`);
        return places;

    } catch (error) {
        console.error("[Overpass] Query error:", error.message);
        throw new Error(`Overpass query failed: ${error.message}`);
    }
}

// Endpoint: Search Places by Text Query
app.post('/api/search-places', async (req, res) => {
    const { query } = req.body;
    if (!query) {
        return res.status(400).json({ error: 'Missing search query' });
    }
    console.log(`[Places Search] Received query: "${query}"`);

    try {
        const location = await geocodeLocation(query);
        if (!location) {
            return res.json({ places: [], message: `Could not find location for "${query}". Please try a different search term.` });
        }
        const places = await queryOverpass(location.lat, location.lon);
        res.json({ places: places, searchCenter: location });
    } catch (error) {
        res.status(500).json({ error: `Failed to search places: ${error.message}` });
    }
});

// Endpoint: Search Nearby Places by Coordinates
app.post('/api/nearby-places', async (req, res) => {
    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: 'Missing latitude or longitude' });
    }
    console.log(`[Nearby Search] Received coords: ${latitude}, ${longitude}`);
    try {
        const places = await queryOverpass(latitude, longitude);
        res.json({ places: places });
    } catch (error) {
        res.status(500).json({ error: `Failed to fetch nearby places: ${error.message}` });
    }
});

// --- END H&R CODE COMMENTED OUT ---


// --- Basic Root Route for Testing ---
app.get('/', (req, res) => {
    res.send('GoDiscover Backend (TESTING - H&R Disabled) is running!'); // Updated message
});

// --- Start the Server ---
app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
    // Startup Warnings for missing essential configurations
    if (!googleApiKey) {
         console.warn("\nWARNING: GOOGLE_API_KEY is missing from .env. Itinerary generation will fail.\n");
    }
    if (!process.env.MONGODB_URI) {
         console.warn("\nWARNING: MONGODB_URI is missing from .env. Database connection and authentication will fail.\n");
    }
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'YOUR_REALLY_STRONG_SECRET_KEY_GOES_HERE_CHANGE_ME') {
         console.warn("\nSECURITY WARNING: JWT_SECRET is missing or using the default placeholder in .env. Please set a strong, unique secret!\n");
    }
});


