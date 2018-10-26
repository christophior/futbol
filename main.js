const { app, BrowserWindow, ipcMain, Tray } = require('electron');
const Positioner = require('electron-positioner');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const isDev = require('electron-is-dev');

const assetsDirectory = path.join(__dirname, 'assets');

let tray = undefined;
let window = undefined;

// update logic
const checkForUpdate = () => {
	autoUpdater.checkForUpdates();
}

autoUpdater.on('update-downloaded', (info) => {
	autoUpdater.quitAndInstall();
});

// update rate, 1hr
const updateRate = 60 * 60 * 1000;
setInterval(checkForUpdate, updateRate);

// Don't show the app in the doc
app.dock.hide();

app.on('ready', () => {

	if (!isDev) {
		checkForUpdate();
	}

	createTray();
	createWindow();
	showWindow();
})

// Quit the app when the window is closed
app.on('window-all-closed', () => {
	app.quit()
})

const createTray = () => {
	tray = new Tray(path.join(assetsDirectory, 'soccerball.png'))
	tray.on('right-click', toggleWindow);
	tray.on('double-click', toggleWindow);
	tray.on('click', function (event) {
		toggleWindow();


		// Show devtools
		// if (isDev) {
		window.openDevTools({ mode: 'detach' })
		// }
	});
}

const getWindowPosition = () => {
	const positioner = new Positioner(window),
		trayBounds = tray.getBounds();

	let position = positioner.calculate('trayCenter', trayBounds);

	// move window down 2 extra pixels
	position.y = position.y + 2;

	return position;
}

const createWindow = () => {
	window = new BrowserWindow({
		width: 300,
		height: 450,
		show: false,
		frame: false,
		fullscreenable: false,
		resizable: false,
		transparent: true,
		webPreferences: {
			// Prevents renderer process code from not running when window is
			// hidden
			backgroundThrottling: false
		}
	});
	window.loadURL(`file://${path.join(__dirname, 'index.html')}`);

	// Hide the window when it loses focus
	window.on('blur', () => {
		if (!window.webContents.isDevToolsOpened()) {
			window.hide();
		}
	});
}

const toggleWindow = () => {
	if (window.isVisible()) {
		window.hide();
	} else {
		showWindow();
	}
}

const showWindow = () => {
	const position = getWindowPosition();
	window.setVisibleOnAllWorkspaces(true);
	window.setPosition(position.x, position.y, false);
	window.show();
	window.focus();
}

ipcMain.on('show-window', () => {
	showWindow();
})

ipcMain.on('hide-window', () => {
	if (window.isVisible()) {
		window.hide();
	}
})

ipcMain.on('data-updated', (event, followedMatchData) => {
	if (followedMatchData) {
		let { homeTeam, homeScore, awayTeam, awayScore, liveMatchTime } = followedMatchData;

		liveMatchTime = liveMatchTime === "0'" ? 'FT' : liveMatchTime;

		tray.setTitle(`${homeTeam} ${homeScore} - ${awayScore} ${awayTeam} (${liveMatchTime})`);
	} else {
		tray.setTitle('');
	}
})