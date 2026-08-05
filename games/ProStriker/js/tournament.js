// ===== PRO STRIKER - tournament.js =====
console.log('[ProStriker] tournament.js loaded');

const TournamentManager = {
    format: 32,
    selectedTeamId: null,
    groups: [],
    currentMatchDay: 0,
    groupStageComplete: false,
    knockoutMatches: [],
    currentKnockoutRound: 0,
    champion: null,
    tournamentComplete: false,
    playerEliminated: false,
    matchResults: [],
    isPlayerOut: false,
    playerMatchIds: [],

    init(format, selectedTeamId) {
        this.format = format;
        this.selectedTeamId = selectedTeamId;
        this.groups = [];
        this.currentMatchDay = 0;
        this.groupStageComplete = false;
        this.knockoutMatches = [];
        this.currentKnockoutRound = 0;
        this.champion = null;
        this.tournamentComplete = false;
        this.playerEliminated = false;
        this.matchResults = [];
        this.isPlayerOut = false;
        this.playerMatchIds = [];

        this.generateGroups();
        console.log('[Tournament] Initialized with', format, 'teams, selected team:', selectedTeamId);
    },

    generateGroups() {
        const teams = this.getTeamsForFormat();
        if (teams.length !== this.format) {
            console.error('[Tournament] Not enough teams for format', this.format);
            return;
        }

        const shuffled = this.shuffleArray(teams);
        
        const playerTeam = TOURNAMENT_TEAMS.find(t => t.id === this.selectedTeamId);
        if (playerTeam) {
            const index = shuffled.findIndex(t => t.id === this.selectedTeamId);
            if (index !== -1) shuffled.splice(index, 1);
            shuffled.unshift(playerTeam);
        }

        this.groups = [];
        for (let i = 0; i < 8; i++) {
            this.groups.push({
                id: i,
                name: String.fromCharCode(65 + i),
                teams: [],
                standings: [],
                matches: [],
                matchDay: 0,
                playerMatchDays: []
            });
        }

        const top8 = shuffled.slice(0, 8);
        const rest = shuffled.slice(8);

        for (let i = 0; i < 8; i++) {
            this.groups[i].teams.push(top8[i]);
        }

        let groupIndex = 0;
        for (let team of rest) {
            this.groups[groupIndex % 8].teams.push(team);
            groupIndex++;
        }

        for (let group of this.groups) {
            this.generateGroupFixtures(group);
        }

        console.log('[Tournament] Groups generated');
    },

    getTeamsForFormat() {
        let teams = [...TOURNAMENT_TEAMS];
        if (this.format === 16) return teams.slice(0, 16);
        else if (this.format === 8) return teams.filter(t => t.tier === 'WORLD_CLASS').slice(0, 8);
        else return teams;
    },

    generateGroupFixtures(group) {
        const teams = group.teams;
        const n = teams.length;
        const matches = [];
        let matchId = 0;

        const pairings = [];
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                pairings.push({ teamA: teams[i], teamB: teams[j] });
            }
        }

        const matchesPerDay = 2;
        let day = 0;
        let dayCount = 0;

        for (let pair of pairings) {
            matches.push({
                id: matchId++,
                groupId: group.id,
                teamA: pair.teamA,
                teamB: pair.teamB,
                played: false,
                scoreA: 0,
                scoreB: 0,
                winner: null,
                matchDay: day,
                pending: false,
                isPlayerMatch: false
            });
            dayCount++;
            if (dayCount >= matchesPerDay) {
                day++;
                dayCount = 0;
            }
        }

        if (matches.length > 0 && matches[matches.length - 1].matchDay > 2) {
            matches[matches.length - 1].matchDay = 2;
        }

        group.matches = matches;
        group.matchDay = 0;
        group.playerMatchDays = [];
        group.standings = teams.map(team => ({
            teamId: team.id,
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDiff: 0,
            points: 0
        }));

        console.log('[Tournament] Group fixtures generated:', matches.length, 'matches for group', group.name);
    },

    simulateMatchDay() {
        if (this.groupStageComplete) return;

        const playerTeamId = this.selectedTeamId;
        const allResults = [];

        for (let group of this.groups) {
            const dayMatches = group.matches.filter(m => 
                m.matchDay === this.currentMatchDay && !m.played
            );

            for (let match of dayMatches) {
                const isPlayerMatch = (match.teamA.id === playerTeamId || match.teamB.id === playerTeamId);
                
                if (isPlayerMatch) {
                    if (group.playerMatchDays.includes(this.currentMatchDay)) {
                        continue;
                    }
                    match.isPlayerMatch = true;
                    match.pending = true;
                    allResults.push({ ...match, isPlayerMatch: true, simulated: false });
                    group.playerMatchDays.push(this.currentMatchDay);
                } else {
                    const result = this.simulateMatch(match.teamA, match.teamB);
                    match.played = true;
                    match.scoreA = result.scoreA;
                    match.scoreB = result.scoreB;
                    match.winner = result.winner;
                    match.isPlayerMatch = false;
                    match.pending = false;
                    this.matchResults.push(match);
                    this.updateGroupStandings(group, match, result);
                    allResults.push({ ...match, simulated: true });
                }
            }
        }

        let allDayMatches = [];
        for (let group of this.groups) {
            const dayMatches = group.matches.filter(m => m.matchDay === this.currentMatchDay);
            allDayMatches = allDayMatches.concat(dayMatches);
        }

        const allDone = allDayMatches.every(m => m.played === true);

        if (allDone) {
            console.log('[Tournament] Match Day', this.currentMatchDay, 'complete');
            this.currentMatchDay++;
            if (this.currentMatchDay >= 3) {
                this.groupStageComplete = true;
                console.log('[Tournament] Group stage complete');
                this.generateKnockoutStage();
            }
        }

        return allResults;
    },

    getPlayerNextMatch() {
        const playerTeamId = this.selectedTeamId;

        if (!this.groupStageComplete) {
            for (let group of this.groups) {
                const match = group.matches.find(m =>
                    (m.teamA.id === playerTeamId || m.teamB.id === playerTeamId) &&
                    !m.played &&
                    m.matchDay === this.currentMatchDay
                );
                if (match) {
                    return { ...match, type: 'group', groupId: group.id };
                }
            }
        } else if (!this.tournamentComplete && !this.isPlayerOut) {
            for (let round of this.knockoutMatches) {
                const match = round.matches.find(m =>
                    (m.teamA && m.teamB) &&
                    (m.teamA.id === playerTeamId || m.teamB.id === playerTeamId) &&
                    !m.played
                );
                if (match) return { ...match, type: 'knockout', round: round.round };
            }
        }

        return null;
    },

    simulateMatch(teamA, teamB) {
        const tierA = getTeamTier(teamA);
        const tierB = getTeamTier(teamB);
        const probs = getMatchProbabilities(tierA, tierB);
        const roll = Math.random() * 100;
        
        let result;
        if (roll < probs.win) result = 'win';
        else if (roll < probs.win + probs.draw) result = 'draw';
        else result = 'loss';

        let winner = null;
        if (result === 'win') winner = teamA;
        else if (result === 'loss') winner = teamB;
        else winner = null;

        const scores = this.generateScore(teamA, teamB, result);
        return { teamA, teamB, scoreA: scores.scoreA, scoreB: scores.scoreB, winner, result };
    },

    generateScore(teamA, teamB, result) {
        const ratingA = teamA.rating;
        const ratingB = teamB.rating;
        const baseGoals = 1 + Math.floor(Math.random() * 2);
        let scoreA, scoreB;

        if (result === 'win') {
            const margin = Math.floor(Math.random() * 2) + 1;
            scoreA = baseGoals + Math.floor(Math.random() * 2);
            scoreB = Math.max(0, scoreA - margin);
        } else if (result === 'loss') {
            const margin = Math.floor(Math.random() * 2) + 1;
            scoreB = baseGoals + Math.floor(Math.random() * 2);
            scoreA = Math.max(0, scoreB - margin);
        } else {
            scoreA = baseGoals;
            scoreB = baseGoals;
        }

        const ratingDiff = Math.floor((ratingA - ratingB) / 20);
        if (ratingDiff > 0) scoreA += Math.floor(Math.random() * ratingDiff);
        else if (ratingDiff < 0) scoreB += Math.floor(Math.random() * Math.abs(ratingDiff));

        scoreA = Math.max(0, Math.min(5, scoreA));
        scoreB = Math.max(0, Math.min(5, scoreB));
        return { scoreA, scoreB };
    },

    updateGroupStandings(group, match, result) {
        const teamAId = match.teamA.id;
        const teamBId = match.teamB.id;
        const teamAStats = group.standings.find(s => s.teamId === teamAId);
        const teamBStats = group.standings.find(s => s.teamId === teamBId);
        
        if (!teamAStats || !teamBStats) {
            console.error('[Tournament] Team not found in standings');
            return;
        }

        const goalsA = result.scoreA;
        const goalsB = result.scoreB;

        teamAStats.played++;
        teamAStats.goalsFor += goalsA;
        teamAStats.goalsAgainst += goalsB;
        teamAStats.goalDiff = teamAStats.goalsFor - teamAStats.goalsAgainst;
        if (result.winner === match.teamA) {
            teamAStats.wins++;
            teamAStats.points += 3;
        } else if (result.winner === null) {
            teamAStats.draws++;
            teamAStats.points += 1;
        } else {
            teamAStats.losses++;
        }

        teamBStats.played++;
        teamBStats.goalsFor += goalsB;
        teamBStats.goalsAgainst += goalsA;
        teamBStats.goalDiff = teamBStats.goalsFor - teamBStats.goalsAgainst;
        if (result.winner === match.teamB) {
            teamBStats.wins++;
            teamBStats.points += 3;
        } else if (result.winner === null) {
            teamBStats.draws++;
            teamBStats.points += 1;
        } else {
            teamBStats.losses++;
        }

        this.sortStandings(group);
        console.log('[Tournament] Updated standings for group', group.name);
    },

    sortStandings(group) {
        group.standings.sort((a, b) => {
            if (a.points !== b.points) return b.points - a.points;
            if (a.goalDiff !== b.goalDiff) return b.goalDiff - a.goalDiff;
            if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
            return Math.random() - 0.5;
        });
    },

    generateKnockoutStage() {
        const qualified = [];
        
        for (let group of this.groups) {
            const standings = group.standings;
            const top2 = standings.slice(0, 2);
            for (let entry of top2) {
                const team = TOURNAMENT_TEAMS.find(t => t.id === entry.teamId);
                if (team) qualified.push(team);
            }
        }

        const playerQualified = qualified.some(t => t.id === this.selectedTeamId);
        if (!playerQualified) {
            this.isPlayerOut = true;
            this.playerEliminated = true;
            this.tournamentComplete = true;
            console.log('[Tournament] Player eliminated in group stage');
            return;
        }

        const rounds = [
            { name: 'Round of 16', matchCount: 8 },
            { name: 'Quarter-Finals', matchCount: 4 },
            { name: 'Semi-Finals', matchCount: 2 },
            { name: 'Final', matchCount: 1 }
        ];

        const groupWinners = [];
        const groupRunners = [];
        for (let group of this.groups) {
            const standings = group.standings;
            if (standings.length >= 2) {
                const winner = TOURNAMENT_TEAMS.find(t => t.id === standings[0].teamId);
                const runner = TOURNAMENT_TEAMS.find(t => t.id === standings[1].teamId);
                if (winner) groupWinners.push(winner);
                if (runner) groupRunners.push(runner);
            }
        }

        const pairs = [];
        const winnerOrder = [0, 1, 2, 3, 4, 5, 6, 7];
        const runnerOrder = [1, 0, 3, 2, 5, 4, 7, 6];
        
        for (let i = 0; i < 8; i++) {
            const teamA = groupWinners[winnerOrder[i]];
            const teamB = groupRunners[runnerOrder[i]];
            if (teamA && teamB) {
                pairs.push({ teamA, teamB });
            } else {
                pairs.push({ teamA: groupWinners[i], teamB: groupRunners[(i + 1) % 8] });
            }
        }

        const firstRound = [];
        for (let pair of pairs) {
            firstRound.push({
                id: firstRound.length,
                teamA: pair.teamA,
                teamB: pair.teamB,
                played: false,
                scoreA: 0,
                scoreB: 0,
                winner: null,
                extraTime: false,
                pending: false,
                isPlayerMatch: false
            });
        }

        this.knockoutMatches = [
            { round: 0, name: 'Round of 16', matches: firstRound },
            { round: 1, name: 'Quarter-Finals', matches: [] },
            { round: 2, name: 'Semi-Finals', matches: [] },
            { round: 3, name: 'Final', matches: [] }
        ];

        console.log('[Tournament] Knockout stage generated');
    },

    simulateKnockoutRound() {
        if (this.tournamentComplete) return;

        const currentRound = this.currentKnockoutRound;
        const roundData = this.knockoutMatches[currentRound];
        if (!roundData) return;

        const playerTeamId = this.selectedTeamId;
        const results = [];

        for (let match of roundData.matches) {
            if (match.played) continue;

            const isPlayerMatch = (match.teamA && match.teamA.id === playerTeamId) || 
                                 (match.teamB && match.teamB.id === playerTeamId);

            if (isPlayerMatch && !this.isPlayerOut) {
                match.isPlayerMatch = true;
                match.pending = true;
                results.push({ ...match, isPlayerMatch: true, simulated: false });
            } else {
                let result = this.simulateMatch(match.teamA, match.teamB);
                let extraTimeCount = 0;
                
                while (result.winner === null && extraTimeCount < 3) {
                    extraTimeCount++;
                    result = this.simulateMatch(match.teamA, match.teamB);
                    if (extraTimeCount >= 3 && result.winner === null) {
                        result.winner = Math.random() < 0.5 ? match.teamA : match.teamB;
                        result.result = 'win';
                        if (result.winner === match.teamA) result.scoreA = result.scoreB + 1;
                        else result.scoreB = result.scoreA + 1;
                    }
                }

                match.played = true;
                match.scoreA = result.scoreA;
                match.scoreB = result.scoreB;
                match.winner = result.winner;
                match.isPlayerMatch = false;
                match.pending = false;
                match.extraTime = extraTimeCount > 0;
                this.matchResults.push(match);
                results.push({ ...match, simulated: true });
            }
        }

        const allDone = roundData.matches.every(m => m.played || m.pending === true);
        if (allDone) {
            if (currentRound < 3) {
                this.advanceKnockoutWinners(currentRound);
                this.currentKnockoutRound++;
            } else {
                this.tournamentComplete = true;
                const finalMatch = roundData.matches[0];
                if (finalMatch && finalMatch.played && finalMatch.winner) {
                    this.champion = finalMatch.winner;
                    console.log('[Tournament] Champion:', this.champion.name);
                }
            }
        }

        return results;
    },

    advanceKnockoutWinners(roundIndex) {
        const currentRound = this.knockoutMatches[roundIndex];
        const nextRound = this.knockoutMatches[roundIndex + 1];
        if (!nextRound) return;

        const winners = [];
        for (let match of currentRound.matches) {
            if (match.played && match.winner) {
                winners.push(match.winner);
            } else if (match.pending) {
                winners.push(null);
            }
        }

        const pairs = [];
        for (let i = 0; i < winners.length; i += 2) {
            const teamA = winners[i];
            const teamB = winners[i + 1];
            if (teamA && teamB) {
                pairs.push({ teamA, teamB });
            } else {
                pairs.push({ teamA: teamA || null, teamB: teamB || null });
            }
        }

        nextRound.matches = pairs.map((pair, idx) => ({
            id: idx,
            teamA: pair.teamA,
            teamB: pair.teamB,
            played: false,
            scoreA: 0,
            scoreB: 0,
            winner: null,
            extraTime: false,
            pending: false,
            isPlayerMatch: false
        }));
    },

       // ===== RECORD PLAYER MATCH RESULT - FIXED =====
    recordPlayerMatchResult(matchId, teamAScore, teamBScore, isGroupMatch, groupId) {
        console.log('[Tournament] Recording match:', matchId, teamAScore, '-', teamBScore, 'Group:', isGroupMatch);
        
        let match = null;
        let group = null;

        if (isGroupMatch) {
            group = this.groups.find(g => g.id === groupId);
            if (group) {
                match = group.matches.find(m => m.id === matchId);
            }
        } else {
            for (let round of this.knockoutMatches) {
                match = round.matches.find(m => m.id === matchId);
                if (match) break;
            }
        }

        if (!match) {
            console.error('[Tournament] Match not found:', matchId);
            console.log('[Tournament] Available matches in groups:');
            for (let g of this.groups) {
                console.log(`Group ${g.name}:`, g.matches.map(m => ({
                    id: m.id,
                    teamA: m.teamA.name,
                    teamB: m.teamB.name,
                    played: m.played,
                    matchDay: m.matchDay
                })));
            }
            return;
        }

        // Store scores
        match.scoreA = teamAScore;
        match.scoreB = teamBScore;

        // Determine winner
        let winner = null;
        if (match.scoreA > match.scoreB) winner = match.teamA;
        else if (match.scoreB > match.scoreA) winner = match.teamB;

        // Handle knockout draw
        if (!isGroupMatch && winner === null) {
            let extraTimeCount = 0;
            let newScoreA = match.scoreA, newScoreB = match.scoreB;
            while (winner === null && extraTimeCount < 3) {
                extraTimeCount++;
                const extraA = Math.floor(Math.random() * 2);
                const extraB = Math.floor(Math.random() * 2);
                newScoreA += extraA;
                newScoreB += extraB;
                if (newScoreA > newScoreB) winner = match.teamA;
                else if (newScoreB > newScoreA) winner = match.teamB;
            }
            if (winner === null) {
                winner = Math.random() < 0.5 ? match.teamA : match.teamB;
                if (winner === match.teamA) newScoreA += 1;
                else newScoreB += 1;
            }
            match.scoreA = newScoreA;
            match.scoreB = newScoreB;
            match.extraTime = true;
        }

        // ⭐ CRITICAL: Mark as played!
        match.played = true;
        match.winner = winner;
        match.pending = false;
        match.isPlayerMatch = false;

        console.log('[Tournament] ✅ Match recorded and marked as PLAYED:', match.teamA.name, match.scoreA, '-', match.scoreB, match.teamB.name);
        console.log('[Tournament] Match.played =', match.played);

        // Store match result
        this.matchResults.push(match);

        // Determine player win/loss
        const playerTeamId = this.selectedTeamId;
        const playerWon = winner && winner.id === playerTeamId;
        const playerLost = winner && winner.id !== playerTeamId;

        // If player lost in knockout
        if (!isGroupMatch && playerLost) {
            this.isPlayerOut = true;
            this.playerEliminated = true;
            this.tournamentComplete = true;
            console.log('[Tournament] Player eliminated in knockout');
            return;
        }

        // Update group standings if group match
        if (isGroupMatch && group) {
            const result = {
                teamA: match.teamA,
                teamB: match.teamB,
                scoreA: match.scoreA,
                scoreB: match.scoreB,
                winner: winner
            };
            this.updateGroupStandings(group, match, result);
            console.log('[Tournament] Updated group standings for group', group.name);

            // Log standings after update
            console.log('[Tournament] Standings after update:');
            for (let entry of group.standings) {
                const team = TOURNAMENT_TEAMS.find(t => t.id === entry.teamId);
                console.log(`  ${team ? team.name : 'Unknown'}: MP=${entry.played}, Pts=${entry.points}`);
            }

            // Check if all group matches are played
            const allGroupsDone = this.groups.every(g => g.matches.every(m => m.played));
            if (allGroupsDone) {
                this.groupStageComplete = true;
                console.log('[Tournament] 🎉 All group matches complete!');
                this.generateKnockoutStage();
            }
        } else if (!isGroupMatch && playerWon) {
            // Check if player won the final
            const isFinal = this.knockoutMatches[3] &&
                           this.knockoutMatches[3].matches.some(m => m.id === match.id);
            if (isFinal) {
                this.champion = winner;
                this.tournamentComplete = true;
                console.log('[Tournament] 🏆 Player is CHAMPION!');
            }
        }

        // If player is out
        if (this.isPlayerOut && !this.tournamentComplete) {
            this.tournamentComplete = true;
            console.log('[Tournament] Tournament complete - player eliminated');
        }
    },
    shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    getProgress() {
        if (this.tournamentComplete) return 100;
        if (!this.groupStageComplete) {
            const totalMatches = this.groups.flatMap(g => g.matches).length;
            const playedMatches = this.groups.flatMap(g => g.matches.filter(m => m.played)).length;
            return Math.round((playedMatches / totalMatches) * 100);
        } else {
            const totalKnockoutMatches = this.knockoutMatches.flatMap(r => r.matches).length;
            const playedKnockout = this.knockoutMatches.flatMap(r => r.matches.filter(m => m.played)).length;
            return 50 + Math.round((playedKnockout / totalKnockoutMatches) * 50);
        }
    },

    getGroupStandings(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return null;
        return group.standings.map(entry => {
            const team = TOURNAMENT_TEAMS.find(t => t.id === entry.teamId);
            return { ...entry, team: team };
        });
    },

    getBracketStatus() {
        return this.knockoutMatches.map((round, idx) => ({
            round: idx,
            name: round.name,
            matches: round.matches.map(m => ({
                teamA: m.teamA ? { ...m.teamA } : null,
                teamB: m.teamB ? { ...m.teamB } : null,
                scoreA: m.scoreA,
                scoreB: m.scoreB,
                played: m.played,
                winner: m.winner ? { ...m.winner } : null,
                pending: m.pending || false,
                extraTime: m.extraTime || false
            }))
        }));
    },

    getAllGroupStandings() {
        return this.groups.map(group => ({
            name: group.name,
            standings: this.getGroupStandings(group.id)
        }));
    },

    getPlayerTeam() {
        return TOURNAMENT_TEAMS.find(t => t.id === this.selectedTeamId);
    },

    hasPendingMatch() {
        return this.getPlayerNextMatch() !== null;
    },

    isPlayerEliminated() {
        return this.playerEliminated;
    },

    isComplete() {
        return this.tournamentComplete;
    }
};