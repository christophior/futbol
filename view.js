const moment = require('moment');

const updateScheduleView = (scheduleData, followedMatch) => {
	// if spinner is present, remove
	$('.spinner').addClass('hidden');
	$('.window-content').removeClass('spinnerShowing');

	renderTab1(scheduleData, followedMatch);
};

const renderTab1 = (scheduleData, followedMatch) => {
	// no data present
	if (scheduleData.length === 0) {
		$('.tabContent1').html('<div class="summary"><b>Problem Loading Data!</b></div>');
	} else {
		let tableEntrys = []

		scheduleData.forEach((dayObject) => {
			let tableBody = `<thead><tr><th>${dayObject.day}</th><th></th></tr></thead>`

			let { matches } = dayObject

			tableBody += '<tbody>'

			matches.forEach(match => {
				if (match.isFutureMatch) {
					tableBody += getFutureMatchHtml(match);
				} else {
					tableBody += getPastPresentMatchHtml(match, followedMatch);
				}
			});

			tableBody += '</tbody>'
			tableEntrys.push(tableBody);
		});

		$('.tabContent1').html(`<table class="table">${tableEntrys.join('')}</table>`);
	}
};

const getFutureMatchHtml = (match) => {
	let { matchId, matchLink, time } = match;
	let { homeTeam, homeFlag, awayTeam, awayFlag } = match;

	return `
		<tr data-id="${matchId}" data-article="${matchLink}" class="selectable">
			<td class="matches">
				<div class="matchesWrapper">
					<div class="match">
						<img src="${homeFlag}" class="flags">
						<div class="matchName">${homeTeam}</div>
					</div>
					<div class="match">
						<img src="${awayFlag}" class="flags">
						<div class="matchName">${awayTeam}</div>
					</div>
				</div>
			</td>
			<td class="date">
				${moment(time).format('hh:mm a')}
			</td>
		</tr>`;
};

const getPastPresentMatchHtml = (match, followedMatch) => {
	let { matchId, matchLink, isLiveMatch, liveMatchTime } = match;
	let { homeTeam, homeScore, homeFlag, awayTeam, awayScore, awayFlag } = match;

	return `
		<tr data-id="${matchId}" data-article="${matchLink}" class="selectable ${isLiveMatch ? 'js-followMatch' : ''} ${matchId == followedMatch ? 'followedMatch' : ''}">
			<td class="matches">
				<div class="matchesWrapper">
					<div class="match">
						<img src="${homeFlag}" class="flags">
						<div class="matchName">${homeTeam}</div>
						<b class="score">${homeScore}</b>
					</div>
					<div class="match">
						<img src="${awayFlag}" class="flags">
						<div class="matchName">${awayTeam}</div>
						<b class="score">${awayScore}</b>
					</div>
				<div>
			</td>
			<td class="date">
				${isLiveMatch && liveMatchTime ? `<span class="live">${liveMatchTime}</span>` : `FT`}
			</td>
		</tr>`;
};

const getStageMatchHtml = (match) => {
	let { matchId, matchLink, time } = match;
	let { homeTeam, homeFlag, awayTeam, awayFlag } = match;

	let homeTeamHtml = homeTeam ? `
		<div class="match">
			<img src="${homeFlag}" class="flags"> ${homeTeam}
		</div>` :
		`<div class="match">TBD</div>`;

	let awayTeamHtml = awayTeam ? `
		<div class="match">
			<img src="${awayFlag}" class="flags"> ${awayTeam}
		</div>` :
		`<div class="match">TBD</div>`;

	return `
		<tr data-id="${matchId}" data-article="${matchLink}" class="selectable">
			<td class="matches">
				<div class="matchesWrapper">
					${homeTeamHtml}
					${awayTeamHtml}
				<div>
			</td>
		</tr>`;
};

const getGroupStandingHtml = (team) => {
	return `
		<tr data-article="${team.url}" class="groupRows selectable">
			<td class="groupRank">
				${team.rank}
			</td>

			<td class="groupName">
				<div>
					<img src="${team.flag}" class="flags"> ${team.name}
				</div>
			</td>

			<td class="groupStats">
				${team.points}
			</td>
		</tr>`;
};

module.exports = {
	updateScheduleView
};