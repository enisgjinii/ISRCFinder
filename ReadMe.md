# Kërkuesi i Avancuar i Spotify (Cross-Browser)

This extension finds metadata for Spotify tracks and albums—including ISRC, UPC, Audio Features, and album info—using a single codebase that works across Chrome, Firefox, and Edge.

## File Structure

- **[background.js](background.js)**  
  Contains the background service which handles fetching Spotify tokens and retrieving track, album, and search data from the Spotify API.

- **[manifest.json](manifest.json)**  
  Defines the extension metadata, permissions, and configuration including the popup and options pages.

- **[popup.html](popup.html)** and **[popup.js](popup.js)**  
  Provide the main UI for the extension. Users can detect the current tab (Spotify or YouTube), enter URLs, and search for tracks/albums.

- **[options.html](options.html)** and **[options.js](options.js)**  
  Allow users to save their Spotify Client ID and Secret credentials, set the duration for saved credentials, and test the credentials.

- **[style.css](style.css)**  
  Contains the shared styles for the popup and options pages including dark mode, layout, buttons, cards, and animations.

## Features

- **Spotify API Integration:**  
  Uses stored credentials to request a Spotify token and fetch metadata from endpoints such as `/v1/tracks`, `/v1/albums`, `/v1/search`, etc.

- **YouTube to Spotify Workflow:**  
  Detects YouTube pages for videos, extracts the title, and performs a search on Spotify for similar tracks.

- **Dark Mode and Expanded View:**  
  Supports toggling dark mode and expanding the popup view for a better user experience.

- **Credential Management:**  
  An options page to save, test, and clear Spotify credentials that are stored locally.

- **Result Export:**  
  Users can copy metadata (e.g. ISRC, UPC) to the clipboard or download JSON files containing detailed track/album information.

## Installation

1. Clone or download the repository.
2. Open Google Chrome (or Firefox/Edge) and navigate to the extensions page.
3. Enable Developer Mode.
4. Click "Load unpacked" and select the project folder.
5. The extension icon should now be visible in your browser.

## Usage

- **Popup:**  
  Click the extension icon to open the popup. Use the buttons to detect the current tab or enter Spotify URLs manually. You can also search for tracks or albums.

- **Options:**  
  Click the "⚙️ Opsionet" button in the popup to open the options page. Enter your Spotify Client ID and Secret, choose how long the credentials remain valid, and test the credentials.

## License

This project is for demonstration purposes. Note that storing credentials locally is not recommended for production environments.
