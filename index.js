const { ipcRenderer, shell, webFrame } = require('electron');
const { updateScheduleData, updateGroupData } = require('./data');

// prevents zooming of window contents
webFrame.setVisualZoomLevelLimits(1, 1);
webFrame.setLayoutZoomLevelLimits(0, 0);

let followedMatch = null;

document.addEventListener('click', (event) => {
	if (event.target.href) {
		// Open links in external browser
		shell.openExternal(event.target.href);
		event.preventDefault();
	} else if (event.target.classList.contains('js-refresh-action')) {
		$('.spinner').removeClass('hidden');
		$('.window-content').addClass('spinnerShowing');
		updateScheduleData(followedMatch);
	} else if (event.target.classList.contains('js-quit-action')) {
		window.close();
	} else if (event.target.classList.contains('js-donate')) {
		shell.openExternal("https://www.paypal.me/christophior/5");
		event.preventDefault();
	} else if (event.target.classList.contains('js-tweet')) {
		shell.openExternal("https://twitter.com/intent/tweet?text=I%27m%20following%20the%202018%20World%20Cup%20live%20using%20the%20Score%21%20mac%20app%20by%20%40christophior%2C%20check%20it%20out%20at%20https%3A%2F%2Fgumroad.com%2Fl%2Fworldcupmactoolbar");
		event.preventDefault();
	} else if (event.target.classList.contains('js-stop-following-action')) {
		followedMatch = null;
		updateScheduleData(followedMatch);
		$('.js-stop-button').addClass('hidden');
		ipcRenderer.send('hide-window');
	} else if (event.target.classList.contains('js-tab1')) {
		switchTab('1');
	} else if (event.target.classList.contains('js-tab2')) {
		switchTab('2');
	} else if ($(event.target).closest('tr').hasClass('selectable')) {
		let tr = $(event.target).closest('tr')
		// follow match
		if (tr.hasClass('js-followMatch')) {
			let matchId = tr.data('id');
			console.log('following', matchId);
			followedMatch = matchId;
			$('.js-stop-button').removeClass('hidden');

		} else { // open article if a past match
			let article = tr.data('article');
			console.log(article);
			shell.openExternal(article);
			event.preventDefault();
		}
		updateScheduleData(followedMatch);
		ipcRenderer.send('hide-window');
	}
})

const switchTab = (activeTab) => {
	let inactiveTab = activeTab === '1' ? '2' : '1';
	document.querySelector(`.js-tab${activeTab}`).classList.add('active')
	document.querySelector(`.js-tab${inactiveTab}`).classList.remove('active')

	document.querySelector(`.tabContent${activeTab}`).classList.remove('hidden')
	document.querySelector(`.tabContent${inactiveTab}`).classList.add('hidden')
}

// Refresh schedule data every 1 minute
const scheduleRefreshRate = 1 * 60 * 1000;
setInterval(() => updateScheduleData(followedMatch), scheduleRefreshRate);

// Refresh group data every hour
const groupsRefreshRate = 60 * 60 * 1000;
setInterval(updateGroupData, groupsRefreshRate);

// Update initial data when loaded
document.addEventListener('DOMContentLoaded', () => {
	updateScheduleData(followedMatch);
	updateGroupData();
});
