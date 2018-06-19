const { app, BrowserWindow, ipcMain, Tray, Dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const isDev = require('electron-is-dev');

const assetsDirectory = path.join(__dirname, 'assets');

let tray = undefined;
let window = undefined;

autoUpdater.on('update-available', () => {
	dialog.showMessageBox({
		type: 'info',
		title: 'Update available!',
		message: 'Update found, would you like to update now?',
		buttons: ['Sure', 'No']
	}, (buttonIndex) => {
		if (buttonIndex === 0) {
			autoUpdater.downloadUpdate()
		}
	});
})

autoUpdater.on('update-downloaded', (info) => {
	dialog.showMessageBox({
		title: 'Updates installing',
		message: 'Application will restart to apply updates...'
	}, () => {
		setImmediate(() => autoUpdater.quitAndInstall())
	});
})

autoUpdater.on('error', (error) => {
	console.error(error);
})

// Don't show the app in the doc
app.dock.hide();

app.on('ready', () => {

	if (!isDev) {
		autoUpdater.checkForUpdates();
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
		if (isDev) {
			// window.openDevTools({ mode: 'detach' })
		}
	});
}

const getWindowPosition = () => {
	const windowBounds = window.getBounds();
	const trayBounds = tray.getBounds();

	// Center window horizontally below the tray icon
	const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));

	// Position window 4 pixels vertically below the tray icon
	const y = Math.round(trayBounds.y + trayBounds.height + 4);

	return { x: x, y: y };
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
		tray.setTitle(`${homeTeam} ${homeScore} - ${awayScore} ${awayTeam} (${liveMatchTime})`);
	} else {
		tray.setTitle('');
	}
})