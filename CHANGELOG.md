# Changelog

All notable changes to the Urbindex project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
