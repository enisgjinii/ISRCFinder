# 🎵 ISRCFinder - YouTube to Spotify Metadata Extractor

A powerful browser extension that bridges YouTube and Spotify to extract ISRC/UPC codes and music metadata. Perfect for music professionals, rights holders, and metadata enthusiasts.

## ✨ Key Features

- 🔍 **Smart Detection**: Automatically detects YouTube URLs from current tab or clipboard
- 🎯 **Accurate Matching**: Advanced similarity algorithm to find the right track on Spotify
- 🔄 **Real-time Sync**: Instant metadata retrieval and automatic search
- 🎨 **Modern UI**: Clean, responsive interface with dark/light mode support
- 🌍 **Multi-language**: Supports English, Albanian, and German
- 💾 **Auto-saving**: All results persist locally

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   git clone https://github.com/enisgjinii/ISRCFinder
   cd ISRCFinder
   ```

2. **Configure API Keys**
   - Get Spotify API credentials from [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Get YouTube Data API key from [Google Cloud Console](https://console.cloud.google.com)
   - Add them in extension settings

3. **Load Extension**
   - Open Chrome Extensions (chrome://extensions/)
   - Enable Developer Mode
   - Click "Load unpacked"
   - Select the ISRCFinder folder

## 🎮 Usage

1. **YouTube Integration**
   - Click extension icon on any YouTube video
   - Or paste YouTube URL manually
   - Extension auto-extracts video info

2. **Spotify Search**
   - Auto-searches Spotify using cleaned video title
   - Manual search option available
   - Batch process multiple Spotify links

3. **Metadata Extraction**
   - Click "Details" to view full metadata
   - One-click ISRC/UPC copying
   - Preview audio samples when available

## ⚙️ Advanced Features

- **Keyboard Shortcuts**
  - `Ctrl/⌘ + Enter`: Fetch YouTube info
  - `Ctrl/⌘ + S`: Search Spotify
  - `Ctrl/⌘ + L`: Clear results

- **Customization**
  - Accent color picker
  - Font size adjustment
  - Auto-fetch settings
  - Export format options

- **Data Management**
  - Local result caching
  - Backup/Restore settings
  - Multiple export formats

## 🛠️ Technical Details

```javascript
Extension Structure:
├── manifest.json        # Extension configuration
├── popup/              # Main extension UI
├── background/         # Background processes
├── utils/             # Shared utilities
└── _locales/          # Language files
```

## 🔒 Privacy & Security

- No data sent to external servers
- All API calls made directly to YouTube/Spotify
- Local storage only for user preferences
- No tracking or analytics

## 🐛 Troubleshooting

Common issues and solutions:

1. **API Key Issues**
   - Verify Spotify API credentials
   - Check YouTube API quota
   - Ensure proper format of keys

2. **No Results**
   - Check internet connection
   - Verify video availability
   - Try manual search

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

ISRCFinder is MIT licensed. See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- [YouTube Data API](https://developers.google.com/youtube/v3)
- [Inter Font](https://fonts.google.com/specimen/Inter)
- [Boxicons](https://boxicons.com/)

---

<p align="center">Made with ❤️ for the music industry</p>
