# 🎵 ISRCFinder - ISRC Code Extractor

ISRCFinder is a browser extension designed to help users find **International Standard Recording Codes (ISRCs)** from various online music platforms. The ISRC is a unique identifier for music recordings, useful for musicians, producers, and rights holders.

## 🚀 Features
- Extract **ISRC codes** from supported music streaming services.
- Easy-to-use **popup interface**.
- **Background script** processes web pages automatically.
- **Customizable settings** to enhance user experience.
- Works on **Chrome** and **Firefox**.

## 🛠 Installation

### 🔹 Install Manually (Developer Mode)
1. **Download** the repository:
   ```sh
   git clone https://github.com/enisgjinii/ISRCFinder.git
   cd ISRCFinder
   ```
2. Open **Google Chrome** and go to:
   ```
   chrome://extensions/
   ```
3. **Enable Developer Mode** (toggle switch in the top-right).
4. Click **"Load unpacked"** and select the `ISRCFinder` folder.
5. The extension is now installed and ready to use!

## 🎮 How to Use
1. Navigate to a music streaming platform (e.g., Spotify, YouTube, or others).
2. Click the **ISRCFinder icon** in the browser toolbar.
3. The popup will display the extracted **ISRC codes**.
4. Copy and use the codes for your records or music rights management.

## 📁 Project Structure
```
ISRCFinder/
│── background.js     # Background script for processing ISRC codes
│── manifest.json     # Browser extension manifest file
│── popup.html        # HTML structure for the extension popup
│── popup.js          # JavaScript logic for the popup UI
│── options.html      # Settings page for the extension
│── options.js        # JavaScript logic for settings
│── style.css         # CSS styles for the popup and settings
│── icons/            # Extension icons
│── utils/            # Utility scripts (if any)
```

## 🔧 Technologies Used
- **JavaScript** – For core functionality.
- **HTML & CSS** – For the UI.
- **Chrome Extension APIs** – For accessing and modifying web pages.

## 📌 Future Improvements
- Support for more streaming platforms.
- Option to export ISRC codes to CSV.
- Improved UI/UX for better usability.

## 🤝 Contributing
Contributions are welcome! Feel free to **fork** the repo and submit a **pull request**.

1. Fork the project.
2. Create a feature branch (`git checkout -b feature-name`).
3. Commit your changes (`git commit -m "Added new feature"`).
4. Push to your branch (`git push origin feature-name`).
5. Open a pull request.

## 📜 License
This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

---

### 🎧 Happy Music Tracking! 🎶
