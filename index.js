const { ipcRenderer, shell, webFrame } = require('electron');
const settings = require('electron-settings');
const { createLeagueSelector, updateScheduleData } = require('./data');

// prevents zooming of window contents
webFrame.setVisualZoomLevelLimits(1, 1);
webFrame.setLayoutZoomLevelLimits(0, 0);

let followedMatch = null;

document.addEventListener('change', (event) => {
	if (event.target.classList.contains('js-select-league')) {
		let value = $('.js-select-league')[0].value || 0;
		settings.set('selectedLeague', value);
		updateScheduleData(followedMatch);
	}
});

document.addEventListener('click', (event) => {
	if (event.target.href) {
		// Open links in external browser
		shell.openExternal(event.target.href);
		event.preventDefault();
	} else if (event.target.classList.contains('js-refresh-action')) {
		updateScheduleData(followedMatch);
	} else if (event.target.classList.contains('js-quit-action')) {
		window.close();
	} else if (event.target.classList.contains('js-donate')) {
		shell.openExternal("https://www.paypal.me/christophior/5");
		event.preventDefault();
	} else if (event.target.classList.contains('js-tweet')) {
		shell.openExternal("https://twitter.com/intent/tweet?text=I%27m%20using%20Score%21%20to%20follow%20the%20latest%20soccer%20scores%2C%20check%20it%20out%20at%20https%3A%2F%2Fgum.co%2Fscoremacapp%20%23scoremacapp");
		event.preventDefault();
	} else if (event.target.classList.contains('js-stop-following-action')) {
		followedMatch = null;
		updateScheduleData(followedMatch);
		$('.js-stop-button').addClass('hidden');
		ipcRenderer.send('hide-window');
	}
	// else if (event.target.classList.contains('js-tab1')) {
	// 	switchTab('1');
	// } else if (event.target.classList.contains('js-tab2')) {
	// 	switchTab('2');
	// } else if ($(event.target).closest('tr').hasClass('selectable')) {
	// 	let tr = $(event.target).closest('tr')
	// 	// follow match
	// 	if (tr.hasClass('js-followMatch')) {
	// 		let matchId = tr.data('id');
	// 		console.log('following', matchId);
	// 		followedMatch = matchId;
	// 		$('.js-stop-button').removeClass('hidden');

	// 	} else { // open article if a past match
	// 		let article = tr.data('article');
	// 		console.log(article);
	// 		shell.openExternal(article);
	// 		event.preventDefault();
	// 	}
	// 	updateScheduleData(followedMatch);
	// 	ipcRenderer.send('hide-window');
	// }
})

// const switchTab = (activeTab) => {
// 	let inactiveTab = activeTab === '1' ? '2' : '1';
// 	document.querySelector(`.js-tab${activeTab}`).classList.add('active')
// 	document.querySelector(`.js-tab${inactiveTab}`).classList.remove('active')

// 	document.querySelector(`.tabContent${activeTab}`).classList.remove('hidden')
// 	document.querySelector(`.tabContent${inactiveTab}`).classList.add('hidden')
// }

// Refresh schedule data every 1 minute
const scheduleRefreshRate = 1 * 60 * 1000;
setInterval(() => updateScheduleData(followedMatch), scheduleRefreshRate);

// Update initial data when loaded
document.addEventListener('DOMContentLoaded', () => {
	createLeagueSelector();
	updateScheduleData(followedMatch);
});
