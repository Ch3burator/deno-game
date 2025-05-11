async function loadLeaderboard() {
    try {
        const response = await fetch('/leaderboard');
        const scores = await response.json();
        const tbody = document.getElementById('leaderboardBody');
        tbody.innerHTML = '';
        scores.forEach(({ player, score }) => {
            console.log('Adding score:', { player, score });
            const row = document.createElement('tr');
            const playerCell = document.createElement('td');
            const scoreCell = document.createElement('td');
            playerCell.textContent = player || 'Unknown';
            scoreCell.textContent = score.toString();
            row.appendChild(playerCell);
            row.appendChild(scoreCell);
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

document.getElementById('refreshLeaderboard').addEventListener('click', loadLeaderboard);

export { loadLeaderboard };