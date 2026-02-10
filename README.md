# Procare Media Downloader (v1.0) 📸

A powerful Chrome/Edge extension to bulk download photos and videos from the Procare parent portal. Features a visual calendar interface, smart memory, and crash protection.

## ✨ Key Features
* **📅 Visual Calendar:** Tracks progress with a color-coded yearly grid.
* **🧠 Smart Memory:** Remembers scanned weeks so you can stop/resume anytime.
* **📂 Custom Folders:** Saves media into a specific subfolder (e.g., `Downloads/KidName/2026`).
* **🛡️ Singleton Guard:** Prevents multiple scan instances from overlapping.
* **🔮 Future Guard:** Automatically stops scanning when the date reaches today.
* **⚡ Smart Retry:** Retries network errors but skips successfully downloaded weeks.

## 🚀 Installation
1.  Download this repository.
2.  Open **Chrome** or **Edge** and go to `chrome://extensions`.
3.  Enable **Developer Mode**.
4.  Click **Load Unpacked**.
5.  Select this folder.

## 📖 Usage
1.  Log in to the [Procare Parent Portal](https://schools.procareconnect.com/).
2.  Click the extension icon.
3.  Select your **Start Date** and **End Date**.
4.  Enter a **Folder Name** (optional).
5.  Click **"Download Everything"**.

## 🛠 Project Structure
* `manifest.json` - Extension configuration and permissions.
* `content.js` - The main logic (Calendar UI, Scanner, Memory).
* `background.js` - Handles file downloads and network requests.
* `popup.html` / `popup.js` - The menu interface.

## ⚠️ Disclaimer
This tool is for personal backup use only. Please use responsibly to avoid overwhelming Procare servers.