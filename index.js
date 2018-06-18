const { ipcRenderer, shell } = require('electron')
const axios = require('axios')
const moment = require('moment')

let followedMatch = null;

document.addEventListener('click', (event) => {
	if (event.target.href) {
		// Open links in external browser
		shell.openExternal(event.target.href);
		event.preventDefault();
	} else if (event.target.classList.contains('js-refresh-action')) {
		updateData();
	} else if (event.target.classList.contains('js-quit-action')) {
		window.close();
	} else if (event.target.classList.contains('js-stop-following-action')) {
		followedMatch = null;
		updateData();
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
		updateData();
		ipcRenderer.send('hide-window');
	}
})

const getData = (next) => {
	console.log(`Getting data`)
	const scheduleUrl = `https://api.fifa.com/api/v1/calendar/matches?idseason=254645&idcompetition=17&language=en-GB&count=100`,
		groupsUrl = ``;

	axios.get(scheduleUrl)
		.then(function (response) {
			let data = response.data && response.data.Results || [];
			return next(normalizeData(data))
		})
		.catch(function (error) {
			console.log(error)
			console.error('Please try again later.')
			return next([])
		})
}

const updateData = () => {
	getData((data) => {
		console.log('Got data!')

		let followedMatchData = null;
		if (followedMatch) {
			followedMatchData = data.find(m => m.matchId == followedMatch);
		}

		ipcRenderer.send('data-updated', followedMatchData)
		updateView(groupByDays(data))
	})
}

const normalizeData = (list) => {
	return list.map(match => {
		let home = match.Home || {},
			away = match.Away || {};

		let opponentsTBD = !home.IdCountry || !away.IdCountry,
			previousDayMatch = moment(match.Date).diff(moment(), 'days') < 0;

		return opponentsTBD || previousDayMatch ? null : {
			time: match.Date,
			futureMatch: home.Score === null || away.Score === null,
			liveMatch: match.MatchStatus === 3,
			liveMatchTime: match.MatchTime || '',
			matchId: match.IdMatch,
			matchLink: `https://www.fifa.com/worldcup/matches/match/${match.IdMatch}/#match-summary`,
			homeTeam: home.TeamName[0].Description,
			homeFlag: `assets/flags/${(home.IdCountry || '').toLowerCase()}.png`,
			homeScore: home.Score,
			awayTeam: away.TeamName[0].Description,
			awayFlag: `assets/flags/${(away.IdCountry || '').toLowerCase()}.png`,
			awayScore: away.Score
		};
	}).filter(m => m !== null);
};


const groupByDays = (list) => {
	let days = [];

	list.forEach(match => {
		if (days.length === 0 || days[days.length - 1].day !== moment(match.time).format('MMMM DD')) {
			days.push({
				day: moment(match.time).format('MMMM DD'),
				matches: [match]
			})
		} else {
			days[days.length - 1].matches.push(match)
		}
	})

	return days;
};

const updateView = (data) => {
	// no data
	if (data.length === 0) {
		document.querySelector('.tabContent1').innerHTML = '<div class="summary">Error Loading Data</div>'
	}

	let tableEntrys = []

	data.forEach((group) => {
		let tableBody = `<thead><tr><th><b>${group.day}</b></th></tr></thead>`

		let { matches } = group

		tableBody += '<tbody>'

		matches.forEach(match => {
			let { matchId, matchLink, liveMatch, liveMatchTime, time } = match;
			let { homeTeam, homeScore, homeFlag, awayTeam, awayScore, awayFlag } = match;

			if (match.futureMatch) {
				tableBody += `
				<tr data-id="${matchId}" data-article="${matchLink}">
					<td>
						<div class="matches">
							<div class="match">
								<img src="${homeFlag}" class="flags"> ${homeTeam}
							</div>
							<div class="match">
								<img src="${awayFlag}" class="flags"> ${awayTeam}
							</div>
						</div>
						<div class="date">
							${moment(time).format('hh:mm A')}
						</div>
					</td>
				</tr>`
			} else {
				tableBody += `
				<tr data-id="${matchId}" data-article="${matchLink}" class="selectable ${liveMatch ? 'js-followMatch' : ''} ${matchId == followedMatch ? 'followedMatch' : ''}">
					<td>
						<div class="matches">
							<div class="match">
								<img src="${homeFlag}" class="flags"> ${homeTeam}
								<b class="score">${homeScore}</b>
							</div>
							<div class="match">
								<img src="${awayFlag}" class="flags"> ${awayTeam}
								<b class="score">${awayScore}</b>
							</div>
						</div>
						<div class="date">
							${liveMatch && liveMatchTime ? `<span class="live">${liveMatchTime}</span>` : `FT`}
						</div>
					</td>
				</tr>`
			}
		});

		tableBody += '</tbody>'
		tableEntrys.push(tableBody);
	});

	document.querySelector('.tabContent1').innerHTML = `<table class="table">${tableEntrys.join('')}</table>`;
}

const switchTab = (activeTab) => {
	let inactiveTab = activeTab === '1' ? '2' : '1';
	document.querySelector(`.js-tab${activeTab}`).classList.add('active')
	document.querySelector(`.js-tab${inactiveTab}`).classList.remove('active')

	document.querySelector(`.tabContent${activeTab}`).classList.remove('hidden')
	document.querySelector(`.tabContent${inactiveTab}`).classList.add('hidden')
}

// Refresh data every 1 minute
const oneMinutes = 1 * 60 * 1000
setInterval(updateData, oneMinutes)

// Update initial weather when loaded
document.addEventListener('DOMContentLoaded', updateData)
