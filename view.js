const moment = require('moment');
const settings = require('electron-settings');

const showSpinner = () => {
	$('.spinner').removeClass('hidden');
	$('.window-content').addClass('spinnerShowing');
}

const hideSpinner = () => {
	$('.spinner').addClass('hidden');
	$('.window-content').removeClass('spinnerShowing');
}

const createSelectorView = (leagues) => {
	var select = $('<select>').attr('id', 'leagueSelector').attr('class', 'js-select-league leagueSelector');
	$('.toolbar-header').append(select);

	leagues.forEach(({ name }, index) => {
		select.append($('<option>').attr('value', index).text(name));
	});

	select.val(settings.get('selectedLeague', 0));
	select.blur();
}

const updateScheduleView = (league, scheduleData, followedMatch) => {
	hideSpinner();
	renderBody(scheduleData, followedMatch);
};

const renderBody = (scheduleData, followedMatch) => {
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

module.exports = {
	updateScheduleView,
	createSelectorView,
	showSpinner,
	hideSpinner
};