# Urbindex - Urban Exploration Mapping PWA

Urbindex is a Progressive Web App (PWA) designed for urban explorers to mark, categorize, and rate interesting locations. With a cyberpunk/neon aesthetic, the app provides a seamless experience on iOS devices when installed to the home screen.

![Urbindex Screenshot](images/screenshots/map-view.png)

## Features

- **Interactive Map**: Explore and discover urban locations using OpenStreetMap with Leaflet.js
- **Location Marking**: Tap to add new locations with details and categories
- **User Ratings**: Rate locations with thumbs up/down system
- **Leaderboard**: See top contributors and compete for the highest score
- **Offline Support**: View and add locations even without an internet connection
- **iOS Home Screen Installation**: Full-screen experience when added to iOS home screen
- **Firebase Integration**: Google Sign-in authentication and Firestore database
- **Cyberpunk Aesthetic**: Neon colors, glowing UI elements, and smooth animations

## Installation

### For Users

1. Visit the Urbindex website on your iOS device
2. Tap the Share button in Safari
3. Select "Add to Home Screen"
4. The app will now appear on your home screen with a native app-like experience

### For Developers

1. Clone this repository
2. Create a Firebase project and enable Authentication and Firestore
3. Update the Firebase configuration in `js/config.js`
4. Deploy to a web server or use a local development server

```bash
# Example using a simple HTTP server
npx http-server -p 8080
```

## Project Structure

```
urbindex/
├── index.html              # Main HTML file
├── manifest.json           # PWA manifest
├── service-worker.js       # Service worker for offline support
├── css/
│   └── styles.css          # Main stylesheet
├── js/
│   ├── app.js              # Main application logic
│   ├── auth.js             # Authentication handling
│   ├── config.js           # Firebase configuration
│   ├── leaderboard.js      # Leaderboard functionality
│   ├── locations.js        # Location data handling
│   ├── map.js              # Map functionality
│   └── offline.js          # Offline support
└── images/
    ├── icons/              # App icons for various sizes
    └── screenshots/        # App screenshots
```

## Firebase Setup

1. Create a new Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Google Authentication
3. Create a Firestore database with the following collections:
   - `locations`: For storing location data
   - `users`: For user profiles
   - `ratings`: For location ratings
4. Update the Firebase configuration in `js/config.js`

## Customization

- **Colors**: Edit CSS variables in `css/styles.css` to change the color scheme
- **Map**: Modify map settings in `js/map.js` to change the initial view
- **Categories**: Update location categories in the HTML and JS files

## Browser Compatibility

- Chrome (desktop and mobile)
- Safari (desktop and mobile)
- Firefox (desktop and mobile)
- Edge (desktop)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [OpenStreetMap](https://www.openstreetmap.org/) for map data
- [Leaflet.js](https://leafletjs.com/) for map functionality
- [Firebase](https://firebase.google.com/) for backend services
- [Google Fonts](https://fonts.google.com/) for typography
