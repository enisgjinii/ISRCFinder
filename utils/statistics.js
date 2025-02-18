export class Statistics {
    static async generateStats(trackData) {
        const stats = {
            totalTracks: 0,
            uniqueArtists: new Set(),
            genres: {},
            decades: {},
            averageDuration: 0
        };

        trackData.forEach(track => {
            stats.totalTracks++;
            stats.uniqueArtists.add(track.artists[0].name);
            track.genres?.forEach(genre => {
                stats.genres[genre] = (stats.genres[genre] || 0) + 1;
            });

            const year = track.album.release_date.split('-')[0];
            const decade = `${Math.floor(year / 10)}0s`;
            stats.decades[decade] = (stats.decades[decade] || 0) + 1;

            stats.averageDuration += track.duration_ms;
        });

        stats.averageDuration = Math.round(stats.averageDuration / stats.totalTracks / 1000);

        return stats;
    }
}