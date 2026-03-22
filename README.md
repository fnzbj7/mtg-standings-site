# MTG Standings Site

This project is a simple web application designed to display the standings of players in Magic: The Gathering events. It fetches data from a JSON file and presents it in a user-friendly format.

## Project Structure

```
mtg-standings-site
├── src
│   ├── index.html         # Main HTML document
│   ├── styles
│   │   └── main.css       # CSS styles for the website
│   ├── js
│   │   ├── app.js         # Main JavaScript logic (entry point)
│   │   ├── constants.js   # Shared constants
│   │   ├── data.js        # Data management functions
│   │   ├── standings.js   # Standings calculation logic
│   │   ├── storage.js     # localStorage helpers
│   │   └── ui.js          # UI rendering and event handling
│   └── data
│       └── sample-event.json # Sample event data in JSON format
├── .gitignore             # Git ignore file
├── package.json           # npm configuration file
└── README.md              # Project documentation
```

## Getting Started

To get a local copy up and running, follow these simple steps:

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mtg-standings-site.git
   ```

2. **Navigate to the project directory**
   ```bash
   cd mtg-standings-site
   ```

3. **Install dependencies**
   If you have npm installed, run:
   ```bash
   npm install
   ```

4. **Open the index.html file**
   You can open the `src/index.html` file in your web browser to view the application.

## Features

- Displays player standings including points and OMW%.
- Fetches data from a JSON file for easy updates.
- Responsive design for better usability on different devices.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License

This project is open-source and available under the [MIT License](LICENSE).