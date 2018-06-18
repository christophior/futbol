const { ipcRenderer, shell } = require('electron')
const axios = require('axios')
const moment = require('moment')

document.addEventListener('click', (event) => {
	if (event.target.href) {
		// Open links in external browser
		shell.openExternal(event.target.href)
		event.preventDefault()
	} else if (event.target.classList.contains('js-refresh-action')) {
		updateData()
	} else if (event.target.classList.contains('js-quit-action')) {
		window.close()
	} else if (event.target.classList.contains('js-tab1')) {
		switchTab('1');
	} else if (event.target.classList.contains('js-tab2')) {
		switchTab('2');
	}
})

const getData = (next) => {
	console.log(`Getting data`)
	const scheduleUrl = `https://api.fifa.com/api/v1/calendar/matches?idseason=254645&idcompetition=17&language=en-GB&count=100`,
		groupsUrl = ``;

	axios.get(scheduleUrl)
		.then(function (response) {
			let data = response.data && response.data.Results || [];
			return next(groupByDays(normalizeData(data)))
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
		ipcRenderer.send('data-updated', data)
		updateView(data)
	})
}

const normalizeData = (list) => {
	return list.map(match => {
		let home = match.Home || {},
			away = match.Away || {};

		let opponentsTBD = !home.IdCountry || !away.IdCountry,
			previousDayMatch = moment(match.Date).diff(moment(), 'days') < 0;
		// MatchStatus, MatchTime ?
		return opponentsTBD || previousDayMatch ? null : {
			time: match.Date,
			futureMatch: home.Score === null || away.Score === null,
			homeTeam: home.TeamName[0].Description,
			homeFlag: home.PictureUrl.replace('{format}', 'fwc2018').replace('{size}', '1'),
			homeScore: home.Score,
			awayTeam: away.TeamName[0].Description,
			awayFlag: away.PictureUrl.replace('{format}', 'fwc2018').replace('{size}', '1'),
			awayScore: away.Score
		};
	}).filter(m => m !== null).slice(0, 10);
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
			let { homeTeam, homeScore, homeFlag, awayTeam, awayScore, awayFlag, time } = match;

			if (match.futureMatch) {
				tableBody += `<tr>
					<td>
						<div class="match">
							<span>
								${homeTeam} <img src="${homeFlag}" class="flags"> <b>&nbsp;&nbsp;${moment(time).format('hh:mm A')}&nbsp;&nbsp;</b> <img src="${awayFlag}" class="flags"> ${awayTeam}
							</span>
						</div>
					</td>
				</tr>`
			} else {
				tableBody += `<tr>
					<td>
						<div class="match">
							<span>
								${homeTeam}
								<img src="${homeFlag}" class="flags">
								<b>&nbsp;&nbsp;${homeScore} - ${awayScore}&nbsp;&nbsp;</b>
								<img src="${awayFlag}" class="flags">
								${awayTeam}
							</span>
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

// Refresh data every 10 minutes
const tenMinutes = 10 * 60 * 1000
setInterval(updateData, tenMinutes)

// Update initial weather when loaded
document.addEventListener('DOMContentLoaded', updateData)
