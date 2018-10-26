const { ipcRenderer } = require('electron');
const axios = require('axios')
const moment = require('moment')
const { updateScheduleView } = require('./view');

const leagues = {
	UEFA: {
		season: '2000011097',
		competition: '2000001041'
	}
};

const updateScheduleData = (followedMatch) => {
	getScheduleData((scheduleData) => {
		console.log('Got data!');
		let followedMatchData = null;

		if (followedMatch) {
			followedMatchData = scheduleData.find(m => m.matchId == followedMatch);
		}

		ipcRenderer.send('data-updated', followedMatchData)
		updateScheduleView(groupByDays(scheduleData), followedMatch);
	});
}

const checkFailed = (then) => {
	return function (responses) {
		const someFailed = responses.some(response => response.error)

		if (someFailed) {
			throw responses
		}

		return then(responses)
	}
}

const getSchedulesUrl = ({ season, competition }) => `https://api.fifa.com/api/v1/calendar/matches?idseason=${season}&idcompetition=${competition}&language=en-GB&count=1000`

const getScheduleData = (next) => {
	console.log(`Getting schedule data`);
	const scheduleUrl = getSchedulesUrl(leagues.UEFA),
		liveUrl = `https://api.fifa.com/api/v1/live/football/now?language=en-GB`;

	const promises = [axios.get(scheduleUrl), axios.get(liveUrl)];
	const promisesResolved = promises.map(promise => promise.catch(error => ({ error })))

	axios.all(promisesResolved)
		.then(checkFailed(([scheduleResponse, liveResponse]) => {
			let data = scheduleResponse.data && scheduleResponse.data.Results || [],
				liveData = liveResponse.data && liveResponse.data.Results || [];

			return next(processScheduleData(substituteLiveData(data, liveData)));
		}))
		.catch((err) => {
			console.log('Failures during API calls', err);
			let scheduleData;

			if (err[0].status === 200 && err[1].status === 200) {
				let scheduleResponse = err[0].data && err[0].data.Results || [],
					liveResponse = err[1].data && err[1].data.Results || [];

				scheduleData = processScheduleData(substituteLiveData(scheduleResponse, liveResponse));
			} else if (err[0].status === 200) {
				let scheduleResponse = err[0].data && err[0].data.Results || [];
				scheduleData = processScheduleData(substituteLiveData(scheduleResponse, []));
			}

			return next(scheduleData);
		});
}

const substituteLiveData = (data, liveData) => {
	data.forEach((match, index) => {
		let isLiveMatch = match.MatchStatus === 3;
		let foundLiveMatch = isLiveMatch ? liveData.find(m => m.IdMatch == match.IdMatch) : null;

		if (isLiveMatch && foundLiveMatch) {
			data[index].MatchTime = foundLiveMatch.MatchTime
		}
	});

	return data;
}

const formatImage = url => url.replace('{format}', 'sq').replace('{size}', '2');

const formatName = ({ TeamName = '' }) => {
	let name = TeamName ? TeamName[0].Description : 'TBD';

	if (name.length > 18) {
		name = `${name.substring(0, 15)}...`
	}

	return name;
}

const processScheduleData = (matchList) => {

	return matchList.map(match => {
		let {
			MatchStatus: matchStatus,
			Date: time,
			IdMatch: matchId,
			MatchTime: liveMatchTime = '',
			StageName: stage = [{}]
		} = match;

		let home = match.Home || {},
			away = match.Away || {};

		let { Score: homeScore } = home,
			{ Score: awayScore } = away,
			matchLink = `https://www.fifa.com/worldcup/matches/match/${matchId}/#match-summary`;

		let isLiveMatch = matchStatus === 3,
			isPastMatch = matchStatus === 0,
			isFutureMatch = homeScore === null || awayScore === null || (!isPastMatch && !isLiveMatch),
			opponentsTBD = !home.IdCountry && !away.IdCountry,
			oldMatch = !isLiveMatch && moment(match.Date).diff(moment(), 'days') < -3;

		return opponentsTBD || oldMatch ? null : {
			time,
			matchId,
			tournamentStage: stage[0].Description,
			isFutureMatch,
			isLiveMatch,
			liveMatchTime,
			matchLink,
			homeScore,
			awayScore,
			homeTeam: formatName(home),
			awayTeam: formatName(away),
			homeFlag: formatImage(home.PictureUrl),
			awayFlag: formatImage(away.PictureUrl)
		};
	}).filter(filterOutNull);
};

const filterOutNull = m => m !== null;

// returns array of objects with matches for each day
// [ { day: 'June 1', matches: [...] } ]
const groupByDays = (list) => {
	let dayObjects = [];

	list.forEach(match => {
		let noDayObjectsPresent = dayObjects.length === 0,
			lastDayObject = dayObjects[dayObjects.length - 1],
			matchDate = moment(match.time).format('MMMM DD');

		if (noDayObjectsPresent || lastDayObject.day !== matchDate) {
			dayObjects.push({
				day: matchDate,
				matches: [match]
			})
		} else {
			lastDayObject.matches.push(match);
		}
	})

	return dayObjects;
};

module.exports = {
	updateScheduleData
};