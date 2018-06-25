const { ipcRenderer } = require('electron');
const axios = require('axios')
const moment = require('moment')
const { updateScheduleView, updateGroupView } = require('./view');

const countryConfig = require('./countries.json');

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

const updateGroupData = () => {
	getGroupData(groupData => {
		console.log('got group data!');
		updateGroupView(groupData);
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

const getGroupData = (next) => {
	console.log(`Getting group data`);
	axios.get('http://api.football-data.org/v1/competitions/467/leagueTable', { 'headers': { 'X-Auth-Token': 'b089c2ca8f7643b4b2188e0a96a2ae1f' } })
		.then(response => {
			console.log(response);
			let groupsData = response.data && response.data.standings;
			return next(processGroupsData(groupsData));
		})
		.catch(error => {
			console.log('error getting backup group data', error);
			return getBackupGroupData(next);
		})
};

const getBackupGroupData = (next) => {
	console.log(`Getting backup group data`);
	axios.get('https://cdn.rawgit.com/openfootball/world-cup.json/b8cc34ee/2018/worldcup.standings.json')
		.then(response => {
			let groupsData = response.data && response.data.groups;
			console.log(groupsData)
			return next(processBackupGroupsData(groupsData));
		})
		.catch(error => {
			console.log('error getting group data', error);
			return next([]);
		})
}

const getScheduleData = (next) => {
	console.log(`Getting schedule data`);
	const scheduleUrl = `https://api.fifa.com/api/v1/calendar/matches?idseason=254645&idcompetition=17&language=en-GB&count=100`,
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

const processScheduleData = (matchList) => {
	return matchList.map(match => {
		let {
			MatchStatus: matchStatus,
			Date: time,
			IdMatch: matchId,
			MatchTime: liveMatchTime = ''
		} = match;

		let home = match.Home || {},
			away = match.Away || {};

		let { Score: homeScore } = home,
			{ Score: awayScore } = away,
			matchLink = `https://www.fifa.com/worldcup/matches/match/${matchId}/#match-summary`;

		let isLiveMatch = matchStatus === 3,
			isPastMatch = matchStatus === 0,
			isFutureMatch = homeScore === null || awayScore === null || (!isPastMatch && !isLiveMatch),
			opponentsTBD = !home.IdCountry || !away.IdCountry,
			previousDayMatch = !isLiveMatch && moment(match.Date).diff(moment(), 'days') < 0;

		return opponentsTBD || previousDayMatch ? null : {
			time,
			matchId,
			isFutureMatch,
			isLiveMatch,
			liveMatchTime,
			matchLink,
			homeScore,
			awayScore,
			homeTeam: home.TeamName[0].Description,
			awayTeam: away.TeamName[0].Description,
			homeFlag: `assets/flags/${(home.IdCountry || '').toLowerCase()}.png`,
			awayFlag: `assets/flags/${(away.IdCountry || '').toLowerCase()}.png`
		};
	}).filter(filterOutNull);
};

const processGroupsData = (groupsData) => {
	console.log(groupsData);
	return Object.keys(groupsData).map(group => {
		return {
			group: `Group ${group}`,
			teams: groupsData[group].map(team => {
				let name = team.team,
					countryData = countryConfig[name] || {};

				return {
					name,
					rank: team.rank,
					points: team.points,
					flag: `assets/flags/${countryData.code}.png`,
					url: countryData.id ? `https://www.fifa.com/worldcup/teams/team/${countryData.id}/` : ''
				}
			})
		}
	});
};

const processBackupGroupsData = (groupsData) => {
	console.log(groupsData);
	return groupsData.map(group => {
		return {
			group: group.name,
			teams: group.standings.map(team => {
				console.log(team);
				let name = team.team && team.team.name || '',
					countryCode = team.team && team.team.code || '',
					countryData = countryConfig[team.team.name] || Object.values(countryConfig).find(c => c.code === countryCode.toLowerCase()) || {};

				return {
					name: name,
					rank: team.pos,
					points: team.pts,
					flag: team.team.code ? `assets/flags/${team.team.code.toLowerCase()}.png` : '',
					url: countryData.id ? `https://www.fifa.com/worldcup/teams/team/${countryData.id}/` : ''
				};
			})
		}
	});
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
			lastDayObject.matches.push(match)
		}
	})

	return dayObjects;
};

const teams = {
};


module.exports = {
	updateScheduleData,
	updateGroupData
};