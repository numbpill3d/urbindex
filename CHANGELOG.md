# Changelog

All notable changes to the Urbindex project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-11-16

### 🚀 Major Location Features Added

#### Enhanced Location Detection System
- **Smart User Location Detection**: Map now automatically detects and centers on user's actual location instead of defaulting to NYC
- **Automatic Location Detection**: Added automatic location detection on page load with proper permission handling
- **Fallback Intelligence**: Smart fallbacks when location detection fails (locale-based defaults)
- **Location Caching**: Session-based caching of user location for improved performance (5-minute cache)
- **Cross-browser Compatibility**: Comprehensive error handling for various geolocation scenarios

#### Address Geocoding System
- **Address Field in Posting Template**: Users can now enter addresses in the posting modal
- **OpenStreetMap Nominatim Integration**: Free geocoding service for address-to-coordinates conversion
- **"Find Location" Button**: Geocodes entered addresses and centers map on found location
- **"Use My Location" Button**: Combines browser geolocation with address lookup
- **Reverse Geocoding**: Converts coordinates back to readable addresses
- **Rate Limit Handling**: Respects Nominatim API usage policies and handles rate limiting

#### Enhanced User Interface
- **Location Indicators**: Visual feedback during location detection and geocoding
- **Loading States**: Loading indicators and user feedback during location operations
- **Error Handling**: Comprehensive error messages and fallback behaviors
- **Temporary Markers**: Visual markers show found locations temporarily (auto-remove after 3-10 seconds)
- **Enhanced Coordinates Display**: Better formatting and visual feedback for coordinate selection

#### Technical Improvements
- **Session Management**: Location data cached locally for improved performance
- **Performance Optimization**: Debounced requests, lazy loading, efficient marker management
- **Accessibility**: Screen reader announcements for location operations
- **Security**: HTTPS requirement for geolocation, proper user consent handling

### 🐛 Bug Fixes and Improvements

#### Fixed Issues
- Fixed "Add Location" functionality by connecting the floating button to the map's location adding system
- Fixed potential element overlapping issues by adding proper z-index to floating button
- Fixed location detection failures on certain browsers and devices
- Fixed rate limiting issues with geocoding requests
- Fixed location permission handling edge cases

#### UI/UX Improvements
- Improved button visibility with neon glow effect and hover state
- Enhanced user feedback when location services are unavailable or user is not authenticated
- Moved radar widget from upper right corner to bottom left corner for better user experience
- Fixed ASCII title display in header and splash screen to prevent cutting off
- Added glow effect to ASCII title for better visibility and aesthetic appeal
- Added floating "Add Location" button with proper styling and positioning

#### Performance Enhancements
- Location caching reduces repeated API calls
- Optimized geocoding requests with proper delays
- Efficient marker management and cleanup
- Reduced page load times with smart location detection

### 📋 Documentation Updates
- Added comprehensive LOCATION_FEATURES.md documentation
- Updated README.md with new location features overview
- Enhanced GETTING_STARTED.md with location setup instructions
- Added troubleshooting sections for location issues
- Documented browser compatibility and requirements

### 🔧 Technical Details
- **Geocoding API**: OpenStreetMap Nominatim (free service)
- **Browser Support**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile Support**: iOS Safari, Android Chrome
- **Cache Duration**: 5 minutes for user location data
- **Rate Limits**: 1 request/second for geocoding API
- **Security**: HTTPS required, user consent mandatory

### ⚡ Breaking Changes
- **Location Default**: Map now centers on user location by default instead of NYC
- **Permission Required**: Location features require explicit user permission
- **HTTPS Required**: Geolocation only works on secure connections (HTTPS or localhost)

### 🆕 New API Endpoints
- **Geocoding**: `GET /search?format=json&q={address}` (Nominatim)
- **Reverse Geocoding**: `GET /reverse?format=json&lat={lat}&lon={lng}` (Nominatim)

### 🧪 Testing
- Cross-browser compatibility testing completed
- Mobile device testing on iOS and Android
- Error scenario testing (denied permissions, network failures, rate limits)
- Performance testing with location caching

## [1.1.0] - 2025-08-15

### Added
- Added floating "Add Location" button with proper styling and positioning
- Added event listener to "Add Location" button that checks for authentication and gets user location
- Added placeholder intro posts to the forum for better user onboarding

### Fixed
- Fixed "Add Location" functionality by connecting the floating button to the map's location adding system
- Fixed potential element overlapping issues by adding proper z-index to floating button
- Improved button visibility with neon glow effect and hover state

### Changed
- Updated map initialization to include "Add Location" button setup
- Enhanced user feedback when location services are unavailable or user is not authenticated
- Moved radar widget from upper right corner to bottom left corner for better user experience and to prevent overlapping with other UI elements
- Fixed ASCII title display in header and splash screen to prevent cutting off
- Added glow effect to ASCII title for better visibility and aesthetic appeal
